// Real-Time Monitoring & Analytics System
// Comprehensive monitoring for all platforms, infrastructure health, performance metrics, and cost tracking

import { EventEmitter } from 'events';
import { z } from 'zod';
import { WebSocket } from 'ws';
import axios from 'axios';
import { performance } from 'perf_hooks';

// Monitoring Configuration Types
export interface MonitoringConfig {
  enabled: boolean;
  realTimeEnabled: boolean;
  retentionPeriod: number; // days
  alertThresholds: AlertThresholds;
  platforms: string[];
  metricsCollectionInterval: number; // seconds
  healthCheckInterval: number; // seconds
}

export interface AlertThresholds {
  cpu: number; // percentage
  memory: number; // percentage
  disk: number; // percentage
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  throughput: number; // requests per second
  availability: number; // percentage
}

export interface MetricPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  cpu: MetricPoint[];
  memory: MetricPoint[];
  disk: MetricPoint[];
  network: MetricPoint[];
  responseTime: MetricPoint[];
  throughput: MetricPoint[];
  errorRate: MetricPoint[];
  activeUsers: MetricPoint[];
  revenue: MetricPoint[];
}

export interface PlatformMetrics {
  platformId: string;
  platformName: string;
  metrics: SystemMetrics;
  health: 'healthy' | 'warning' | 'critical' | 'unknown';
  uptime: number;
  version: string;
  lastUpdated: Date;
}

export interface Alert {
  id: string;
  type: 'performance' | 'security' | 'infrastructure' | 'business' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  platformId?: string;
  metricName: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  assignedTo?: string;
}

// Real-Time Metrics Collector
export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, SystemMetrics> = new Map();
  private collectionInterval: NodeJS.Timeout | null = null;
  private config: MonitoringConfig;
  
  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    
    if (config.enabled) {
      this.startCollection();
    }
  }
  
  startCollection() {
    if (this.collectionInterval) return;
    
    this.collectionInterval = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.metricsCollectionInterval * 1000);
    
    console.log('📊 Metrics collection started');
  }
  
  stopCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      console.log('📊 Metrics collection stopped');
    }
  }
  
  private async collectMetrics() {
    try {
      // Collect system metrics for each platform
      for (const platformId of this.config.platforms) {
        const metrics = await this.collectPlatformMetrics(platformId);
        this.metrics.set(platformId, metrics);
        
        // Emit real-time metrics event
        this.emit('metricsCollected', {
          platformId,
          metrics,
          timestamp: new Date()
        });
        
        // Check for alerts
        await this.checkAlertConditions(platformId, metrics);
      }
    } catch (error) {
      console.error('Metrics collection error:', error);
      this.emit('collectionError', error);
    }
  }
  
  private async collectPlatformMetrics(platformId: string): Promise<SystemMetrics> {
    const timestamp = new Date();
    
    // System metrics collection (would integrate with actual monitoring tools)
    const cpuUsage = await this.getCpuUsage(platformId);
    const memoryUsage = await this.getMemoryUsage(platformId);
    const diskUsage = await this.getDiskUsage(platformId);
    const networkStats = await this.getNetworkStats(platformId);
    const responseTime = await this.getResponseTime(platformId);
    const throughput = await this.getThroughput(platformId);
    const errorRate = await this.getErrorRate(platformId);
    const activeUsers = await this.getActiveUsers(platformId);
    const revenue = await this.getRevenueMetrics(platformId);
    
    return {
      cpu: [{ timestamp, value: cpuUsage }],
      memory: [{ timestamp, value: memoryUsage }],
      disk: [{ timestamp, value: diskUsage }],
      network: [{ timestamp, value: networkStats.total }],
      responseTime: [{ timestamp, value: responseTime }],
      throughput: [{ timestamp, value: throughput }],
      errorRate: [{ timestamp, value: errorRate }],
      activeUsers: [{ timestamp, value: activeUsers }],
      revenue: [{ timestamp, value: revenue }]
    };
  }
  
  private async getCpuUsage(platformId: string): Promise<number> {
    // Mock CPU usage - integrate with actual monitoring
    const usage = Math.random() * 100;
    return Math.min(usage, 100);
  }
  
  private async getMemoryUsage(platformId: string): Promise<number> {
    // Mock memory usage
    const usage = Math.random() * 100;
    return Math.min(usage, 100);
  }
  
  private async getDiskUsage(platformId: string): Promise<number> {
    // Mock disk usage
    const usage = Math.random() * 100;
    return Math.min(usage, 100);
  }
  
  private async getNetworkStats(platformId: string): Promise<{ total: number; in: number; out: number }> {
    // Mock network stats in MB/s
    const total = Math.random() * 1000;
    return {
      total,
      in: total * 0.6,
      out: total * 0.4
    };
  }
  
  private async getResponseTime(platformId: string): Promise<number> {
    try {
      // Actual response time check
      const startTime = performance.now();
      
      // Make health check request to platform
      const healthUrl = this.getPlatformHealthUrl(platformId);
      await axios.get(healthUrl, { timeout: 5000 });
      
      const endTime = performance.now();
      return endTime - startTime;
    } catch (error) {
      return 5000; // Return high response time on error
    }
  }
  
  private async getThroughput(platformId: string): Promise<number> {
    // Mock throughput - would integrate with actual metrics
    return Math.floor(Math.random() * 1000) + 100;
  }
  
  private async getErrorRate(platformId: string): Promise<number> {
    // Mock error rate percentage
    return Math.random() * 5; // 0-5% error rate
  }
  
  private async getActiveUsers(platformId: string): Promise<number> {
    // Mock active users - would query actual database
    return Math.floor(Math.random() * 10000) + 1000;
  }
  
  private async getRevenueMetrics(platformId: string): Promise<number> {
    // Mock revenue - would integrate with payment systems
    return Math.floor(Math.random() * 50000) + 10000;
  }
  
  private getPlatformHealthUrl(platformId: string): string {
    // Map platform IDs to health check URLs
    const urlMap: Record<string, string> = {
      'boyfanz': process.env.BOYFANZ_HEALTH_URL || 'http://localhost:5000/health',
      'girlfanz': process.env.GIRLFANZ_HEALTH_URL || 'http://localhost:5001/health',
      'pupfanz': process.env.PUPFANZ_HEALTH_URL || 'http://localhost:5002/health',
      'transfanz': process.env.TRANSFANZ_HEALTH_URL || 'http://localhost:5003/health',
      'taboofanz': process.env.TABOOFANZ_HEALTH_URL || 'http://localhost:5004/health'
    };
    
    return urlMap[platformId] || `http://localhost:5000/health`;
  }
  
  private async checkAlertConditions(platformId: string, metrics: SystemMetrics) {
    const thresholds = this.config.alertThresholds;
    
    // Check CPU threshold
    const cpuValue = metrics.cpu[0]?.value || 0;
    if (cpuValue > thresholds.cpu) {
      this.emit('alertTriggered', {
        type: 'performance',
        severity: cpuValue > 90 ? 'critical' : 'high',
        platformId,
        metricName: 'cpu',
        currentValue: cpuValue,
        threshold: thresholds.cpu,
        title: 'High CPU Usage',
        description: `CPU usage is ${cpuValue.toFixed(1)}%, exceeding threshold of ${thresholds.cpu}%`
      });
    }
    
    // Check Memory threshold
    const memoryValue = metrics.memory[0]?.value || 0;
    if (memoryValue > thresholds.memory) {
      this.emit('alertTriggered', {
        type: 'performance',
        severity: memoryValue > 90 ? 'critical' : 'high',
        platformId,
        metricName: 'memory',
        currentValue: memoryValue,
        threshold: thresholds.memory,
        title: 'High Memory Usage',
        description: `Memory usage is ${memoryValue.toFixed(1)}%, exceeding threshold of ${thresholds.memory}%`
      });
    }
    
    // Check Response Time threshold
    const responseTimeValue = metrics.responseTime[0]?.value || 0;
    if (responseTimeValue > thresholds.responseTime) {
      this.emit('alertTriggered', {
        type: 'performance',
        severity: responseTimeValue > 3000 ? 'critical' : 'medium',
        platformId,
        metricName: 'responseTime',
        currentValue: responseTimeValue,
        threshold: thresholds.responseTime,
        title: 'High Response Time',
        description: `Response time is ${responseTimeValue.toFixed(1)}ms, exceeding threshold of ${thresholds.responseTime}ms`
      });
    }
    
    // Check Error Rate threshold
    const errorRateValue = metrics.errorRate[0]?.value || 0;
    if (errorRateValue > thresholds.errorRate) {
      this.emit('alertTriggered', {
        type: 'performance',
        severity: errorRateValue > 10 ? 'critical' : 'high',
        platformId,
        metricName: 'errorRate',
        currentValue: errorRateValue,
        threshold: thresholds.errorRate,
        title: 'High Error Rate',
        description: `Error rate is ${errorRateValue.toFixed(2)}%, exceeding threshold of ${thresholds.errorRate}%`
      });
    }
  }
  
  getMetrics(platformId?: string): SystemMetrics | Map<string, SystemMetrics> {
    if (platformId) {
      return this.metrics.get(platformId) || this.getEmptyMetrics();
    }
    return this.metrics;
  }
  
  private getEmptyMetrics(): SystemMetrics {
    return {
      cpu: [],
      memory: [],
      disk: [],
      network: [],
      responseTime: [],
      throughput: [],
      errorRate: [],
      activeUsers: [],
      revenue: []
    };
  }
}

// Alert Management System
export class AlertManager extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private alertCounter = 0;
  
  constructor() {
    super();
  }
  
  createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): Alert {
    const alert: Alert = {
      id: `alert_${++this.alertCounter}_${Date.now()}`,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      ...alertData
    };
    
    this.alerts.set(alert.id, alert);
    this.emit('alertCreated', alert);
    
    // Auto-escalate critical alerts
    if (alert.severity === 'critical') {
      this.emit('criticalAlert', alert);
    }
    
    return alert;
  }
  
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    alert.acknowledged = true;
    alert.assignedTo = acknowledgedBy;
    
    this.emit('alertAcknowledged', alert);
    return true;
  }
  
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    alert.resolved = true;
    alert.assignedTo = resolvedBy;
    
    this.emit('alertResolved', alert);
    return true;
  }
  
  getAlerts(filters?: {
    platformId?: string;
    severity?: string;
    type?: string;
    acknowledged?: boolean;
    resolved?: boolean;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());
    
    if (filters) {
      if (filters.platformId) {
        alerts = alerts.filter(a => a.platformId === filters.platformId);
      }
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.type) {
        alerts = alerts.filter(a => a.type === filters.type);
      }
      if (filters.acknowledged !== undefined) {
        alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
      }
      if (filters.resolved !== undefined) {
        alerts = alerts.filter(a => a.resolved === filters.resolved);
      }
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  getAlertSummary() {
    const alerts = Array.from(this.alerts.values());
    
    return {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      critical: alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
      high: alerts.filter(a => a.severity === 'high' && !a.resolved).length,
      medium: alerts.filter(a => a.severity === 'medium' && !a.resolved).length,
      low: alerts.filter(a => a.severity === 'low' && !a.resolved).length,
      acknowledged: alerts.filter(a => a.acknowledged && !a.resolved).length,
      resolved: alerts.filter(a => a.resolved).length
    };
  }
}

// Real-Time Analytics Engine
export class AnalyticsEngine extends EventEmitter {
  private analytics: Map<string, any> = new Map();
  private metricsCollector: MetricsCollector;
  
  constructor(metricsCollector: MetricsCollector) {
    super();
    this.metricsCollector = metricsCollector;
    this.setupMetricsListener();
  }
  
  private setupMetricsListener() {
    this.metricsCollector.on('metricsCollected', (data) => {
      this.processMetrics(data);
    });
  }
  
  private async processMetrics(data: { platformId: string; metrics: SystemMetrics; timestamp: Date }) {
    const { platformId, metrics, timestamp } = data;
    
    // Calculate analytics
    const analytics = await this.calculateAnalytics(platformId, metrics);
    
    // Store analytics
    this.analytics.set(`${platformId}_${timestamp.getTime()}`, {
      platformId,
      timestamp,
      ...analytics
    });
    
    // Emit analytics event
    this.emit('analyticsUpdated', {
      platformId,
      analytics,
      timestamp
    });
  }
  
  private async calculateAnalytics(platformId: string, metrics: SystemMetrics) {
    const cpu = metrics.cpu[0]?.value || 0;
    const memory = metrics.memory[0]?.value || 0;
    const responseTime = metrics.responseTime[0]?.value || 0;
    const throughput = metrics.throughput[0]?.value || 0;
    const errorRate = metrics.errorRate[0]?.value || 0;
    const activeUsers = metrics.activeUsers[0]?.value || 0;
    const revenue = metrics.revenue[0]?.value || 0;
    
    return {
      performance: {
        score: this.calculatePerformanceScore(cpu, memory, responseTime, errorRate),
        trend: 'stable', // Would calculate from historical data
        bottleneck: this.identifyBottleneck(cpu, memory, responseTime)
      },
      availability: {
        uptime: responseTime < 3000 ? 99.9 : 95.0,
        sla: responseTime < 1000 ? 'met' : 'violated'
      },
      usage: {
        activeUsers,
        peakHour: new Date().getHours(),
        utilization: Math.max(cpu, memory)
      },
      business: {
        revenue,
        revenuePerUser: activeUsers > 0 ? revenue / activeUsers : 0,
        conversionRate: Math.random() * 10 // Mock conversion rate
      },
      cost: {
        infrastructure: this.calculateInfrastructureCost(cpu, memory, throughput),
        efficiency: this.calculateCostEfficiency(revenue, cpu, memory)
      }
    };
  }
  
  private calculatePerformanceScore(cpu: number, memory: number, responseTime: number, errorRate: number): number {
    let score = 100;
    
    // Deduct points based on resource usage and performance
    score -= Math.max(0, (cpu - 80) * 0.5);
    score -= Math.max(0, (memory - 80) * 0.5);
    score -= Math.max(0, (responseTime - 1000) * 0.01);
    score -= errorRate * 10;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private identifyBottleneck(cpu: number, memory: number, responseTime: number): string {
    if (cpu > 80) return 'cpu';
    if (memory > 80) return 'memory';
    if (responseTime > 2000) return 'network';
    return 'none';
  }
  
  private calculateInfrastructureCost(cpu: number, memory: number, throughput: number): number {
    // Mock cost calculation based on resource usage
    const baseCost = 100; // Base monthly cost
    const cpuCost = (cpu / 100) * 50;
    const memoryCost = (memory / 100) * 30;
    const bandwidthCost = (throughput / 1000) * 10;
    
    return baseCost + cpuCost + memoryCost + bandwidthCost;
  }
  
  private calculateCostEfficiency(revenue: number, cpu: number, memory: number): number {
    const resourceCost = (cpu + memory) / 2;
    return resourceCost > 0 ? revenue / resourceCost : 0;
  }
  
  getAnalytics(platformId?: string, timeRange?: { start: Date; end: Date }) {
    let analytics = Array.from(this.analytics.values());
    
    if (platformId) {
      analytics = analytics.filter(a => a.platformId === platformId);
    }
    
    if (timeRange) {
      analytics = analytics.filter(a => 
        a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }
    
    return analytics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  generateReport(platformId?: string) {
    const analytics = this.getAnalytics(platformId);
    const latest = analytics[0];
    
    if (!latest) {
      return {
        summary: 'No data available',
        recommendations: ['Start collecting metrics to generate reports']
      };
    }
    
    return {
      summary: {
        platform: latest.platformId,
        performanceScore: latest.performance.score,
        availability: latest.availability.uptime,
        activeUsers: latest.usage.activeUsers,
        revenue: latest.business.revenue,
        cost: latest.cost.infrastructure
      },
      trends: {
        performance: latest.performance.trend,
        usage: 'growing', // Would calculate from historical data
        revenue: 'stable'
      },
      recommendations: this.generateRecommendations(latest)
    };
  }
  
  private generateRecommendations(analytics: any): string[] {
    const recommendations = [];
    
    if (analytics.performance.score < 70) {
      recommendations.push(`Improve performance - current score: ${analytics.performance.score}`);
    }
    
    if (analytics.performance.bottleneck !== 'none') {
      recommendations.push(`Address ${analytics.performance.bottleneck} bottleneck`);
    }
    
    if (analytics.availability.sla === 'violated') {
      recommendations.push('SLA violation detected - investigate response time issues');
    }
    
    if (analytics.cost.efficiency < 100) {
      recommendations.push('Optimize cost efficiency - consider resource scaling');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal');
    }
    
    return recommendations;
  }
}

// WebSocket Manager for Real-Time Updates
export class WebSocketManager {
  private wss: any;
  private clients: Set<WebSocket> = new Set();
  
  constructor(port: number = 3001) {
    // This would initialize WebSocket server
    // For now, we'll simulate the functionality
    console.log(`🔌 WebSocket server would start on port ${port}`);
  }
  
  broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data, timestamp: new Date() });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  sendToClient(clientId: string, event: string, data: any) {
    // Find specific client and send message
    const message = JSON.stringify({ event, data, timestamp: new Date() });
    // Implementation would depend on how clients are identified
  }
  
  getConnectedClients(): number {
    return this.clients.size;
  }
}

// Main Real-Time Monitoring Service
export class RealTimeMonitoringService extends EventEmitter {
  public metricsCollector: MetricsCollector;
  public alertManager: AlertManager;
  public analyticsEngine: AnalyticsEngine;
  public webSocketManager: WebSocketManager;
  
  private config: MonitoringConfig;
  
  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    
    // Initialize components
    this.metricsCollector = new MetricsCollector(config);
    this.alertManager = new AlertManager();
    this.webSocketManager = new WebSocketManager();
    this.analyticsEngine = new AnalyticsEngine(this.metricsCollector);
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    // Forward metrics to WebSocket clients
    this.metricsCollector.on('metricsCollected', (data) => {
      if (this.config.realTimeEnabled) {
        this.webSocketManager.broadcast('metricsUpdate', data);
      }
    });
    
    // Handle alerts
    this.metricsCollector.on('alertTriggered', (alertData) => {
      const alert = this.alertManager.createAlert(alertData);
      this.webSocketManager.broadcast('newAlert', alert);
    });
    
    this.alertManager.on('criticalAlert', (alert) => {
      this.handleCriticalAlert(alert);
    });
    
    // Forward analytics updates
    this.analyticsEngine.on('analyticsUpdated', (data) => {
      if (this.config.realTimeEnabled) {
        this.webSocketManager.broadcast('analyticsUpdate', data);
      }
    });
  }
  
  private async handleCriticalAlert(alert: Alert) {
    console.error('🚨 CRITICAL ALERT:', alert.title);
    
    // Send notifications (email, Slack, etc.)
    await this.sendCriticalAlertNotifications(alert);
    
    // Auto-escalate if needed
    if (alert.type === 'infrastructure' && alert.severity === 'critical') {
      this.emit('autoScale', {
        platformId: alert.platformId,
        reason: 'Critical alert triggered'
      });
    }
  }
  
  private async sendCriticalAlertNotifications(alert: Alert) {
    try {
      // Send to notification channels
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (webhookUrl) {
        await axios.post(webhookUrl, {
          text: `🚨 CRITICAL ALERT: ${alert.title}`,
          attachments: [
            {
              color: 'danger',
              fields: [
                { title: 'Platform', value: alert.platformId || 'System', short: true },
                { title: 'Metric', value: alert.metricName, short: true },
                { title: 'Current Value', value: alert.currentValue.toString(), short: true },
                { title: 'Threshold', value: alert.threshold.toString(), short: true },
                { title: 'Description', value: alert.description, short: false }
              ],
              ts: Math.floor(alert.timestamp.getTime() / 1000)
            }
          ]
        });
      }
    } catch (error) {
      console.error('Failed to send critical alert notification:', error);
    }
  }
  
  // API Methods
  getDashboardData() {
    const metrics = this.metricsCollector.getMetrics() as Map<string, SystemMetrics>;
    const alerts = this.alertManager.getAlerts();
    const alertSummary = this.alertManager.getAlertSummary();
    
    const platformMetrics: PlatformMetrics[] = [];
    
    // Convert metrics to platform metrics format
    metrics.forEach((metric, platformId) => {
      const latestCpu = metric.cpu[metric.cpu.length - 1]?.value || 0;
      const latestMemory = metric.memory[metric.memory.length - 1]?.value || 0;
      const latestResponseTime = metric.responseTime[metric.responseTime.length - 1]?.value || 0;
      
      let health: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
      
      if (latestCpu > 90 || latestMemory > 90 || latestResponseTime > 3000) {
        health = 'critical';
      } else if (latestCpu > 70 || latestMemory > 70 || latestResponseTime > 1000) {
        health = 'warning';
      }
      
      platformMetrics.push({
        platformId,
        platformName: this.formatPlatformName(platformId),
        metrics: metric,
        health,
        uptime: health === 'critical' ? 95.0 : health === 'warning' ? 98.5 : 99.9,
        version: '1.0.0',
        lastUpdated: new Date()
      });
    });
    
    return {
      platforms: platformMetrics,
      alerts: {
        recent: alerts.slice(0, 10),
        summary: alertSummary
      },
      overview: {
        totalPlatforms: platformMetrics.length,
        healthyPlatforms: platformMetrics.filter(p => p.health === 'healthy').length,
        warningPlatforms: platformMetrics.filter(p => p.health === 'warning').length,
        criticalPlatforms: platformMetrics.filter(p => p.health === 'critical').length,
        connectedClients: this.webSocketManager.getConnectedClients(),
        lastUpdated: new Date()
      }
    };
  }
  
  private formatPlatformName(platformId: string): string {
    const nameMap: Record<string, string> = {
      'boyfanz': 'BoyFanz',
      'girlfanz': 'GirlFanz',
      'pupfanz': 'PupFanz',
      'transfanz': 'TransFanz',
      'taboofanz': 'TabooFanz'
    };
    
    return nameMap[platformId] || platformId.charAt(0).toUpperCase() + platformId.slice(1);
  }
  
  getMetrics(platformId?: string, timeRange?: { start: Date; end: Date }) {
    return this.metricsCollector.getMetrics(platformId);
  }
  
  getAnalytics(platformId?: string, timeRange?: { start: Date; end: Date }) {
    return this.analyticsEngine.getAnalytics(platformId, timeRange);
  }
  
  generateReport(platformId?: string) {
    return this.analyticsEngine.generateReport(platformId);
  }
  
  // Control methods
  start() {
    this.metricsCollector.startCollection();
    console.log('🚀 Real-time monitoring service started');
  }
  
  stop() {
    this.metricsCollector.stopCollection();
    console.log('⏹️  Real-time monitoring service stopped');
  }
  
  updateConfig(newConfig: Partial<MonitoringConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart collection with new config if needed
    if (newConfig.metricsCollectionInterval || newConfig.platforms) {
      this.metricsCollector.stopCollection();
      this.metricsCollector = new MetricsCollector(this.config);
      this.setupEventHandlers();
    }
  }
}

// Export validation schemas
export const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  realTimeEnabled: z.boolean().default(true),
  retentionPeriod: z.number().min(1).max(365).default(30),
  alertThresholds: z.object({
    cpu: z.number().min(0).max(100).default(80),
    memory: z.number().min(0).max(100).default(80),
    disk: z.number().min(0).max(100).default(90),
    responseTime: z.number().min(0).default(2000),
    errorRate: z.number().min(0).max(100).default(5),
    throughput: z.number().min(0).default(100),
    availability: z.number().min(0).max(100).default(99)
  }),
  platforms: z.array(z.string()).default(['boyfanz', 'girlfanz', 'pupfanz', 'transfanz', 'taboofanz']),
  metricsCollectionInterval: z.number().min(5).max(300).default(30),
  healthCheckInterval: z.number().min(5).max(300).default(60)
});

export type MonitoringConfigInput = z.infer<typeof MonitoringConfigSchema>;