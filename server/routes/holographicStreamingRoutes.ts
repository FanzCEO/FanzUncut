import { Router, Request, Response } from 'express';
import { holographicStreamingService } from '../services/holographicStreamingService';
import { isAuthenticated, requireCreator } from '../middleware/auth';

const router = Router();

/**
 * Enable holographic mode for a live stream (creators only)
 * POST /api/holographic/enable
 */
router.post('/enable', isAuthenticated, requireCreator, async (req: Request, res: Response) => {
  try {
    const { liveStreamId, mode, quality, environmentPreset, maxConcurrentViewers } = req.body;
    
    if (!liveStreamId) {
      return res.status(400).json({
        success: false,
        message: 'Live stream ID is required',
      });
    }

    const result = await holographicStreamingService.createHolographicStream({
      liveStreamId,
      mode,
      quality,
      environmentPreset,
      maxConcurrentViewers,
    });

    return res.json({
      success: true,
      message: 'Holographic mode enabled',
      stream: result,
    });
  } catch (error: any) {
    console.error('Enable holographic mode error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to enable holographic mode',
    });
  }
});

/**
 * Join a holographic stream session
 * POST /api/holographic/join
 */
router.post('/join', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { holographicStreamId, deviceType, browserAgent, webxrMode } = req.body;
    
    if (!holographicStreamId) {
      return res.status(400).json({
        success: false,
        message: 'Holographic stream ID is required',
      });
    }

    const result = await holographicStreamingService.joinHolographicSession({
      holographicStreamId,
      userId: req.user!.id,
      deviceType,
      browserAgent,
      webxrMode,
    });

    return res.json({
      success: true,
      message: 'Joined holographic session',
      ...result,
    });
  } catch (error: any) {
    console.error('Join holographic session error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to join holographic session',
    });
  }
});

/**
 * Update avatar position in holographic space
 * POST /api/holographic/avatar/position
 */
router.post('/avatar/position', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { sessionId, position, rotation, viewDirection } = req.body;
    
    if (!sessionId || !position) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and position are required',
      });
    }

    const result = await holographicStreamingService.updateAvatarPosition({
      sessionId,
      position,
      rotation,
      viewDirection,
    });

    return res.json({
      success: true,
      session: result,
    });
  } catch (error: any) {
    console.error('Update avatar position error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update avatar position',
    });
  }
});

/**
 * Leave holographic session
 * POST /api/holographic/leave/:sessionId
 */
router.post('/leave/:sessionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const result = await holographicStreamingService.leaveHolographicSession(sessionId);

    return res.json({
      success: true,
      message: 'Left holographic session',
      session: result,
    });
  } catch (error: any) {
    console.error('Leave holographic session error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to leave holographic session',
    });
  }
});

/**
 * Get active sessions for a holographic stream
 * GET /api/holographic/sessions/:holographicStreamId
 */
router.get('/sessions/:holographicStreamId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { holographicStreamId } = req.params;
    
    const sessions = await holographicStreamingService.getActiveSessions(holographicStreamId);

    return res.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('Get active sessions error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active sessions',
    });
  }
});

/**
 * Create or update user's avatar
 * POST /api/holographic/avatar
 */
router.post('/avatar', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { modelType, modelUrl, colorScheme } = req.body;
    
    const result = await holographicStreamingService.upsertAvatar({
      userId: req.user!.id,
      modelType,
      modelUrl,
      colorScheme,
    });

    return res.json({
      success: true,
      message: 'Avatar updated',
      avatar: result,
    });
  } catch (error: any) {
    console.error('Update avatar error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update avatar',
    });
  }
});

/**
 * Get user's avatar
 * GET /api/holographic/avatar/:userId
 */
router.get('/avatar/:userId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const avatar = await holographicStreamingService.getAvatar(userId);

    return res.json({
      success: true,
      avatar,
    });
  } catch (error: any) {
    console.error('Get avatar error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get avatar',
    });
  }
});

/**
 * Get holographic stream details
 * GET /api/holographic/stream/:liveStreamId
 */
router.get('/stream/:liveStreamId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { liveStreamId } = req.params;
    
    const stream = await holographicStreamingService.getHolographicStream(liveStreamId);

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'Holographic stream not found',
      });
    }

    return res.json({
      success: true,
      stream,
    });
  } catch (error: any) {
    console.error('Get holographic stream error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get holographic stream',
    });
  }
});

/**
 * Update session performance metrics
 * POST /api/holographic/metrics
 */
router.post('/metrics', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { sessionId, frameRate, latencyMs } = req.body;
    
    if (!sessionId || frameRate === undefined || latencyMs === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, frame rate, and latency are required',
      });
    }

    await holographicStreamingService.updateSessionMetrics(sessionId, frameRate, latencyMs);

    return res.json({
      success: true,
      message: 'Metrics updated',
    });
  } catch (error: any) {
    console.error('Update metrics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update metrics',
    });
  }
});

/**
 * Update tracking state (hands/eyes)
 * POST /api/holographic/tracking
 */
router.post('/tracking', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { sessionId, handsTracked, eyeGazeTracked, gestureData } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const result = await holographicStreamingService.updateTrackingState(
      sessionId,
      handsTracked || false,
      eyeGazeTracked || false,
      gestureData
    );

    return res.json({
      success: true,
      session: result,
    });
  } catch (error: any) {
    console.error('Update tracking state error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update tracking state',
    });
  }
});

export { router as holographicStreamingRoutes };
