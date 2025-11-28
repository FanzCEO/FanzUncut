import { Router } from "express";
import { platformPrivilegesService } from "../services/platformPrivilegesService";
import { isAuthenticated } from "../middleware/auth";

const router = Router();

/**
 * Platform Privileges API Routes
 * 
 * Provides trust-tier-based privilege and limit information
 */

// Get user's current platform privileges
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const privileges = await platformPrivilegesService.getUserPrivileges(userId);
    
    res.json({
      success: true,
      privileges,
    });
  } catch (error) {
    console.error("Error fetching privileges:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch privileges",
    });
  }
});

// Check if user has access to a specific feature
router.get("/feature/:feature", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const feature = req.params.feature;
    
    const hasAccess = await platformPrivilegesService.hasFeatureAccess(
      userId,
      feature as any
    );
    
    res.json({
      success: true,
      feature,
      hasAccess,
    });
  } catch (error) {
    console.error("Error checking feature access:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check feature access",
    });
  }
});

// Check if user can perform an action
router.post("/check-action", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const action = req.body;
    
    const result = await platformPrivilegesService.canPerformAction(userId, action);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error checking action:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check action",
    });
  }
});

// Get transaction fee for user
router.get("/transaction-fee/:amount", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const amountCents = parseInt(req.params.amount);
    
    const fee = await platformPrivilegesService.getTransactionFee(userId, amountCents);
    
    res.json({
      success: true,
      amountCents,
      feeCents: fee,
      totalCents: amountCents + fee,
    });
  } catch (error) {
    console.error("Error calculating transaction fee:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate transaction fee",
    });
  }
});

// Get credit interest rate for user
router.get("/credit-rate", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const rateBps = await platformPrivilegesService.getCreditInterestRate(userId);
    
    res.json({
      success: true,
      interestRateBps: rateBps,
      interestRatePercentage: rateBps / 100,
    });
  } catch (error) {
    console.error("Error fetching credit rate:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch credit rate",
    });
  }
});

export default router;
