import { storage } from '../storage';
import { aiModerationService } from './aiModerationService';
import { nanoid } from 'nanoid';

interface MessageValidationResult {
  isValid: boolean;
  risk: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  sanitizedContent?: string;
  moderationRequired: boolean;
  autoReject: boolean;
}

interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
  riskFactors: {
    duplicateContent: boolean;
    rapidPosting: boolean;
    suspiciousPatterns: boolean;
    blacklistedTerms: boolean;
  };
}

// Comprehensive message security and validation service
class MessageSecurityService {
  private messageCache = new Map<string, any>();
  private rateLimitCache = new Map<string, { count: number; resetTime: number }>();
  private spamPatterns = new Set([
    /(\b(?:click|visit|check)\s+(?:here|this|link))/i,
    /(\b(?:free|cheap|discount|sale)\s+(?:porn|sex|adult))/i,
    /(telegram|whatsapp|kik|snap|discord).*(@|username|contact)/i,
    /(\$\d+|\d+\$|\bmoney\b|\bcash\b|\bpayment\b).*(\bquick\b|\bfast\b|\beasy\b)/i,
    /(bitcoin|crypto|investment|trading).*guaranteed/i
  ]);
  
  private blacklistedTerms = new Set([
    'underage', 'minor', 'child', 'teen', 'young', 'schoolgirl',
    'rape', 'forced', 'non-consent', 'abuse', 'violence',
    'drugs', 'substance', 'illegal', 'piracy', 'hack'
  ]);

  // Main message validation pipeline
  async validateMessage(params: {
    senderId: string;
    recipientId: string;
    content: string;
    messageType: 'text' | 'image' | 'video' | 'audio';
    mediaUrl?: string;
    priceCents?: number;
    metadata?: Record<string, any>;
  }): Promise<MessageValidationResult> {
    try {
      const { senderId, recipientId, content, messageType, mediaUrl, priceCents } = params;

      // Initialize validation result
      const result: MessageValidationResult = {
        isValid: true,
        risk: 'low',
        flags: [],
        moderationRequired: false,
        autoReject: false
      };

      // 1. Rate limiting check
      const rateLimitResult = await this.checkRateLimit(senderId);
      if (!rateLimitResult.allowed) {
        result.isValid = false;
        result.risk = 'high';
        result.flags.push('rate_limit_exceeded');
        result.autoReject = true;
        return result;
      }

      // 2. Spam detection
      const spamResult = await this.detectSpam(senderId, content);
      if (spamResult.isSpam) {
        result.risk = spamResult.confidence > 0.8 ? 'critical' : 'high';
        result.flags.push('spam_detected');
        result.flags.push(...spamResult.reasons);
        
        if (spamResult.confidence > 0.9) {
          result.autoReject = true;
          result.isValid = false;
        } else {
          result.moderationRequired = true;
        }
      }

      // 3. Content validation and sanitization
      const contentResult = await this.validateAndSanitizeContent(content);
      if (!contentResult.isValid) {
        result.isValid = false;
        result.risk = 'critical';
        result.flags.push(...contentResult.flags);
        result.autoReject = true;
      } else {
        result.sanitizedContent = contentResult.sanitizedContent;
        if (contentResult.flags.length > 0) {
          result.flags.push(...contentResult.flags);
          result.risk = contentResult.risk;
          result.moderationRequired = true;
        }
      }

      // 4. Media content validation
      if (mediaUrl && (messageType === 'image' || messageType === 'video')) {
        const mediaResult = await this.validateMediaContent(mediaUrl, messageType);
        if (!mediaResult.isValid) {
          result.isValid = false;
          result.risk = 'critical';
          result.flags.push(...mediaResult.flags);
          result.autoReject = true;
        } else if (mediaResult.requiresModeration) {
          result.moderationRequired = true;
          result.risk = 'medium';
        }
      }

      // 5. User behavior analysis
      const behaviorResult = await this.analyzeUserBehavior(senderId, recipientId);
      if (behaviorResult.suspicious) {
        result.flags.push(...behaviorResult.flags);
        result.risk = behaviorResult.severity;
        if (behaviorResult.severity === 'critical') {
          result.moderationRequired = true;
        }
      }

      // 6. Payment validation for paid messages
      if (priceCents && priceCents > 0) {
        const paymentResult = await this.validatePaymentMessage(senderId, priceCents, content);
        if (!paymentResult.isValid) {
          result.flags.push(...paymentResult.flags);
          result.risk = 'high';
          result.moderationRequired = true;
        }
      }

      // 7. Final risk assessment
      result.risk = this.calculateOverallRisk(result.flags);

      // Log validation result for monitoring
      await this.logValidationResult(senderId, recipientId, result);

      console.log(`🛡️ Message validation: ${senderId} → ${recipientId} | Risk: ${result.risk} | Flags: ${result.flags.length}`);
      return result;

    } catch (error) {
      console.error('Message validation failed:', error);
      return {
        isValid: false,
        risk: 'critical',
        flags: ['validation_error'],
        moderationRequired: true,
        autoReject: false
      };
    }
  }

  // Rate limiting for message sending
  private async checkRateLimit(userId: string): Promise<{ allowed: boolean; resetTime?: number }> {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxMessages = 30; // 30 messages per minute

    const key = `rate_limit_${userId}`;
    const existing = this.rateLimitCache.get(key);

    if (!existing || now > existing.resetTime) {
      // New window
      this.rateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }

    if (existing.count >= maxMessages) {
      return { allowed: false, resetTime: existing.resetTime };
    }

    existing.count++;
    return { allowed: true };
  }

  // Advanced spam detection with ML patterns
  private async detectSpam(senderId: string, content: string): Promise<SpamDetectionResult> {
    const result: SpamDetectionResult = {
      isSpam: false,
      confidence: 0,
      reasons: [],
      riskFactors: {
        duplicateContent: false,
        rapidPosting: false,
        suspiciousPatterns: false,
        blacklistedTerms: false
      }
    };

    // Check for spam patterns
    for (const pattern of this.spamPatterns) {
      if (pattern.test(content)) {
        result.riskFactors.suspiciousPatterns = true;
        result.reasons.push('suspicious_pattern_detected');
        result.confidence += 0.3;
      }
    }

    // Check for blacklisted terms
    const lowerContent = content.toLowerCase();
    for (const term of this.blacklistedTerms) {
      if (lowerContent.includes(term)) {
        result.riskFactors.blacklistedTerms = true;
        result.reasons.push('blacklisted_term');
        result.confidence += 0.4;
      }
    }

    // Check for duplicate content
    const recentMessages = await this.getRecentUserMessages(senderId, 10);
    const duplicateCount = recentMessages.filter(msg => 
      this.calculateContentSimilarity(msg.content, content) > 0.8
    ).length;

    if (duplicateCount > 2) {
      result.riskFactors.duplicateContent = true;
      result.reasons.push('duplicate_content');
      result.confidence += 0.5;
    }

    // Check posting frequency
    const recentCount = recentMessages.length;
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const rapidPosts = recentMessages.filter(msg => 
      Date.now() - new Date(msg.createdAt).getTime() < timeWindow
    ).length;

    if (rapidPosts > 10) {
      result.riskFactors.rapidPosting = true;
      result.reasons.push('rapid_posting');
      result.confidence += 0.3;
    }

    // Additional spam indicators
    if (content.includes('http') && !content.includes('boyfanz.com')) {
      result.reasons.push('external_link');
      result.confidence += 0.2;
    }

    if (content.length > 500 && (content.match(/[A-Z]/g) || []).length / content.length > 0.5) {
      result.reasons.push('excessive_caps');
      result.confidence += 0.2;
    }

    result.isSpam = result.confidence > 0.5;
    result.confidence = Math.min(result.confidence, 1.0);

    return result;
  }

  // Content validation and sanitization
  private async validateAndSanitizeContent(content: string): Promise<{
    isValid: boolean;
    sanitizedContent: string;
    flags: string[];
    risk: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const result = {
      isValid: true,
      sanitizedContent: content,
      flags: [] as string[],
      risk: 'low' as 'low' | 'medium' | 'high' | 'critical'
    };

    // Basic sanitization
    result.sanitizedContent = content
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .trim();

    // Length validation
    if (content.length > 2000) {
      result.flags.push('content_too_long');
      result.risk = 'medium';
      result.sanitizedContent = result.sanitizedContent.substring(0, 2000);
    }

    // Prohibited content check
    const prohibitedPatterns = [
      /\b(?:child|minor|underage)\b.*\b(?:porn|sex|nude)\b/i,
      /\b(?:rape|forced|non-consent)\b/i,
      /\b(?:drugs|cocaine|heroin|meth)\b.*\b(?:sell|buy|trade)\b/i,
      /\b(?:hack|piracy|illegal)\b.*\b(?:content|software|service)\b/i
    ];

    for (const pattern of prohibitedPatterns) {
      if (pattern.test(content)) {
        result.isValid = false;
        result.risk = 'critical';
        result.flags.push('prohibited_content');
        break;
      }
    }

    // Suspicious financial terms
    if (/\b(?:bitcoin|crypto|investment)\b.*\b(?:guaranteed|profits|returns)\b/i.test(content)) {
      result.flags.push('financial_scam_indicator');
      result.risk = 'high';
    }

    // Personal information exposure
    if (/\b(?:\d{3}-\d{2}-\d{4}|\d{4}\s\d{4}\s\d{4}\s\d{4})\b/.test(content)) {
      result.flags.push('personal_info_exposure');
      result.risk = 'high';
    }

    return result;
  }

  // Media content validation using AI moderation
  private async validateMediaContent(mediaUrl: string, mediaType: string): Promise<{
    isValid: boolean;
    requiresModeration: boolean;
    flags: string[];
  }> {
    try {
      // Use AI moderation service for content analysis
      const moderationResult = await aiModerationService.moderateMedia(mediaUrl, mediaType as any);

      const result = {
        isValid: true,
        requiresModeration: false,
        flags: [] as string[]
      };

      if (moderationResult.isUnsafe) {
        if (moderationResult.confidence > 0.9) {
          result.isValid = false;
          result.flags.push('unsafe_content_detected');
        } else {
          result.requiresModeration = true;
          result.flags.push('potential_unsafe_content');
        }
      }

      if (moderationResult.categories.includes('csam') || moderationResult.categories.includes('underage')) {
        result.isValid = false;
        result.flags.push('illegal_content_detected');
      }

      return result;

    } catch (error) {
      console.error('Media validation failed:', error);
      return {
        isValid: false,
        requiresModeration: true,
        flags: ['media_validation_error']
      };
    }
  }

  // User behavior analysis for suspicious activity
  private async analyzeUserBehavior(senderId: string, recipientId: string): Promise<{
    suspicious: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    flags: string[];
  }> {
    const result = {
      suspicious: false,
      severity: 'low' as 'low' | 'medium' | 'high' | 'critical',
      flags: [] as string[]
    };

    try {
      // Check for mass messaging patterns
      const recentRecipients = await this.getRecentMessageRecipients(senderId, 24); // Last 24 hours
      if (recentRecipients.length > 50) {
        result.suspicious = true;
        result.severity = 'high';
        result.flags.push('mass_messaging_detected');
      }

      // Check for new account suspicious activity
      const sender = await storage.getUser(senderId);
      if (sender) {
        const accountAge = Date.now() - new Date(sender.createdAt).getTime();
        const daysSinceCreation = accountAge / (24 * 60 * 60 * 1000);
        
        if (daysSinceCreation < 1 && recentRecipients.length > 10) {
          result.suspicious = true;
          result.severity = 'critical';
          result.flags.push('new_account_mass_messaging');
        }
      }

      // Check for conversation patterns
      const conversationHistory = await storage.getConversationMessages(senderId, recipientId, 10);
      if (conversationHistory.length === 0) {
        // First message to this recipient
        const firstMessageToMultiple = recentRecipients.filter(r => r !== recipientId).length;
        if (firstMessageToMultiple > 20) {
          result.suspicious = true;
          result.severity = 'medium';
          result.flags.push('cold_outreach_pattern');
        }
      }

      return result;

    } catch (error) {
      console.error('User behavior analysis failed:', error);
      return result;
    }
  }

  // Validate paid messages for potential fraud
  private async validatePaymentMessage(senderId: string, priceCents: number, content: string): Promise<{
    isValid: boolean;
    flags: string[];
  }> {
    const result = {
      isValid: true,
      flags: [] as string[]
    };

    // Check for unreasonable pricing
    if (priceCents > 500000) { // $5000+
      result.flags.push('excessive_price');
    }

    if (priceCents < 100) { // Under $1
      result.flags.push('suspiciously_low_price');
    }

    // Check content-price mismatch
    if (content.length < 10 && priceCents > 5000) { // Short content, high price
      result.flags.push('content_price_mismatch');
    }

    // Check for payment scam indicators
    if (/\b(?:send|pay|money)\b.*\b(?:first|advance|upfront)\b/i.test(content)) {
      result.isValid = false;
      result.flags.push('advance_payment_scam');
    }

    return result;
  }

  // Calculate overall risk based on flags
  private calculateOverallRisk(flags: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalFlags = ['prohibited_content', 'illegal_content_detected', 'advance_payment_scam'];
    const highFlags = ['spam_detected', 'unsafe_content_detected', 'mass_messaging_detected', 'financial_scam_indicator'];
    const mediumFlags = ['suspicious_pattern_detected', 'duplicate_content', 'potential_unsafe_content'];

    if (flags.some(flag => criticalFlags.includes(flag))) return 'critical';
    if (flags.some(flag => highFlags.includes(flag))) return 'high';
    if (flags.some(flag => mediumFlags.includes(flag))) return 'medium';
    return 'low';
  }

  // Helper methods
  private async getRecentUserMessages(userId: string, limit: number): Promise<any[]> {
    try {
      return await storage.getRecentUserMessages(userId, limit);
    } catch (error) {
      console.error('Failed to get recent messages:', error);
      return [];
    }
  }

  private async getRecentMessageRecipients(userId: string, hours: number): Promise<string[]> {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      return await storage.getMessageRecipientsSince(userId, cutoff);
    } catch (error) {
      console.error('Failed to get message recipients:', error);
      return [];
    }
  }

  private calculateContentSimilarity(content1: string, content2: string): number {
    // Simple similarity calculation based on character overlap
    const set1 = new Set(content1.toLowerCase().split(''));
    const set2 = new Set(content2.toLowerCase().split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private async logValidationResult(senderId: string, recipientId: string, result: MessageValidationResult): Promise<void> {
    try {
      await storage.createAuditLog({
        actorId: senderId,
        action: 'message_validation',
        targetType: 'message',
        targetId: `${senderId}-${recipientId}`,
        diffJson: {
          risk: result.risk,
          flags: result.flags,
          moderationRequired: result.moderationRequired,
          autoReject: result.autoReject
        }
      });
    } catch (error) {
      console.error('Failed to log validation result:', error);
    }
  }

  // Cleanup rate limit cache
  async cleanupCache(): Promise<void> {
    const now = Date.now();
    const expiredKeys = Array.from(this.rateLimitCache.entries())
      .filter(([_, data]) => now > data.resetTime)
      .map(([key]) => key);
    
    expiredKeys.forEach(key => this.rateLimitCache.delete(key));
  }
}

export const messageSecurityService = new MessageSecurityService();