import { Router, Request, Response } from 'express';
import { fanCreatorLoanService } from '../services/fanCreatorLoanService';
import { isAuthenticated } from '../middleware/auth';
import { z } from 'zod';
import { db } from '../db';
import { fanCreatorLoans, loanRepayments, users } from '@shared/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

const router = Router();

// Validation schemas
const createLoanSchema = z.object({
  borrowerId: z.string(),
  principalCents: z.number().min(100).max(10000000), // $1 - $100,000
  termDays: z.number().min(7).max(365), // 1 week to 1 year
  purpose: z.string().max(500).optional(),
  collateralType: z.enum(['content_revenue', 'future_earnings', 'token_pledge']).optional(),
  collateralValueCents: z.number().optional(),
  installmentCount: z.number().min(1).max(52).default(1),
  installmentFrequency: z.enum(['weekly', 'monthly', 'one-time']).default('one-time'),
});

const approveLoanSchema = z.object({
  loanId: z.string(),
});

const makeRepaymentSchema = z.object({
  loanId: z.string(),
  amountCents: z.number().min(1),
});

// ===== LOAN CREATION =====

// Create loan request (fan lends to creator)
router.post('/create', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    
    const validationResult = createLoanSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const data = validationResult.data;

    // Verify borrower exists and is a creator
    const [borrower] = await db
      .select()
      .from(users)
      .where(eq(users.id, data.borrowerId));

    if (!borrower) {
      return res.status(404).json({
        success: false,
        error: 'Creator not found',
      });
    }

    if (borrower.role !== 'creator') {
      return res.status(400).json({
        success: false,
        error: 'User is not a creator',
      });
    }

    // Create loan
    const loan = await fanCreatorLoanService.createLoanRequest({
      lenderId: userId, // Fan (lender)
      borrowerId: data.borrowerId, // Creator (borrower)
      principalCents: data.principalCents,
      termDays: data.termDays,
      purpose: data.purpose,
      collateralType: data.collateralType,
      collateralValueCents: data.collateralValueCents,
      installmentCount: data.installmentCount,
      installmentFrequency: data.installmentFrequency,
    });

    // Auto-approve if low risk and small amount
    const autoApprove = (
      loan.riskTier === 'low' && 
      loan.principalCents <= 50000 // $500 or less
    );

    if (autoApprove) {
      const approvedLoan = await fanCreatorLoanService.approveLoan({
        loanId: loan.id,
        approvedBy: 'auto-system',
      });

      return res.json({
        success: true,
        loan: approvedLoan,
        autoApproved: true,
        message: 'Loan auto-approved and disbursed',
      });
    }

    return res.json({
      success: true,
      loan,
      autoApproved: false,
      message: 'Loan request created, pending approval',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== LOAN APPROVAL =====

// Manually approve loan (admin or creator accepts)
router.post('/approve', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    
    const validationResult = approveLoanSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const { loanId } = validationResult.data;

    // Verify user has permission to approve
    const [loan] = await db
      .select()
      .from(fanCreatorLoans)
      .where(eq(fanCreatorLoans.id, loanId));

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found',
      });
    }

    // Only borrower (creator) or admin can approve
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (loan.borrowerId !== userId && user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to approve this loan',
      });
    }

    const approvedLoan = await fanCreatorLoanService.approveLoan({
      loanId,
      approvedBy: userId,
    });

    return res.json({
      success: true,
      loan: approvedLoan,
      message: 'Loan approved and funds disbursed',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== LOAN REPAYMENT =====

// Make loan repayment
router.post('/repay', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    
    const validationResult = makeRepaymentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const { loanId, amountCents } = validationResult.data;

    // Verify user is the borrower
    const [loan] = await db
      .select()
      .from(fanCreatorLoans)
      .where(eq(fanCreatorLoans.id, loanId));

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found',
      });
    }

    if (loan.borrowerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to repay this loan',
      });
    }

    const updatedLoan = await fanCreatorLoanService.makeRepayment({
      loanId,
      amountCents,
    });

    return res.json({
      success: true,
      loan: updatedLoan,
      message: updatedLoan.status === 'completed' 
        ? 'Loan fully repaid!' 
        : 'Payment processed successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== LOAN QUERIES =====

// Get loans where user is lender (fan's investments)
router.get('/my-loans/lent', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const loans = await db
      .select({
        loan: fanCreatorLoans,
        borrower: users,
      })
      .from(fanCreatorLoans)
      .leftJoin(users, eq(fanCreatorLoans.borrowerId, users.id))
      .where(eq(fanCreatorLoans.lenderId, userId))
      .orderBy(desc(fanCreatorLoans.createdAt));

    return res.json({
      success: true,
      loans,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get loans where user is borrower (creator's loans)
router.get('/my-loans/borrowed', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const loans = await db
      .select({
        loan: fanCreatorLoans,
        lender: users,
      })
      .from(fanCreatorLoans)
      .leftJoin(users, eq(fanCreatorLoans.lenderId, users.id))
      .where(eq(fanCreatorLoans.borrowerId, userId))
      .orderBy(desc(fanCreatorLoans.createdAt));

    return res.json({
      success: true,
      loans,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get single loan details with repayment schedule
router.get('/loans/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const loanId = req.params.id;

    const [loanData] = await db
      .select({
        loan: fanCreatorLoans,
        lender: users,
        borrower: users,
      })
      .from(fanCreatorLoans)
      .leftJoin(users, eq(fanCreatorLoans.lenderId, users.id))
      .where(eq(fanCreatorLoans.id, loanId));

    if (!loanData) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found',
      });
    }

    // Verify user is lender or borrower
    if (loanData.loan.lenderId !== userId && loanData.loan.borrowerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this loan',
      });
    }

    // Get repayment schedule
    const repayments = await db
      .select()
      .from(loanRepayments)
      .where(eq(loanRepayments.loanId, loanId))
      .orderBy(loanRepayments.installmentNumber);

    return res.json({
      success: true,
      loan: loanData.loan,
      lender: loanData.lender,
      borrower: loanData.borrower,
      repayments,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get available creators for lending (trust-scored)
router.get('/available-creators', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const creators = await db
      .select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .where(eq(users.role, 'creator'))
      .orderBy(desc(users.createdAt))
      .limit(50);

    // Calculate interest rates for each creator (using default trust score)
    const creatorsWithRates = creators.map(creator => ({
      ...creator,
      trustScore: 0, // TODO: Get from FanzTrust
      interestRateBps: fanCreatorLoanService.calculateInterestRate(0),
      riskTier: fanCreatorLoanService.getRiskTier(0),
    }));

    return res.json({
      success: true,
      creators: creatorsWithRates,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== ADMIN ROUTES =====

// Get all loans (admin only)
router.get('/admin/all-loans', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const loans = await db
      .select()
      .from(fanCreatorLoans)
      .orderBy(desc(fanCreatorLoans.createdAt))
      .limit(100);

    return res.json({
      success: true,
      loans,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as fanCreatorLoanRoutes };
