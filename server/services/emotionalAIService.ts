import { OpenAI } from "openai";

// EMOTIONAL AI - Sentiment Analysis for Fan Engagement Optimization
// Uses OpenAI to analyze emotional tone of fan interactions

export interface SentimentAnalysisResult {
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  emotions: {
    joy?: number;
    love?: number;
    excitement?: number;
    surprise?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    disgust?: number;
  };
  confidence: number; // 0-100
  keywords: string[];
  summary: string;
  engagementScore: number; // 0-100 (likelihood to convert/subscribe)
  suggestedResponse?: string;
}

export interface EmotionalInsights {
  overallSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  dominantEmotions: Array<{ emotion: string; percentage: number }>;
  engagementTrend: 'improving' | 'stable' | 'declining';
  atRiskFans: number;
  loyalFans: number;
  recommendations: string[];
}

export interface ContentAnalysis {
  predictedReaction: SentimentAnalysisResult;
  viralityScore: number; // 0-100
  controversyRisk: number; // 0-100
  suggestedOptimizations: string[];
}

// Lazy initialization
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }
  return openai;
}

export class EmotionalAIService {
  /**
   * Analyze sentiment of a single message/comment
   */
  async analyzeSentiment(text: string, context?: {
    userId?: string;
    contentId?: string;
    previousInteractions?: number;
  }): Promise<SentimentAnalysisResult> {
    const prompt = `
Analyze the emotional tone and sentiment of this fan message. Return a JSON object with:

Message: "${text}"

${context?.previousInteractions ? `Previous interactions with creator: ${context.previousInteractions}` : ''}

Return format:
{
  "sentiment": "very_positive|positive|neutral|negative|very_negative",
  "emotions": {
    "joy": 0-100,
    "love": 0-100,
    "excitement": 0-100,
    "surprise": 0-100,
    "sadness": 0-100,
    "anger": 0-100,
    "fear": 0-100,
    "disgust": 0-100
  },
  "confidence": 0-100,
  "keywords": ["word1", "word2"],
  "summary": "Brief emotional summary",
  "engagementScore": 0-100,
  "suggestedResponse": "Recommended creator response tone/approach"
}

Focus on:
- Overall sentiment (very_positive to very_negative)
- Specific emotions (only include emotions with >10% intensity)
- Engagement likelihood (0-100, based on enthusiasm/interest)
- Suggested response strategy for creator
`;

    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert emotional intelligence analyst specializing in creator-fan relationships. Analyze messages with psychological depth and provide actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        sentiment: result.sentiment || 'neutral',
        emotions: result.emotions || {},
        confidence: result.confidence || 50,
        keywords: result.keywords || [],
        summary: result.summary || 'No sentiment detected',
        engagementScore: result.engagementScore || 50,
        suggestedResponse: result.suggestedResponse,
      };
    } catch (error: any) {
      console.error('❌ Emotional AI sentiment analysis failed:', error.message);
      
      // Fallback: Simple keyword-based sentiment
      return this.fallbackSentimentAnalysis(text);
    }
  }

  /**
   * Analyze batch of messages for overall emotional insights
   */
  async analyzeEmotionalInsights(messages: Array<{
    text: string;
    userId: string;
    createdAt: Date;
  }>): Promise<EmotionalInsights> {
    if (messages.length === 0) {
      return {
        overallSentiment: 'neutral',
        dominantEmotions: [],
        engagementTrend: 'stable',
        atRiskFans: 0,
        loyalFans: 0,
        recommendations: ['No data to analyze'],
      };
    }

    // Analyze messages with concurrency limit to avoid rate limits
    const messagesToAnalyze = messages.slice(0, 50);
    const analyses: SentimentAnalysisResult[] = [];
    const BATCH_SIZE = 5; // Max 5 concurrent OpenAI calls
    
    for (let i = 0; i < messagesToAnalyze.length; i += BATCH_SIZE) {
      const batch = messagesToAnalyze.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(msg => this.analyzeSentiment(msg.text))
      );
      analyses.push(...batchResults);
      
      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < messagesToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Aggregate results
    const sentiments = analyses.map(a => a.sentiment);
    const positiveCount = sentiments.filter(s => s.includes('positive')).length;
    const negativeCount = sentiments.filter(s => s.includes('negative')).length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;

    const overallSentiment: SentimentAnalysisResult['sentiment'] = 
      positiveCount > negativeCount * 2 ? 'positive' :
      negativeCount > positiveCount * 2 ? 'negative' : 'neutral';

    // Calculate emotion frequencies
    const emotionCounts: Record<string, number> = {};
    analyses.forEach(a => {
      Object.entries(a.emotions).forEach(([emotion, score]) => {
        if (score && score > 10) {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + score;
        }
      });
    });

    const dominantEmotions = Object.entries(emotionCounts)
      .map(([emotion, total]) => ({
        emotion,
        percentage: Math.round((total / analyses.length) * 100) / 100
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    // Calculate engagement metrics
    const avgEngagement = analyses.reduce((sum, a) => sum + a.engagementScore, 0) / analyses.length;
    const atRiskFans = analyses.filter(a => a.sentiment.includes('negative') && a.engagementScore < 30).length;
    const loyalFans = analyses.filter(a => a.sentiment.includes('positive') && a.engagementScore > 70).length;

    // Determine trend (simple: compare first half vs second half)
    const firstHalf = analyses.slice(0, Math.floor(analyses.length / 2));
    const secondHalf = analyses.slice(Math.floor(analyses.length / 2));
    
    // Guard against division by zero
    const firstAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, a) => sum + a.engagementScore, 0) / firstHalf.length 
      : 50;
    const secondAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, a) => sum + a.engagementScore, 0) / secondHalf.length
      : 50;
    
    const engagementTrend: EmotionalInsights['engagementTrend'] =
      secondAvg > firstAvg + 10 ? 'improving' :
      secondAvg < firstAvg - 10 ? 'declining' : 'stable';

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (atRiskFans > 3) {
      recommendations.push(`⚠️ ${atRiskFans} fans showing signs of disengagement - consider personalized outreach`);
    }
    if (negativeCount > positiveCount) {
      recommendations.push('📉 Negative sentiment detected - review recent content and engagement strategy');
    }
    if (avgEngagement < 40) {
      recommendations.push('💡 Low engagement overall - try more interactive content (polls, Q&A, behind-the-scenes)');
    }
    if (loyalFans > messages.length * 0.3) {
      recommendations.push(`🌟 ${loyalFans} highly engaged fans - consider exclusive rewards or VIP experiences`);
    }
    if (engagementTrend === 'improving') {
      recommendations.push('📈 Engagement trending up - keep up current content strategy!');
    }

    return {
      overallSentiment,
      dominantEmotions,
      engagementTrend,
      atRiskFans,
      loyalFans,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue monitoring fan sentiment'],
    };
  }

  /**
   * Predict fan reaction to content before posting
   */
  async analyzeContentReaction(content: {
    text?: string;
    caption?: string;
    type: 'photo' | 'video' | 'text' | 'poll';
    tags?: string[];
  }): Promise<ContentAnalysis> {
    const text = content.text || content.caption || '';
    
    const prompt = `
Predict how fans will react to this content. Return JSON:

Content Type: ${content.type}
Text: "${text}"
Tags: ${content.tags?.join(', ') || 'none'}

Return format:
{
  "predictedReaction": {
    "sentiment": "very_positive|positive|neutral|negative|very_negative",
    "emotions": { "joy": 0-100, "excitement": 0-100, ... },
    "confidence": 0-100,
    "keywords": ["word1", "word2"],
    "summary": "Predicted fan reaction",
    "engagementScore": 0-100
  },
  "viralityScore": 0-100,
  "controversyRisk": 0-100,
  "suggestedOptimizations": ["suggestion1", "suggestion2"]
}

Consider:
- Emotional appeal and engagement potential
- Viral potential (shareability, trending topics)
- Controversy risk (sensitive topics, polarizing language)
- Optimization suggestions (timing, hashtags, framing)
`;

    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a content strategy expert predicting audience reactions to creator content. Provide data-driven insights for optimization."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        predictedReaction: result.predictedReaction || this.fallbackSentimentAnalysis(text),
        viralityScore: result.viralityScore || 50,
        controversyRisk: result.controversyRisk || 0,
        suggestedOptimizations: result.suggestedOptimizations || [],
      };
    } catch (error: any) {
      console.error('❌ Content reaction prediction failed:', error.message);
      
      return {
        predictedReaction: this.fallbackSentimentAnalysis(text),
        viralityScore: 50,
        controversyRisk: 0,
        suggestedOptimizations: ['AI analysis unavailable - posting as-is'],
      };
    }
  }

  /**
   * Fallback sentiment analysis (keyword-based)
   */
  private fallbackSentimentAnalysis(text: string): SentimentAnalysisResult {
    const lowerText = text.toLowerCase();
    
    // Simple keyword matching
    const positiveWords = ['love', 'amazing', 'great', 'awesome', 'beautiful', 'perfect', 'excited'];
    const negativeWords = ['hate', 'terrible', 'awful', 'disappointed', 'angry', 'sad'];
    
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
    
    const sentiment: SentimentAnalysisResult['sentiment'] = 
      positiveCount > negativeCount ? 'positive' :
      negativeCount > positiveCount ? 'negative' : 'neutral';
    
    return {
      sentiment,
      emotions: {
        joy: sentiment === 'positive' ? 60 : 20,
        sadness: sentiment === 'negative' ? 60 : 20,
      },
      confidence: 40,
      keywords: [],
      summary: 'Basic sentiment analysis (AI unavailable)',
      engagementScore: 50,
    };
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

export const emotionalAIService = new EmotionalAIService();
