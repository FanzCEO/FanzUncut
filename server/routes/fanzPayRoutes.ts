import { Router } from 'express';
import { fanzPayService } from '../services/fanzPayService';
import { isAuthenticated } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ===== DEPOSIT ENDPOINTS =====

/**
 * POST /api/fanz-pay/deposit
 * Process instant deposit - External payment → FanzWallet
 */
router.post('/deposit', isAuthenticated, async (req, res) => {
  try {
    const schema = z.object({
      amountCents: z.number().int().positive(),
      currency: z.string().default('USD'),
      paymentProvider: z.string(),
      paymentMethod: z.object({
        type: z.enum(['card', 'crypto', 'bank']),
        data: z.any(),
      }),
      metadata: z.record(z.any()).optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzPayService.processDeposit({
      userId: req.user!.id,
      amountCents: validated.amountCents,
      currency: validated.currency,
      paymentProvider: validated.paymentProvider,
      paymentMethod: {
        type: validated.paymentMethod.type,
        data: validated.paymentMethod.data || {},
      },
      metadata: validated.metadata,
    });

    if (result.success) {
      res.json({
        success: true,
        transactionId: result.transactionId,
        walletId: result.walletId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Deposit endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Deposit failed',
    });
  }
});

// ===== WITHDRAWAL ENDPOINTS =====

/**
 * POST /api/fanz-pay/withdrawal
 * Process instant withdrawal - FanzWallet → External payout
 */
router.post('/withdrawal', isAuthenticated, async (req, res) => {
  try {
    const schema = z.object({
      amountCents: z.number().int().positive(),
      currency: z.string().default('USD'),
      payoutProvider: z.string(),
      destination: z.object({
        type: z.enum(['bank', 'ewallet', 'crypto', 'check']),
        email: z.string().email().optional(),
        accountNumber: z.string().optional(),
        routingNumber: z.string().optional(),
        cryptoAddress: z.string().optional(),
      }),
      metadata: z.record(z.any()).optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzPayService.processWithdrawal({
      userId: req.user!.id,
      ...validated,
    });

    if (result.success) {
      res.json({
        success: true,
        transactionId: result.transactionId,
        payoutId: result.payoutId,
        estimatedArrival: result.estimatedArrival,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Withdrawal endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Withdrawal failed',
    });
  }
});

// ===== INSTANT TRANSFER ENDPOINTS =====

/**
 * POST /api/fanz-pay/transfer
 * Instant P2P transfer between FanzWallets
 */
router.post('/transfer', isAuthenticated, async (req, res) => {
  try {
    const schema = z.object({
      toUserId: z.string(),
      amountCents: z.number().int().positive(),
      currency: z.string().default('USD'),
      description: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const validated = schema.parse(req.body);

    const result = await fanzPayService.instantTransfer({
      fromUserId: req.user!.id,
      ...validated,
    });

    if (result.success) {
      res.json({
        success: true,
        transactionId: result.transactionId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Transfer endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transfer failed',
    });
  }
});

// ===== PROVIDER LISTING ENDPOINTS =====

/**
 * GET /api/fanz-pay/providers/deposit
 * Get available payment providers for deposits
 */
router.get('/providers/deposit', isAuthenticated, async (req, res) => {
  try {
    const providers = await fanzPayService.getDepositProviders();
    res.json({ success: true, providers });
  } catch (error) {
    console.error('Get deposit providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deposit providers',
    });
  }
});

/**
 * GET /api/fanz-pay/providers/withdrawal
 * Get available payout providers for withdrawals
 */
router.get('/providers/withdrawal', isAuthenticated, async (req, res) => {
  try {
    const providers = await fanzPayService.getWithdrawalProviders();
    res.json({ success: true, providers });
  } catch (error) {
    console.error('Get withdrawal providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal providers',
    });
  }
});

// ===== ANALYTICS ENDPOINTS =====

/**
 * GET /api/fanz-pay/stats
 * Get payment processing statistics
 */
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const stats = await fanzPayService.getPaymentStats(req.user!.id);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment stats',
    });
  }
});

export default router;
