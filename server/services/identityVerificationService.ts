import { storage } from '../storage';
import { performanceOptimizationService } from './performanceOptimizationService';

interface KYCVerificationRequest {
  id: string;
  userId: string;
  type: 'basic' | 'enhanced' | 'business';
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';
  documents: {
    type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
    url: string;
    uploadedAt: Date;
    verified: boolean;
  }[];
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    phoneNumber: string;
    nationality: string;
  };
  verificationLevel: 'none' | 'basic' | 'enhanced' | 'business';
  riskScore: number;
  amlChecks: {
    sanctionsList: boolean;
    pepCheck: boolean;
    adverseMedia: boolean;
    completed: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

interface ComplianceThresholds {
  basicVerification: number; // $500
  enhancedVerification: number; // $3000
  businessVerification: number; // $10000
  amlReportingThreshold: number; // $10000
  suspiciousActivityThreshold: number; // $5000
}

interface FraudDetectionResult {
  isSuspicious: boolean;
  riskScore: number;
  flags: string[];
  recommendedAction: 'approve' | 'review' | 'reject' | 'freeze';
  reasons: string[];
  confidence: number;
}

// Comprehensive identity verification and compliance service
class IdentityVerificationService {
  private verificationCache = new Map<string, KYCVerificationRequest>();
  private riskScoreCache = new Map<string, number>();
  
  private complianceThresholds: ComplianceThresholds = {
    basicVerification: 50000, // $500
    enhancedVerification: 300000, // $3000  
    businessVerification: 1000000, // $10000
    amlReportingThreshold: 1000000, // $10000
    suspiciousActivityThreshold: 500000 // $5000
  };

  // ===== KYC VERIFICATION WORKFLOW =====

  // Initiate KYC verification process
  async initiateKYCVerification(params: {
    userId: string;
    type: 'basic' | 'enhanced' | 'business';
    personalInfo: any;
    documents: { type: string; url: string }[];
  }): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      console.log(`🔍 Initiating ${params.type} KYC verification for user: ${params.userId}`);

      // Check if user already has pending verification
      const existingVerification = await this.getUserActiveVerification(params.userId);
      if (existingVerification) {
        return { 
          success: false, 
          error: 'User already has an active verification request' 
        };
      }

      // Validate documents
      const documentValidation = await this.validateDocuments(params.documents);
      if (!documentValidation.isValid) {
        return { 
          success: false, 
          error: documentValidation.error || 'Invalid documents provided' 
        };
      }

      const verificationId = `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const kycRequest: KYCVerificationRequest = {
        id: verificationId,
        userId: params.userId,
        type: params.type,
        status: 'pending',
        documents: params.documents.map(doc => ({
          type: doc.type as any,
          url: doc.url,
          uploadedAt: new Date(),
          verified: false
        })),
        personalInfo: params.personalInfo,
        verificationLevel: 'none',
        riskScore: 0,
        amlChecks: {
          sanctionsList: false,
          pepCheck: false,
          adverseMedia: false,
          completed: false,
          riskLevel: 'low'
        },
        submittedAt: new Date(),
        expiresAt
      };

      // Store verification request
      await storage.createKYCVerification(kycRequest);
      this.verificationCache.set(verificationId, kycRequest);

      // Queue background processing
      await this.queueVerificationProcessing(kycRequest);

      // Create audit log
      await storage.createAuditLog({
        actorId: params.userId,
        action: 'kyc_verification_initiated',
        targetType: 'kyc_verification',
        targetId: verificationId,
        diffJson: {
          verificationType: params.type,
          documentCount: params.documents.length
        }
      });

      console.log(`✅ KYC verification initiated: ${verificationId}`);
      return { success: true, verificationId };

    } catch (error) {
      console.error('KYC initiation failed:', error);
      return { success: false, error: 'Verification initiation failed' };
    }
  }

  // Process KYC verification (background job)
  async processKYCVerification(verificationId: string): Promise<void> {
    try {
      console.log(`⚙️ Processing KYC verification: ${verificationId}`);

      const verification = await this.getKYCVerification(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }

      verification.status = 'processing';
      await this.updateKYCVerification(verification);

      // Step 1: Document verification using AI/OCR
      const documentResults = await this.verifyDocuments(verification.documents);
      
      // Step 2: Identity verification against databases
      const identityResults = await this.verifyIdentity(verification.personalInfo);
      
      // Step 3: AML/sanctions screening
      const amlResults = await this.performAMLScreening(verification);
      
      // Step 4: Calculate risk score
      const riskScore = await this.calculateRiskScore(
        documentResults,
        identityResults,
        amlResults,
        verification
      );

      // Step 5: Make verification decision
      const decision = await this.makeVerificationDecision(
        verification,
        documentResults,
        identityResults,
        amlResults,
        riskScore
      );

      // Update verification with results
      verification.riskScore = riskScore;
      verification.amlChecks = amlResults;
      verification.status = decision.approved ? 'approved' : 'rejected';
      verification.rejectionReason = decision.reason;
      verification.reviewedAt = new Date();
      verification.reviewedBy = 'system';

      if (decision.approved) {
        verification.verificationLevel = verification.type;
        await this.grantVerificationLevel(verification.userId, verification.type);
      }

      await this.updateKYCVerification(verification);

      // Create audit log
      await storage.createAuditLog({
        actorId: 'system',
        action: `kyc_verification_${verification.status}`,
        targetType: 'kyc_verification',
        targetId: verificationId,
        diffJson: {
          riskScore,
          verificationLevel: verification.verificationLevel,
          rejectionReason: verification.rejectionReason
        }
      });

      // Send notification
      await this.sendVerificationNotification(verification);

      console.log(`✅ KYC verification processed: ${verificationId} - Status: ${verification.status}`);

    } catch (error) {
      console.error(`KYC processing failed for ${verificationId}:`, error);
      
      // Update status to failed and retry or manual review
      const verification = await this.getKYCVerification(verificationId);
      if (verification) {
        verification.status = 'rejected';
        verification.rejectionReason = 'Processing error - manual review required';
        await this.updateKYCVerification(verification);
      }
    }
  }

  // ===== PAYMENT COMPLIANCE CHECKS =====

  // Check if payment requires verification
  async checkPaymentCompliance(params: {
    userId: string;
    amount: number;
    type: 'purchase' | 'tip' | 'subscription' | 'payout';
    metadata?: Record<string, any>;
  }): Promise<{
    allowed: boolean;
    verificationRequired?: 'basic' | 'enhanced' | 'business';
    reason?: string;
    currentLevel?: string;
    maxAllowed?: number;
  }> {
    try {
      console.log(`⚖️ Checking payment compliance: ${params.userId} - $${params.amount/100} (${params.type})`);

      const user = await storage.getUser(params.userId);
      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      // Get user's current verification level
      const currentVerification = await this.getUserVerificationLevel(params.userId);
      
      // Check compliance thresholds
      if (params.type === 'payout') {
        // Stricter requirements for payouts
        if (params.amount >= this.complianceThresholds.enhancedVerification && 
            currentVerification !== 'enhanced' && currentVerification !== 'business') {
          return {
            allowed: false,
            verificationRequired: 'enhanced',
            reason: 'Enhanced verification required for payouts over $3,000',
            currentLevel: currentVerification,
            maxAllowed: this.complianceThresholds.basicVerification
          };
        }
      } else {
        // Regular purchase compliance
        if (params.amount >= this.complianceThresholds.businessVerification && 
            currentVerification !== 'business') {
          return {
            allowed: false,
            verificationRequired: 'business',
            reason: 'Business verification required for transactions over $10,000',
            currentLevel: currentVerification,
            maxAllowed: this.complianceThresholds.enhancedVerification
          };
        } else if (params.amount >= this.complianceThresholds.enhancedVerification && 
                  currentVerification === 'none') {
          return {
            allowed: false,
            verificationRequired: 'enhanced',
            reason: 'Enhanced verification required for transactions over $3,000',
            currentLevel: currentVerification,
            maxAllowed: this.complianceThresholds.basicVerification
          };
        } else if (params.amount >= this.complianceThresholds.basicVerification && 
                  currentVerification === 'none') {
          return {
            allowed: false,
            verificationRequired: 'basic',
            reason: 'Basic verification required for transactions over $500',
            currentLevel: currentVerification,
            maxAllowed: 500 // Allow up to $5 without verification
          };
        }
      }

      // Check for suspicious activity
      const fraudCheck = await this.detectFraudulentActivity(params.userId, params.amount, params.type);
      if (fraudCheck.isSuspicious && fraudCheck.recommendedAction === 'reject') {
        return {
          allowed: false,
          reason: 'Transaction flagged for suspicious activity',
          currentLevel: currentVerification
        };
      }

      // AML reporting requirements
      if (params.amount >= this.complianceThresholds.amlReportingThreshold) {
        await this.createAMLReport(params.userId, params.amount, params.type, params.metadata);
      }

      console.log(`✅ Payment compliance check passed: ${params.userId}`);
      return { allowed: true, currentLevel: currentVerification };

    } catch (error) {
      console.error('Payment compliance check failed:', error);
      return { allowed: false, reason: 'Compliance check failed' };
    }
  }

  // ===== FRAUD DETECTION =====

  // Detect fraudulent activity patterns
  async detectFraudulentActivity(
    userId: string, 
    amount: number, 
    type: string
  ): Promise<FraudDetectionResult> {
    try {
      console.log(`🕵️ Running fraud detection for user: ${userId}`);

      const result: FraudDetectionResult = {
        isSuspicious: false,
        riskScore: 0,
        flags: [],
        recommendedAction: 'approve',
        reasons: [],
        confidence: 0
      };

      // Get user's transaction history
      const recentTransactions = await storage.getUserTransactions(userId, {
        limit: 100,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      });

      // Check for velocity patterns
      const velocityCheck = this.checkTransactionVelocity(recentTransactions.transactions, amount);
      if (velocityCheck.suspicious) {
        result.flags.push('high_velocity');
        result.reasons.push('Unusually high transaction frequency');
        result.riskScore += 30;
      }

      // Check for amount patterns
      const amountCheck = this.checkAmountPatterns(recentTransactions.transactions, amount);
      if (amountCheck.suspicious) {
        result.flags.push('unusual_amount');
        result.reasons.push('Transaction amount outside normal pattern');
        result.riskScore += 20;
      }

      // Check for geographic anomalies
      const geoCheck = await this.checkGeographicPatterns(userId);
      if (geoCheck.suspicious) {
        result.flags.push('geographic_anomaly');
        result.reasons.push('Transaction from unusual location');
        result.riskScore += 25;
      }

      // Check for device/browser patterns
      const deviceCheck = await this.checkDevicePatterns(userId);
      if (deviceCheck.suspicious) {
        result.flags.push('device_anomaly');
        result.reasons.push('Transaction from new or suspicious device');
        result.riskScore += 15;
      }

      // Check for structuring patterns (amounts just below reporting thresholds)
      if (this.detectStructuring(recentTransactions.transactions, amount)) {
        result.flags.push('potential_structuring');
        result.reasons.push('Potential transaction structuring detected');
        result.riskScore += 40;
      }

      // Calculate overall assessment
      result.isSuspicious = result.riskScore > 50;
      result.confidence = Math.min(result.riskScore / 100, 0.95);

      if (result.riskScore > 80) {
        result.recommendedAction = 'reject';
      } else if (result.riskScore > 50) {
        result.recommendedAction = 'review';
      } else if (result.riskScore > 25) {
        result.recommendedAction = 'approve';
      }

      // Cache risk score for user
      this.riskScoreCache.set(userId, result.riskScore);

      console.log(`🕵️ Fraud detection complete: Risk score ${result.riskScore}/100`);
      return result;

    } catch (error) {
      console.error('Fraud detection failed:', error);
      return {
        isSuspicious: false,
        riskScore: 0,
        flags: ['detection_error'],
        recommendedAction: 'review',
        reasons: ['Fraud detection system error'],
        confidence: 0
      };
    }
  }

  // ===== HELPER METHODS =====

  private async queueVerificationProcessing(verification: KYCVerificationRequest): Promise<void> {
    // Queue automated processing
    await performanceOptimizationService.queueJob('process_kyc_verification', {
      verificationId: verification.id
    }, { priority: 'high', delaySeconds: 10 });

    // Queue manual review if enhanced/business verification
    if (verification.type === 'enhanced' || verification.type === 'business') {
      await performanceOptimizationService.queueJob('queue_manual_review', {
        verificationId: verification.id,
        type: verification.type
      }, { priority: 'medium', delaySeconds: 3600 }); // 1 hour delay
    }
  }

  private async validateDocuments(documents: any[]): Promise<{ isValid: boolean; error?: string }> {
    // Basic validation
    if (documents.length === 0) {
      return { isValid: false, error: 'No documents provided' };
    }

    // Check document types
    const requiredDocs = ['passport', 'drivers_license', 'national_id'];
    const hasValidId = documents.some(doc => requiredDocs.includes(doc.type));
    
    if (!hasValidId) {
      return { isValid: false, error: 'Valid government-issued ID required' };
    }

    return { isValid: true };
  }

  private async verifyDocuments(documents: any[]): Promise<any> {
    // Simulated document verification (real implementation would use OCR/AI)
    return {
      verified: true,
      confidence: 0.95,
      extractedData: {
        name: 'John Doe',
        dateOfBirth: '1990-01-01',
        documentNumber: 'ABC123456'
      }
    };
  }

  private async verifyIdentity(personalInfo: any): Promise<any> {
    // Simulated identity verification against databases
    return {
      verified: true,
      confidence: 0.90,
      matches: ['credit_bureau', 'public_records']
    };
  }

  private async performAMLScreening(verification: KYCVerificationRequest): Promise<any> {
    // Simulated AML screening
    return {
      sanctionsList: true,
      pepCheck: true,
      adverseMedia: true,
      completed: true,
      riskLevel: 'low' as const,
      matches: []
    };
  }

  private async calculateRiskScore(
    documentResults: any,
    identityResults: any,
    amlResults: any,
    verification: KYCVerificationRequest
  ): Promise<number> {
    let score = 0;

    // Document verification contributes 40%
    score += documentResults.confidence * 40;

    // Identity verification contributes 35%
    score += identityResults.confidence * 35;

    // AML screening contributes 25%
    if (amlResults.riskLevel === 'low') score += 25;
    else if (amlResults.riskLevel === 'medium') score += 15;
    else if (amlResults.riskLevel === 'high') score += 5;

    return Math.round(score);
  }

  private async makeVerificationDecision(
    verification: KYCVerificationRequest,
    documentResults: any,
    identityResults: any,
    amlResults: any,
    riskScore: number
  ): Promise<{ approved: boolean; reason?: string }> {
    
    // Auto-approve if high confidence and low risk
    if (riskScore >= 85 && amlResults.riskLevel === 'low') {
      return { approved: true };
    }

    // Auto-reject if very low confidence or high risk
    if (riskScore < 60 || amlResults.riskLevel === 'critical') {
      return { 
        approved: false, 
        reason: 'Insufficient verification confidence or high risk profile' 
      };
    }

    // Queue for manual review
    await performanceOptimizationService.queueJob('manual_kyc_review', {
      verificationId: verification.id,
      riskScore,
      amlRisk: amlResults.riskLevel
    }, { priority: 'medium' });

    return { approved: false, reason: 'Queued for manual review' };
  }

  private async getUserActiveVerification(userId: string): Promise<KYCVerificationRequest | null> {
    try {
      return await storage.getUserActiveKYCVerification(userId);
    } catch (error) {
      console.error('Failed to get active verification:', error);
      return null;
    }
  }

  private async getUserVerificationLevel(userId: string): Promise<string> {
    try {
      const verification = await storage.getUserLatestApprovedKYC(userId);
      return verification?.verificationLevel || 'none';
    } catch (error) {
      console.error('Failed to get verification level:', error);
      return 'none';
    }
  }

  private async getKYCVerification(verificationId: string): Promise<KYCVerificationRequest | null> {
    // Check cache first
    if (this.verificationCache.has(verificationId)) {
      return this.verificationCache.get(verificationId)!;
    }

    // Fetch from database
    const verification = await storage.getKYCVerification(verificationId);
    if (verification) {
      this.verificationCache.set(verificationId, verification);
    }

    return verification;
  }

  private async updateKYCVerification(verification: KYCVerificationRequest): Promise<void> {
    await storage.updateKYCVerification(verification.id, verification);
    this.verificationCache.set(verification.id, verification);
  }

  private async grantVerificationLevel(userId: string, level: string): Promise<void> {
    await storage.updateUserVerificationLevel(userId, level);
  }

  private async sendVerificationNotification(verification: KYCVerificationRequest): Promise<void> {
    await performanceOptimizationService.queueJob('send_email', {
      to: verification.userId,
      subject: `KYC Verification ${verification.status}`,
      template: 'kyc_result',
      data: {
        status: verification.status,
        level: verification.verificationLevel,
        reason: verification.rejectionReason
      }
    });
  }

  private async createAMLReport(
    userId: string, 
    amount: number, 
    type: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    console.log(`📋 Creating AML report for transaction: ${userId} - $${amount/100}`);
    
    await storage.createAMLReport({
      userId,
      amount,
      transactionType: type,
      reportedAt: new Date(),
      metadata
    });
  }

  // Fraud detection helper methods
  private checkTransactionVelocity(transactions: any[], currentAmount: number): { suspicious: boolean } {
    const last24Hours = transactions.filter(t => 
      Date.now() - new Date(t.createdAt).getTime() < 24 * 60 * 60 * 1000
    );

    // More than 10 transactions in 24 hours is suspicious
    return { suspicious: last24Hours.length > 10 };
  }

  private checkAmountPatterns(transactions: any[], currentAmount: number): { suspicious: boolean } {
    if (transactions.length === 0) return { suspicious: false };

    const amounts = transactions.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const deviation = Math.abs(currentAmount - avgAmount) / avgAmount;

    // Suspicious if amount deviates by more than 500% from average
    return { suspicious: deviation > 5.0 };
  }

  private async checkGeographicPatterns(userId: string): Promise<{ suspicious: boolean }> {
    // Simulated geographic check
    return { suspicious: false };
  }

  private async checkDevicePatterns(userId: string): Promise<{ suspicious: boolean }> {
    // Simulated device fingerprinting check
    return { suspicious: false };
  }

  private detectStructuring(transactions: any[], currentAmount: number): boolean {
    // Check for amounts just below $10k threshold
    const structuringThreshold = this.complianceThresholds.amlReportingThreshold * 0.9; // 90% of threshold
    
    const recentLargeTransactions = transactions.filter(t => 
      t.amount > structuringThreshold && 
      Date.now() - new Date(t.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    // Suspicious if multiple large transactions just below threshold
    return recentLargeTransactions.length > 2;
  }
}

export const identityVerificationService = new IdentityVerificationService();