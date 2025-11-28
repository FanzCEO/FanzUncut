import { Express, Request, Response } from 'express';
import { fanzTrustService } from '../services/fanzTrustService';
import { fanzCard } from '../services/fanzCardService';
import { isAuthenticated } from '../middleware/auth';
import { z } from 'zod';

/**
 * FanzTrust™ Financial Ledger Routes
 * API endpoints for the comprehensive financial ecosystem
 */

export function registerFanzTrustRoutes(app: Express) {
  
  // ===== WALLET ROUTES =====
  
  /**
   * Get user's wallet
   */
  app.get('/api/fanz-trust/wallet', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const type = (req.query.type as any) || 'standard';
      
      const wallet = await fanzTrustService.getOrCreateWallet(userId, type);
      const balance = await fanzTrustService.getWalletBalance(wallet.id);
      
      res.json({
        wallet: {
          ...wallet,
          availableBalanceCents: Number(wallet.availableBalanceCents),
          pendingBalanceCents: Number(wallet.pendingBalanceCents),
          heldBalanceCents: Number(wallet.heldBalanceCents),
          totalBalanceCents: Number(wallet.totalBalanceCents),
        },
        balance,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get wallet stats
   */
  app.get('/api/fanz-trust/wallet/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const stats = await fanzTrustService.getWalletStats(userId);
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== LEDGER ROUTES =====
  
  /**
   * Get transaction history
   */
  app.get('/api/fanz-trust/transactions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const transactions = await fanzTrustService.getTransactionHistory({
        userId,
        limit,
        offset,
      });
      
      res.json({ transactions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Transfer funds
   */
  app.post('/api/fanz-trust/transfer', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const schema = z.object({
        toUserId: z.string().uuid(),
        amountCents: z.number().int().positive(),
        description: z.string().optional(),
      });
      
      const data = schema.parse(req.body);
      
      // Get sender and receiver wallets
      const fromWallet = await fanzTrustService.getOrCreateWallet(userId);
      const toWallet = await fanzTrustService.getOrCreateWallet(data.toUserId);
      
      const result = await fanzTrustService.transferFunds({
        fromUserId: userId,
        fromWalletId: fromWallet.id,
        toUserId: data.toUserId,
        toWalletId: toWallet.id,
        amountCents: data.amountCents,
        description: data.description,
      });
      
      res.json({ success: true, transfer: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== CREDIT ROUTES =====
  
  /**
   * Get user's credit lines
   */
  app.get('/api/fanz-trust/credit', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const creditLines = await fanzTrustService.getUserCreditLines(userId);
      
      res.json({ creditLines });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Apply for credit line
   */
  app.post('/api/fanz-trust/credit/apply', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const schema = z.object({
        creditLimitCents: z.number().int().positive(),
        collateralType: z.string().optional(),
        collateralValueCents: z.number().int().positive().optional(),
      });
      
      const data = schema.parse(req.body);
      
      const creditLine = await fanzTrustService.createCreditLine({
        userId,
        creditLimitCents: data.creditLimitCents,
        collateralType: data.collateralType,
        collateralValueCents: data.collateralValueCents,
      });
      
      res.json({ creditLine });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * Draw from credit line
   */
  app.post('/api/fanz-trust/credit/:id/draw', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const creditLineId = req.params.id;
      
      const schema = z.object({
        amountCents: z.number().int().positive(),
        description: z.string().optional(),
      });
      
      const data = schema.parse(req.body);
      
      const result = await fanzTrustService.drawCredit({
        creditLineId,
        userId,
        amountCents: data.amountCents,
        description: data.description,
      });
      
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== TOKEN ROUTES =====
  
  /**
   * Get user's token balances
   */
  app.get('/api/fanz-trust/tokens', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const tokenTypes: Array<'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility'> = [
        'fanzcoin', 'fanztoken', 'loyalty', 'reward', 'utility'
      ];
      
      const balances = await Promise.all(
        tokenTypes.map(async (type) => {
          const token = await fanzTrustService.getOrCreateTokenBalance(userId, type);
          return {
            ...token,
            balance: Number(token.balance),
            lockedBalance: Number(token.lockedBalance),
          };
        })
      );
      
      res.json({ tokens: balances });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Purchase tokens
   */
  app.post('/api/fanz-trust/tokens/purchase', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const schema = z.object({
        tokenType: z.enum(['fanzcoin', 'fanztoken', 'loyalty', 'reward', 'utility']),
        tokenAmount: z.number().int().positive(),
      });
      
      const data = schema.parse(req.body);
      
      const result = await fanzTrustService.purchaseTokens({
        userId,
        tokenType: data.tokenType,
        tokenAmount: data.tokenAmount,
      });
      
      res.json({ 
        success: true, 
        tokens: {
          ...result.tokens,
          balance: Number(result.tokens.balance),
          lockedBalance: Number(result.tokens.lockedBalance),
        },
        transaction: result.ledgerEntry,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== REVENUE SHARING ROUTES =====
  
  /**
   * Process revenue split
   */
  app.post('/api/fanz-trust/revenue/split', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        referenceType: z.string(),
        referenceId: z.string(),
        splitType: z.enum(['collaborative', 'affiliate', 'referral', 'platform_fee', 'royalty']),
        totalRevenueCents: z.number().int().positive(),
        splits: z.array(z.object({
          userId: z.string().uuid(),
          percentage: z.number().min(0).max(100),
        })),
      });
      
      const data = schema.parse(req.body);
      
      const revenueShare = await fanzTrustService.processRevenueShare(data);
      
      res.json({ success: true, revenueShare });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== FINANCIAL DASHBOARD DATA =====
  
  /**
   * Get comprehensive financial dashboard data
   */
  app.get('/api/fanz-trust/dashboard', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Get wallet
      const wallet = await fanzTrustService.getOrCreateWallet(userId);
      const balance = await fanzTrustService.getWalletBalance(wallet.id);
      
      // Get stats
      const stats = await fanzTrustService.getWalletStats(userId);
      
      // Get recent transactions
      const transactions = await fanzTrustService.getTransactionHistory({
        userId,
        limit: 10,
      });
      
      // Get token balances
      const tokenTypes: Array<'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility'> = [
        'fanzcoin', 'fanztoken', 'loyalty', 'reward', 'utility'
      ];
      
      const tokens = await Promise.all(
        tokenTypes.map(async (type) => {
          const token = await fanzTrustService.getOrCreateTokenBalance(userId, type);
          return {
            type,
            balance: Number(token.balance),
            lockedBalance: Number(token.lockedBalance),
            valueCentsPerToken: token.valueCentsPerToken,
          };
        })
      );
      
      // Get credit lines
      const creditLines = await fanzTrustService.getUserCreditLines(userId);
      
      // Get virtual cards
      const cardsResult = await fanzCard.getUserCards(userId);
      const cards = cardsResult.success ? cardsResult.cards : [];
      
      res.json({
        wallet: {
          ...wallet,
          availableBalanceCents: Number(wallet.availableBalanceCents),
          pendingBalanceCents: Number(wallet.pendingBalanceCents),
          heldBalanceCents: Number(wallet.heldBalanceCents),
          totalBalanceCents: Number(wallet.totalBalanceCents),
        },
        balance,
        stats,
        recentTransactions: transactions,
        tokens,
        creditLines: creditLines.map(cl => ({
          ...cl,
          creditLimitCents: Number(cl.creditLimitCents),
          balanceCents: Number(cl.balanceCents),
          availableCreditCents: Number(cl.availableCreditCents),
        })),
        cards: cards.map(card => ({
          id: card.id,
          lastFour: card.lastFour,
          status: card.status,
          nickname: card.nickname,
          perTransactionLimitCents: Number(card.perTransactionLimitCents),
          dailyLimitCents: Number(card.dailyLimitCents),
          monthlyLimitCents: Number(card.monthlyLimitCents),
          createdAt: card.createdAt,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
