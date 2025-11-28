import { Router } from "express";
import { fanzCard } from "../services/fanzCardService";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const router = Router();

/**
 * Authorize a transaction (webhook endpoint for card processor)
 * POST /api/fanz-card-webhooks/authorize
 * 
 * Note: This endpoint is NOT protected by session auth since external
 * card processors need to call it. In production, implement:
 * - Webhook signature verification
 * - IP whitelist
 * - Secret key validation
 */
router.post("/authorize", async (req, res) => {
  try {
    const schema = z.object({
      cardId: z.string(),
      amountCents: z.number().positive(),
      merchantName: z.string(),
      merchantCategory: z.string().optional(),
      merchantCountry: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzCard.authorizeTransaction(validated);

    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        declineReason: result.declineReason,
      });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Authorization failed' 
    });
  }
});

/**
 * Settle a transaction (webhook endpoint for card processor)
 * POST /api/fanz-card-webhooks/settle
 * 
 * Note: This endpoint is NOT protected by session auth since external
 * card processors need to call it. In production, implement:
 * - Webhook signature verification
 * - IP whitelist
 * - Secret key validation
 */
router.post("/settle", async (req, res) => {
  try {
    const schema = z.object({
      transactionId: z.string(),
      finalAmountCents: z.number().positive().optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzCard.settleTransaction(validated);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Settlement failed' 
    });
  }
});

export default router;
