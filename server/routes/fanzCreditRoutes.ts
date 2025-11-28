import { Router } from "express";
import { FanzCreditService } from "../services/fanzCreditService";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const router = Router();
const fanzCredit = new FanzCreditService();

/**
 * Apply for a credit line
 * POST /api/fanz-credit/apply
 */
router.post("/apply", async (req, res) => {
  try {
    const schema = z.object({
      requestedCreditCents: z.number().positive(),
      collateralType: z.enum(['fan_stake', 'creator_revenue', 'token_pledge']).optional(),
      collateralValueCents: z.number().positive().optional(),
      collateralMetadata: z.any().optional(),
    });

    const validated = schema.parse(req.body);

    const creditLine = await fanzCredit.applyForCreditLine({
      userId: req.user!.id,
      ...validated,
    });

    res.json(creditLine);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to apply for credit line' 
    });
  }
});

/**
 * Draw from credit line
 * POST /api/fanz-credit/:creditLineId/draw
 */
router.post("/:creditLineId/draw", async (req, res) => {
  try {
    const schema = z.object({
      amountCents: z.number().positive(),
      purpose: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzCredit.drawCredit({
      creditLineId: req.params.creditLineId,
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
      error: error instanceof Error ? error.message : 'Failed to draw credit' 
    });
  }
});

/**
 * Repay credit line
 * POST /api/fanz-credit/:creditLineId/repay
 */
router.post("/:creditLineId/repay", async (req, res) => {
  try {
    const schema = z.object({
      amountCents: z.number().positive(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzCredit.repayCredit({
      creditLineId: req.params.creditLineId,
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
      error: error instanceof Error ? error.message : 'Failed to repay credit' 
    });
  }
});

/**
 * Get all credit lines for user
 * GET /api/fanz-credit/lines
 */
router.get("/lines", async (req, res) => {
  try {
    const creditLines = await fanzCredit.getCreditLines(req.user!.id);
    res.json(creditLines);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch credit lines' 
    });
  }
});

/**
 * Get specific credit line
 * GET /api/fanz-credit/:creditLineId
 */
router.get("/:creditLineId", async (req, res) => {
  try {
    const creditLine = await fanzCredit.getCreditLine(
      req.params.creditLineId,
      req.user!.id
    );

    if (!creditLine) {
      return res.status(404).json({ error: 'Credit line not found' });
    }

    res.json(creditLine);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch credit line' 
    });
  }
});

/**
 * Freeze credit line
 * POST /api/fanz-credit/:creditLineId/freeze
 */
router.post("/:creditLineId/freeze", async (req, res) => {
  try {
    const schema = z.object({
      reason: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    await fanzCredit.freezeCreditLine(
      req.params.creditLineId,
      req.user!.id,
      validated.reason
    );

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to freeze credit line' 
    });
  }
});

/**
 * Close credit line
 * POST /api/fanz-credit/:creditLineId/close
 */
router.post("/:creditLineId/close", async (req, res) => {
  try {
    const schema = z.object({
      reason: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    await fanzCredit.closeCreditLine(
      req.params.creditLineId,
      req.user!.id,
      validated.reason
    );

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to close credit line' 
    });
  }
});

/**
 * Calculate trust score
 * GET /api/fanz-credit/trust-score
 */
router.get("/trust-score", async (req, res) => {
  try {
    const fanzCreditService = new FanzCreditService();
    const trustScore = await fanzCreditService.calculateTrustScore(req.user!.id);
    
    res.json({ 
      trustScore,
      maxScore: 1000,
      tier: trustScore >= 750 ? 'low' : trustScore >= 500 ? 'standard' : 'high',
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to calculate trust score' 
    });
  }
});

export default router;
