import { randomUUID } from "crypto";
import { db } from "../db";
import { 
  revenueQuests, 
  questParticipants, 
  questMilestones,
  fanzLedger,
  fanzWallets,
  InsertRevenueQuest,
  InsertQuestParticipant,
  InsertQuestMilestone,
  RevenueQuest,
  QuestParticipant 
} from "@shared/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { fanzTrustService } from "./fanzTrustService";

export class RevenueQuestService {
  
  // Create a new revenue quest
  async createQuest(data: InsertRevenueQuest): Promise<RevenueQuest> {
    const [quest] = await db.insert(revenueQuests).values(data).returning();
    return quest;
  }

  // Get quest by ID
  async getQuestById(questId: string): Promise<RevenueQuest | null> {
    const [quest] = await db
      .select()
      .from(revenueQuests)
      .where(eq(revenueQuests.id, questId));
    return quest || null;
  }

  // Get all quests for a creator
  async getCreatorQuests(creatorId: string, status?: string): Promise<RevenueQuest[]> {
    const conditions = [eq(revenueQuests.creatorId, creatorId)];
    
    if (status) {
      conditions.push(eq(revenueQuests.status, status as any));
    }

    return db
      .select()
      .from(revenueQuests)
      .where(and(...conditions))
      .orderBy(desc(revenueQuests.createdAt));
  }

  // Get active quests (for discovery feed)
  async getActiveQuests(limit = 20): Promise<RevenueQuest[]> {
    return db
      .select()
      .from(revenueQuests)
      .where(eq(revenueQuests.status, "active"))
      .orderBy(desc(revenueQuests.createdAt))
      .limit(limit);
  }

  // Contribute to a quest
  async contributeToQuest(
    questId: string,
    userId: string,
    amountCents: number
  ): Promise<QuestParticipant> {
    // Use transaction for atomic contribution
    const participant = await db.transaction(async (tx) => {
      // Lock quest row and verify it's still active (prevents race with completion)
      const [quest] = await tx
        .select()
        .from(revenueQuests)
        .where(eq(revenueQuests.id, questId))
        .for("update");
      
      if (!quest) {
        throw new Error("Quest not found");
      }

      if (quest.status !== "active") {
        throw new Error("Quest is not active");
      }

      if (amountCents < (quest.minContributionCents || 0)) {
        throw new Error(`Minimum contribution is ${quest.minContributionCents || 0} cents`);
      }

      // Check if this is a new contributor (inside locked transaction)
      const existingParticipant = await tx
        .select()
        .from(questParticipants)
        .where(and(
          eq(questParticipants.questId, questId),
          eq(questParticipants.userId, userId)
        ))
        .limit(1);
      
      const isNewContributor = existingParticipant.length === 0;

      // Check if user has sufficient balance
      const wallet = await fanzTrustService.getOrCreateWallet(userId);
      if ((wallet.availableBalanceCents || 0) < amountCents) {
        throw new Error("Insufficient balance");
      }
      
      // Deduct from user wallet
      await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: sql`${fanzWallets.availableBalanceCents} - ${amountCents}`,
          heldBalanceCents: sql`${fanzWallets.heldBalanceCents} + ${amountCents}`,
        })
        .where(eq(fanzWallets.userId, userId));

      // Create ledger entry
      const newBalance = (wallet.availableBalanceCents || 0) - amountCents;
      await tx.insert(fanzLedger).values({
        userId,
        walletId: wallet.id,
        transactionId: randomUUID(),
        entryType: "debit",
        transactionType: "transfer",
        amountCents,
        balanceAfterCents: newBalance,
        currency: wallet.currency,
        description: `Contributed to quest: ${quest.title}`,
        referenceType: "quest_contribution",
        referenceId: questId,
        metadata: { questId, questTitle: quest.title },
      });

      // Check if user is an early underwriter (first 10% of goal)
      const currentAmount = quest.currentAmountCents || 0;
      const isUnderwriter = currentAmount < (quest.goalAmountCents * 0.1);
      const underwriterBonusPercentage = isUnderwriter ? 10 : 0;

      // Create or update participant record (don't store share percentage - calculate on payout)
      const [p] = await tx
        .insert(questParticipants)
        .values({
          questId,
          userId,
          contributedAmountCents: amountCents,
          isUnderwriter,
          underwriterBonusPercentage,
          metadata: { walletId: wallet.id },
        })
        .onConflictDoUpdate({
          target: [questParticipants.questId, questParticipants.userId],
          set: {
            contributedAmountCents: sql`${questParticipants.contributedAmountCents} + ${amountCents}`,
          },
        })
        .returning();

      // Update quest progress
      const newTotal = currentAmount + amountCents;
      const completionPercentage = Math.min(100, Math.round((newTotal / quest.goalAmountCents) * 100));
      
      await tx
        .update(revenueQuests)
        .set({
          currentAmountCents: newTotal,
          totalContributors: isNewContributor ? sql`${revenueQuests.totalContributors} + 1` : revenueQuests.totalContributors,
          completionPercentage,
          status: completionPercentage >= 100 ? "completed" : quest.status,
          completedAt: completionPercentage >= 100 ? new Date() : null,
        })
        .where(eq(revenueQuests.id, questId));

      return p;
    });

    // Re-fetch quest to get updated values after transaction
    const updatedQuest = await this.getQuestById(questId);
    if (!updatedQuest) {
      return participant;
    }

    // Check and unlock milestones (outside transaction)
    await this.checkMilestones(questId, updatedQuest.currentAmountCents || 0);

    // If quest is completed, distribute rewards (outside transaction)
    if (updatedQuest.status === "completed") {
      await this.distributeQuestRewards(questId);
    }

    return participant;
  }

  // Check and unlock milestones
  private async checkMilestones(questId: string, currentAmount: number): Promise<void> {
    const milestones = await db
      .select()
      .from(questMilestones)
      .where(and(
        eq(questMilestones.questId, questId),
        eq(questMilestones.isReached, false)
      ))
      .orderBy(asc(questMilestones.targetAmountCents));

    for (const milestone of milestones) {
      if (currentAmount >= milestone.targetAmountCents) {
        await db
          .update(questMilestones)
          .set({
            isReached: true,
            reachedAt: new Date(),
          })
          .where(eq(questMilestones.id, milestone.id));
      }
    }
  }

  // Distribute quest rewards when completed
  private async distributeQuestRewards(questId: string): Promise<void> {
    const quest = await this.getQuestById(questId);
    if (!quest || quest.status !== "completed") {
      return;
    }

    // Get all participants
    const participants = await db
      .select()
      .from(questParticipants)
      .where(eq(questParticipants.questId, questId));

    const currentAmount = quest.currentAmountCents || 0;
    const contributorSharePercentage = quest.contributorSharePercentage || 0;
    
    // Calculate revenue split
    const creatorRevenueCents = Math.round(currentAmount * (100 - contributorSharePercentage) / 100);
    const contributorPoolCents = currentAmount - creatorRevenueCents;

    // Use transaction for atomic payout distribution
    await db.transaction(async (tx) => {
      // Atomic idempotency guard: set rewardsDistributed = true only if currently false
      const [updated] = await tx
        .update(revenueQuests)
        .set({ rewardsDistributed: true })
        .where(and(
          eq(revenueQuests.id, questId),
          eq(revenueQuests.rewardsDistributed, false)
        ))
        .returning({ id: revenueQuests.id });
      
      // If no rows updated, rewards already distributed (concurrent call)
      if (!updated) {
        return;
      }
      // Pay the creator their revenue share
      const creatorWallet = await fanzTrustService.getOrCreateWallet(quest.creatorId);
      await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: sql`${fanzWallets.availableBalanceCents} + ${creatorRevenueCents}`,
        })
        .where(eq(fanzWallets.id, creatorWallet.id));

      // Create ledger entry for creator revenue
      await tx.insert(fanzLedger).values({
        userId: quest.creatorId,
        walletId: creatorWallet.id,
        transactionId: randomUUID(),
        entryType: "credit",
        transactionType: "transfer",
        amountCents: creatorRevenueCents,
        balanceAfterCents: (creatorWallet.availableBalanceCents || 0) + creatorRevenueCents,
        currency: creatorWallet.currency,
        description: `Quest revenue: ${quest.title}`,
        referenceType: "quest_revenue",
        referenceId: questId,
        metadata: { questId, questTitle: quest.title },
      });

      // Distribute to contributors
      const totalContributed = participants.reduce((sum, p) => sum + p.contributedAmountCents, 0);
      let totalContributorPayouts = 0;

      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        const isLastParticipant = i === participants.length - 1;
        
        // Calculate participant's share of the contributor pool
        const sharePercentage = (participant.contributedAmountCents / totalContributed) * 100;
        let participantShare = Math.round((contributorPoolCents * sharePercentage) / 100);

        // On last participant, assign any rounding remainder to ensure exact total
        if (isLastParticipant) {
          const remainder = contributorPoolCents - totalContributorPayouts;
          participantShare = remainder;
        }

        const earnedAmountCents = participantShare;
        totalContributorPayouts += earnedAmountCents;

        // Release held funds: debit full contribution, credit earnings
        const wallet = await fanzTrustService.getOrCreateWallet(participant.userId);
        
        await tx
          .update(fanzWallets)
          .set({
            heldBalanceCents: sql`${fanzWallets.heldBalanceCents} - ${participant.contributedAmountCents}`,
            availableBalanceCents: sql`${fanzWallets.availableBalanceCents} + ${earnedAmountCents}`,
          })
          .where(eq(fanzWallets.id, wallet.id));

        // Record earnings
        await tx
          .update(questParticipants)
          .set({ earnedAmountCents })
          .where(eq(questParticipants.id, participant.id));

        // Create ledger entry for earnings
        if (earnedAmountCents > 0) {
          await tx.insert(fanzLedger).values({
            userId: participant.userId,
            walletId: wallet.id,
            transactionId: randomUUID(),
            entryType: "credit",
            transactionType: "quest_reward",
            amountCents: earnedAmountCents,
            balanceAfterCents: (wallet.availableBalanceCents || 0) + earnedAmountCents,
            currency: wallet.currency,
            description: `Quest reward: ${quest.title}`,
            referenceType: "quest_reward",
            referenceId: questId,
            metadata: { questId, questTitle: quest.title },
          });
        }
      }

      // Verify zero-sum: total paid out should equal currentAmount
      const totalPaid = creatorRevenueCents + totalContributorPayouts;
      if (totalPaid !== currentAmount) {
        throw new Error(`Payout mismatch: ${totalPaid} vs ${currentAmount}`);
      }
    });
  }

  // Get quest participants
  async getQuestParticipants(questId: string): Promise<QuestParticipant[]> {
    return db
      .select()
      .from(questParticipants)
      .where(eq(questParticipants.questId, questId))
      .orderBy(desc(questParticipants.contributedAmountCents));
  }

  // Get user's quest participation
  async getUserQuestParticipation(userId: string): Promise<QuestParticipant[]> {
    return db
      .select()
      .from(questParticipants)
      .where(eq(questParticipants.userId, userId))
      .orderBy(desc(questParticipants.contributedAt));
  }

  // Add milestone to quest
  async addMilestone(data: InsertQuestMilestone) {
    const [milestone] = await db
      .insert(questMilestones)
      .values(data)
      .returning();
    return milestone;
  }

  // Get quest milestones
  async getQuestMilestones(questId: string) {
    return db
      .select()
      .from(questMilestones)
      .where(eq(questMilestones.questId, questId))
      .orderBy(asc(questMilestones.targetAmountCents));
  }

  // Update quest
  async updateQuest(questId: string, updates: Partial<InsertRevenueQuest>) {
    const [updated] = await db
      .update(revenueQuests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(revenueQuests.id, questId))
      .returning();
    return updated;
  }

  // AI-powered quest suggestions (mock implementation for now)
  async getAIQuestSuggestion(creatorId: string): Promise<{
    suggestedGoalCents: number;
    confidenceScore: number;
    insights: any;
  }> {
    // This would integrate with OpenAI in production
    // For now, return a simple calculation based on creator's wallet
    const wallet = await fanzTrustService.getOrCreateWallet(creatorId);
    
    // Suggest a goal that's 10x their current balance
    const availableBalance = wallet.availableBalanceCents || 0;
    const suggestedGoalCents = availableBalance * 10;
    
    return {
      suggestedGoalCents: Math.max(10000, suggestedGoalCents), // Min $100
      confidenceScore: 75,
      insights: {
        reasoning: "Based on your wallet balance and typical creator performance",
        recommendedDuration: "30 days",
        suggestedRewardType: "exclusive_content",
      },
    };
  }
}

export const revenueQuestService = new RevenueQuestService();
