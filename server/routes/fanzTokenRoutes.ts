import { Router } from "express";
import { FanzTokenService } from "../services/fanzTokenService";
import { requireAdmin } from "../middleware/auth";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const router = Router();
const fanzToken = new FanzTokenService();

// Helper to validate user exists
async function validateUserExists(userId: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return !!user;
}

// Token type validation
const tokenTypeSchema = z.enum(['fanzcoin', 'fanztoken', 'loyalty', 'reward', 'utility']);

/**
 * Get all token accounts for user
 * GET /api/fanz-token/accounts
 */
router.get("/accounts", async (req, res) => {
  try {
    const accounts = await fanzToken.getUserTokenAccounts(req.user!.id);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch token accounts' 
    });
  }
});

/**
 * Get specific token balance
 * GET /api/fanz-token/balance/:tokenType
 */
router.get("/balance/:tokenType", async (req, res) => {
  try {
    const tokenType = tokenTypeSchema.parse(req.params.tokenType);
    const balance = await fanzToken.getTokenBalance(req.user!.id, tokenType);
    res.json(balance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch token balance' 
    });
  }
});

/**
 * Mint tokens (admin/system use only)
 * POST /api/fanz-token/mint
 */
router.post("/mint", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string(),
      tokenType: tokenTypeSchema,
      amount: z.number().positive(),
      reason: z.string(),
      expiresAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
    });

    const validated = schema.parse(req.body);

    // Validate user exists
    if (!(await validateUserExists(validated.userId))) {
      return res.status(404).json({ error: `User not found: ${validated.userId}` });
    }

    const result = await fanzToken.mintTokens(validated);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Audit log: Admin minted tokens
    console.log(`🔐 Admin ${req.user!.id} minted ${validated.amount} ${validated.tokenType} for user ${validated.userId} - ${validated.reason}`);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to mint tokens' 
    });
  }
});

/**
 * Burn tokens
 * POST /api/fanz-token/burn
 */
router.post("/burn", async (req, res) => {
  try {
    const schema = z.object({
      tokenType: tokenTypeSchema,
      amount: z.number().positive(),
      reason: z.string(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzToken.burnTokens({
      userId: req.user!.id,
      ...validated,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to burn tokens' 
    });
  }
});

/**
 * Transfer tokens to another user
 * POST /api/fanz-token/transfer
 */
router.post("/transfer", async (req, res) => {
  try {
    const schema = z.object({
      toUserId: z.string(),
      tokenType: tokenTypeSchema,
      amount: z.number().positive(),
      memo: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzToken.transferTokens({
      fromUserId: req.user!.id,
      ...validated,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to transfer tokens' 
    });
  }
});

/**
 * Lock tokens (for staking, escrow, etc.)
 * POST /api/fanz-token/lock
 */
router.post("/lock", async (req, res) => {
  try {
    const schema = z.object({
      tokenType: tokenTypeSchema,
      amount: z.number().positive(),
      reason: z.string(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzToken.lockTokens({
      userId: req.user!.id,
      ...validated,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to lock tokens' 
    });
  }
});

/**
 * Unlock tokens
 * POST /api/fanz-token/unlock
 */
router.post("/unlock", async (req, res) => {
  try {
    const schema = z.object({
      tokenType: tokenTypeSchema,
      amount: z.number().positive(),
      reason: z.string(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzToken.unlockTokens({
      userId: req.user!.id,
      ...validated,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to unlock tokens' 
    });
  }
});

/**
 * Convert tokens to fiat (credit FanzWallet)
 * POST /api/fanz-token/convert-to-fiat
 */
router.post("/convert-to-fiat", async (req, res) => {
  try {
    const schema = z.object({
      tokenType: tokenTypeSchema,
      tokenAmount: z.number().positive(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzToken.convertTokensToFiat({
      userId: req.user!.id,
      ...validated,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to convert tokens to fiat' 
    });
  }
});

/**
 * Convert fiat to tokens (purchase tokens)
 * POST /api/fanz-token/convert-to-tokens
 */
router.post("/convert-to-tokens", async (req, res) => {
  try {
    const schema = z.object({
      tokenType: tokenTypeSchema,
      fiatAmountCents: z.number().positive(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzToken.convertFiatToTokens({
      userId: req.user!.id,
      ...validated,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to convert fiat to tokens' 
    });
  }
});

/**
 * Award loyalty tokens (admin/system only)
 * POST /api/fanz-token/award-loyalty
 */
router.post("/award-loyalty", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string(),
      amount: z.number().positive(),
      reason: z.string(),
      activityType: z.string(),
    });

    const validated = schema.parse(req.body);

    // Validate user exists
    if (!(await validateUserExists(validated.userId))) {
      return res.status(404).json({ error: `User not found: ${validated.userId}` });
    }

    const result = await fanzToken.awardLoyaltyTokens(validated);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Audit log: Admin awarded loyalty tokens
    console.log(`🔐 Admin ${req.user!.id} awarded ${validated.amount} loyalty tokens to user ${validated.userId} - ${validated.activityType}: ${validated.reason}`);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to award loyalty tokens' 
    });
  }
});

/**
 * Award reward tokens (admin/system only)
 * POST /api/fanz-token/award-reward
 */
router.post("/award-reward", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string(),
      amount: z.number().positive(),
      achievementId: z.string(),
      achievementName: z.string(),
    });

    const validated = schema.parse(req.body);

    // Validate user exists
    if (!(await validateUserExists(validated.userId))) {
      return res.status(404).json({ error: `User not found: ${validated.userId}` });
    }

    const result = await fanzToken.awardRewardTokens(validated);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Audit log: Admin awarded reward tokens
    console.log(`🔐 Admin ${req.user!.id} awarded ${validated.amount} reward tokens to user ${validated.userId} - ${validated.achievementName} (${validated.achievementId})`);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to award reward tokens' 
    });
  }
});

export default router;
