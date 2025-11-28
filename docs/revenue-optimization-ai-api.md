# FANZ Revenue Optimization AI - API Documentation

## Overview

The FANZ Revenue Optimization AI provides advanced AI-driven features to help content creators maximize their earnings through dynamic pricing, optimal content scheduling, audience segmentation, and revenue prediction.

**Base URL**: `/api/revenue-ai`
**Authentication**: Required (Bearer token)
**Content-Type**: `application/json`

---

## 🤖 Dynamic Pricing AI

### Analyze Pricing Optimization

**POST** `/api/revenue-ai/pricing/analyze`

Analyzes optimal pricing for content using AI algorithms that consider conversion rates, engagement, market positioning, and price elasticity.

#### Request Body
```json
{
  "contentType": "VIDEO",
  "historicalData": {
    "conversionRate": 0.12,
    "averageRevenue": 150,
    "viewCount": 1000,
    "engagementRate": 0.08
  }
}
```

#### Parameters
- `contentType` (required): One of `VIDEO`, `PHOTO_SET`, `LIVE_STREAM`, `CUSTOM_REQUEST`, `SUBSCRIPTION`
- `historicalData` (optional): Object with performance metrics

#### Response
```json
{
  "success": true,
  "data": {
    "pricingAnalysis": {
      "suggestedPrice": 28.75,
      "confidence": 0.82,
      "reasoning": [
        "Strong conversion rate indicates pricing power",
        "High engagement suggests premium content value",
        "Optimized for revenue maximization based on 1000 data points"
      ],
      "alternatives": [
        {
          "strategy": "PREMIUM",
          "price": 33.06,
          "expectedConversion": 0.102,
          "expectedRevenue": 3.37,
          "description": "Higher price for premium positioning"
        }
      ],
      "marketComparison": "COMPETITIVE",
      "demandElasticity": "MODERATE"
    },
    "contentType": "VIDEO",
    "timestamp": "2024-01-15T10:30:00Z",
    "creatorId": "creator123"
  }
}
```

### Get Pricing History

**GET** `/api/revenue-ai/pricing/history/:creatorId`

Retrieves pricing analysis history for a creator.

#### Query Parameters
- `contentType` (optional): Filter by specific content type
- `limit` (optional): Number of records to return (default: 10)

#### Response
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "contentType": "VIDEO",
        "analyses": [
          {
            "timestamp": "2024-01-15T10:30:00Z",
            "analysis": { /* pricing analysis object */ },
            "metrics": { /* input metrics */ },
            "applied": false
          }
        ]
      }
    ],
    "totalRecords": 25,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## 📅 Content Scheduling AI

### Optimize Content Schedule

**POST** `/api/revenue-ai/scheduling/optimize`

Analyzes historical posting performance to identify optimal posting times, content type scheduling, and audience timezone patterns.

#### Request Body
```json
{
  "historicalData": {
    "postPerformance": [
      {
        "publishedAt": "2024-01-15T14:00:00Z",
        "engagementRate": 0.12,
        "revenue": 50,
        "type": "video"
      }
    ],
    "audienceTimezones": {
      "America/New_York": 0.4,
      "America/Los_Angeles": 0.3,
      "UTC": 0.3
    }
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "schedulingOptimization": {
      "optimalTimes": [
        {
          "hour": 20,
          "day": "Tuesday",
          "time": "20:00",
          "score": 0.85,
          "avgEngagement": 0.15,
          "avgRevenue": 75,
          "confidence": 0.9
        }
      ],
      "contentTypeOptimization": {
        "videos": {
          "bestTimes": [/* array of optimal times */],
          "bestDays": ["Tuesday", "Thursday", "Sunday"],
          "averageRevenue": 65.5,
          "optimalFrequency": "BI_DAILY"
        }
      },
      "weeklySchedule": {
        "Monday": [],
        "Tuesday": [
          {
            "time": "20:00",
            "expectedPerformance": 0.85,
            "confidence": 0.9
          }
        ]
      },
      "seasonalTrends": {
        "Dec": {
          "avgRevenue": 85.2,
          "totalRevenue": 1704,
          "posts": 20
        }
      },
      "audienceTimezone": "America/New_York",
      "confidence": 0.75
    },
    "creatorId": "creator123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Get Scheduling Recommendations

**GET** `/api/revenue-ai/scheduling/recommendations/:creatorId`

Retrieves quick scheduling recommendations based on cached optimization data.

#### Query Parameters
- `contentType` (optional): Filter recommendations by content type

#### Response
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "hour": 20,
        "day": "Tuesday",
        "time": "20:00",
        "score": 0.85,
        "confidence": 0.9
      }
    ],
    "weeklySchedule": { /* weekly schedule object */ },
    "contentType": "ALL",
    "confidence": 0.75,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

---

## 👥 Audience Segmentation AI

### Analyze Audience Segments

**POST** `/api/revenue-ai/audience/analyze`

Segments audience based on spending behavior, engagement patterns, and demographics to identify high-value fans, at-risk fans, and growth opportunities.

#### Request Body
```json
{
  "audienceData": {
    "fans": [
      {
        "id": "fan123",
        "totalSpent": 500,
        "lastActivity": "2024-01-15T10:00:00Z",
        "joinDate": "2023-06-01T10:00:00Z",
        "age": 28,
        "location": "New York",
        "preferredDevice": "mobile"
      }
    ]
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "audienceAnalysis": {
      "segments": [
        {
          "id": "high-value",
          "name": "High-Value VIPs",
          "size": 15,
          "averageSpending": 387.50,
          "characteristics": {
            "averageAge": 32.5,
            "topLocations": [
              { "location": "New York", "count": 8 }
            ],
            "preferredDevices": [
              { "device": "mobile", "count": 12 }
            ]
          },
          "recommendedStrategy": "Premium exclusive content and personalized experiences"
        }
      ],
      "recommendations": [
        {
          "segmentId": "high-value",
          "segmentName": "High-Value VIPs",
          "recommendations": [
            {
              "type": "CONTENT_STRATEGY",
              "description": "Premium exclusive content and personalized experiences",
              "priority": "HIGH"
            }
          ]
        }
      ],
      "targetingStrategies": {
        "high-value": {
          "contentTypes": ["photos", "videos", "custom-content", "live-streams"],
          "messagingTone": "Exclusive and appreciative",
          "promotionalFrequency": "Low frequency, high value",
          "interactionLevel": "High - Personal and direct"
        }
      },
      "growthOpportunities": [
        {
          "type": "EXPAND_HIGH_VALUE",
          "description": "Opportunity to grow high-value VIP segment through premium offerings",
          "potential": "HIGH",
          "targetIncrease": "25-50%"
        }
      ],
      "retentionInsights": {
        "averageLifetime": 145.7,
        "churnRiskFactors": [
          {
            "factor": "LOW_SPENDING",
            "impact": "HIGH",
            "description": "Fans with low spending have higher churn risk"
          }
        ],
        "retentionDrivers": [
          {
            "driver": "CONSISTENT_ENGAGEMENT",
            "impact": "HIGH",
            "description": "Regular interaction and content consumption drives retention"
          }
        ]
      }
    },
    "summary": {
      "totalSegments": 4,
      "totalRecommendations": 4,
      "growthOpportunities": 2
    }
  }
}
```

### Get Audience Segments

**GET** `/api/revenue-ai/audience/segments/:creatorId`

Retrieves stored audience segments for a creator.

#### Query Parameters
- `segmentId` (optional): Get specific segment details

---

## 💰 Revenue Prediction AI

### Predict Revenue

**POST** `/api/revenue-ai/predict`

Predicts future revenue using historical data, trend analysis, and growth factors.

#### Request Body
```json
{
  "timeframe": "MONTHLY",
  "inputData": {
    "historicalRevenue": [800, 900, 1200, 1100, 1300, 1400],
    "averageMonthlyRevenue": 1100,
    "fanCount": 750,
    "engagementRate": 0.09,
    "retentionRate": 0.82
  }
}
```

#### Parameters
- `timeframe`: `MONTHLY` or `YEARLY`
- `inputData`: Historical metrics and current performance data

#### Response
```json
{
  "success": true,
  "data": {
    "revenuePrediction": {
      "prediction": 1347.50,
      "confidence": 0.78,
      "breakdown": {
        "subscriptions": 606.38,
        "payPerView": 404.25,
        "tips": 269.50,
        "merchandise": 67.37
      },
      "growthOpportunities": [
        {
          "area": "PREMIUM_CONTENT",
          "potential": "HIGH",
          "description": "High engagement suggests audience willing to pay for premium content"
        }
      ],
      "riskFactors": []
    },
    "timeframe": "MONTHLY",
    "summary": {
      "predictedAmount": "$1347.50",
      "confidence": "78%",
      "opportunities": 2,
      "risks": 0
    }
  }
}
```

### Get Revenue Breakdown

**GET** `/api/revenue-ai/predict/breakdown/:creatorId`

Gets detailed revenue breakdown predictions.

#### Query Parameters
- `timeframe` (optional): `MONTHLY` or `YEARLY` (default: `MONTHLY`)

---

## 🎯 Comprehensive Insights

### Get All AI Insights

**POST** `/api/revenue-ai/insights/comprehensive`

Runs all AI analyses simultaneously for a complete picture.

#### Request Body
```json
{
  "inputData": {
    "pricing": { /* pricing historical data */ },
    "scheduling": { /* scheduling historical data */ },
    "audience": { /* audience data */ },
    "revenue": { /* revenue data */ }
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "insights": {
      "pricing": { /* pricing analysis results */ },
      "scheduling": { /* scheduling optimization results */ },
      "audience": { /* audience segmentation results */ },
      "revenue": { /* revenue prediction results */ },
      "errors": []
    },
    "summary": {
      "totalInsights": 4,
      "suggestedPrice": 28.75,
      "optimalPostingTimes": 3,
      "audienceSegments": 4,
      "predictedRevenue": 1347.50,
      "confidence": {
        "pricing": 0.82,
        "scheduling": 0.75,
        "revenue": 0.78
      }
    },
    "hasErrors": false
  }
}
```

---

## 📊 Dashboard & Management

### Get AI Dashboard

**GET** `/api/revenue-ai/dashboard/:creatorId`

Retrieves comprehensive dashboard data with AI insights, recommendations, and alerts.

#### Response
```json
{
  "success": true,
  "data": {
    "dashboard": {
      "pricingInsights": { /* latest pricing insights by content type */ },
      "schedulingOptimization": { /* scheduling optimization data */ },
      "audienceSegmentation": { /* audience analysis */ },
      "revenuePatterns": { /* revenue prediction data */ },
      "recommendations": [
        {
          "type": "GROWTH_OPPORTUNITY",
          "title": "EXPAND_HIGH_VALUE",
          "description": "Opportunity to grow high-value VIP segment through premium offerings",
          "priority": "HIGH",
          "action": "Review audience segmentation for details"
        }
      ],
      "alerts": [
        {
          "type": "WARNING",
          "title": "HIGH_CHURN",
          "description": "Poor retention rate threatens consistent revenue",
          "impact": "HIGH",
          "timestamp": "2024-01-15T10:30:00Z"
        }
      ]
    },
    "summary": {
      "hasData": true,
      "dataTypes": ["pricingInsights", "schedulingOptimization", "audienceSegmentation"],
      "recommendationsCount": 2,
      "alertsCount": 1
    }
  }
}
```

### Get System Status (Admin Only)

**GET** `/api/revenue-ai/status`

Retrieves system status and metrics for administrators.

#### Response
```json
{
  "success": true,
  "data": {
    "systemStatus": {
      "pricingModels": 42,
      "schedulingOptimizers": 38,
      "audienceSegments": 35,
      "revenuePatterns": 40,
      "performanceMetrics": 0,
      "aiConfig": {
        "learningRate": 0.01,
        "confidenceThreshold": 0.75,
        "maxPriceAdjustment": 0.3,
        "optimizationInterval": 3600000,
        "minDataPoints": 10
      },
      "status": "OPERATIONAL",
      "lastUpdated": "2024-01-15T10:30:00Z"
    },
    "metrics": {
      "totalCreatorsWithPricing": 42,
      "totalSchedulingOptimizations": 38,
      "totalAudienceAnalyses": 35,
      "totalRevenuePatterns": 40
    }
  }
}
```

---

## 🔒 Authentication & Authorization

All endpoints require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.boyfanz.com/api/revenue-ai/pricing/analyze
```

### Access Control
- **Creator Access**: Can access their own data only
- **Admin Access**: Can access all creator data and system status
- **Authorization Check**: Each endpoint validates user permissions

---

## 💡 Usage Examples

### Complete AI Analysis Workflow

```javascript
// 1. Get comprehensive insights
const insights = await fetch('/api/revenue-ai/insights/comprehensive', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    inputData: {
      pricing: { conversionRate: 0.12, viewCount: 1000 },
      audience: { fans: [...] },
      revenue: { averageMonthlyRevenue: 1100 }
    }
  })
});

// 2. Apply pricing recommendations
const pricingAnalysis = insights.data.insights.pricing;
console.log(`Suggested price: $${pricingAnalysis.suggestedPrice}`);

// 3. Schedule content optimally
const scheduling = insights.data.insights.scheduling;
const nextPostTime = scheduling.optimalTimes[0];
console.log(`Best time to post: ${nextPostTime.time} on ${nextPostTime.day}`);

// 4. Target high-value audience
const audience = insights.data.insights.audience;
const vipSegment = audience.segments.find(s => s.id === 'high-value');
console.log(`VIP segment: ${vipSegment.size} fans, avg spending $${vipSegment.averageSpending}`);
```

---

## 🛡️ Compliance & Best Practices

### Adult Industry Compliance
- **Payment Processors**: Only adult-friendly processors (CCBill, Segpay, Epoch, Vendo, Verotel) are referenced
- **Content Guidelines**: All recommendations comply with adult content platform standards
- **Privacy**: GDPR-compliant data handling with explicit consent requirements

### Creator-First Philosophy
- All recommendations focus on increasing creator earnings, control, and safety
- Transparent AI reasoning provided for all suggestions
- No hidden fees or dark patterns in recommendations
- Creator data ownership and control maintained

### Security Features
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration for approved domains

### Performance Standards
- API response times < 300ms (P95)
- 99.9% uptime SLA
- Automatic scaling for traffic spikes
- CDN optimization for global access

---

## 🔧 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information (development only)"
}
```

### Common Error Codes
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 📈 Rate Limits

- **Standard Users**: 100 requests per minute
- **Premium Users**: 300 requests per minute
- **Admin Users**: 1000 requests per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642780800
```

---

*Built with ❤️ for the FANZ creator economy*
*© 2024 FANZ Unlimited Network - Adult-friendly, creator-first AI platform*