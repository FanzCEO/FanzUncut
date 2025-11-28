import { eq, like, desc, asc, and, or, gte, lte, sql, count, inArray } from 'drizzle-orm';
import { 
  supportTickets, 
  ticketMessages, 
  wikiArticles, 
  wikiCategories,
  tutorials,
  tutorialCategories,
  userTutorialProgress,
  faqEntries,
  badges,
  userBadges,
  navigationPaths,
  searchAnalytics,
  type InsertSupportTicket,
  type InsertTicketMessage,
  type InsertWikiArticle,
  type InsertTutorial,
  type InsertFaqEntry,
  type SupportTicket,
  type WikiArticle,
  type Tutorial,
  type FaqEntry
} from '@shared/schema';
import type { IStorage } from '../storage';

interface SearchOptions {
  query: string;
  type?: 'all' | 'articles' | 'tutorials' | 'faq';
  category?: string;
  limit?: number;
  offset?: number;
  filters?: {
    difficulty?: string;
    status?: string;
    tags?: string[];
  };
}

interface SearchResult {
  id: string;
  type: 'article' | 'tutorial' | 'faq';
  title: string;
  excerpt?: string;
  content: string;
  url: string;
  relevanceScore: number;
  tags: string[];
  category?: string;
  metadata?: any;
}

interface TicketFilters {
  status?: string[];
  category?: string[];
  priority?: string[];
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

interface AnalyticsReport {
  period: string;
  metrics: {
    totalTickets: number;
    resolvedTickets: number;
    averageResponseTime: number;
    customerSatisfactionScore: number;
    topCategories: Array<{ category: string; count: number }>;
    topSearchQueries: Array<{ query: string; count: number }>;
    tutorialCompletionRate: number;
    helpfulContentRatings: number;
  };
  trends: {
    ticketVolume: Array<{ date: string; count: number }>;
    responseTime: Array<{ date: string; avgTime: number }>;
  };
}

export class AIHelpSupportService {
  constructor(private storage: IStorage) {}

  // ===== AI-POWERED SEARCH SYSTEM =====

  /**
   * Performs intelligent search across all help content with semantic matching
   */
  async searchHelpContent(options: SearchOptions): Promise<{
    results: SearchResult[];
    totalCount: number;
    suggestions: string[];
    facets: {
      categories: Array<{ name: string; count: number }>;
      types: Array<{ name: string; count: number }>;
      tags: Array<{ name: string; count: number }>;
    };
  }> {
    const { query, type = 'all', limit = 20, offset = 0 } = options;
    
    // Track search analytics
    await this.trackSearchAnalytics(query, options);
    
    const results: SearchResult[] = [];
    let totalCount = 0;
    
    // Semantic search implementation (simplified - would use vector embeddings in production)
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    // Search wiki articles
    if (type === 'all' || type === 'articles') {
      const articles = await this.searchWikiArticles(searchTerms, options);
      results.push(...articles.map(article => ({
        id: article.id,
        type: 'article' as const,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        url: `/help/articles/${article.slug}`,
        relevanceScore: this.calculateRelevanceScore(article.content + ' ' + article.title, searchTerms),
        tags: article.tags,
        category: article.categoryId,
        metadata: { views: article.viewCount, rating: article.averageRating }
      })));
    }
    
    // Search tutorials
    if (type === 'all' || type === 'tutorials') {
      const tutorialResults = await this.searchTutorials(searchTerms, options);
      results.push(...tutorialResults.map(tutorial => ({
        id: tutorial.id,
        type: 'tutorial' as const,
        title: tutorial.title,
        excerpt: tutorial.description,
        content: tutorial.description || '',
        url: `/help/tutorials/${tutorial.slug}`,
        relevanceScore: this.calculateRelevanceScore(tutorial.title + ' ' + (tutorial.description || ''), searchTerms),
        tags: tutorial.tags,
        category: tutorial.categoryId,
        metadata: { 
          difficulty: tutorial.difficulty, 
          duration: tutorial.estimatedDuration,
          completionRate: tutorial.successRate 
        }
      })));
    }
    
    // Search FAQ entries
    if (type === 'all' || type === 'faq') {
      const faqResults = await this.searchFAQ(searchTerms, options);
      results.push(...faqResults.map(faq => ({
        id: faq.id,
        type: 'faq' as const,
        title: faq.question,
        excerpt: faq.answer.substring(0, 200) + '...',
        content: faq.answer,
        url: `/help/faq#${faq.id}`,
        relevanceScore: this.calculateRelevanceScore(faq.question + ' ' + faq.answer, searchTerms),
        tags: faq.tags,
        category: faq.categoryId,
        metadata: { views: faq.viewCount, helpful: faq.helpfulVotes }
      })));
    }
    
    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);
    totalCount = results.length;
    
    // Generate search suggestions and facets
    const suggestions = await this.generateSearchSuggestions(query);
    const facets = await this.generateSearchFacets(results);
    
    return {
      results: paginatedResults,
      totalCount,
      suggestions,
      facets
    };
  }

  private async searchWikiArticles(searchTerms: string[], options: SearchOptions): Promise<WikiArticle[]> {
    // In production, this would use full-text search with vector embeddings
    return [] as WikiArticle[]; // Mock implementation
  }

  private async searchTutorials(searchTerms: string[], options: SearchOptions): Promise<Tutorial[]> {
    return [] as Tutorial[]; // Mock implementation
  }

  private async searchFAQ(searchTerms: string[], options: SearchOptions): Promise<FaqEntry[]> {
    return [] as FaqEntry[]; // Mock implementation
  }

  private calculateRelevanceScore(content: string, searchTerms: string[]): number {
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    searchTerms.forEach(term => {
      const termCount = (lowerContent.match(new RegExp(term, 'g')) || []).length;
      score += termCount * (term.length / 10); // Weight by term length
    });
    
    return score;
  }

  private async generateSearchSuggestions(query: string): Promise<string[]> {
    // AI-powered suggestions based on popular searches and content
    return [
      'how to upload content',
      'payment processing',
      'account verification',
      'content moderation',
      'privacy settings'
    ];
  }

  private async generateSearchFacets(results: SearchResult[]): Promise<{
    categories: Array<{ name: string; count: number }>;
    types: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
  }> {
    const categories = new Map<string, number>();
    const types = new Map<string, number>();
    const tags = new Map<string, number>();
    
    results.forEach(result => {
      // Count types
      types.set(result.type, (types.get(result.type) || 0) + 1);
      
      // Count categories
      if (result.category) {
        categories.set(result.category, (categories.get(result.category) || 0) + 1);
      }
      
      // Count tags
      result.tags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
    });
    
    return {
      categories: Array.from(categories.entries()).map(([name, count]) => ({ name, count })),
      types: Array.from(types.entries()).map(([name, count]) => ({ name, count })),
      tags: Array.from(tags.entries()).map(([name, count]) => ({ name, count }))
    };
  }

  private async trackSearchAnalytics(query: string, options: SearchOptions): Promise<void> {
    // Track search for analytics and improvement
    // Implementation would insert into searchAnalytics table
  }

  // ===== SUPPORT TICKET SYSTEM =====

  /**
   * Creates a new support ticket with AI-powered categorization and priority assignment
   */
  async createSupportTicket(ticketData: Omit<InsertSupportTicket, 'ticketNumber'>, userId?: string): Promise<SupportTicket> {
    // Generate human-readable ticket number
    const ticketNumber = await this.generateTicketNumber();
    
    // AI-powered category and priority detection
    const aiAnalysis = await this.analyzeTicketContent(ticketData.subject, ticketData.description);
    
    const ticket: InsertSupportTicket = {
      ...ticketData,
      ticketNumber,
      category: aiAnalysis.suggestedCategory || ticketData.category,
      priority: aiAnalysis.suggestedPriority || ticketData.priority,
      tags: [...(ticketData.tags || []), ...aiAnalysis.suggestedTags],
      metadata: {
        ...ticketData.metadata,
        aiAnalysis,
        browser: ticketData.metadata?.browser,
        platform: ticketData.metadata?.platform,
        errorLogs: ticketData.metadata?.errorLogs
      },
      userId
    };
    
    // Create ticket and initial system message
    const createdTicket = await this.storage.createSupportTicket(ticket);
    
    // Add initial system message
    await this.addTicketMessage({
      ticketId: createdTicket.id,
      type: 'system_message',
      content: `Ticket created. Category: ${createdTicket.category}, Priority: ${createdTicket.priority}`,
      isInternal: false,
      metadata: { automated: true }
    });
    
    // Auto-assign if rules match
    await this.autoAssignTicket(createdTicket);
    
    // Send automated response if applicable
    await this.sendAutomatedResponse(createdTicket);
    
    return createdTicket;
  }

  private async generateTicketNumber(): Promise<string> {
    const prefix = 'BF';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private async analyzeTicketContent(subject: string, description: string): Promise<{
    suggestedCategory: string;
    suggestedPriority: string;
    suggestedTags: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    urgencyScore: number;
  }> {
    // AI analysis of ticket content (simplified implementation)
    const content = (subject + ' ' + description).toLowerCase();
    
    let suggestedCategory = 'general_inquiry';
    let suggestedPriority = 'normal';
    const suggestedTags: string[] = [];
    
    // Simple keyword-based categorization (would use ML in production)
    if (content.includes('payment') || content.includes('billing') || content.includes('charge')) {
      suggestedCategory = 'billing';
      suggestedTags.push('payment');
    } else if (content.includes('upload') || content.includes('content') || content.includes('video')) {
      suggestedCategory = 'technical_support';
      suggestedTags.push('content');
    } else if (content.includes('account') || content.includes('login') || content.includes('password')) {
      suggestedCategory = 'account_issues';
      suggestedTags.push('account');
    } else if (content.includes('bug') || content.includes('error') || content.includes('broken')) {
      suggestedCategory = 'bug_report';
      suggestedTags.push('bug');
    }
    
    // Priority detection
    if (content.includes('urgent') || content.includes('critical') || content.includes('emergency')) {
      suggestedPriority = 'high';
    } else if (content.includes('broken') || content.includes('not working') || content.includes('error')) {
      suggestedPriority = 'high';
    }
    
    // Sentiment analysis (simplified)
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (content.includes('angry') || content.includes('frustrated') || content.includes('terrible')) {
      sentiment = 'negative';
    } else if (content.includes('thank') || content.includes('great') || content.includes('love')) {
      sentiment = 'positive';
    }
    
    return {
      suggestedCategory,
      suggestedPriority,
      suggestedTags,
      sentiment,
      urgencyScore: suggestedPriority === 'high' ? 0.8 : 0.5
    };
  }

  private async autoAssignTicket(ticket: SupportTicket): Promise<void> {
    // Auto-assignment logic based on category, load, and availability
    // Implementation would query available agents and assign based on rules
  }

  private async sendAutomatedResponse(ticket: SupportTicket): Promise<void> {
    // Send automated acknowledgment response
    const autoResponse = await this.generateAutomatedResponse(ticket);
    if (autoResponse) {
      await this.addTicketMessage({
        ticketId: ticket.id,
        type: 'auto_response',
        content: autoResponse,
        isInternal: false,
        metadata: { automated: true }
      });
    }
  }

  private async generateAutomatedResponse(ticket: SupportTicket): Promise<string | null> {
    // Generate contextual automated responses based on ticket category
    const responses: Record<string, string> = {
      billing: "Thank you for contacting us about your billing inquiry. We've received your request and will review your account details. You can expect a response within 24 hours.",
      technical_support: "Thanks for reaching out about your technical issue. Our support team will investigate this and provide assistance. In the meantime, you might find our troubleshooting guides helpful.",
      account_issues: "We've received your account-related request. For security reasons, we may need to verify your identity before making any changes. A support agent will contact you soon.",
      bug_report: "Thank you for reporting this bug. Our development team will investigate the issue. If you have any additional information or steps to reproduce the problem, please reply to this ticket."
    };
    
    return responses[ticket.category] || null;
  }

  async addTicketMessage(messageData: InsertTicketMessage): Promise<void> {
    await this.storage.addTicketMessage(messageData);
    
    // Update ticket timestamps
    if (messageData.type === 'agent_response' && messageData.authorId) {
      await this.updateTicketResponseTime(messageData.ticketId);
    }
  }

  private async updateTicketResponseTime(ticketId: string): Promise<void> {
    // Update first response time if this is the first agent response
    // Implementation would check if firstResponseAt is null and update it
  }

  /**
   * Get tickets with advanced filtering and search
   */
  async getTickets(filters: TicketFilters, page = 1, limit = 20): Promise<{
    tickets: SupportTicket[];
    totalCount: number;
    metrics: {
      open: number;
      pending: number;
      resolved: number;
      overdue: number;
    };
  }> {
    // Implementation would query tickets with filters
    return {
      tickets: [],
      totalCount: 0,
      metrics: { open: 0, pending: 0, resolved: 0, overdue: 0 }
    };
  }

  // ===== WIKI SYSTEM =====

  /**
   * Creates or updates wiki articles with AI content suggestions
   */
  async createWikiArticle(articleData: InsertWikiArticle): Promise<WikiArticle> {
    // Generate URL slug
    const slug = this.generateSlug(articleData.title);
    
    // AI content analysis and suggestions
    const contentAnalysis = await this.analyzeWikiContent(articleData.content);
    
    const article: InsertWikiArticle = {
      ...articleData,
      slug,
      keywords: contentAnalysis.suggestedKeywords,
      searchVector: contentAnalysis.searchVector,
      metaTitle: articleData.metaTitle || articleData.title,
      metaDescription: articleData.metaDescription || contentAnalysis.suggestedMetaDescription
    };
    
    return await this.storage.createWikiArticle(article);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async analyzeWikiContent(content: string): Promise<{
    suggestedKeywords: string[];
    searchVector: string;
    suggestedMetaDescription: string;
    readabilityScore: number;
    suggestedTags: string[];
  }> {
    // AI content analysis (simplified implementation)
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    const suggestedKeywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return {
      suggestedKeywords,
      searchVector: content.toLowerCase(), // Simplified
      suggestedMetaDescription: content.substring(0, 160) + '...',
      readabilityScore: 0.7,
      suggestedTags: suggestedKeywords.slice(0, 5)
    };
  }

  // ===== TUTORIAL SYSTEM =====

  /**
   * Creates interactive tutorials with progress tracking
   */
  async createTutorial(tutorialData: InsertTutorial): Promise<Tutorial> {
    const slug = this.generateSlug(tutorialData.title);
    
    const tutorial: InsertTutorial = {
      ...tutorialData,
      slug
    };
    
    return await this.storage.createTutorial(tutorial);
  }

  /**
   * Tracks user progress through tutorials
   */
  async updateTutorialProgress(userId: string, tutorialId: string, progress: {
    currentStep: number;
    completedSteps: number;
    timeSpent: number;
  }): Promise<void> {
    // Update progress and calculate completion percentage
    const progressPercentage = (progress.completedSteps / progress.currentStep) * 100;
    
    await this.storage.updateTutorialProgress(userId, tutorialId, {
      ...progress,
      progressPercentage: progressPercentage.toString(),
      lastAccessedAt: new Date()
    });
    
    // Award badges if tutorial completed
    if (progressPercentage === 100) {
      await this.awardTutorialCompletionBadge(userId, tutorialId);
    }
  }

  private async awardTutorialCompletionBadge(userId: string, tutorialId: string): Promise<void> {
    // Implementation would check for tutorial-specific badges and award them
  }

  // ===== ANALYTICS AND REPORTING =====

  /**
   * Generates comprehensive support analytics report
   */
  async generateSupportAnalytics(period: string, filters?: any): Promise<AnalyticsReport> {
    // Implementation would aggregate data from various tables
    return {
      period,
      metrics: {
        totalTickets: 0,
        resolvedTickets: 0,
        averageResponseTime: 0,
        customerSatisfactionScore: 0,
        topCategories: [],
        topSearchQueries: [],
        tutorialCompletionRate: 0,
        helpfulContentRatings: 0
      },
      trends: {
        ticketVolume: [],
        responseTime: []
      }
    };
  }

  /**
   * Gets personalized help recommendations for users
   */
  async getPersonalizedRecommendations(userId: string): Promise<{
    recommendedArticles: WikiArticle[];
    suggestedTutorials: Tutorial[];
    relevantFAQ: FaqEntry[];
    quickActions: Array<{ title: string; url: string; icon: string }>;
  }> {
    // AI-powered personalization based on user behavior and current context
    return {
      recommendedArticles: [],
      suggestedTutorials: [],
      relevantFAQ: [],
      quickActions: [
        { title: 'Submit Support Ticket', url: '/help/tickets/new', icon: 'ticket' },
        { title: 'Browse Knowledge Base', url: '/help/articles', icon: 'book' },
        { title: 'Start Tutorial', url: '/help/tutorials', icon: 'play' },
        { title: 'Contact Support', url: '/help/contact', icon: 'message' }
      ]
    };
  }

  /**
   * Processes natural language queries and provides contextual help
   */
  async processNaturalLanguageQuery(query: string, context?: {
    currentPage?: string;
    userRole?: string;
    previousActions?: string[];
  }): Promise<{
    answer: string;
    confidence: number;
    suggestedActions: Array<{ title: string; url: string }>;
    relatedContent: SearchResult[];
  }> {
    // AI-powered natural language processing for contextual help
    const searchResults = await this.searchHelpContent({ query, limit: 5 });
    
    // Generate contextual answer (simplified implementation)
    let answer = "I found some relevant information that might help you.";
    let confidence = 0.7;
    
    if (searchResults.results.length > 0) {
      const topResult = searchResults.results[0];
      answer = topResult.excerpt || topResult.content.substring(0, 200) + '...';
      confidence = topResult.relevanceScore > 5 ? 0.9 : 0.6;
    }
    
    return {
      answer,
      confidence,
      suggestedActions: [
        { title: 'View Full Article', url: searchResults.results[0]?.url || '/help' },
        { title: 'Contact Support', url: '/help/contact' }
      ],
      relatedContent: searchResults.results.slice(0, 3)
    };
  }
}

// Helper interface for storage methods (to be implemented in storage.ts)
interface HelpSupportStorage extends IStorage {
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  addTicketMessage(message: InsertTicketMessage): Promise<void>;
  createWikiArticle(article: InsertWikiArticle): Promise<WikiArticle>;
  createTutorial(tutorial: InsertTutorial): Promise<Tutorial>;
  updateTutorialProgress(userId: string, tutorialId: string, progress: any): Promise<void>;
}

// Export singleton instance
export const aiHelpSupportService = new AIHelpSupportService({} as IStorage);