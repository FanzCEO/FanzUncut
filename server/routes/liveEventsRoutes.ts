import { Router } from "express";
import { LiveEventsService } from "../services/liveEventsService";
import { isAuthenticated } from "../middleware/auth";
import { z } from "zod";
import {
  insertLiveEventSchema,
  insertEventTicketSchema,
  insertEventAttendanceSchema,
  insertEventTipSchema,
} from "@shared/schema";

const router = Router();
const liveEventsService = new LiveEventsService();

/**
 * Live Events API Routes
 * Manages mixed-reality events with real-time features
 * 
 * IMPORTANT: Specific routes MUST come before /:eventId to avoid path collisions
 */

// Get all events (public - no auth required for browsing)
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    
    const events = await liveEventsService.getAllEvents(status as any);
    
    res.json(events);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to get events",
    });
  }
});

// Create new event (creators only)
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const eventData = insertLiveEventSchema.parse(req.body);
    
    const event = await liveEventsService.createEvent(userId, eventData);
    
    res.json({
      success: true,
      event,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to create event",
    });
  }
});

// Get creator's events (MUST be before /:eventId)
router.get("/creator/:creatorId", isAuthenticated, async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { status } = req.query;
    
    const events = await liveEventsService.getCreatorEvents(
      creatorId,
      status as any
    );
    
    res.json({
      success: true,
      events,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get creator events",
    });
  }
});

// Get upcoming events (MUST be before /:eventId)
router.get("/discover/upcoming", isAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const events = await liveEventsService.getUpcomingEvents(limit);
    
    res.json({
      success: true,
      events,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get upcoming events",
    });
  }
});

// Get currently live events
router.get("/discover/live", isAuthenticated, async (req, res) => {
  try {
    const events = await liveEventsService.getLiveEvents();
    
    res.json({
      success: true,
      events,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get live events",
    });
  }
});

// Get user's NFT souvenirs (MUST be before /:eventId to avoid /nft being captured as eventId)
router.get("/nft/my-souvenirs", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const nfts = await liveEventsService.getUserNftSouvenirs(userId);
    
    res.json({
      success: true,
      nfts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get NFT souvenirs",
    });
  }
});

// === Routes with /:eventId parameter start here ===

// Get event by ID
router.get("/:eventId", isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await liveEventsService.getEventById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
      });
    }
    
    res.json({
      success: true,
      event,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get event",
    });
  }
});

// Get event stats
router.get("/:eventId/stats", isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const stats = await liveEventsService.getEventStats(eventId);
    
    res.json({
      success: true,
      ...stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get event stats",
    });
  }
});

// Start event
router.post("/:eventId/start", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    
    const event = await liveEventsService.startEvent(eventId, userId);
    
    res.json({
      success: true,
      event,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to start event",
    });
  }
});

// End event
router.post("/:eventId/end", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    
    const event = await liveEventsService.endEvent(eventId, userId);
    
    res.json({
      success: true,
      event,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to end event",
    });
  }
});

// Cancel event
router.post("/:eventId/cancel", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    
    const event = await liveEventsService.cancelEvent(eventId, userId);
    
    res.json({
      success: true,
      event,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to cancel event",
    });
  }
});

// Purchase ticket
router.post("/:eventId/tickets/purchase", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    const { pricePaidCents, paymentMethod } = req.body;
    
    const ticket = await liveEventsService.purchaseTicket(
      eventId,
      userId,
      pricePaidCents,
      paymentMethod
    );
    
    res.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to purchase ticket",
    });
  }
});

// Join event
router.post("/:eventId/join", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    
    const attendance = await liveEventsService.joinEvent(eventId, userId);
    
    res.json({
      success: true,
      attendance,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to join event",
    });
  }
});

// Leave event
router.post("/:eventId/leave", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    
    await liveEventsService.leaveEvent(eventId, userId);
    
    res.json({
      success: true,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to leave event",
    });
  }
});

// Get active attendees
router.get("/:eventId/attendees", isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const attendees = await liveEventsService.getActiveAttendees(eventId);
    
    res.json({
      success: true,
      attendees,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get attendees",
    });
  }
});

// Send tip during event
router.post("/:eventId/tips", isAuthenticated, async (req, res) => {
  try {
    const fromUserId = req.user!.id;
    const { eventId } = req.params;
    const { toUserId, amountCents, message, isAnonymous } = req.body;
    
    const tip = await liveEventsService.sendEventTip(
      eventId,
      fromUserId,
      toUserId,
      amountCents,
      message,
      isAnonymous
    );
    
    res.json({
      success: true,
      tip,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to send tip",
    });
  }
});

// Get event tips
router.get("/:eventId/tips", isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const tips = await liveEventsService.getEventTips(eventId, limit);
    
    res.json({
      success: true,
      tips,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get tips",
    });
  }
});

// Mint NFT souvenir
router.post("/:eventId/nft/mint", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    
    const nft = await liveEventsService.mintNftSouvenir(eventId, userId);
    
    res.json({
      success: true,
      nft,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to mint NFT souvenir",
    });
  }
});

export default router;
