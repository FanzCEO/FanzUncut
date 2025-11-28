import { db } from "../db";
import {
  trustScores,
  trustProofs,
  disputeCases,
  users,
  type TrustScore,
  type TrustProof,
  type DisputeCase,
  type InsertTrustProof,
  type InsertDisputeCase,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// Trust tier thresholds (in score points)
const TRUST_TIER_THRESHOLDS = {
  unverified: 0,
  bronze: 100,
  silver: 500,
  gold: 1500,
  platinum: 5000,
  diamond: 10000,
};

// Proof type point values
const PROOF_POINT_VALUES = {
  id_verification: 200,
  address_verification: 150,
  payment_history: 100,
  social_media: 50,
  employment: 100,
  bank_statement: 150,
};

export class TrustScoringService {
  // Get or create trust score for user
  async getOrCreateTrustScore(userId: string): Promise<TrustScore> {
    let [score] = await db
      .select()
      .from(trustScores)
      .where(eq(trustScores.userId, userId))
      .limit(1);

    if (!score) {
      [score] = await db
        .insert(trustScores)
        .values({
          userId,
          currentTier: "unverified",
          scorePoints: 0,
        })
        .returning();
    }

    return score;
  }

  // Calculate trust tier based on score points
  private calculateTier(scorePoints: number): "unverified" | "bronze" | "silver" | "gold" | "platinum" | "diamond" {
    if (scorePoints >= TRUST_TIER_THRESHOLDS.diamond) return "diamond";
    if (scorePoints >= TRUST_TIER_THRESHOLDS.platinum) return "platinum";
    if (scorePoints >= TRUST_TIER_THRESHOLDS.gold) return "gold";
    if (scorePoints >= TRUST_TIER_THRESHOLDS.silver) return "silver";
    if (scorePoints >= TRUST_TIER_THRESHOLDS.bronze) return "bronze";
    return "unverified";
  }

  // Recalculate user's trust score based on all factors
  async calculateTrustScore(userId: string): Promise<TrustScore> {
    const score = await this.getOrCreateTrustScore(userId);

    // Base points from approved proofs
    const approvedProofsPoints = (score.proofsApproved || 0) * 100;

    // Transaction history bonus (up to 1000 points)
    const transactionBonus = Math.min(
      (score.transactionCount || 0) * 10,
      1000
    );

    // Volume bonus (up to 2000 points, 1 point per $100)
    const volumeBonus = Math.min(
      Math.floor((score.totalTransactionVolumeCents || 0) / 10000),
      2000
    );

    // Dispute record impact
    const disputeImpact = 
      ((score.successfulDisputesWon || 0) * 100) - 
      ((score.disputesLost || 0) * 200);

    // Account age bonus (up to 500 points, 1 point per day)
    const ageBonus = Math.min(score.accountAgeDays || 0, 500);

    // Good standing streak (up to 1000 points, 2 points per day)
    const streakBonus = Math.min((score.consecutiveGoodStandingDays || 0) * 2, 1000);

    // Calculate total
    const totalPoints = Math.max(0,
      approvedProofsPoints +
      transactionBonus +
      volumeBonus +
      disputeImpact +
      ageBonus +
      streakBonus +
      (score.bonusPoints || 0) -
      (score.penaltyPoints || 0)
    );

    const newTier = this.calculateTier(totalPoints);

    // Update score
    const [updatedScore] = await db
      .update(trustScores)
      .set({
        scorePoints: totalPoints,
        currentTier: newTier,
        lastCalculatedAt: new Date(),
        nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .where(eq(trustScores.userId, userId))
      .returning();

    return updatedScore;
  }

  // Submit proof for verification
  async submitProof(
    userId: string,
    proofData: Omit<InsertTrustProof, "userId">
  ): Promise<TrustProof> {
    // Create proof submission
    const [proof] = await db
      .insert(trustProofs)
      .values({
        ...proofData,
        userId,
        status: "pending",
      })
      .returning();

    // Increment submission counter
    await db
      .update(trustScores)
      .set({
        proofsSubmitted: sql`${trustScores.proofsSubmitted} + 1`,
      })
      .where(eq(trustScores.userId, userId));

    return proof;
  }

  // Verify proof (admin action)
  async verifyProof(
    proofId: string,
    verifiedBy: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<TrustProof> {
    const [existingProof] = await db
      .select()
      .from(trustProofs)
      .where(eq(trustProofs.id, proofId))
      .limit(1);

    if (!existingProof) {
      throw new Error("Proof not found");
    }

    if (existingProof.status !== "pending" && existingProof.status !== "under_review") {
      throw new Error("Proof already verified");
    }

    // Calculate score points for this proof type
    const scorePoints = approved
      ? PROOF_POINT_VALUES[existingProof.proofType as keyof typeof PROOF_POINT_VALUES] || 50
      : 0;

    // Update proof
    const [proof] = await db
      .update(trustProofs)
      .set({
        status: approved ? "approved" : "rejected",
        verifiedBy,
        verifiedAt: new Date(),
        rejectionReason: approved ? null : rejectionReason,
        scorePointsAwarded: scorePoints,
      })
      .where(eq(trustProofs.id, proofId))
      .returning();

    // Update trust score counters
    if (approved) {
      await db
        .update(trustScores)
        .set({
          proofsApproved: sql`${trustScores.proofsApproved} + 1`,
        })
        .where(eq(trustScores.userId, existingProof.userId));
    } else {
      await db
        .update(trustScores)
        .set({
          proofsRejected: sql`${trustScores.proofsRejected} + 1`,
        })
        .where(eq(trustScores.userId, existingProof.userId));
    }

    // Recalculate trust score
    await this.calculateTrustScore(existingProof.userId);

    return proof;
  }

  // Get user's proofs
  async getUserProofs(userId: string): Promise<TrustProof[]> {
    return await db
      .select()
      .from(trustProofs)
      .where(eq(trustProofs.userId, userId))
      .orderBy(desc(trustProofs.submittedAt));
  }

  // Get pending proofs for review (admin)
  async getPendingProofs(limit = 50): Promise<TrustProof[]> {
    return await db
      .select()
      .from(trustProofs)
      .where(eq(trustProofs.status, "pending"))
      .orderBy(desc(trustProofs.submittedAt))
      .limit(limit);
  }

  // File a dispute
  async fileDispute(
    filedBy: string,
    disputeData: Omit<InsertDisputeCase, "filedBy">
  ): Promise<DisputeCase> {
    const [dispute] = await db
      .insert(disputeCases)
      .values({
        ...disputeData,
        filedBy,
        status: "open",
      })
      .returning();

    // AI-assisted analysis (mock for now)
    const aiRecommendation = this.analyzeDisputeWithAI(dispute);
    
    // Update dispute with AI insights
    const [updatedDispute] = await db
      .update(disputeCases)
      .set({
        aiRecommendedAction: aiRecommendation.action,
        aiConfidenceScore: aiRecommendation.confidence,
        aiReasoning: aiRecommendation.reasoning,
      })
      .where(eq(disputeCases.id, dispute.id))
      .returning();

    return updatedDispute;
  }

  // AI analysis (mock)
  private analyzeDisputeWithAI(dispute: DisputeCase): {
    action: string;
    confidence: number;
    reasoning: any;
  } {
    // Mock AI analysis - in production, this would call an AI service
    const patterns = {
      transaction: { action: "review_transaction", confidence: 75 },
      content: { action: "content_takedown", confidence: 65 },
      harassment: { action: "warn_user", confidence: 85 },
      fraud: { action: "suspend_account", confidence: 90 },
    };

    const recommendation = patterns[dispute.disputeType as keyof typeof patterns] || {
      action: "manual_review",
      confidence: 50,
    };

    return {
      ...recommendation,
      reasoning: {
        factors: ["dispute_type", "user_history", "evidence_quality"],
        riskLevel: recommendation.confidence > 80 ? "high" : "medium",
      },
    };
  }

  // Resolve dispute (admin action)
  async resolveDispute(
    disputeId: string,
    assignedTo: string,
    resolution: string,
    rulingInFavorOf?: string,
    compensationCents?: number
  ): Promise<DisputeCase> {
    const [existingDispute] = await db
      .select()
      .from(disputeCases)
      .where(eq(disputeCases.id, disputeId))
      .limit(1);

    if (!existingDispute) {
      throw new Error("Dispute not found");
    }

    // Update dispute
    const [dispute] = await db
      .update(disputeCases)
      .set({
        status: "resolved",
        assignedTo,
        resolution,
        rulingInFavorOf,
        compensationAmountCents: compensationCents || 0,
        resolvedAt: new Date(),
      })
      .where(eq(disputeCases.id, disputeId))
      .returning();

    // Update trust scores based on outcome
    if (rulingInFavorOf === existingDispute.filedBy) {
      // Filer won
      await db
        .update(trustScores)
        .set({
          successfulDisputesWon: sql`${trustScores.successfulDisputesWon} + 1`,
        })
        .where(eq(trustScores.userId, existingDispute.filedBy));

      if (existingDispute.againstUser) {
        await db
          .update(trustScores)
          .set({
            disputesLost: sql`${trustScores.disputesLost} + 1`,
          })
          .where(eq(trustScores.userId, existingDispute.againstUser));
      }
    } else if (rulingInFavorOf === existingDispute.againstUser && existingDispute.againstUser) {
      // Against user won
      await db
        .update(trustScores)
        .set({
          successfulDisputesWon: sql`${trustScores.successfulDisputesWon} + 1`,
        })
        .where(eq(trustScores.userId, existingDispute.againstUser));

      await db
        .update(trustScores)
        .set({
          disputesLost: sql`${trustScores.disputesLost} + 1`,
        })
        .where(eq(trustScores.userId, existingDispute.filedBy));
    }

    // Recalculate trust scores
    await this.calculateTrustScore(existingDispute.filedBy);
    if (existingDispute.againstUser) {
      await this.calculateTrustScore(existingDispute.againstUser);
    }

    return dispute;
  }

  // Get user's disputes
  async getUserDisputes(userId: string): Promise<DisputeCase[]> {
    return await db
      .select()
      .from(disputeCases)
      .where(
        sql`${disputeCases.filedBy} = ${userId} OR ${disputeCases.againstUser} = ${userId}`
      )
      .orderBy(desc(disputeCases.filedAt));
  }

  // Get open disputes (admin)
  async getOpenDisputes(limit = 50): Promise<DisputeCase[]> {
    return await db
      .select()
      .from(disputeCases)
      .where(eq(disputeCases.status, "open"))
      .orderBy(desc(disputeCases.filedAt))
      .limit(limit);
  }

  // Get trust score statistics
  async getTrustStats(): Promise<{
    totalUsers: number;
    tierDistribution: Record<string, number>;
    averageScore: number;
  }> {
    const scores = await db.select().from(trustScores);

    const tierDistribution = scores.reduce((acc, score) => {
      acc[score.currentTier] = (acc[score.currentTier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + (score.scorePoints || 0), 0) / scores.length
      : 0;

    return {
      totalUsers: scores.length,
      tierDistribution,
      averageScore: Math.round(averageScore),
    };
  }
}

export const trustScoringService = new TrustScoringService();
