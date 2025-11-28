import { db } from "../db";
import {
  liveEvents,
  eventTickets,
  eventAttendance,
  eventTips,
  eventNftSouvenirs,
  fanzLedger,
  fanzWallets,
  InsertLiveEvent,
  InsertEventTicket,
  InsertEventAttendance,
  InsertEventTip,
  InsertEventNftSouvenir,
  LiveEvent,
  EventTicket,
  EventAttendance,
  EventTip,
  EventNftSouvenir,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { broadcastToRoom } from "../websocket";

/**
 * Live Events Service
 * Manages mixed-reality events with real-time interactions, tipping, and NFT souvenirs
 */
export class LiveEventsService {
  /**
   * Create a new live event
   */
  async createEvent(creatorId: string, eventData: InsertLiveEvent): Promise<LiveEvent> {
    const [event] = await db
      .insert(liveEvents)
      .values({
        ...eventData,
        creatorId,
      })
      .returning();

    return event;
  }

  /**
   * Get event by ID with full details
   */
  async getEventById(eventId: string): Promise<LiveEvent | null> {
    const [event] = await db
      .select()
      .from(liveEvents)
      .where(eq(liveEvents.id, eventId))
      .limit(1);

    return event || null;
  }

  /**
   * Get all events (public)
   */
  async getAllEvents(
    status?: "scheduled" | "live" | "ended" | "cancelled"
  ): Promise<LiveEvent[]> {
    const conditions = [];
    
    if (status) {
      conditions.push(eq(liveEvents.status, status));
    }
    
    const events = await db
      .select()
      .from(liveEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(liveEvents.scheduledStartAt))
      .limit(100);
    
    // Join with creator info
    const eventsWithCreators = await Promise.all(
      events.map(async (event) => {
        const [creator] = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: profiles.displayName,
            avatarUrl: profiles.avatarUrl,
          })
          .from(users)
          .leftJoin(profiles, eq(users.id, profiles.userId))
          .where(eq(users.id, event.creatorId))
          .limit(1);
        
        return {
          ...event,
          creator,
        };
      })
    );
    
    return eventsWithCreators;
  }

  /**
   * Get events for a creator
   */
  async getCreatorEvents(
    creatorId: string,
    status?: "scheduled" | "live" | "ended" | "cancelled"
  ): Promise<LiveEvent[]> {
    const conditions = [eq(liveEvents.creatorId, creatorId)];
    
    if (status) {
      conditions.push(eq(liveEvents.status, status));
    }

    return db
      .select()
      .from(liveEvents)
      .where(and(...conditions))
      .orderBy(desc(liveEvents.scheduledStartAt));
  }

  /**
   * Get upcoming public events (for discovery)
   */
  async getUpcomingEvents(limit: number = 20): Promise<LiveEvent[]> {
    return db
      .select()
      .from(liveEvents)
      .where(
        and(
          eq(liveEvents.status, "scheduled"),
          gte(liveEvents.scheduledStartAt, new Date())
        )
      )
      .orderBy(liveEvents.scheduledStartAt)
      .limit(limit);
  }

  /**
   * Get currently live events
   */
  async getLiveEvents(): Promise<LiveEvent[]> {
    return db
      .select()
      .from(liveEvents)
      .where(eq(liveEvents.status, "live"))
      .orderBy(desc(liveEvents.peakConcurrentViewers));
  }

  /**
   * Start an event (change status to live)
   */
  async startEvent(eventId: string, creatorId: string): Promise<LiveEvent> {
    const [event] = await db
      .update(liveEvents)
      .set({
        status: "live",
        actualStartAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(liveEvents.id, eventId), eq(liveEvents.creatorId, creatorId)))
      .returning();

    if (!event) {
      throw new Error("Event not found or unauthorized");
    }

    // WebSocket: Broadcast event start to all ticket holders and subscribers
    try {
      broadcastToRoom(`event:${eventId}`, {
        type: 'stream_update',
        data: {
          eventId,
          status: 'live',
          actualStartAt: event.actualStartAt,
          title: event.title,
          message: `${event.title} has started!`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Log but don't fail the operation if WebSocket broadcast fails
      console.error(`WebSocket broadcast failed for event start ${eventId}:`, err);
    }

    return event;
  }

  /**
   * End an event
   */
  async endEvent(eventId: string, creatorId: string): Promise<LiveEvent> {
    // Mark all active attendance as left
    await db
      .update(eventAttendance)
      .set({
        leftAt: new Date(),
        isActive: false,
      })
      .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.isActive, true)));

    const [event] = await db
      .update(liveEvents)
      .set({
        status: "ended",
        actualEndAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(liveEvents.id, eventId), eq(liveEvents.creatorId, creatorId)))
      .returning();

    if (!event) {
      throw new Error("Event not found or unauthorized");
    }

    // WebSocket: Broadcast event end to all attendees
    try {
      broadcastToRoom(`event:${eventId}`, {
        type: 'stream_update',
        data: {
          eventId,
          status: 'ended',
          actualEndAt: event.actualEndAt,
          title: event.title,
          message: `${event.title} has ended. Thanks for attending!`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Log but don't fail the operation if WebSocket broadcast fails
      console.error(`WebSocket broadcast failed for event end ${eventId}:`, err);
    }

    return event;
  }

  /**
   * Cancel an event and refund all tickets
   */
  async cancelEvent(eventId: string, creatorId: string): Promise<LiveEvent> {
    return await db.transaction(async (tx) => {
      const [event] = await tx
        .update(liveEvents)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(and(eq(liveEvents.id, eventId), eq(liveEvents.creatorId, creatorId)))
        .returning();

      if (!event) {
        throw new Error("Event not found or unauthorized");
      }

      // Get all tickets for this event
      const tickets = await tx
        .select()
        .from(eventTickets)
        .where(and(eq(eventTickets.eventId, eventId), sql`${eventTickets.refundedAt} IS NULL`));

      // Refund each ticket
      for (const ticket of tickets) {
        // Get fan's wallet and lock it
        const [fanWallet] = await tx
          .select()
          .from(fanzWallets)
          .where(eq(fanzWallets.userId, ticket.fanId))
          .for('update')
          .limit(1);

        // Get creator's wallet and lock it
        const [creatorWallet] = await tx
          .select()
          .from(fanzWallets)
          .where(eq(fanzWallets.userId, creatorId))
          .for('update')
          .limit(1);

        if (!fanWallet || !creatorWallet) {
          throw new Error(`Wallet not found for refund - fan: ${ticket.fanId}, creator: ${creatorId}`);
        }

        // CRITICAL: Pre-flight check - ensure creator has funds for refund
        if ((creatorWallet.availableBalanceCents || 0) < ticket.pricePaidCents) {
          throw new Error(`Creator has insufficient funds for refund. Required: ${ticket.pricePaidCents}, Available: ${creatorWallet.availableBalanceCents || 0}`);
        }

        // Calculate new balances for refund
        const fanNewBalance = (fanWallet.availableBalanceCents || 0) + ticket.pricePaidCents;
        const creatorNewBalance = (creatorWallet.availableBalanceCents || 0) - ticket.pricePaidCents;

        // Credit fan's wallet (refund)
        const fanCreditResult = await tx
          .update(fanzWallets)
          .set({
            availableBalanceCents: sql`${fanzWallets.availableBalanceCents} + ${ticket.pricePaidCents}`,
            totalBalanceCents: sql`${fanzWallets.totalBalanceCents} + ${ticket.pricePaidCents}`,
            updatedAt: new Date(),
          })
          .where(eq(fanzWallets.userId, ticket.fanId))
          .returning();

        // CRITICAL: Verify fan credit succeeded
        if (!fanCreditResult || fanCreditResult.length === 0) {
          throw new Error(`Failed to credit fan wallet for refund - transaction aborted`);
        }

        // Debit creator's wallet
        const creatorDebitResult = await tx
          .update(fanzWallets)
          .set({
            availableBalanceCents: sql`${fanzWallets.availableBalanceCents} - ${ticket.pricePaidCents}`,
            totalBalanceCents: sql`${fanzWallets.totalBalanceCents} - ${ticket.pricePaidCents}`,
            updatedAt: new Date(),
          })
          .where(eq(fanzWallets.userId, creatorId))
          .returning();

        // CRITICAL: Verify creator debit succeeded
        if (!creatorDebitResult || creatorDebitResult.length === 0) {
          throw new Error(`Failed to debit creator wallet for refund - transaction aborted`);
        }

        const refundTransactionId = `event_refund_${nanoid(12)}`;

        // Record credit in fan's ledger (refund)
        await tx.insert(fanzLedger).values({
          transactionId: refundTransactionId,
          walletId: fanWallet.id,
          userId: ticket.fanId,
          entryType: "credit",
          transactionType: "refund",
          amountCents: ticket.pricePaidCents,
          balanceAfterCents: fanNewBalance,
          currency: "USD",
          description: `Refund for cancelled event: ${event.title}`,
          referenceType: "event_refund",
          referenceId: eventId,
          metadata: { eventId, eventTitle: event.title, ticketId: ticket.id },
        });

        // Record debit in creator's ledger
        await tx.insert(fanzLedger).values({
          transactionId: refundTransactionId,
          walletId: creatorWallet.id,
          userId: creatorId,
          entryType: "debit",
          transactionType: "refund",
          amountCents: ticket.pricePaidCents,
          balanceAfterCents: creatorNewBalance,
          currency: "USD",
          description: `Refund issued for cancelled event: ${event.title}`,
          referenceType: "event_refund",
          referenceId: eventId,
          metadata: { eventId, eventTitle: event.title, ticketId: ticket.id, fanId: ticket.fanId },
        });

        // Mark ticket as refunded
        await tx
          .update(eventTickets)
          .set({
            refundedAt: new Date(),
          })
          .where(eq(eventTickets.id, ticket.id));
      }

      // Update event revenue to zero (all refunded)
      await tx
        .update(liveEvents)
        .set({
          totalRevenueCents: 0,
          updatedAt: new Date(),
        })
        .where(eq(liveEvents.id, eventId));

      return event;
    }).then((event) => {
      // WebSocket: Broadcast event cancellation AFTER transaction commits
      try {
        broadcastToRoom(`event:${eventId}`, {
          type: 'stream_update',
          data: {
            eventId,
            status: 'cancelled',
            title: event.title,
            message: `Event '${event.title}' has been cancelled. All tickets have been refunded.`,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        // Log but don't fail the operation if WebSocket broadcast fails
        console.error(`WebSocket broadcast failed for event cancellation ${eventId}:`, err);
      }
      return event;
    });
  }

  /**
   * Purchase event ticket
   */
  async purchaseTicket(
    eventId: string,
    fanId: string,
    pricePaidCents: number,
    paymentMethod: string = "fanzwallet"
  ): Promise<EventTicket> {
    return await db.transaction(async (tx) => {
      // Check if ticket already purchased
      const existingTicket = await tx
        .select()
        .from(eventTickets)
        .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.fanId, fanId)))
        .limit(1);

      if (existingTicket.length > 0) {
        throw new Error("Ticket already purchased for this event");
      }

      // Get event details
      const [event] = await tx
        .select()
        .from(liveEvents)
        .where(eq(liveEvents.id, eventId))
        .limit(1);

      if (!event) {
        throw new Error("Event not found");
      }

      if (event.status === "cancelled") {
        throw new Error("Event has been cancelled");
      }

      if (event.status === "ended") {
        throw new Error("Event has already ended");
      }

      // Get fan's wallet and lock it for update (prevents race conditions)
      const [fanWallet] = await tx
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.userId, fanId))
        .for('update')
        .limit(1);

      if (!fanWallet) {
        throw new Error("Fan wallet not found");
      }

      // Check sufficient funds BEFORE any updates
      if ((fanWallet.availableBalanceCents || 0) < pricePaidCents) {
        throw new Error("Insufficient funds");
      }

      // ATOMIC capacity check: Lock event row FOR UPDATE to prevent concurrent overselling
      if (event.maxAttendees) {
        // Lock the event row to serialize capacity checks across concurrent purchases
        await tx
          .select()
          .from(liveEvents)
          .where(eq(liveEvents.id, eventId))
          .for('update')
          .limit(1);

        // Now safely count tickets (row locked, no concurrent ticket inserts can proceed)
        const ticketCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(eventTickets)
          .where(and(eq(eventTickets.eventId, eventId), sql`${eventTickets.refundedAt} IS NULL`));

        if (ticketCount[0].count >= event.maxAttendees) {
          throw new Error("Event is sold out");
        }
      }

      // Get creator's wallet and lock it
      const [creatorWallet] = await tx
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.userId, event.creatorId))
        .for('update')
        .limit(1);

      if (!creatorWallet) {
        throw new Error("Creator wallet not found");
      }

      // Calculate new balances BEFORE updates (for ledger accuracy)
      const fanNewBalance = (fanWallet.availableBalanceCents || 0) - pricePaidCents;
      const creatorNewBalance = (creatorWallet.availableBalanceCents || 0) + pricePaidCents;

      // Deduct from fan's wallet
      const debitResult = await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: sql`${fanzWallets.availableBalanceCents} - ${pricePaidCents}`,
          totalBalanceCents: sql`${fanzWallets.totalBalanceCents} - ${pricePaidCents}`,
          updatedAt: new Date(),
        })
        .where(eq(fanzWallets.userId, fanId))
        .returning();

      // CRITICAL: Verify debit succeeded
      if (!debitResult || debitResult.length === 0) {
        throw new Error("Failed to debit fan wallet - transaction aborted");
      }

      // Credit creator's wallet
      const creditResult = await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: sql`${fanzWallets.availableBalanceCents} + ${pricePaidCents}`,
          totalBalanceCents: sql`${fanzWallets.totalBalanceCents} + ${pricePaidCents}`,
          updatedAt: new Date(),
        })
        .where(eq(fanzWallets.userId, event.creatorId))
        .returning();

      // CRITICAL: Verify credit succeeded
      if (!creditResult || creditResult.length === 0) {
        throw new Error("Failed to credit creator wallet - transaction aborted");
      }

      const transactionId = `event_ticket_${nanoid(12)}`;

      // Record debit in fan's ledger (double-entry bookkeeping) using pre-calculated balances
      await tx.insert(fanzLedger).values({
        transactionId,
        walletId: fanWallet.id,
        userId: fanId,
        entryType: "debit",
        transactionType: "payment",
        amountCents: pricePaidCents,
        balanceAfterCents: fanNewBalance,
        currency: "USD",
        description: `Event ticket: ${event.title}`,
        referenceType: "event_ticket",
        referenceId: eventId,
        metadata: { eventId, eventTitle: event.title },
      });

      // Record credit in creator's ledger using pre-calculated balances
      await tx.insert(fanzLedger).values({
        transactionId,
        walletId: creatorWallet.id,
        userId: event.creatorId,
        entryType: "credit",
        transactionType: "payment",
        amountCents: pricePaidCents,
        balanceAfterCents: creatorNewBalance,
        currency: "USD",
        description: `Event ticket sale: ${event.title}`,
        referenceType: "event_ticket",
        referenceId: eventId,
        metadata: { eventId, eventTitle: event.title, fanId },
      });

      // Create ticket
      const [ticket] = await tx
        .insert(eventTickets)
        .values({
          eventId,
          fanId,
          pricePaidCents,
          paymentMethod,
          transactionId,
        })
        .returning();

      // Update event revenue
      await tx
        .update(liveEvents)
        .set({
          totalRevenueCents: sql`${liveEvents.totalRevenueCents} + ${pricePaidCents}`,
          updatedAt: new Date(),
        })
        .where(eq(liveEvents.id, eventId));

      return ticket;
    });
  }

  /**
   * Join event (mark attendance)
   */
  async joinEvent(eventId: string, userId: string): Promise<EventAttendance> {
    return await db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(liveEvents)
        .where(eq(liveEvents.id, eventId))
        .limit(1);

      if (!event) {
        throw new Error("Event not found");
      }

      if (event.status !== "live") {
        throw new Error("Event is not currently live");
      }

      // CRITICAL: Verify access control entitlement based on event's accessType
      if (event.accessType === "ticketed") {
        // Verify user has purchased a valid (non-refunded) ticket
        const validTicket = await tx
          .select()
          .from(eventTickets)
          .where(
            and(
              eq(eventTickets.eventId, eventId),
              eq(eventTickets.fanId, userId),
              sql`${eventTickets.refundedAt} IS NULL`
            )
          )
          .limit(1);

        if (validTicket.length === 0) {
          throw new Error("Access denied: Valid ticket required for this event");
        }
      } else if (event.accessType === "subscription_only") {
        // Verify user has active subscription to creator
        // TODO: Implement subscription check when subscription system exists
        // For now, allow access (will be enforced when subscriptions are implemented)
      } else if (event.accessType === "tier_gated") {
        // Verify user meets minimum trust tier requirement
        // TODO: Implement trust tier check when tier gating is defined
        // For now, allow access (will be enforced when tier requirements are added)
      }
      // "free" access type allows anyone to join

      // Check if user already has active attendance
      const activeAttendance = await tx
        .select()
        .from(eventAttendance)
        .where(
          and(
            eq(eventAttendance.eventId, eventId),
            eq(eventAttendance.userId, userId),
            eq(eventAttendance.isActive, true)
          )
        )
        .limit(1);

      if (activeAttendance.length > 0) {
        return activeAttendance[0];
      }

      // Create attendance record
      const [attendance] = await tx
        .insert(eventAttendance)
        .values({
          eventId,
          userId,
        })
        .returning();

      // Update concurrent viewers count
      const activeCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(eventAttendance)
        .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.isActive, true)));

      const currentViewers = activeCount[0].count;

      await tx
        .update(liveEvents)
        .set({
          peakConcurrentViewers: sql`GREATEST(${liveEvents.peakConcurrentViewers}, ${currentViewers})`,
          totalAttendees: sql`${liveEvents.totalAttendees} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(liveEvents.id, eventId));

      return { attendance, eventId, currentViewers, userId };
    }).then(({ attendance, eventId, currentViewers, userId }) => {
      // WebSocket: Broadcast new joiner AFTER transaction commits
      try {
        broadcastToRoom(`event:${eventId}`, {
          type: 'stream_update',
          data: {
            eventId,
            action: 'user_joined',
            userId,
            currentViewers,
            message: `Someone joined the event`,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        // Log but don't fail the operation if WebSocket broadcast fails
        console.error(`WebSocket broadcast failed for user joined ${eventId}:`, err);
      }
      return attendance;
    });
  }

  /**
   * Leave event
   */
  async leaveEvent(eventId: string, userId: string): Promise<void> {
    const now = new Date();

    await db
      .update(eventAttendance)
      .set({
        leftAt: now,
        isActive: false,
        durationSeconds: sql`EXTRACT(EPOCH FROM (${now} - ${eventAttendance.joinedAt}))::INTEGER`,
      })
      .where(
        and(
          eq(eventAttendance.eventId, eventId),
          eq(eventAttendance.userId, userId),
          eq(eventAttendance.isActive, true)
        )
      );

    // Get updated viewer count
    const activeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventAttendance)
      .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.isActive, true)));

    const currentViewers = activeCount[0]?.count || 0;

    // WebSocket: Broadcast user left to room with updated viewer count
    try {
      broadcastToRoom(`event:${eventId}`, {
        type: 'stream_update',
        data: {
          eventId,
          action: 'user_left',
          userId,
          currentViewers,
          message: `Someone left the event`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Log but don't fail the operation if WebSocket broadcast fails
      console.error(`WebSocket broadcast failed for user left ${eventId}:`, err);
    }
  }

  /**
   * Get active attendees for an event
   */
  async getActiveAttendees(eventId: string): Promise<EventAttendance[]> {
    return db
      .select()
      .from(eventAttendance)
      .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.isActive, true)));
  }

  /**
   * Send tip during live event
   */
  async sendEventTip(
    eventId: string,
    fromUserId: string,
    toUserId: string,
    amountCents: number,
    message?: string,
    isAnonymous: boolean = false
  ): Promise<EventTip> {
    return await db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(liveEvents)
        .where(eq(liveEvents.id, eventId))
        .limit(1);

      if (!event) {
        throw new Error("Event not found");
      }

      if (event.status !== "live") {
        throw new Error("Event is not currently live");
      }

      // Get tipper's wallet and lock it for update
      const [tipperWallet] = await tx
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.userId, fromUserId))
        .for('update')
        .limit(1);

      if (!tipperWallet) {
        throw new Error("Tipper wallet not found");
      }

      // Check sufficient funds BEFORE any updates
      if ((tipperWallet.availableBalanceCents || 0) < amountCents) {
        throw new Error("Insufficient funds for tip");
      }

      // Get recipient's wallet and lock it
      const [recipientWallet] = await tx
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.userId, toUserId))
        .for('update')
        .limit(1);

      if (!recipientWallet) {
        throw new Error("Recipient wallet not found");
      }

      // Calculate new balances BEFORE updates (for ledger accuracy)
      const tipperNewBalance = (tipperWallet.availableBalanceCents || 0) - amountCents;
      const recipientNewBalance = (recipientWallet.availableBalanceCents || 0) + amountCents;

      // Deduct from tipper's wallet
      const debitResult = await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: sql`${fanzWallets.availableBalanceCents} - ${amountCents}`,
          totalBalanceCents: sql`${fanzWallets.totalBalanceCents} - ${amountCents}`,
          updatedAt: new Date(),
        })
        .where(eq(fanzWallets.userId, fromUserId))
        .returning();

      // CRITICAL: Verify debit succeeded
      if (!debitResult || debitResult.length === 0) {
        throw new Error("Failed to debit tipper wallet - transaction aborted");
      }

      // Credit recipient's wallet
      const creditResult = await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: sql`${fanzWallets.availableBalanceCents} + ${amountCents}`,
          totalBalanceCents: sql`${fanzWallets.totalBalanceCents} + ${amountCents}`,
          updatedAt: new Date(),
        })
        .where(eq(fanzWallets.userId, toUserId))
        .returning();

      // CRITICAL: Verify credit succeeded
      if (!creditResult || creditResult.length === 0) {
        throw new Error("Failed to credit recipient wallet - transaction aborted");
      }

      const transactionId = `event_tip_${nanoid(12)}`;

      // Record debit in tipper's ledger (double-entry bookkeeping) using pre-calculated balances
      await tx.insert(fanzLedger).values({
        transactionId,
        walletId: tipperWallet.id,
        userId: fromUserId,
        entryType: "debit",
        transactionType: "tip",
        amountCents,
        balanceAfterCents: tipperNewBalance,
        currency: "USD",
        description: `Event tip: ${event.title}`,
        referenceType: "event_tip",
        referenceId: eventId,
        metadata: { eventId, message, isAnonymous, toUserId },
      });

      // Record credit in recipient's ledger using pre-calculated balances
      await tx.insert(fanzLedger).values({
        transactionId,
        walletId: recipientWallet.id,
        userId: toUserId,
        entryType: "credit",
        transactionType: "tip",
        amountCents,
        balanceAfterCents: recipientNewBalance,
        currency: "USD",
        description: `Tip received during: ${event.title}`,
        referenceType: "event_tip",
        referenceId: eventId,
        metadata: { eventId, message, isAnonymous, fromUserId },
      });

      // Create tip record
      const [tip] = await tx
        .insert(eventTips)
        .values({
          eventId,
          fromUserId,
          toUserId,
          amountCents,
          message,
          isAnonymous,
          transactionId,
        })
        .returning();

      // Update event tips total
      await tx
        .update(liveEvents)
        .set({
          totalTipsCents: sql`${liveEvents.totalTipsCents} + ${amountCents}`,
          totalRevenueCents: sql`${liveEvents.totalRevenueCents} + ${amountCents}`,
          updatedAt: new Date(),
        })
        .where(eq(liveEvents.id, eventId));

      return { tip, eventId, message, isAnonymous, fromUserId, toUserId, amountCents };
    }).then(({ tip, eventId, message, isAnonymous, fromUserId, toUserId, amountCents }) => {
      // WebSocket: Broadcast new tip AFTER transaction commits
      try {
        broadcastToRoom(`event:${eventId}`, {
          type: 'tip',
          data: {
            eventId,
            tipId: tip.id,
            amountCents,
            amountUSD: (amountCents / 100).toFixed(2),
            message,
            isAnonymous,
            fromUserId: isAnonymous ? null : fromUserId,
            toUserId,
            highlight: tip.highlightColor,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        // Log but don't fail the operation if WebSocket broadcast fails
        console.error(`WebSocket broadcast failed for event tip ${eventId}:`, err);
      }
      return tip;
    });
  }

  /**
   * Get event tips (for live display)
   */
  async getEventTips(eventId: string, limit: number = 50): Promise<EventTip[]> {
    return db
      .select()
      .from(eventTips)
      .where(eq(eventTips.eventId, eventId))
      .orderBy(desc(eventTips.tippedAt))
      .limit(limit);
  }

  /**
   * Mint NFT souvenir for attendee
   */
  async mintNftSouvenir(
    eventId: string,
    userId: string
  ): Promise<EventNftSouvenir> {
    return await db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(liveEvents)
        .where(eq(liveEvents.id, eventId))
        .limit(1);

      if (!event) {
        throw new Error("Event not found");
      }

      if (!event.nftSouvenirEnabled) {
        throw new Error("NFT souvenirs not enabled for this event");
      }

      // Check if user attended the event
      const attendance = await tx
        .select()
        .from(eventAttendance)
        .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.userId, userId)))
        .limit(1);

      if (attendance.length === 0) {
        throw new Error("User did not attend this event");
      }

      // Check if NFT already minted
      const existing = await tx
        .select()
        .from(eventNftSouvenirs)
        .where(
          and(eq(eventNftSouvenirs.eventId, eventId), eq(eventNftSouvenirs.userId, userId))
        )
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Get serial number (total NFTs minted + 1)
      const nftCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(eventNftSouvenirs)
        .where(eq(eventNftSouvenirs.eventId, eventId));

      const serialNumber = nftCount[0].count + 1;

      // Mint NFT souvenir
      const [nft] = await tx
        .insert(eventNftSouvenirs)
        .values({
          eventId,
          userId,
          tokenId: `event-${eventId}-${nanoid(8)}`,
          name: event.nftSouvenirName || `${event.title} - Souvenir NFT`,
          description: event.nftSouvenirDescription || `Commemorative NFT from ${event.title}`,
          imageUrl: event.nftSouvenirImageUrl || "/default-nft-souvenir.png",
          serialNumber,
          attributes: {
            eventTitle: event.title,
            eventDate: event.actualStartAt || event.scheduledStartAt,
            attendeeCount: event.totalAttendees,
            serialNumber,
          },
          rarity: serialNumber <= 10 ? "legendary" : serialNumber <= 50 ? "epic" : "common",
        })
        .returning();

      return nft;
    });
  }

  /**
   * Get user's NFT souvenirs
   */
  async getUserNftSouvenirs(userId: string): Promise<EventNftSouvenir[]> {
    return db
      .select()
      .from(eventNftSouvenirs)
      .where(eq(eventNftSouvenirs.userId, userId))
      .orderBy(desc(eventNftSouvenirs.mintedAt));
  }

  /**
   * Get event statistics
   */
  async getEventStats(eventId: string) {
    const [event] = await db
      .select()
      .from(liveEvents)
      .where(eq(liveEvents.id, eventId))
      .limit(1);

    if (!event) {
      throw new Error("Event not found");
    }

    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventTickets)
      .where(eq(eventTickets.eventId, eventId));

    const [tipsCount] = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`COALESCE(SUM(${eventTips.amountCents}), 0)`,
      })
      .from(eventTips)
      .where(eq(eventTips.eventId, eventId));

    const [nftCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventNftSouvenirs)
      .where(eq(eventNftSouvenirs.eventId, eventId));

    const [activeAttendees] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventAttendance)
      .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.isActive, true)));

    return {
      event,
      ticketsSold: ticketCount.count,
      totalTips: tipsCount.count,
      totalTipsAmount: tipsCount.total,
      nftsMinted: nftCount.count,
      activeAttendees: activeAttendees.count,
    };
  }
}
