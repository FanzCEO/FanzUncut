import { Router } from "express";
import { fanzCard } from "../services/fanzCardService";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const router = Router();

/**
 * Issue a new virtual card
 * POST /api/fanz-card/issue
 */
router.post("/issue", async (req, res) => {
  try {
    const schema = z.object({
      cardholderName: z.string().min(1),
      dailySpendLimitCents: z.number().positive().optional(),
      monthlySpendLimitCents: z.number().positive().optional(),
      perTransactionLimitCents: z.number().positive().optional(),
      allowedMerchantCategories: z.array(z.string()).optional(),
      blockedMerchantCategories: z.array(z.string()).optional(),
      allowedCountries: z.array(z.string()).optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzCard.issueCard({
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
      error: error instanceof Error ? error.message : 'Failed to issue card' 
    });
  }
});

/**
 * Get user's cards
 * GET /api/fanz-card/cards
 */
router.get("/cards", async (req, res) => {
  try {
    const result = await fanzCard.getUserCards(req.user!.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch cards' 
    });
  }
});

/**
 * Get card transactions
 * GET /api/fanz-card/:cardId/transactions
 */
router.get("/:cardId/transactions", async (req, res) => {
  try {
    const { cardId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await fanzCard.getCardTransactions({
      cardId,
      userId: req.user!.id, // Add ownership check
      limit
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch transactions' 
    });
  }
});

/**
 * Freeze a card
 * POST /api/fanz-card/:cardId/freeze
 */
router.post("/:cardId/freeze", async (req, res) => {
  try {
    const { cardId } = req.params;
    const schema = z.object({
      reason: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const result = await fanzCard.freezeCard({
      cardId,
      userId: req.user!.id, // Add ownership check
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
      error: error instanceof Error ? error.message : 'Failed to freeze card' 
    });
  }
});

/**
 * Unfreeze a card
 * POST /api/fanz-card/:cardId/unfreeze
 */
router.post("/:cardId/unfreeze", async (req, res) => {
  try {
    const { cardId } = req.params;

    const result = await fanzCard.unfreezeCard({ 
      cardId,
      userId: req.user!.id // Add ownership check
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to unfreeze card' 
    });
  }
});

/**
 * Cancel a card
 * POST /api/fanz-card/:cardId/cancel
 */
router.post("/:cardId/cancel", async (req, res) => {
  try {
    const { cardId } = req.params;
    const schema = z.object({
      reason: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const result = await fanzCard.cancelCard({
      cardId,
      userId: req.user!.id, // Add ownership check
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
      error: error instanceof Error ? error.message : 'Failed to cancel card' 
    });
  }
});

/**
 * Update card limits
 * PATCH /api/fanz-card/:cardId/limits
 */
router.patch("/:cardId/limits", async (req, res) => {
  try {
    const { cardId } = req.params;
    const schema = z.object({
      dailySpendLimitCents: z.number().positive().optional(),
      monthlySpendLimitCents: z.number().positive().optional(),
      perTransactionLimitCents: z.number().positive().optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzCard.updateCardLimits({
      cardId,
      userId: req.user!.id, // Add ownership check
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
      error: error instanceof Error ? error.message : 'Failed to update limits' 
    });
  }
});

export default router;
