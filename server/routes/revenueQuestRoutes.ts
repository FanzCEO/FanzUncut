import { Router } from "express";
import { revenueQuestService } from "../services/revenueQuestService";
import { insertRevenueQuestSchema, insertQuestMilestoneSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all active quests (discovery feed)
router.get("/quests/active", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const quests = await revenueQuestService.getActiveQuests(limit);
    res.json(quests);
  } catch (error) {
    next(error);
  }
});

// Get creator's quests
router.get("/quests/creator/:creatorId", async (req, res, next) => {
  try {
    const { creatorId } = req.params;
    const status = req.query.status as string | undefined;
    const quests = await revenueQuestService.getCreatorQuests(creatorId, status);
    res.json(quests);
  } catch (error) {
    next(error);
  }
});

// Get user's my quests (created by them)
router.get("/quests/my-quests", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const status = req.query.status as string | undefined;
    const quests = await revenueQuestService.getCreatorQuests(req.user.id, status);
    res.json(quests);
  } catch (error) {
    next(error);
  }
});

// Get user's quest participation
router.get("/quests/my-participation", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const participation = await revenueQuestService.getUserQuestParticipation(req.user.id);
    res.json(participation);
  } catch (error) {
    next(error);
  }
});

// Get quest by ID
router.get("/quests/:questId", async (req, res, next) => {
  try {
    const { questId } = req.params;
    const quest = await revenueQuestService.getQuestById(questId);
    
    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }
    
    res.json(quest);
  } catch (error) {
    next(error);
  }
});

// Create a new quest
router.post("/quests", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = insertRevenueQuestSchema.parse({
      ...req.body,
      creatorId: req.user.id, // Always use authenticated user's ID
    });

    const quest = await revenueQuestService.createQuest(data);
    res.status(201).json(quest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    next(error);
  }
});

// Get AI quest suggestion
router.get("/quests/ai-suggestion", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const suggestion = await revenueQuestService.getAIQuestSuggestion(req.user.id);
    res.json(suggestion);
  } catch (error) {
    next(error);
  }
});

// Update quest
router.patch("/quests/:questId", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { questId } = req.params;
    
    // Verify ownership
    const quest = await revenueQuestService.getQuestById(questId);
    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }
    if (quest.creatorId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to update this quest" });
    }

    const updates = req.body;
    const updated = await revenueQuestService.updateQuest(questId, updates);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Contribute to quest
router.post("/quests/:questId/contribute", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { questId } = req.params;
    const { amountCents } = req.body;

    if (!amountCents || amountCents <= 0) {
      return res.status(400).json({ error: "Invalid contribution amount" });
    }

    const participant = await revenueQuestService.contributeToQuest(
      questId,
      req.user.id,
      amountCents
    );

    res.json(participant);
  } catch (error) {
    next(error);
  }
});

// Get quest participants
router.get("/quests/:questId/participants", async (req, res, next) => {
  try {
    const { questId } = req.params;
    const participants = await revenueQuestService.getQuestParticipants(questId);
    res.json(participants);
  } catch (error) {
    next(error);
  }
});

// Get quest milestones
router.get("/quests/:questId/milestones", async (req, res, next) => {
  try {
    const { questId } = req.params;
    const milestones = await revenueQuestService.getQuestMilestones(questId);
    res.json(milestones);
  } catch (error) {
    next(error);
  }
});

// Add milestone to quest
router.post("/quests/:questId/milestones", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { questId } = req.params;
    
    // Verify ownership
    const quest = await revenueQuestService.getQuestById(questId);
    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }
    if (quest.creatorId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to add milestone to this quest" });
    }

    const data = insertQuestMilestoneSchema.parse({
      ...req.body,
      questId,
    });

    const milestone = await revenueQuestService.addMilestone(data);
    res.status(201).json(milestone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    next(error);
  }
});

export default router;
