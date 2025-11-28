import { storage } from '../storage';
import { performanceOptimizationService } from './performanceOptimizationService';

interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  pageUrl?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  platform: string;
  revenue?: number;
  currency?: string;
}

interface UserBehaviorInsight {
  userId: string;
  timeframe: string;
  metrics: {
    sessionCount: number;
    totalTime: number;
    pageViews: number;
    interactions: number;
    purchaseValue: number;
    contentViews: number;
    messagesSent: number;
  };
  patterns: {
    mostActiveHours: number[];
    preferredContentTypes: string[];
    engagementLevel: 'low' | 'medium' | 'high';
    churnRisk: number; // 0-100
    lifetimeValue: number;
  };
  trends: {
    metric: string;
    change: number;
    direction: 'up' | 'down' | 'stable';
  }[];
}

interface PaymentAnalytics {
  timeframe: string;
  metrics: {
    totalRevenue: number;
    transactionCount: number;
    averageOrderValue: number;
    successRate: number;
    chargebackRate: number;
    refundRate: number;
  };
  byPaymentMethod: Record<string, {
    revenue: number;
    count: number;
    successRate: number;
  }>;
  byCountry: Record<string, {
    revenue: number;
    count: number;
    averageValue: number;
  }>;
  trends: {
    daily: { date: string; revenue: number; count: number }[];
    weekly: { week: string; revenue: number; count: number }[];
    monthly: { month: string; revenue: number; count: number }[];
  };
  topCreators: {
    userId: string;
    username: string;
    revenue: number;
    transactionCount: number;
  }[];
}

interface SystemPerformanceMetrics {
  timestamp: Date;
  server: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
    requestCount: number;
    errorRate: number;
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  database: {
    connectionCount: number;
    queryCount: number;
    slowQueries: number;
    cacheHitRate: number;
    replicationLag: number;
  };
  external: {
    paymentProcessorUptime: number;
    cdnPerformance: number;
    emailDeliveryRate: number;
    storageLatency: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  isActive: boolean;
  channels: ('email' | 'webhook' | 'sms')[];
  recipients: string[];
  cooldownMinutes: number;
  lastTriggered?: Date;
}

// Comprehensive analytics, monitoring, and alerting service
class ComprehensiveAnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private performanceMetrics: SystemPerformanceMetrics[] = [];
  private alertRules = new Map<string, AlertRule>();
  private lastAlerts = new Map<string, Date>();

  constructor() {
    // DISABLED: Fake monitoring service causing spam alerts and database errors
    // this.initializeDefaultAlerts();
    // this.startPerformanceMonitoring();
    // this.startEventProcessing();
  }

  // ===== EVENT TRACKING =====

  // Track user interaction event
  async trackEvent(params: {
    userId?: string;
    sessionId: string;
    eventType: 'page_view' | 'click' | 'purchase' | 'upload' | 'message' | 'search' | 'interaction';
    eventName: string;
    properties?: Record<string, any>;
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    pageUrl?: string;
    revenue?: number;
    currency?: string;
  }): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: params.userId,
        sessionId: params.sessionId,
        eventType: params.eventType,
        eventName: params.eventName,
        properties: params.properties || {},
        timestamp: new Date(),
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        referrer: params.referrer,
        pageUrl: params.pageUrl,
        deviceType: this.detectDeviceType(params.userAgent),
        platform: this.detectPlatform(params.userAgent),
        revenue: params.revenue,
        currency: params.currency
      };

      // Add to processing queue
      this.eventQueue.push(event);

      // Send to Google Analytics if configured
      await this.sendToGoogleAnalytics(event);

      // Real-time processing for critical events
      if (params.eventType === 'purchase' || params.revenue) {
        await this.processRevenueEvent(event);
      }

      console.log(`📊 Event tracked: ${params.eventName} (${params.eventType})`);

    } catch (error) {
      console.error('Event tracking failed:', error);
    }
  }

  // ===== USER BEHAVIOR ANALYTICS =====

  // Generate comprehensive user behavior insights
  async generateUserBehaviorInsights(
    userId: string, 
    timeframe: string = '30d'
  ): Promise<UserBehaviorInsight> {
    try {
      console.log(`🧠 Generating behavior insights for user: ${userId} (${timeframe})`);

      // Check cache first
      const cacheKey = `behavior_insights:${userId}:${timeframe}`;
      const cached = await performanceOptimizationService.getFromCache<UserBehaviorInsight>(cacheKey);
      if (cached) return cached;

      // Get user events for timeframe
      const events = await storage.getUserEvents(userId, timeframe);
      const sessions = await storage.getUserSessions(userId, timeframe);
      const transactions = await storage.getUserTransactions(userId, { 
        startDate: this.getTimeframeStart(timeframe) 
      });

      // Calculate metrics
      const metrics = {
        sessionCount: sessions.length,
        totalTime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
        pageViews: events.filter(e => e.eventType === 'page_view').length,
        interactions: events.filter(e => e.eventType === 'click' || e.eventType === 'interaction').length,
        purchaseValue: transactions.transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        contentViews: events.filter(e => e.eventName.includes('content_view')).length,
        messagesSent: events.filter(e => e.eventType === 'message').length
      };

      // Analyze patterns
      const patterns = await this.analyzeUserPatterns(events, sessions, transactions.transactions);
      
      // Calculate trends
      const trends = await this.calculateUserTrends(userId, timeframe);

      const insights: UserBehaviorInsight = {
        userId,
        timeframe,
        metrics,
        patterns,
        trends
      };

      // Cache insights
      const ttl = timeframe.includes('d') ? 3600 : 86400; // 1h for daily, 24h for others
      await performanceOptimizationService.cache(cacheKey, insights, ttl);

      console.log(`✅ Behavior insights generated for ${userId}: ${patterns.engagementLevel} engagement`);
      return insights;

    } catch (error) {
      console.error('User behavior analysis failed:', error);
      throw error;
    }
  }

  // ===== PAYMENT ANALYTICS =====

  // Generate comprehensive payment analytics
  async generatePaymentAnalytics(timeframe: string = '30d'): Promise<PaymentAnalytics> {
    try {
      console.log(`💰 Generating payment analytics for: ${timeframe}`);

      // Check cache
      const cacheKey = `payment_analytics:${timeframe}`;
      const cached = await performanceOptimizationService.getFromCache<PaymentAnalytics>(cacheKey);
      if (cached) return cached;

      const startDate = this.getTimeframeStart(timeframe);
      const endDate = new Date();

      // Get all transactions for timeframe
      const transactions = await storage.getTransactionsByDateRange(startDate, endDate);
      const completedTransactions = transactions.filter(t => t.status === 'completed');

      // Calculate core metrics
      const metrics = {
        totalRevenue: completedTransactions.reduce((sum, t) => sum + t.amount, 0),
        transactionCount: transactions.length,
        averageOrderValue: completedTransactions.length > 0 
          ? completedTransactions.reduce((sum, t) => sum + t.amount, 0) / completedTransactions.length 
          : 0,
        successRate: transactions.length > 0 
          ? (completedTransactions.length / transactions.length) * 100 
          : 0,
        chargebackRate: this.calculateChargebackRate(transactions),
        refundRate: this.calculateRefundRate(transactions)
      };

      // Group by payment method
      const byPaymentMethod = this.groupTransactionsByPaymentMethod(transactions);
      
      // Group by country
      const byCountry = await this.groupTransactionsByCountry(transactions);
      
      // Calculate trends
      const trends = await this.calculatePaymentTrends(startDate, endDate);
      
      // Get top creators
      const topCreators = await this.getTopCreatorsByRevenue(startDate, endDate);

      const analytics: PaymentAnalytics = {
        timeframe,
        metrics,
        byPaymentMethod,
        byCountry,
        trends,
        topCreators
      };

      // Cache analytics
      const ttl = timeframe.includes('d') ? 1800 : 3600; // 30min for daily, 1h for others
      await performanceOptimizationService.cache(cacheKey, analytics, ttl);

      console.log(`✅ Payment analytics generated: $${metrics.totalRevenue/100} revenue, ${metrics.transactionCount} transactions`);
      return analytics;

    } catch (error) {
      console.error('Payment analytics generation failed:', error);
      throw error;
    }
  }

  // ===== PERFORMANCE MONITORING =====

  // Collect system performance metrics
  async collectPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
    try {
      const metrics: SystemPerformanceMetrics = {
        timestamp: new Date(),
        server: {
          cpuUsage: process.cpuUsage().user / 1000000, // Convert to percentage approximation
          memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
          diskUsage: 0, // Would need filesystem check
          uptime: process.uptime(),
          requestCount: await this.getRequestCount(),
          errorRate: await this.getErrorRate(),
          responseTime: await this.getResponseTimeMetrics()
        },
        database: {
          connectionCount: await this.getDatabaseConnectionCount(),
          queryCount: await this.getDatabaseQueryCount(),
          slowQueries: await this.getSlowQueryCount(),
          cacheHitRate: performanceOptimizationService.getPerformanceMetrics().cache.hitRate,
          replicationLag: 0 // Would need database-specific implementation
        },
        external: {
          paymentProcessorUptime: await this.checkPaymentProcessorHealth(),
          cdnPerformance: await this.checkCDNPerformance(),
          emailDeliveryRate: await this.getEmailDeliveryRate(),
          storageLatency: await this.checkStorageLatency()
        }
      };

      // Store metrics
      this.performanceMetrics.push(metrics);
      await storage.createPerformanceMetric(metrics);

      // Keep only last 1000 metrics in memory
      if (this.performanceMetrics.length > 1000) {
        this.performanceMetrics = this.performanceMetrics.slice(-1000);
      }

      // Check alert rules
      await this.checkAlertRules(metrics);

      return metrics;

    } catch (error) {
      console.error('Performance metrics collection failed:', error);
      throw error;
    }
  }

  // ===== ERROR TRACKING & ALERTING =====

  // Create alert rule
  async createAlertRule(params: {
    name: string;
    metric: string;
    condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
    threshold: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
    channels: ('email' | 'webhook' | 'sms')[];
    recipients: string[];
    cooldownMinutes?: number;
  }): Promise<{ success: boolean; ruleId?: string; error?: string }> {
    try {
      const ruleId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const rule: AlertRule = {
        id: ruleId,
        name: params.name,
        metric: params.metric,
        condition: params.condition,
        threshold: params.threshold,
        severity: params.severity,
        isActive: true,
        channels: params.channels,
        recipients: params.recipients,
        cooldownMinutes: params.cooldownMinutes || 30
      };

      // Store rule
      await storage.createAlertRule(rule);
      this.alertRules.set(ruleId, rule);

      console.log(`🚨 Alert rule created: ${params.name} (${params.metric} ${params.condition} ${params.threshold})`);
      return { success: true, ruleId };

    } catch (error) {
      console.error('Alert rule creation failed:', error);
      return { success: false, error: 'Alert rule creation failed' };
    }
  }

  // Check alert rules against current metrics
  private async checkAlertRules(metrics: SystemPerformanceMetrics): Promise<void> {
    try {
      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.isActive) continue;

        // Check cooldown
        const lastAlert = this.lastAlerts.get(ruleId);
        if (lastAlert && Date.now() - lastAlert.getTime() < rule.cooldownMinutes * 60 * 1000) {
          continue;
        }

        // Get metric value
        const metricValue = this.getMetricValue(metrics, rule.metric);
        if (metricValue === null) continue;

        // Check condition
        const triggered = this.evaluateCondition(metricValue, rule.condition, rule.threshold);
        
        if (triggered) {
          await this.triggerAlert(rule, metricValue);
          this.lastAlerts.set(ruleId, new Date());
        }
      }
    } catch (error) {
      console.error('Alert rule checking failed:', error);
    }
  }

  // Trigger alert notification
  private async triggerAlert(rule: AlertRule, currentValue: number): Promise<void> {
    try {
      console.log(`🚨 ALERT TRIGGERED: ${rule.name} - ${rule.metric} = ${currentValue} (threshold: ${rule.threshold})`);

      const alertData = {
        ruleName: rule.name,
        metric: rule.metric,
        currentValue,
        threshold: rule.threshold,
        severity: rule.severity,
        timestamp: new Date()
      };

      // Send notifications through configured channels
      for (const channel of rule.channels) {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(rule, alertData);
            break;
          case 'webhook':
            await this.sendWebhookAlert(rule, alertData);
            break;
          case 'sms':
            await this.sendSMSAlert(rule, alertData);
            break;
        }
      }

      // Store alert in database
      await storage.createAlert({
        ruleId: rule.id,
        metric: rule.metric,
        currentValue,
        threshold: rule.threshold,
        severity: rule.severity,
        triggeredAt: new Date()
      });

    } catch (error) {
      console.error('Alert trigger failed:', error);
    }
  }

  // ===== GOOGLE ANALYTICS INTEGRATION =====

  // Send event to Google Analytics 4
  private async sendToGoogleAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      const measurementId = process.env.VITE_GA_MEASUREMENT_ID;
      const apiSecret = process.env.GA_API_SECRET;

      if (!measurementId || !apiSecret) {
        console.warn('Google Analytics not configured, skipping GA event');
        return;
      }

      const gaEvent = {
        client_id: event.sessionId,
        user_id: event.userId,
        events: [{
          name: event.eventName.replace(/[^a-zA-Z0-9_]/g, '_'), // GA4 event name format
          parameters: {
            ...event.properties,
            event_category: event.eventType,
            page_location: event.pageUrl,
            page_referrer: event.referrer,
            currency: event.currency || 'USD',
            value: event.revenue ? event.revenue / 100 : undefined // Convert cents to dollars
          }
        }]
      };

      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gaEvent)
        }
      );

      if (!response.ok) {
        throw new Error(`GA API error: ${response.status}`);
      }

      console.log(`📈 Event sent to Google Analytics: ${event.eventName}`);

    } catch (error) {
      console.error('Google Analytics event failed:', error);
    }
  }

  // ===== HELPER METHODS =====

  private startPerformanceMonitoring(): void {
    // Collect metrics every 60 seconds
    setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
      } catch (error) {
        console.error('Performance monitoring failed:', error);
      }
    }, 60000);
  }

  private startEventProcessing(): void {
    // Process event queue every 10 seconds
    setInterval(async () => {
      if (this.eventQueue.length === 0) return;

      try {
        const events = this.eventQueue.splice(0, 100); // Process up to 100 events at once
        await storage.createAnalyticsEvents(events);
        console.log(`📊 Processed ${events.length} analytics events`);
      } catch (error) {
        console.error('Event processing failed:', error);
      }
    }, 10000);
  }

  private detectDeviceType(userAgent?: string): 'desktop' | 'mobile' | 'tablet' {
    if (!userAgent) return 'desktop';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile')) return 'mobile';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
    return 'desktop';
  }

  private detectPlatform(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';
    if (ua.includes('android')) return 'android';
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    return 'unknown';
  }

  private getTimeframeStart(timeframe: string): Date {
    const now = new Date();
    const match = timeframe.match(/(\d+)([dwhmy])/);
    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const [, amount, unit] = match;
    const value = parseInt(amount);

    switch (unit) {
      case 'd': return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'w': return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
      case 'y': return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Mock implementations for development
  private async processRevenueEvent(event: AnalyticsEvent): Promise<void> {
    console.log(`💰 Revenue event processed: $${(event.revenue || 0)/100}`);
  }

  private async analyzeUserPatterns(events: any[], sessions: any[], transactions: any[]): Promise<any> {
    // Analyze active hours
    const hours = events.map(e => new Date(e.timestamp).getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const mostActiveHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Analyze content preferences
    const contentEvents = events.filter(e => e.eventName.includes('content'));
    const contentTypes = contentEvents.map(e => e.properties?.contentType || 'unknown');
    const preferredContentTypes = [...new Set(contentTypes)].slice(0, 3);

    // Calculate engagement level
    const avgSessionTime = sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length : 0;
    const engagementLevel = avgSessionTime > 600 ? 'high' : avgSessionTime > 300 ? 'medium' : 'low';

    // Calculate churn risk
    const lastActivity = sessions.length > 0 ? Math.max(...sessions.map(s => new Date(s.createdAt).getTime())) : 0;
    const daysSinceActivity = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);
    const churnRisk = Math.min(daysSinceActivity * 10, 100);

    // Calculate lifetime value
    const lifetimeValue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      mostActiveHours,
      preferredContentTypes,
      engagementLevel,
      churnRisk,
      lifetimeValue
    };
  }

  private async calculateUserTrends(userId: string, timeframe: string): Promise<any[]> {
    // Mock trend calculation
    return [
      { metric: 'session_count', change: 5.2, direction: 'up' },
      { metric: 'engagement_time', change: -2.1, direction: 'down' },
      { metric: 'purchase_value', change: 15.7, direction: 'up' }
    ];
  }

  private calculateChargebackRate(transactions: any[]): number {
    const chargebacks = transactions.filter(t => t.status === 'chargeback').length;
    return transactions.length > 0 ? (chargebacks / transactions.length) * 100 : 0;
  }

  private calculateRefundRate(transactions: any[]): number {
    const refunds = transactions.filter(t => t.status === 'refunded').length;
    return transactions.length > 0 ? (refunds / transactions.length) * 100 : 0;
  }

  private groupTransactionsByPaymentMethod(transactions: any[]): Record<string, any> {
    const grouped = transactions.reduce((acc, t) => {
      const method = t.paymentMethod || 'unknown';
      if (!acc[method]) {
        acc[method] = { revenue: 0, count: 0, successful: 0 };
      }
      acc[method].count++;
      if (t.status === 'completed') {
        acc[method].revenue += t.amount;
        acc[method].successful++;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calculate success rates
    Object.keys(grouped).forEach(method => {
      grouped[method].successRate = (grouped[method].successful / grouped[method].count) * 100;
    });

    return grouped;
  }

  private async groupTransactionsByCountry(transactions: any[]): Promise<Record<string, any>> {
    // Mock implementation - would use IP geolocation data
    return {
      'US': { revenue: 150000, count: 25, averageValue: 6000 },
      'GB': { revenue: 75000, count: 15, averageValue: 5000 },
      'CA': { revenue: 45000, count: 12, averageValue: 3750 }
    };
  }

  private async calculatePaymentTrends(startDate: Date, endDate: Date): Promise<any> {
    // Mock trend calculation
    return {
      daily: [
        { date: '2025-09-20', revenue: 5000, count: 8 },
        { date: '2025-09-21', revenue: 7500, count: 12 }
      ],
      weekly: [
        { week: '2025-W38', revenue: 35000, count: 56 },
        { week: '2025-W39', revenue: 42000, count: 67 }
      ],
      monthly: [
        { month: '2025-08', revenue: 125000, count: 200 },
        { month: '2025-09', revenue: 150000, count: 240 }
      ]
    };
  }

  private async getTopCreatorsByRevenue(startDate: Date, endDate: Date): Promise<any[]> {
    // Mock implementation
    return [
      { userId: 'user1', username: 'creator1', revenue: 25000, transactionCount: 45 },
      { userId: 'user2', username: 'creator2', revenue: 18000, transactionCount: 32 },
      { userId: 'user3', username: 'creator3', revenue: 15000, transactionCount: 28 }
    ];
  }

  // Performance monitoring helper methods
  private async getRequestCount(): Promise<number> { return 1250; }
  private async getErrorRate(): Promise<number> { return 0.5; }
  private async getResponseTimeMetrics(): Promise<any> {
    return { p50: 125, p95: 450, p99: 1200 };
  }
  private async getDatabaseConnectionCount(): Promise<number> { return 15; }
  private async getDatabaseQueryCount(): Promise<number> { return 3400; }
  private async getSlowQueryCount(): Promise<number> { return 5; }
  private async checkPaymentProcessorHealth(): Promise<number> { return 99.8; }
  private async checkCDNPerformance(): Promise<number> { return 98.5; }
  private async getEmailDeliveryRate(): Promise<number> { return 97.2; }
  private async checkStorageLatency(): Promise<number> { return 45; }

  // Alert system helper methods
  private initializeDefaultAlerts(): void {
    const defaultRules = [
      {
        name: 'High Error Rate',
        metric: 'server.errorRate',
        condition: 'greater_than' as const,
        threshold: 5,
        severity: 'critical' as const,
        channels: ['email' as const],
        recipients: ['admin@boyfanz.com']
      },
      {
        name: 'Low Database Performance',
        metric: 'database.cacheHitRate',
        condition: 'less_than' as const,
        threshold: 80,
        severity: 'warning' as const,
        channels: ['email' as const],
        recipients: ['tech@boyfanz.com']
      }
    ];

    defaultRules.forEach(rule => {
      const id = `default_${rule.name.toLowerCase().replace(/\s+/g, '_')}`;
      this.alertRules.set(id, {
        id,
        isActive: true,
        cooldownMinutes: 30,
        ...rule
      });
    });
  }

  private getMetricValue(metrics: SystemPerformanceMetrics, metricPath: string): number | null {
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than': return value > threshold;
      case 'less_than': return value < threshold;
      case 'equals': return value === threshold;
      case 'not_equals': return value !== threshold;
      default: return false;
    }
  }

  private async sendEmailAlert(rule: AlertRule, alertData: any): Promise<void> {
    await performanceOptimizationService.queueJob('send_email', {
      to: rule.recipients,
      subject: `🚨 ${rule.severity.toUpperCase()}: ${rule.name}`,
      template: 'alert_notification',
      data: alertData
    }, { priority: rule.severity === 'critical' ? 'critical' : 'high' });
  }

  private async sendWebhookAlert(rule: AlertRule, alertData: any): Promise<void> {
    // Implementation would send webhook to configured endpoints
    console.log(`📡 Webhook alert: ${rule.name}`);
  }

  private async sendSMSAlert(rule: AlertRule, alertData: any): Promise<void> {
    // Implementation would send SMS through service like Twilio
    console.log(`📱 SMS alert: ${rule.name}`);
  }
}

export const comprehensiveAnalyticsService = new ComprehensiveAnalyticsService();