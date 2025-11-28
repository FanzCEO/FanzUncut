// FANZ Revenue Optimization AI - Smoke Tests
// Basic integration tests to ensure endpoints are working

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import RevenueOptimizationAI from '../server/services/revenueOptimizationAI.js';

describe('Revenue Optimization AI Service', () => {
  let revenueAI;

  beforeAll(() => {
    revenueAI = new RevenueOptimizationAI();
  });

  describe('Dynamic Pricing AI', () => {
    it('should analyze pricing optimization for VIDEO content', async () => {
      const result = await revenueAI.analyzePricingOptimization(
        'test-creator-123',
        'VIDEO',
        {
          conversionRate: 0.12,
          averageRevenue: 150,
          viewCount: 1000,
          engagementRate: 0.08
        }
      );

      expect(result).toHaveProperty('suggestedPrice');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('alternatives');
      expect(result).toHaveProperty('marketComparison');
      expect(result).toHaveProperty('demandElasticity');

      expect(typeof result.suggestedPrice).toBe('number');
      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(Array.isArray(result.alternatives)).toBe(true);
      expect(result.alternatives).toHaveLength(3); // premium, competitive, penetration
    });

    it('should handle different content types with appropriate price ranges', async () => {
      const contentTypes = ['VIDEO', 'PHOTO_SET', 'LIVE_STREAM', 'CUSTOM_REQUEST', 'SUBSCRIPTION'];
      
      for (const contentType of contentTypes) {
        const result = await revenueAI.analyzePricingOptimization(
          'test-creator-456',
          contentType,
          {
            conversionRate: 0.1,
            averageRevenue: 100,
            viewCount: 500,
            engagementRate: 0.05
          }
        );

        expect(result.suggestedPrice).toBeGreaterThan(0);
        expect(['PREMIUM', 'COMPETITIVE', 'BUDGET']).toContain(result.marketComparison);
        expect(['HIGH', 'MODERATE', 'LOW']).toContain(result.demandElasticity);
      }
    });
  });

  describe('Content Scheduling AI', () => {
    it('should optimize content scheduling with performance data', async () => {
      const historicalData = {
        postPerformance: [
          {
            publishedAt: '2024-01-15T14:00:00Z',
            engagementRate: 0.12,
            revenue: 50,
            type: 'video'
          },
          {
            publishedAt: '2024-01-16T18:00:00Z',
            engagementRate: 0.08,
            revenue: 30,
            type: 'photo'
          },
          {
            publishedAt: '2024-01-17T20:00:00Z',
            engagementRate: 0.15,
            revenue: 75,
            type: 'video'
          }
        ],
        audienceTimezones: {
          'America/New_York': 0.4,
          'America/Los_Angeles': 0.3,
          'UTC': 0.3
        }
      };

      const result = await revenueAI.optimizeContentScheduling(
        'test-creator-789',
        historicalData
      );

      expect(result).toHaveProperty('optimalTimes');
      expect(result).toHaveProperty('contentTypeOptimization');
      expect(result).toHaveProperty('weeklySchedule');
      expect(result).toHaveProperty('seasonalTrends');
      expect(result).toHaveProperty('audienceTimezone');
      expect(result).toHaveProperty('confidence');

      expect(Array.isArray(result.optimalTimes)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.audienceTimezone).toBe('America/New_York'); // Should pick the highest percentage
    });

    it('should handle empty performance data gracefully', async () => {
      const result = await revenueAI.optimizeContentScheduling(
        'test-creator-empty',
        { postPerformance: [], audienceTimezones: {} }
      );

      expect(result).toHaveProperty('optimalTimes');
      expect(result).toHaveProperty('confidence');
      expect(result.optimalTimes).toHaveLength(0); // No data = no optimal times
      expect(result.audienceTimezone).toBe('UTC'); // Default timezone
    });
  });

  describe('Audience Segmentation AI', () => {
    it('should analyze audience segments with fan data', async () => {
      const audienceData = {
        fans: [
          {
            id: 'fan1',
            totalSpent: 500,
            lastActivity: '2024-01-15T10:00:00Z',
            joinDate: '2023-06-01T10:00:00Z',
            age: 28,
            location: 'New York',
            preferredDevice: 'mobile'
          },
          {
            id: 'fan2',
            totalSpent: 50,
            lastActivity: '2024-01-10T15:00:00Z',
            joinDate: '2023-12-01T10:00:00Z',
            age: 35,
            location: 'California',
            preferredDevice: 'desktop'
          },
          {
            id: 'fan3',
            totalSpent: 200,
            lastActivity: '2023-11-15T10:00:00Z', // At-risk fan (old activity)
            joinDate: '2023-03-01T10:00:00Z',
            age: 22,
            location: 'Texas',
            preferredDevice: 'mobile'
          }
        ]
      };

      const result = await revenueAI.analyzeAudienceSegments(
        'test-creator-segments',
        audienceData
      );

      expect(result).toHaveProperty('segments');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('targetingStrategies');
      expect(result).toHaveProperty('growthOpportunities');
      expect(result).toHaveProperty('retentionInsights');

      expect(Array.isArray(result.segments)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.growthOpportunities)).toBe(true);
      
      // Should identify high-value, regular-supporters, casual-fans, and at-risk segments
      const segmentIds = result.segments.map(s => s.id);
      expect(segmentIds).toContain('high-value'); // fan1 with $500 spent
      expect(segmentIds).toContain('at-risk'); // fan3 with old last activity

      // Each segment should have characteristics
      result.segments.forEach(segment => {
        expect(segment).toHaveProperty('id');
        expect(segment).toHaveProperty('name');
        expect(segment).toHaveProperty('size');
        expect(segment).toHaveProperty('averageSpending');
        expect(segment).toHaveProperty('recommendedStrategy');
        expect(typeof segment.size).toBe('number');
        expect(typeof segment.averageSpending).toBe('number');
      });
    });
  });

  describe('Revenue Prediction AI', () => {
    it('should predict monthly revenue with confidence scoring', async () => {
      const inputData = {
        historicalRevenue: [800, 900, 1200, 1100, 1300, 1400], // 6 months
        averageMonthlyRevenue: 1100,
        fanCount: 750,
        engagementRate: 0.09,
        retentionRate: 0.82
      };

      const result = await revenueAI.predictRevenue(
        'test-creator-revenue',
        'MONTHLY',
        inputData
      );

      expect(result).toHaveProperty('prediction');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('growthOpportunities');
      expect(result).toHaveProperty('riskFactors');

      expect(typeof result.prediction).toBe('number');
      expect(result.prediction).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Check breakdown structure
      expect(result.breakdown).toHaveProperty('subscriptions');
      expect(result.breakdown).toHaveProperty('payPerView');
      expect(result.breakdown).toHaveProperty('tips');
      expect(result.breakdown).toHaveProperty('merchandise');

      // Ensure breakdown adds up to prediction (within rounding tolerance)
      const totalBreakdown = Object.values(result.breakdown).reduce((sum, val) => sum + val, 0);
      expect(Math.abs(totalBreakdown - result.prediction)).toBeLessThan(1); // Within $1 due to rounding
    });

    it('should predict yearly revenue with seasonal adjustments', async () => {
      const inputData = {
        historicalRevenue: [1000, 1100, 1200],
        averageMonthlyRevenue: 1100,
        fanCount: 500,
        engagementRate: 0.1,
        retentionRate: 0.8
      };

      const result = await revenueAI.predictRevenue(
        'test-creator-yearly',
        'YEARLY',
        inputData
      );

      expect(result.prediction).toBeGreaterThan(inputData.averageMonthlyRevenue * 10); // At least 10x monthly (considering growth)
      expect(result.prediction).toBeLessThan(inputData.averageMonthlyRevenue * 15); // But not unrealistically high
    });
  });

  describe('System Status', () => {
    it('should provide system status information', () => {
      const status = revenueAI.getSystemStatus();

      expect(status).toHaveProperty('pricingModels');
      expect(status).toHaveProperty('schedulingOptimizers');
      expect(status).toHaveProperty('audienceSegments');
      expect(status).toHaveProperty('revenuePatterns');
      expect(status).toHaveProperty('performanceMetrics');
      expect(status).toHaveProperty('aiConfig');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('lastUpdated');

      expect(status.status).toBe('OPERATIONAL');
      expect(typeof status.pricingModels).toBe('number');
      expect(typeof status.schedulingOptimizers).toBe('number');
      expect(typeof status.audienceSegments).toBe('number');
      expect(status.aiConfig).toHaveProperty('learningRate');
      expect(status.aiConfig).toHaveProperty('confidenceThreshold');
      expect(status.aiConfig).toHaveProperty('maxPriceAdjustment');
    });
  });

  describe('Data Persistence', () => {
    it('should store and retrieve pricing analysis history', async () => {
      const creatorId = 'test-persistence-123';
      const contentType = 'VIDEO';

      // Run multiple analyses
      await revenueAI.analyzePricingOptimization(creatorId, contentType, { conversionRate: 0.1 });
      await revenueAI.analyzePricingOptimization(creatorId, contentType, { conversionRate: 0.15 });
      
      // Check if data is stored
      const key = `${creatorId}_${contentType}`;
      const history = revenueAI.pricingModels.get(key);
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);

      // Each history entry should have required fields
      history.forEach(entry => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('analysis');
        expect(entry).toHaveProperty('metrics');
        expect(entry).toHaveProperty('applied');
        expect(typeof entry.applied).toBe('boolean');
      });
    });

    it('should limit pricing history to 50 entries', async () => {
      const creatorId = 'test-limit-456';
      const contentType = 'PHOTO_SET';

      // Add 55 analyses (more than the limit)
      for (let i = 0; i < 55; i++) {
        await revenueAI.analyzePricingOptimization(creatorId, contentType, { 
          conversionRate: 0.1 + (i * 0.001) 
        });
      }

      const key = `${creatorId}_${contentType}`;
      const history = revenueAI.pricingModels.get(key);
      
      expect(history).toBeDefined();
      expect(history.length).toBe(50); // Should be capped at 50
    });
  });

  // Edge cases and error handling
  describe('Error Handling', () => {
    it('should handle invalid content type gracefully', async () => {
      await expect(
        revenueAI.analyzePricingOptimization('test', 'INVALID_TYPE', {})
      ).resolves.not.toThrow(); // Should not throw, should use default
    });

    it('should handle empty historical data', async () => {
      const result = await revenueAI.optimizeContentScheduling('test', {});
      expect(result).toBeDefined();
      expect(result.optimalTimes).toEqual([]);
    });

    it('should handle audience data without fans', async () => {
      const result = await revenueAI.analyzeAudienceSegments('test', {});
      expect(result).toBeDefined();
      expect(result.segments).toEqual([]);
    });
  });
});

// Compliance Tests - Ensure adult industry best practices
describe('FANZ Compliance Tests', () => {
  it('should not reference banned payment processors', async () => {
    const ai = new RevenueOptimizationAI();
    
    // Test all text outputs for banned processors
    const pricingResult = await ai.analyzePricingOptimization('test', 'VIDEO', {});
    const schedulingResult = await ai.optimizeContentScheduling('test', {});
    const audienceResult = await ai.analyzeAudienceSegments('test', { fans: [] });
    const revenueResult = await ai.predictRevenue('test', 'MONTHLY', {});
    
    const allText = JSON.stringify([pricingResult, schedulingResult, audienceResult, revenueResult]);
    
    // Should not contain banned payment processors (per rules)
    expect(allText.toLowerCase()).not.toContain('stripe');
    expect(allText.toLowerCase()).not.toContain('paypal');
  });

  it('should maintain creator-first messaging in recommendations', async () => {
    const ai = new RevenueOptimizationAI();
    const audienceData = {
      fans: [
        { id: 'test', totalSpent: 100, lastActivity: new Date().toISOString(), joinDate: '2023-01-01' }
      ]
    };
    
    const result = await ai.analyzeAudienceSegments('test-creator', audienceData);
    
    // All recommendations should focus on creator benefit
    result.recommendations.forEach(rec => {
      rec.recommendations.forEach(r => {
        expect(r.description.toLowerCase()).toMatch(/(creator|earnings|income|revenue|benefit|value)/);
      });
    });
  });

  it('should use FANZ branding consistently', () => {
    const ai = new RevenueOptimizationAI();
    const status = ai.getSystemStatus();
    
    // System should identify as FANZ service
    expect(JSON.stringify(status)).toContain('Revenue Optimization AI');
    // Should not contain old "FUN" branding
    expect(JSON.stringify(status).toLowerCase()).not.toContain(' fun ');
  });
});