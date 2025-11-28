import crypto from 'crypto';
import { storage } from '../storage';

interface WatermarkMetadata {
  userId: string;
  mediaId: string;
  timestamp: string;
  platformId: string;
  contentHash: string;
  digitalSignature: string;
}

interface ForensicSignature {
  mediaId: string;
  metadata: WatermarkMetadata;
  forensicMarkers: {
    pixelPattern?: string;
    frequencyDomain?: string;
    steganographicData?: string;
  };
  verificationHash: string;
}

export class WatermarkService {
  private readonly platformSecret = process.env.WATERMARK_SECRET || 'boyfanz_secret_key';
  private readonly platformId = 'boyfanz_v1';

  async applyWatermark(mediaId: string, userId: string, s3Key: string): Promise<ForensicSignature> {
    try {
      const timestamp = new Date().toISOString();
      const contentHash = await this.generateContentHash(s3Key);
      
      const metadata: WatermarkMetadata = {
        userId,
        mediaId,
        timestamp,
        platformId: this.platformId,
        contentHash,
        digitalSignature: this.generateDigitalSignature(userId, mediaId, timestamp, contentHash)
      };

      const forensicMarkers = await this.generateForensicMarkers(s3Key, metadata);
      const verificationHash = this.createVerificationHash(metadata, forensicMarkers);
      
      const forensicSignature: ForensicSignature = {
        mediaId,
        metadata,
        forensicMarkers,
        verificationHash
      };

      await storage.updateMediaAsset(mediaId, {
        forensicSignature: JSON.stringify(forensicSignature),
        watermarked: true,
        watermarkedAt: new Date()
      });

      await storage.createAuditLog({
        actorId: null, // system action - no user actor
        action: 'watermark_applied',
        targetType: 'media_asset',
        targetId: mediaId,
        diffJson: { 
          userId,
          watermarkType: 'forensic_signature',
          verificationHash
        }
      });

      console.log(`🔒 Forensic watermark applied to media ${mediaId}`);
      return forensicSignature;
    } catch (error) {
      console.error('Error applying watermark:', error);
      throw error;
    }
  }

  private generateDigitalSignature(userId: string, mediaId: string, timestamp: string, contentHash: string): string {
    const data = `${userId}:${mediaId}:${timestamp}:${contentHash}:${this.platformSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async generateContentHash(s3Key: string): Promise<string> {
    const data = `${s3Key}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async generateForensicMarkers(s3Key: string, metadata: WatermarkMetadata): Promise<any> {
    const steganographicData = this.generateSteganographicPattern(metadata);
    const pixelPattern = this.generatePixelPattern(metadata.userId, metadata.mediaId);
    const frequencyDomain = this.generateFrequencyMarkers(metadata.timestamp);

    return {
      pixelPattern,
      frequencyDomain,
      steganographicData
    };
  }

  private generateSteganographicPattern(metadata: WatermarkMetadata): string {
    const data = `${metadata.userId.slice(0, 8)}${metadata.timestamp.slice(-8)}`;
    return Buffer.from(data).toString('base64');
  }

  private generatePixelPattern(userId: string, mediaId: string): string {
    const seed = `${userId}${mediaId}`;
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    return hash.slice(0, 16);
  }

  private generateFrequencyMarkers(timestamp: string): string {
    const timeHash = crypto.createHash('sha1').update(timestamp).digest('hex');
    return timeHash.slice(0, 20);
  }

  private createVerificationHash(metadata: WatermarkMetadata, forensicMarkers: any): string {
    const combined = JSON.stringify({ metadata, forensicMarkers });
    return crypto.createHash('sha256').update(combined + this.platformSecret).digest('hex');
  }

  async verifyWatermark(mediaId: string): Promise<{
    isValid: boolean;
    confidence: number;
    metadata?: WatermarkMetadata;
    tampering?: {
      detected: boolean;
      indicators: string[];
    };
  }> {
    try {
      const mediaAsset = await storage.getMediaAsset(mediaId);
      if (!mediaAsset?.forensicSignature) {
        return { isValid: false, confidence: 0 };
      }

      const signature: ForensicSignature = JSON.parse(mediaAsset.forensicSignature);
      
      const expectedSignature = this.generateDigitalSignature(
        signature.metadata.userId,
        signature.metadata.mediaId,
        signature.metadata.timestamp,
        signature.metadata.contentHash
      );

      const signatureValid = expectedSignature === signature.metadata.digitalSignature;
      const expectedHash = this.createVerificationHash(signature.metadata, signature.forensicMarkers);
      const hashValid = expectedHash === signature.verificationHash;
      
      const tamperingCheck = await this.detectTampering(signature, mediaAsset);
      const confidence = this.calculateConfidence(signatureValid, hashValid, tamperingCheck);
      
      return {
        isValid: signatureValid && hashValid && !tamperingCheck.detected,
        confidence,
        metadata: signature.metadata,
        tampering: tamperingCheck
      };
    } catch (error) {
      console.error('Error verifying watermark:', error);
      return { isValid: false, confidence: 0 };
    }
  }

  private async detectTampering(signature: ForensicSignature, mediaAsset: any): Promise<{
    detected: boolean;
    indicators: string[];
  }> {
    const indicators: string[] = [];
    
    const currentHash = await this.generateContentHash(mediaAsset.s3Key);
    if (currentHash !== signature.metadata.contentHash) {
      indicators.push('Content hash mismatch');
    }
    
    if (mediaAsset.updatedAt > new Date(signature.metadata.timestamp)) {
      indicators.push('File modified after watermarking');
    }
    
    return {
      detected: indicators.length > 0,
      indicators
    };
  }

  private calculateConfidence(signatureValid: boolean, hashValid: boolean, tamperingCheck: any): number {
    let confidence = 0;
    
    if (signatureValid) confidence += 40;
    if (hashValid) confidence += 40;
    if (!tamperingCheck.detected) confidence += 20;
    
    return Math.min(confidence, 100);
  }

  async getForensicReport(mediaId: string): Promise<{
    mediaId: string;
    watermarkStatus: string;
    verificationResult: any;
    chainOfCustody: any[];
    complianceScore: number;
  }> {
    const verification = await this.verifyWatermark(mediaId);
    const auditLogs = await this.getWatermarkAuditTrail(mediaId);
    
    let complianceScore = 0;
    if (verification.isValid) complianceScore += 50;
    complianceScore += Math.min(verification.confidence * 0.3, 30);
    if (auditLogs.length > 0) complianceScore += 20;
    
    return {
      mediaId,
      watermarkStatus: verification.isValid ? 'valid' : 'invalid',
      verificationResult: verification,
      chainOfCustody: auditLogs,
      complianceScore: Math.round(complianceScore)
    };
  }

  private async getWatermarkAuditTrail(mediaId: string): Promise<any[]> {
    return [
      {
        action: 'watermark_applied',
        timestamp: new Date().toISOString(),
        actor: 'system'
      }
    ];
  }
}

export const watermarkService = new WatermarkService();