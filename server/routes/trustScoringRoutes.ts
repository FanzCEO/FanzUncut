import { Router } from "express";
import { trustScoringService } from "../services/trustScoringService";
import { insertTrustProofSchema, insertDisputeCaseSchema } from "@shared/schema";
import { isAuthenticated, requireAdmin } from "../middleware/auth";

const router = Router();

// Get user's trust score
router.get("/score", isAuthenticated, async (req, res, next) => {
  try {
    const score = await trustScoringService.getOrCreateTrustScore(req.user!.id);
    res.json(score);
  } catch (error) {
    next(error);
  }
});

// Recalculate user's trust score
router.post("/score/recalculate", isAuthenticated, async (req, res, next) => {
  try {
    const score = await trustScoringService.calculateTrustScore(req.user!.id);
    res.json(score);
  } catch (error) {
    next(error);
  }
});

// Submit proof for verification
router.post("/proofs", isAuthenticated, async (req, res, next) => {
  try {
    const validated = insertTrustProofSchema.parse(req.body);
    const proof = await trustScoringService.submitProof(req.user!.id, validated);
    res.status(201).json(proof);
  } catch (error) {
    next(error);
  }
});

// Get user's proofs
router.get("/proofs", isAuthenticated, async (req, res, next) => {
  try {
    const proofs = await trustScoringService.getUserProofs(req.user!.id);
    res.json(proofs);
  } catch (error) {
    next(error);
  }
});

// Get pending proofs for review (admin only)
router.get("/proofs/pending", isAuthenticated, requireAdmin, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const proofs = await trustScoringService.getPendingProofs(limit);
    res.json(proofs);
  } catch (error) {
    next(error);
  }
});

// Verify proof (admin only)
router.put("/proofs/:id/verify", isAuthenticated, requireAdmin, async (req, res, next) => {
  try {
    const { approved, rejectionReason } = req.body;
    const proof = await trustScoringService.verifyProof(
      req.params.id,
      req.user!.id,
      approved,
      rejectionReason
    );
    res.json(proof);
  } catch (error) {
    next(error);
  }
});

// File a dispute
router.post("/disputes", isAuthenticated, async (req, res, next) => {
  try {
    const validated = insertDisputeCaseSchema.parse(req.body);
    const dispute = await trustScoringService.fileDispute(req.user!.id, validated);
    res.status(201).json(dispute);
  } catch (error) {
    next(error);
  }
});

// Get user's disputes
router.get("/disputes", isAuthenticated, async (req, res, next) => {
  try {
    const disputes = await trustScoringService.getUserDisputes(req.user!.id);
    res.json(disputes);
  } catch (error) {
    next(error);
  }
});

// Get open disputes (admin only)
router.get("/disputes/open", isAuthenticated, requireAdmin, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const disputes = await trustScoringService.getOpenDisputes(limit);
    res.json(disputes);
  } catch (error) {
    next(error);
  }
});

// Resolve dispute (admin only)
router.put("/disputes/:id/resolve", isAuthenticated, requireAdmin, async (req, res, next) => {
  try {
    const { resolution, rulingInFavorOf, compensationCents } = req.body;
    const dispute = await trustScoringService.resolveDispute(
      req.params.id,
      req.user!.id,
      resolution,
      rulingInFavorOf,
      compensationCents
    );
    res.json(dispute);
  } catch (error) {
    next(error);
  }
});

// Get trust statistics (admin only)
router.get("/stats", isAuthenticated, requireAdmin, async (req, res, next) => {
  try {
    const stats = await trustScoringService.getTrustStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export { router as trustScoringRoutes };
