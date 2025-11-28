import { storage } from '../storage';
import { notificationService } from './notificationService';
import { aiModerationService } from './aiModerationService';

interface KycDocumentData {
  docType: 'id_verification' | 'consent_form' | 'model_release';
  s3Key: string;
  checksum: string;
  userId: string;
}

interface VerificationResult {
  isValid: boolean;
  confidence: number;
  errors: string[];
  extractedData?: {
    dateOfBirth?: string;
    fullName?: string;
    idNumber?: string;
    expirationDate?: string;
    livenessScore?: number;
    documentQuality?: number;
  };
  ageVerification?: {
    isOver18: boolean;
    calculatedAge: number;
    verificationMethod: 'document_ocr' | 'liveness_selfie' | 'combined';
  };
  livenessCheck?: {
    passed: boolean;
    confidence: number;
    antiSpoofing: boolean;
    realPerson: boolean;
  };
}

class KycService {
  private verifyMyApiUrl: string;
  private verifyMyApiKey: string;

  constructor() {
    this.verifyMyApiUrl = process.env.VERIFYMY_API_URL || 'https://api.verifymy.com';
    this.verifyMyApiKey = process.env.VERIFYMY_API_KEY || 'test_key';
  }

  async submit2257Document(documentData: KycDocumentData): Promise<{ id: string; status: string }> {
    try {
      // Create 2257 record
      const record = await storage.create2257Record({
        userId: documentData.userId,
        docType: documentData.docType,
        s3Key: documentData.s3Key,
        checksum: documentData.checksum
      });

      // Initiate verification process
      const verification = await this.initiateDocumentVerification(documentData);
      
      // Update user KYC status
      await storage.upsertKycVerification({
        userId: documentData.userId,
        provider: 'verifymy',
        externalId: verification.externalId,
        status: 'pending',
        dataJson: {
          documentType: documentData.docType,
          submittedAt: new Date().toISOString()
        }
      });

      // Create audit log
      await storage.createAuditLog({
        actorId: documentData.userId,
        action: 'kyc_document_submitted',
        targetType: '2257_record',
        targetId: record.id,
        diffJson: { docType: documentData.docType }
      });

      // Notify admins of new submission
      await notificationService.sendSystemNotification({
        kind: 'system',
        payloadJson: {
          message: `New 2257 document submitted: ${documentData.docType}`,
          userId: documentData.userId,
          docType: documentData.docType
        }
      });

      return { id: record.id, status: 'pending' };
    } catch (error) {
      console.error('Error submitting 2257 document:', error);
      throw error;
    }
  }

  private async initiateDocumentVerification(documentData: KycDocumentData): Promise<{ externalId: string }> {
    // Enhanced verification with age and liveness checks
    try {
      const payload = {
        document_type: documentData.docType,
        s3_key: documentData.s3Key,
        user_id: documentData.userId,
        verification_level: 'enhanced', // Request full verification
        features: [
          'document_ocr',      // Extract DOB and personal data
          'liveness_detection', // Selfie with liveness proof
          'age_verification',   // Calculate and verify 18+ status
          'anti_spoofing',     // Prevent fake documents/photos
          'biometric_match'    // Match selfie to ID photo
        ],
        compliance_checks: {
          min_age: 18,          // CRITICAL: Must be 18 or older
          document_quality: 0.8, // High quality document required
          liveness_threshold: 0.85, // High liveness confidence required
          require_real_person: true
        }
      };

      // In production: Call actual VerifyMy API
      const response = await this.callVerifyMyAPI('/verification/initiate', payload);
      
      console.log(`✅ Enhanced verification initiated for ${documentData.docType} - External ID: ${response.external_id}`);
      console.log(`📋 Verification features: age_check, liveness_detection, anti_spoofing`);
      
      return { externalId: response.external_id };
    } catch (error) {
      console.error('❌ Failed to initiate enhanced verification:', error);
      
      // Fallback to mock for development
      const mockExternalId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`⚠️ Using mock verification ID: ${mockExternalId} (development mode)`);
      
      return { externalId: mockExternalId };
    }
  }

  private async callVerifyMyAPI(endpoint: string, payload: any): Promise<any> {
    if (!this.verifyMyApiKey || this.verifyMyApiKey === 'test_key') {
      throw new Error('VerifyMy API key not configured for production');
    }

    const response = await fetch(`${this.verifyMyApiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.verifyMyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`VerifyMy API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async initiateVerification(userId: string) {
    try {
      // In a real implementation, this would call VerifyMy API
      const verification = await storage.upsertKycVerification({
        userId,
        provider: 'verifymy',
        externalId: `vm_${Date.now()}`,
        status: 'pending',
        dataJson: { initiated: true },
      });

      await notificationService.sendNotification(userId, {
        kind: 'kyc',
        payloadJson: {
          message: 'KYC verification initiated',
          status: 'pending'
        }
      });

      return verification;
    } catch (error) {
      console.error('Error initiating KYC verification:', error);
      throw error;
    }
  }

  async handleWebhook(payload: any, signature: string) {
    try {
      // CRITICAL SECURITY: Verify webhook signature 
      if (!signature) {
        throw new Error('No signature provided');
      }

      // Verify signature using HMAC-SHA256 (similar to GetStream implementation)
      const webhookSecret = process.env.VERIFYMY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('⚠️ VerifyMy webhook secret not configured - cannot verify signature');
        throw new Error('Webhook secret not configured');
      }

      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload), 'utf8')
        .digest('hex');

      // Secure comparison to prevent timing attacks
      const providedSignature = signature.replace(/^sha256=/, ''); // Handle potential prefix
      if (!crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )) {
        console.error('❌ VerifyMy webhook: Invalid signature');
        throw new Error('Invalid webhook signature');
      }

      console.log('✅ VerifyMy webhook signature verified successfully');

      // Process the webhook payload
      const { external_id, status, user_data, verification_data } = payload;
      
      if (!external_id) {
        throw new Error('No external_id in payload');
      }

      // Find the verification record by external_id
      const kyc = await storage.getKycByExternalId(external_id);
      if (!kyc) {
        throw new Error('KYC verification not found');
      }

      // CRITICAL: Enhanced age and liveness verification
      const enhancedVerification = await this.processEnhancedVerification(verification_data);
      
      // Determine final status based on all verification criteria
      let finalStatus = status;
      let rejectionReasons: string[] = [];

      if (status === 'approved' && enhancedVerification) {
        // Additional checks even if provider says "approved"
        if (!enhancedVerification.ageVerification?.isOver18) {
          finalStatus = 'rejected';
          rejectionReasons.push('Under 18 years old - not eligible');
          
          // CRITICAL: Flag underage attempt for immediate attention
          await this.flagComplianceViolation(
            kyc.userId, 
            `Underage verification attempt: Age ${enhancedVerification.ageVerification?.calculatedAge}`, 
            'critical'
          );
        }

        if (!enhancedVerification.livenessCheck?.passed) {
          finalStatus = 'rejected';
          rejectionReasons.push('Liveness check failed - unable to verify real person');
        }

        if ((enhancedVerification.extractedData?.documentQuality || 0) < 0.8) {
          finalStatus = 'rejected';
          rejectionReasons.push('Document quality insufficient for verification');
        }

        if (!enhancedVerification.livenessCheck?.antiSpoofing) {
          finalStatus = 'rejected';
          rejectionReasons.push('Anti-spoofing check failed - potential fraudulent document');
        }
      }

      // Update verification status with enhanced data
      await storage.upsertKycVerification({
        userId: kyc.userId,
        provider: kyc.provider,
        externalId: kyc.externalId,
        status: finalStatus === 'approved' ? 'approved' : finalStatus === 'rejected' ? 'rejected' : 'pending',
        dataJson: {
          ...kyc.dataJson,
          verificationData: verification_data,
          enhancedVerification,
          rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : undefined,
          completedAt: new Date().toISOString()
        }
      });

      // Notify user of verification result
      await notificationService.sendNotification(kyc.userId, {
        kind: 'kyc',
        payloadJson: {
          message: finalStatus === 'approved' 
            ? 'Your identity verification has been approved' 
            : finalStatus === 'rejected'
              ? `Identity verification rejected: ${rejectionReasons.join(', ')}`
              : 'Your identity verification requires additional review',
          status: finalStatus,
          rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : undefined
        }
      });

      // Create audit log
      await storage.createAuditLog({
        actorId: 'system',
        action: `kyc_${status}`,
        targetType: 'kyc_verification',
        targetId: kyc.id,
        diffJson: { externalId: external_id, verificationData: verification_data }
      });

      // If approved, update user compliance status
      if (status === 'approved') {
        await this.updateUserComplianceStatus(kyc.userId);
      }
      
      return kyc;
    } catch (error) {
      console.error('Error handling KYC webhook:', error);
      throw error;
    }
  }

  private async processEnhancedVerification(verificationData: any): Promise<VerificationResult | null> {
    if (!verificationData) {
      console.log('⚠️ No verification data provided');
      return null;
    }

    try {
      // Extract key data from verification response
      const {
        document_data,
        liveness_data,
        age_verification,
        biometric_match,
        document_quality,
        anti_spoofing_score
      } = verificationData;

      const result: VerificationResult = {
        isValid: false,
        confidence: 0,
        errors: [],
        extractedData: {
          dateOfBirth: document_data?.date_of_birth,
          fullName: document_data?.full_name,
          idNumber: document_data?.id_number,
          expirationDate: document_data?.expiration_date,
          livenessScore: liveness_data?.confidence,
          documentQuality: document_quality?.score
        }
      };

      // CRITICAL: Age verification logic
      if (document_data?.date_of_birth) {
        const age = this.calculateAge(document_data.date_of_birth);
        result.ageVerification = {
          isOver18: age >= 18,
          calculatedAge: age,
          verificationMethod: liveness_data ? 'combined' : 'document_ocr'
        };

        if (age < 18) {
          result.errors.push(`User is ${age} years old - under 18 minimum age requirement`);
          console.log(`❌ UNDERAGE DETECTED: ${age} years old`);
        } else {
          console.log(`✅ Age verification passed: ${age} years old`);
        }
      } else {
        result.errors.push('Date of birth not extracted from document');
        result.ageVerification = {
          isOver18: false,
          calculatedAge: 0,
          verificationMethod: 'document_ocr'
        };
      }

      // Enhanced liveness verification
      result.livenessCheck = {
        passed: (liveness_data?.confidence || 0) >= 0.85,
        confidence: liveness_data?.confidence || 0,
        antiSpoofing: (anti_spoofing_score?.score || 0) >= 0.8,
        realPerson: liveness_data?.real_person === true
      };

      if (!result.livenessCheck.passed) {
        result.errors.push(`Liveness check failed: confidence ${liveness_data?.confidence || 0} < 0.85 required`);
      }

      if (!result.livenessCheck.antiSpoofing) {
        result.errors.push(`Anti-spoofing failed: score ${anti_spoofing_score?.score || 0} < 0.8 required`);
      }

      // Overall confidence calculation
      const ageConfidence = result.ageVerification?.isOver18 ? 1.0 : 0.0;
      const livenessConfidence = result.livenessCheck.confidence;
      const documentConfidence = document_quality?.score || 0;
      const spoofingConfidence = result.livenessCheck.antiSpoofing ? 1.0 : 0.0;

      result.confidence = (ageConfidence + livenessConfidence + documentConfidence + spoofingConfidence) / 4;
      result.isValid = result.errors.length === 0 && result.confidence >= 0.8;

      console.log(`📊 Enhanced verification result: valid=${result.isValid}, confidence=${result.confidence.toFixed(2)}, errors=${result.errors.length}`);
      
      return result;
    } catch (error) {
      console.error('❌ Error processing enhanced verification:', error);
      return {
        isValid: false,
        confidence: 0,
        errors: ['Failed to process verification data'],
        ageVerification: { isOver18: false, calculatedAge: 0, verificationMethod: 'document_ocr' },
        livenessCheck: { passed: false, confidence: 0, antiSpoofing: false, realPerson: false }
      };
    }
  }

  private calculateAge(dateOfBirth: string): number {
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust if birthday hasn't occurred this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      console.log(`📅 Age calculation: DOB ${dateOfBirth} → Age ${age}`);
      return age;
    } catch (error) {
      console.error('❌ Error calculating age:', error);
      return 0; // Default to 0 (under 18) on error
    }
  }

  private async updateUserComplianceStatus(userId: string): Promise<void> {
    // Check if user has all required verifications
    const requiredDocs = ['id_verification', 'consent_form', 'model_release'];
    const records = await storage.get2257Records(userId);
    
    const hasAllDocs = requiredDocs.every(docType => 
      records.some(record => record.docType === docType)
    );

    if (hasAllDocs) {
      // User is now fully compliant
      await storage.updateUser(userId, { 
        complianceStatus: 'verified',
        verifiedAt: new Date()
      });

      // Notify user of full verification
      await notificationService.sendNotification(userId, {
        kind: 'system',
        payloadJson: {
          message: 'Congratulations! Your account is now fully verified and compliant.',
          status: 'verified'
        }
      });
    }
  }

  async getVerificationStatus(userId: string): Promise<{
    status: string;
    requiredDocuments: string[];
    submittedDocuments: string[];
    missingDocuments: string[];
    complianceScore: number;
  }> {
    const kyc = await storage.getKycVerification(userId);
    const records = await storage.get2257Records(userId);
    
    const requiredDocs = ['id_verification', 'consent_form', 'model_release'];
    const submittedDocs = records.map(r => r.docType);
    const missingDocs = requiredDocs.filter(doc => !submittedDocs.includes(doc));
    
    // Calculate compliance score (0-100)
    const complianceScore = Math.round((submittedDocs.length / requiredDocs.length) * 100);

    return {
      status: kyc?.status || 'pending',
      requiredDocuments: requiredDocs,
      submittedDocuments: submittedDocs,
      missingDocuments: missingDocs,
      complianceScore
    };
  }

  async flagComplianceViolation(userId: string, reason: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    // Create compliance violation record
    await storage.createAuditLog({
      actorId: 'system',
      action: 'compliance_violation',
      targetType: 'user',
      targetId: userId,
      diffJson: { reason, severity, timestamp: new Date().toISOString() }
    });

    // If critical, immediately suspend user and trigger kill switch
    if (severity === 'critical') {
      await storage.updateUser(userId, { 
        status: 'suspended',
        suspendedAt: new Date(),
        suspensionReason: reason
      });

      // Trigger kill switch for all user content
      await this.triggerKillSwitch(userId, reason);
    }

    // Notify compliance team
    await notificationService.sendSystemNotification({
      kind: 'system',
      payloadJson: {
        message: `Compliance violation flagged: ${reason}`,
        userId,
        severity,
        timestamp: new Date().toISOString()
      }
    });
  }

  private async triggerKillSwitch(userId: string, reason: string): Promise<void> {
    console.log(`🚨 KILL SWITCH ACTIVATED for user ${userId}: ${reason}`);
    
    // Immediately hide all user content
    const userMedia = await storage.getMediaAssetsByOwner(userId);
    for (const media of userMedia) {
      await storage.updateMediaAssetStatus(media.id, 'flagged');
      
      // Flag via AI moderation service for audit trail
      await aiModerationService.flagContent(media.id, reason, 'critical');
    }

    // Create high-priority audit log
    await storage.createAuditLog({
      actorId: 'system',
      action: 'kill_switch_activated',
      targetType: 'user',
      targetId: userId,
      diffJson: { 
        reason, 
        affectedMedia: userMedia.length,
        timestamp: new Date().toISOString()
      }
    });

    // Send immediate alerts to all admins
    await notificationService.sendSystemNotification({
      kind: 'system',
      payloadJson: {
        message: `🚨 KILL SWITCH: User ${userId} suspended - ${reason}`,
        userId,
        reason,
        severity: 'critical',
        mediaCount: userMedia.length
      }
    });
  }

  // Process KYC verification webhooks from VerifyMy (bridge method for webhook routes)
  async processKYCWebhook(webhookData: any): Promise<{ success: boolean, message: string }> {
    try {
      // Extract signature if provided in webhook data
      const signature = webhookData.signature || webhookData._signature || '';
      
      // Remove signature from data before processing
      const { signature: _, _signature: __, ...cleanData } = webhookData;
      
      // Use existing handleWebhook method
      await this.handleWebhook(cleanData, signature);
      
      return { success: true, message: 'KYC webhook processed successfully' };
    } catch (error) {
      console.error('KYC webhook processing failed:', error);
      return { success: false, message: 'KYC webhook processing failed' };
    }
  }
}

export const kycService = new KycService();
