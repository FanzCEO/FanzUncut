import { Router, Request, Response } from 'express';
import { deepfakeDetectionService } from '../services/deepfakeDetectionService';
import { isAuthenticated, requireCreator, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Register verified content (creators only)
 * POST /api/deepfake/register-content
 */
router.post('/register-content', isAuthenticated, requireCreator, async (req: Request, res: Response) => {
  try {
    const { mediaUrl, mediaType, metadata } = req.body;
    
    if (!mediaUrl || !mediaType) {
      return res.status(400).json({
        success: false,
        message: 'Media URL and type are required',
      });
    }

    const result = await deepfakeDetectionService.registerVerifiedContent(
      req.user!.id,
      mediaUrl,
      mediaType,
      metadata
    );

    return res.json({
      success: true,
      message: 'Content registered as verified',
      content: result,
    });
  } catch (error: any) {
    console.error('Register verified content error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register verified content',
    });
  }
});

/**
 * Verify content for deepfakes
 * POST /api/deepfake/verify
 */
router.post('/verify', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { contentUrl, contentType, creatorId } = req.body;
    
    if (!contentUrl || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content URL and type are required',
      });
    }

    const result = await deepfakeDetectionService.verifyContent({
      contentUrl,
      contentType,
      creatorId,
      reportedBy: req.user!.id,
    });

    return res.json({
      success: true,
      message: 'Content verification complete',
      verification: result,
    });
  } catch (error: any) {
    console.error('Content verification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify content',
    });
  }
});

/**
 * Report deepfake content
 * POST /api/deepfake/report
 */
router.post('/report', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const {
      reportedContentUrl,
      reportedContentType,
      impersonatedCreatorId,
      description,
      evidence,
    } = req.body;
    
    if (!reportedContentUrl || !reportedContentType || !impersonatedCreatorId) {
      return res.status(400).json({
        success: false,
        message: 'Content URL, type, and creator ID are required',
      });
    }

    const result = await deepfakeDetectionService.reportDeepfake({
      reportedContentUrl,
      reportedContentType,
      impersonatedCreatorId,
      reportedBy: req.user!.id,
      description,
      evidence,
    });

    return res.json({
      success: true,
      message: 'Deepfake report submitted successfully',
      report: result,
    });
  } catch (error: any) {
    console.error('Report deepfake error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit deepfake report',
    });
  }
});

/**
 * Get deepfake reports for a creator
 * GET /api/deepfake/my-reports
 */
router.get('/my-reports', isAuthenticated, requireCreator, async (req: Request, res: Response) => {
  try {
    const reports = await deepfakeDetectionService.getCreatorReports(req.user!.id);

    return res.json({
      success: true,
      reports,
    });
  } catch (error: any) {
    console.error('Get creator reports error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reports',
    });
  }
});

/**
 * Get all pending reports (admin only)
 * GET /api/deepfake/admin/pending
 */
router.get('/admin/pending', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const reports = await deepfakeDetectionService.getPendingReports();

    return res.json({
      success: true,
      reports,
    });
  } catch (error: any) {
    console.error('Get pending reports error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending reports',
    });
  }
});

/**
 * Update report status (admin only)
 * PATCH /api/deepfake/admin/report/:reportId
 */
router.patch('/admin/report/:reportId', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status, actionTaken } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = ['under_review', 'confirmed', 'false_positive', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const result = await deepfakeDetectionService.updateReportStatus(
      reportId,
      status,
      actionTaken,
      req.user!.id
    );

    return res.json({
      success: true,
      message: 'Report status updated',
      report: result,
    });
  } catch (error: any) {
    console.error('Update report status error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update report status',
    });
  }
});

/**
 * Get verification statistics (admin only)
 * GET /api/deepfake/admin/stats
 */
router.get('/admin/stats', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await deepfakeDetectionService.getVerificationStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Get verification stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch statistics',
    });
  }
});

export { router as deepfakeDetectionRoutes };
