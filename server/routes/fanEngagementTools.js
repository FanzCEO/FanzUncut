// FANZ Fan Engagement Tools API Routes

import express from 'express';
import FanEngagementToolsService from '../services/fanEngagementTools.js';

const router = express.Router();
const engagementService = new FanEngagementToolsService();

// === Fan Level Routes ===

/**
 * @route   POST /api/fan-engagement/levels/configure
 * @desc    Configure fan levels for a creator
 * @access  Private (Creator only)
 * @body    { creatorId, levels: [{ id, name, requirements, benefits, badge, color }] }
 */
router.post('/levels/configure', async (req, res) => {
  try {
    const { creatorId, levels, rules } = req.body;
    
    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID is required',
        code: 'MISSING_CREATOR_ID'
      });
    }

    console.log(`🏆 Configuring fan levels for creator ${creatorId}...`);
    const config = await engagementService.configureLevels(creatorId, { levels, rules });

    res.status(201).json({
      success: true,
      data: {
        config: {
          levels: config.levels,
          rules: config.rules,
          count: config.levels.length
        }
      },
      message: 'Fan levels configured successfully'
    });

  } catch (error) {
    console.error('❌ Error configuring fan levels:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to configure fan levels',
      code: 'LEVELS_CONFIG_ERROR'
    });
  }
});

// === Badge Routes ===

/**
 * @route   POST /api/fan-engagement/badges/designs
 * @desc    Set badge designs for a creator
 * @access  Private (Creator only)
 * @body    { creatorId, designs: [{ name, icon, description, rarity }] }
 */
router.post('/badges/designs', async (req, res) => {
  try {
    const { creatorId, designs } = req.body;
    
    if (!creatorId || !designs) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID and designs are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    console.log(`🏅 Setting badge designs for creator ${creatorId}...`);
    const badgeDesigns = await engagementService.setBadgeDesigns(creatorId, designs);

    res.status(201).json({
      success: true,
      data: {
        designs: badgeDesigns,
        count: badgeDesigns.length
      },
      message: 'Badge designs set successfully'
    });

  } catch (error) {
    console.error('❌ Error setting badge designs:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to set badge designs',
      code: 'BADGE_DESIGNS_ERROR'
    });
  }
});

/**
 * @route   POST /api/fan-engagement/badges/assign
 * @desc    Assign badge to a fan
 * @access  Private (Creator only)
 * @body    { creatorId, fanId, badgeName }
 */
router.post('/badges/assign', async (req, res) => {
  try {
    const { creatorId, fanId, badgeName } = req.body;
    
    if (!creatorId || !fanId || !badgeName) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID, fan ID, and badge name are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    console.log(`🏅 Assigning badge '${badgeName}' to fan ${fanId} for creator ${creatorId}...`);
    const badges = await engagementService.assignBadge(creatorId, fanId, badgeName);

    res.json({
      success: true,
      data: {
        fanId,
        badgeName,
        allBadges: badges
      },
      message: 'Badge assigned successfully'
    });

  } catch (error) {
    console.error('❌ Error assigning badge:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to assign badge',
      code: 'BADGE_ASSIGN_ERROR'
    });
  }
});

/**
 * @route   GET /api/fan-engagement/badges/:creatorId/:fanId
 * @desc    Get all badges for a fan
 * @access  Private
 */
router.get('/badges/:creatorId/:fanId', async (req, res) => {
  try {
    const { creatorId, fanId } = req.params;
    
    console.log(`🔍 Getting badges for fan ${fanId} of creator ${creatorId}...`);
    const badges = await engagementService.getBadges(creatorId, fanId);

    res.json({
      success: true,
      data: {
        fanId,
        badges,
        count: badges.length
      },
      message: 'Badges retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting badges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get badges',
      code: 'BADGES_RETRIEVAL_ERROR'
    });
  }
});

// === Exclusive Access Routes ===

/**
 * @route   POST /api/fan-engagement/exclusive/grant
 * @desc    Grant exclusive content access to a fan
 * @access  Private (Creator only)
 * @body    { creatorId, fanId, tier }
 */
router.post('/exclusive/grant', async (req, res) => {
  try {
    const { creatorId, fanId, tier } = req.body;
    
    if (!creatorId || !fanId || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID, fan ID, and tier are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    console.log(`🔐 Granting exclusive access tier '${tier}' to fan ${fanId} for creator ${creatorId}...`);
    const accessTiers = await engagementService.grantExclusiveAccess(creatorId, fanId, tier);

    res.json({
      success: true,
      data: {
        fanId,
        tier,
        allTiers: accessTiers
      },
      message: 'Exclusive access granted successfully'
    });

  } catch (error) {
    console.error('❌ Error granting exclusive access:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to grant exclusive access',
      code: 'EXCLUSIVE_ACCESS_ERROR'
    });
  }
});

/**
 * @route   GET /api/fan-engagement/exclusive/:creatorId/:fanId
 * @desc    Get exclusive access tiers for a fan
 * @access  Private
 */
router.get('/exclusive/:creatorId/:fanId', async (req, res) => {
  try {
    const { creatorId, fanId } = req.params;
    
    console.log(`🔍 Getting exclusive access for fan ${fanId} of creator ${creatorId}...`);
    const tiers = await engagementService.getExclusiveAccess(creatorId, fanId);

    res.json({
      success: true,
      data: {
        fanId,
        tiers,
        count: tiers.length
      },
      message: 'Exclusive access retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting exclusive access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exclusive access',
      code: 'EXCLUSIVE_ACCESS_RETRIEVAL_ERROR'
    });
  }
});

// === Personalized Greetings Routes ===

/**
 * @route   POST /api/fan-engagement/greetings/set
 * @desc    Set personalized greeting for a fan
 * @access  Private (Creator only)
 * @body    { creatorId, fanId, message }
 */
router.post('/greetings/set', async (req, res) => {
  try {
    const { creatorId, fanId, message } = req.body;
    
    if (!creatorId || !fanId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID, fan ID, and message are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    console.log(`💬 Setting personalized greeting for fan ${fanId} of creator ${creatorId}...`);
    const greeting = await engagementService.setPersonalizedGreeting(creatorId, fanId, message);

    res.json({
      success: true,
      data: greeting,
      message: 'Personalized greeting set successfully'
    });

  } catch (error) {
    console.error('❌ Error setting personalized greeting:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to set personalized greeting',
      code: 'GREETING_SET_ERROR'
    });
  }
});

/**
 * @route   GET /api/fan-engagement/greetings/:creatorId/:fanId
 * @desc    Get personalized greeting for a fan
 * @access  Private
 */
router.get('/greetings/:creatorId/:fanId', async (req, res) => {
  try {
    const { creatorId, fanId } = req.params;
    
    console.log(`🔍 Getting personalized greeting for fan ${fanId} of creator ${creatorId}...`);
    const greeting = await engagementService.getPersonalizedGreeting(creatorId, fanId);

    res.json({
      success: true,
      data: {
        fanId,
        greeting
      },
      message: greeting ? 'Personalized greeting retrieved successfully' : 'No personalized greeting found'
    });

  } catch (error) {
    console.error('❌ Error getting personalized greeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get personalized greeting',
      code: 'GREETING_RETRIEVAL_ERROR'
    });
  }
});

// === Custom Tip Messages Routes ===

/**
 * @route   POST /api/fan-engagement/tip-messages/configure
 * @desc    Configure custom tip message settings for a creator
 * @access  Private (Creator only)
 * @body    { creatorId, enabled, maxLength, moderationRequired }
 */
router.post('/tip-messages/configure', async (req, res) => {
  try {
    const { creatorId, enabled, maxLength, moderationRequired } = req.body;
    
    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID is required',
        code: 'MISSING_CREATOR_ID'
      });
    }

    console.log(`💰 Configuring tip messages for creator ${creatorId}...`);
    const config = await engagementService.configureTipMessages(creatorId, { enabled, maxLength, moderationRequired });

    res.json({
      success: true,
      data: { config },
      message: 'Tip message configuration updated successfully'
    });

  } catch (error) {
    console.error('❌ Error configuring tip messages:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to configure tip messages',
      code: 'TIP_MESSAGE_CONFIG_ERROR'
    });
  }
});

/**
 * @route   POST /api/fan-engagement/tip-messages/process
 * @desc    Process a custom tip message from a fan
 * @access  Private
 * @body    { creatorId, fanId, message }
 */
router.post('/tip-messages/process', async (req, res) => {
  try {
    const { creatorId, fanId, message } = req.body;
    
    if (!creatorId || !fanId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID, fan ID, and message are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    console.log(`💬 Processing tip message from fan ${fanId} to creator ${creatorId}...`);
    const result = await engagementService.processCustomTipMessage(creatorId, fanId, message);

    res.json({
      success: true,
      data: {
        fanId,
        messageLength: message.length,
        accepted: result.accepted,
        moderated: result.moderated
      },
      message: 'Tip message processed successfully'
    });

  } catch (error) {
    console.error('❌ Error processing tip message:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process tip message',
      code: 'TIP_MESSAGE_PROCESS_ERROR'
    });
  }
});

// === Engagement Profile Routes ===

/**
 * @route   GET /api/fan-engagement/profile/:creatorId/:fanId
 * @desc    Get complete engagement profile for a fan
 * @access  Private
 */
router.get('/profile/:creatorId/:fanId', async (req, res) => {
  try {
    const { creatorId, fanId } = req.params;
    
    console.log(`👤 Getting engagement profile for fan ${fanId} of creator ${creatorId}...`);
    const profile = await engagementService.getEngagementProfile(creatorId, fanId);

    res.json({
      success: true,
      data: { profile },
      message: 'Engagement profile retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting engagement profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement profile',
      code: 'PROFILE_RETRIEVAL_ERROR'
    });
  }
});

// === System Health ===

/**
 * @route   GET /api/fan-engagement/system/health
 * @desc    Get fan engagement system health status
 * @access  Private
 */
router.get('/system/health', async (req, res) => {
  try {
    const health = {
      levelConfigs: engagementService.levelConfigs.size,
      badgeDesigns: engagementService.badgeDesigns.size,
      badges: engagementService.badges.size,
      exclusiveAccess: engagementService.exclusiveAccess.size,
      greetings: engagementService.greetings.size,
      tipMessageRules: engagementService.tipMessageRules.size,
      auditLogs: engagementService.auditLog.size,
      status: 'HEALTHY',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { health },
      message: 'Fan engagement system is healthy'
    });

  } catch (error) {
    console.error('❌ Error getting system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health',
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

export default router;