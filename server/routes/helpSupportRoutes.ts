import { Express } from 'express';
import { z } from 'zod';
import { isAuthenticated, requireAdmin, requireModeratorOrAdmin } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { aiHelpSupportService } from '../services/aiHelpSupportService';
import { 
  insertSupportTicketSchema, 
  insertTicketMessageSchema,
  insertWikiArticleSchema,
  insertTutorialSchema,
  insertFaqEntrySchema
} from '@shared/schema';

// Validation schemas for API requests
const searchHelpSchema = z.object({
  query: z.string().min(1).max(500),
  type: z.enum(['all', 'articles', 'tutorials', 'faq']).optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  filters: z.object({
    difficulty: z.string().optional(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional()
});

const createTicketSchema = insertSupportTicketSchema.extend({
  metadata: z.object({
    browser: z.string().optional(),
    platform: z.string().optional(),
    errorLogs: z.array(z.string()).optional(),
    currentUrl: z.string().optional(),
    userAgent: z.string().optional()
  }).optional()
});

const ticketMessageSchema = insertTicketMessageSchema.extend({
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    size: z.number(),
    type: z.string()
  })).optional()
});

const tutorialProgressSchema = z.object({
  currentStep: z.number().min(0),
  completedSteps: z.number().min(0),
  timeSpent: z.number().min(0), // seconds
  stepData: z.record(z.any()).optional() // step-specific data
});

const nlQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  context: z.object({
    currentPage: z.string().optional(),
    userRole: z.string().optional(),
    previousActions: z.array(z.string()).optional()
  }).optional()
});

export function registerHelpSupportRoutes(app: Express) {
  
  // ===== AI-POWERED SEARCH ENDPOINTS =====
  
  /**
   * Search across all help content with AI-powered matching
   * GET /api/help/search
   */
  app.get('/api/help/search', async (req, res) => {
    try {
      const searchParams = searchHelpSchema.parse({
        query: req.query.q || req.query.query,
        type: req.query.type,
        category: req.query.category,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
        filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined
      });

      const results = await aiHelpSupportService.searchHelpContent(searchParams);
      
      res.json({
        success: true,
        data: results,
        meta: {
          query: searchParams.query,
          totalResults: results.totalCount,
          hasMore: results.totalCount > (searchParams.offset || 0) + results.results.length
        }
      });
    } catch (error) {
      console.error('Help search error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to search help content',
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  /**
   * Natural language query processing
   * POST /api/help/ask
   */
  app.post('/api/help/ask', async (req, res) => {
    try {
      const { query, context } = nlQuerySchema.parse(req.body);
      
      const response = await aiHelpSupportService.processNaturalLanguageQuery(query, context);
      
      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('NL query error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process query',
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  /**
   * Get search suggestions for auto-complete
   * GET /api/help/search/suggestions
   */
  app.get('/api/help/search/suggestions', async (req, res) => {
    try {
      // Get popular search terms, common keywords, and trending topics
      const suggestions = await aiHelpSupportService.getSearchSuggestions();
      
      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Search suggestions error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get search suggestions',
        // Provide default suggestions on error
        data: [
          'Account verification',
          'Payment processing',
          'Content upload',
          'Privacy settings',
          'Revenue sharing',
          'Content moderation',
          'Mobile app',
          'Streaming setup',
          'Profile management',
          'Subscription help'
        ]
      });
    }
  });

  /**
   * Get personalized help recommendations
   * GET /api/help/recommendations
   */
  app.get('/api/help/recommendations', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const recommendations = await aiHelpSupportService.getPersonalizedRecommendations(userId);
      
      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Recommendations error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get recommendations' 
      });
    }
  });

  // ===== SUPPORT TICKET ENDPOINTS =====
  
  /**
   * Create a new support ticket
   * POST /api/help/tickets
   */
  app.post('/api/help/tickets', csrfProtection, async (req, res) => {
    try {
      const ticketData = createTicketSchema.parse(req.body);
      const userId = req.user?.id;
      
      const ticket = await aiHelpSupportService.createSupportTicket(ticketData, userId);
      
      res.status(201).json({
        success: true,
        data: ticket,
        message: `Ticket ${ticket.ticketNumber} created successfully`
      });
    } catch (error) {
      console.error('Create ticket error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create support ticket',
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  /**
   * Get user's support tickets
   * GET /api/help/tickets
   */
  app.get('/api/help/tickets', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const status = req.query.status as string;
      
      const filters = {
        userId,
        status: status ? [status] : undefined
      };
      
      const result = await aiHelpSupportService.getTickets(filters, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get tickets error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get tickets' 
      });
    }
  });

  /**
   * Get specific ticket with messages
   * GET /api/help/tickets/:ticketId
   */
  app.get('/api/help/tickets/:ticketId', async (req, res) => {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;
      
      // Check if user can access this ticket (owner or admin/moderator)
      const ticket = await aiHelpSupportService.getTicket(ticketId, userId);
      if (!ticket) {
        return res.status(404).json({ 
          success: false, 
          error: 'Ticket not found' 
        });
      }
      
      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Get ticket error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get ticket' 
      });
    }
  });

  /**
   * Add message to ticket
   * POST /api/help/tickets/:ticketId/messages
   */
  app.post('/api/help/tickets/:ticketId/messages', csrfProtection, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const messageData = ticketMessageSchema.parse({
        ...req.body,
        ticketId,
        authorId: req.user?.id,
        type: req.user?.role === 'admin' || req.user?.role === 'moderator' ? 'agent_response' : 'user_message'
      });
      
      await aiHelpSupportService.addTicketMessage(messageData);
      
      res.json({
        success: true,
        message: 'Message added successfully'
      });
    } catch (error) {
      console.error('Add ticket message error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to add message',
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  // ===== ADMIN TICKET MANAGEMENT =====
  
  /**
   * Get all tickets for admin/moderator
   * GET /api/admin/help/tickets
   */
  app.get('/api/admin/help/tickets', requireModeratorOrAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const filters = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        category: req.query.category ? (req.query.category as string).split(',') : undefined,
        priority: req.query.priority ? (req.query.priority as string).split(',') : undefined,
        assignedTo: req.query.assignedTo as string,
        dateRange: req.query.startDate && req.query.endDate ? {
          start: new Date(req.query.startDate as string),
          end: new Date(req.query.endDate as string)
        } : undefined
      };
      
      const result = await aiHelpSupportService.getTickets(filters, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Admin get tickets error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get tickets' 
      });
    }
  });

  /**
   * Assign ticket to agent
   * PUT /api/admin/help/tickets/:ticketId/assign
   */
  app.put('/api/admin/help/tickets/:ticketId/assign', requireModeratorOrAdmin, csrfProtection, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { assignedTo } = req.body;
      
      await aiHelpSupportService.assignTicket(ticketId, assignedTo, req.user!.id);
      
      res.json({
        success: true,
        message: 'Ticket assigned successfully'
      });
    } catch (error) {
      console.error('Assign ticket error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to assign ticket' 
      });
    }
  });

  /**
   * Update ticket status
   * PUT /api/admin/help/tickets/:ticketId/status
   */
  app.put('/api/admin/help/tickets/:ticketId/status', requireModeratorOrAdmin, csrfProtection, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { status, resolution } = req.body;
      
      await aiHelpSupportService.updateTicketStatus(ticketId, status, req.user!.id, resolution);
      
      res.json({
        success: true,
        message: 'Ticket status updated successfully'
      });
    } catch (error) {
      console.error('Update ticket status error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update ticket status' 
      });
    }
  });

  // ===== WIKI SYSTEM ENDPOINTS =====
  
  /**
   * Get wiki articles with filtering and search
   * GET /api/help/wiki
   */
  app.get('/api/help/wiki', async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const category = req.query.category as string;
      const search = req.query.search as string;
      const status = req.query.status as string || 'published';
      
      const articles = await aiHelpSupportService.getWikiArticles({
        page,
        limit,
        category,
        search,
        status
      });
      
      res.json({
        success: true,
        data: articles
      });
    } catch (error) {
      console.error('Get wiki articles error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get wiki articles' 
      });
    }
  });

  /**
   * Get specific wiki article
   * GET /api/help/wiki/:slug
   */
  app.get('/api/help/wiki/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const article = await aiHelpSupportService.getWikiArticle(slug);
      
      if (!article) {
        return res.status(404).json({ 
          success: false, 
          error: 'Article not found' 
        });
      }
      
      // Track article view
      await aiHelpSupportService.trackArticleView(article.id, req.user?.id);
      
      res.json({
        success: true,
        data: article
      });
    } catch (error) {
      console.error('Get wiki article error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get article' 
      });
    }
  });

  /**
   * Rate article helpfulness
   * POST /api/help/wiki/:articleId/rate
   */
  app.post('/api/help/wiki/:articleId/rate', csrfProtection, async (req, res) => {
    try {
      const { articleId } = req.params;
      const { helpful, rating, feedback } = req.body;
      
      await aiHelpSupportService.rateArticle(articleId, {
        helpful: Boolean(helpful),
        rating: rating ? Number(rating) : undefined,
        feedback,
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'Rating submitted successfully'
      });
    } catch (error) {
      console.error('Rate article error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to submit rating' 
      });
    }
  });

  // ===== ADMIN WIKI MANAGEMENT =====
  
  /**
   * Create new wiki article
   * POST /api/admin/help/wiki
   */
  app.post('/api/admin/help/wiki', requireModeratorOrAdmin, csrfProtection, async (req, res) => {
    try {
      const articleData = insertWikiArticleSchema.parse({
        ...req.body,
        authorId: req.user!.id
      });
      
      const article = await aiHelpSupportService.createWikiArticle(articleData);
      
      res.status(201).json({
        success: true,
        data: article,
        message: 'Article created successfully'
      });
    } catch (error) {
      console.error('Create wiki article error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create article',
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  /**
   * Update wiki article
   * PUT /api/admin/help/wiki/:articleId
   */
  app.put('/api/admin/help/wiki/:articleId', requireModeratorOrAdmin, csrfProtection, async (req, res) => {
    try {
      const { articleId } = req.params;
      const updates = {
        ...req.body,
        lastEditedBy: req.user!.id
      };
      
      const article = await aiHelpSupportService.updateWikiArticle(articleId, updates);
      
      res.json({
        success: true,
        data: article,
        message: 'Article updated successfully'
      });
    } catch (error) {
      console.error('Update wiki article error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update article' 
      });
    }
  });

  // ===== TUTORIAL SYSTEM ENDPOINTS =====
  
  /**
   * Get available tutorials
   * GET /api/help/tutorials
   */
  app.get('/api/help/tutorials', async (req, res) => {
    try {
      const category = req.query.category as string;
      const difficulty = req.query.difficulty as string;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      
      const tutorials = await aiHelpSupportService.getTutorials({
        category,
        difficulty,
        page,
        limit,
        status: 'published'
      });
      
      res.json({
        success: true,
        data: tutorials
      });
    } catch (error) {
      console.error('Get tutorials error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get tutorials' 
      });
    }
  });

  /**
   * Get specific tutorial
   * GET /api/help/tutorials/:slug
   */
  app.get('/api/help/tutorials/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const tutorial = await aiHelpSupportService.getTutorial(slug);
      
      if (!tutorial) {
        return res.status(404).json({ 
          success: false, 
          error: 'Tutorial not found' 
        });
      }
      
      // Get user progress if authenticated
      let progress = null;
      if (req.user) {
        progress = await aiHelpSupportService.getTutorialProgress(req.user.id, tutorial.id);
      }
      
      res.json({
        success: true,
        data: {
          tutorial,
          progress
        }
      });
    } catch (error) {
      console.error('Get tutorial error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get tutorial' 
      });
    }
  });

  /**
   * Update tutorial progress
   * PUT /api/help/tutorials/:tutorialId/progress
   */
  app.put('/api/help/tutorials/:tutorialId/progress', isAuthenticated, csrfProtection, async (req, res) => {
    try {
      const { tutorialId } = req.params;
      const userId = req.user!.id;
      const progress = tutorialProgressSchema.parse(req.body);
      
      await aiHelpSupportService.updateTutorialProgress(userId, tutorialId, progress);
      
      res.json({
        success: true,
        message: 'Progress updated successfully'
      });
    } catch (error) {
      console.error('Update tutorial progress error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update progress',
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  // ===== FAQ ENDPOINTS =====
  
  /**
   * Get FAQ entries
   * GET /api/help/faq
   */
  app.get('/api/help/faq', async (req, res) => {
    try {
      const category = req.query.category as string;
      const search = req.query.search as string;
      
      const faqEntries = await aiHelpSupportService.getFAQEntries({
        category,
        search,
        isVisible: true
      });
      
      res.json({
        success: true,
        data: faqEntries
      });
    } catch (error) {
      console.error('Get FAQ error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get FAQ entries' 
      });
    }
  });

  /**
   * Rate FAQ entry helpfulness
   * POST /api/help/faq/:faqId/rate
   */
  app.post('/api/help/faq/:faqId/rate', csrfProtection, async (req, res) => {
    try {
      const { faqId } = req.params;
      const { helpful } = req.body;
      
      await aiHelpSupportService.rateFAQEntry(faqId, Boolean(helpful), req.user?.id);
      
      res.json({
        success: true,
        message: 'Rating submitted successfully'
      });
    } catch (error) {
      console.error('Rate FAQ error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to submit rating' 
      });
    }
  });

  // ===== ANALYTICS ENDPOINTS =====
  
  /**
   * Get support analytics dashboard
   * GET /api/admin/help/analytics
   */
  app.get('/api/admin/help/analytics', requireModeratorOrAdmin, async (req, res) => {
    try {
      const period = req.query.period as string || '30d';
      const filters = {
        category: req.query.category as string,
        assignedTo: req.query.assignedTo as string
      };
      
      const analytics = await aiHelpSupportService.generateSupportAnalytics(period, filters);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get analytics' 
      });
    }
  });

  // ===== CATEGORIES AND METADATA =====
  
  /**
   * Get wiki categories
   * GET /api/help/wiki/categories
   */
  app.get('/api/help/wiki/categories', async (req, res) => {
    try {
      const categories = await aiHelpSupportService.getWikiCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get wiki categories error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get categories' 
      });
    }
  });

  /**
   * Get tutorial categories
   * GET /api/help/tutorials/categories
   */
  app.get('/api/help/tutorials/categories', async (req, res) => {
    try {
      const categories = await aiHelpSupportService.getTutorialCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get tutorial categories error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get categories' 
      });
    }
  });
}