import { storage } from '../storage';
import { createHash } from 'crypto';
import { performanceOptimizationService } from './performanceOptimizationService';

interface DMCARequest {
  id: string;
  claimantName: string;
  claimantEmail: string;
  claimantAddress: string;
  copyrightedWork: string;
  infringingContent: {
    contentId: string;
    url: string;
    description: string;
  }[];
  goodFaithStatement: boolean;
  perjuryStatement: boolean;
  signature: string;
  submittedAt: Date;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  reviewedBy?: string;
  reviewedAt?: Date;
  actionTaken?: string;
}

interface ContentBundle {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  contentIds: string[];
  tags: string[];
  promoCode?: string;
  validUntil?: Date;
  maxRedemptions?: number;
  redemptions: number;
  isActive: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

interface ContentHash {
  contentId: string;
  md5Hash: string;
  sha256Hash: string;
  perceptualHash?: string; // For images/videos
  createdAt: Date;
}

// Comprehensive content management and DMCA compliance service
class ContentManagementService {
  private hashCache = new Map<string, ContentHash>();
  private bundleCache = new Map<string, ContentBundle>();

  // ===== DMCA TAKEDOWN SYSTEM =====

  // Submit DMCA takedown request
  async submitDMCARequest(params: {
    claimantName: string;
    claimantEmail: string;
    claimantAddress: string;
    copyrightedWork: string;
    infringingContent: {
      contentId: string;
      url: string;
      description: string;
    }[];
    goodFaithStatement: boolean;
    perjuryStatement: boolean;
    signature: string;
  }): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Validate required fields
      if (!params.claimantName || !params.claimantEmail || !params.signature) {
        return { success: false, error: 'Missing required fields' };
      }

      if (!params.goodFaithStatement || !params.perjuryStatement) {
        return { success: false, error: 'Required statements not acknowledged' };
      }

      if (params.infringingContent.length === 0) {
        return { success: false, error: 'No infringing content specified' };
      }

      const requestId = `dmca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const dmcaRequest: DMCARequest = {
        id: requestId,
        claimantName: params.claimantName,
        claimantEmail: params.claimantEmail,
        claimantAddress: params.claimantAddress,
        copyrightedWork: params.copyrightedWork,
        infringingContent: params.infringingContent,
        goodFaithStatement: params.goodFaithStatement,
        perjuryStatement: params.perjuryStatement,
        signature: params.signature,
        submittedAt: new Date(),
        status: 'pending'
      };

      // Store DMCA request
      await storage.createDMCARequest(dmcaRequest);

      // Queue background job for initial review
      await performanceOptimizationService.queueJob('dmca_initial_review', {
        requestId,
        infringingContentIds: params.infringingContent.map(c => c.contentId)
      }, { priority: 'high' });

      // Create audit log
      await storage.createAuditLog({
        actorId: 'system',
        action: 'dmca_request_submitted',
        targetType: 'dmca_request',
        targetId: requestId,
        diffJson: {
          claimantEmail: params.claimantEmail,
          contentCount: params.infringingContent.length
        }
      });

      console.log(`⚖️ DMCA request submitted: ${requestId} - ${params.infringingContent.length} items`);
      return { success: true, requestId };

    } catch (error) {
      console.error('DMCA request submission failed:', error);
      return { success: false, error: 'Request submission failed' };
    }
  }

  // Process DMCA takedown (admin action)
  async processDMCARequest(
    requestId: string, 
    adminId: string, 
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await storage.getDMCARequest(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.status !== 'pending' && request.status !== 'reviewing') {
        return { success: false, error: 'Request already processed' };
      }

      // Update request status
      request.status = action === 'approve' ? 'approved' : 'rejected';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      request.actionTaken = reason || `Request ${action}d by admin`;

      await storage.updateDMCARequest(requestId, request);

      if (action === 'approve') {
        // Take down the infringing content
        for (const content of request.infringingContent) {
          await this.takedownContent(content.contentId, requestId, adminId);
        }

        // Add content hashes to blacklist to prevent re-upload
        await this.blacklistContentHashes(request.infringingContent.map(c => c.contentId));

        request.status = 'completed';
        await storage.updateDMCARequest(requestId, request);
      }

      // Create audit log
      await storage.createAuditLog({
        actorId: adminId,
        action: `dmca_request_${action}d`,
        targetType: 'dmca_request',
        targetId: requestId,
        diffJson: {
          reason,
          contentCount: request.infringingContent.length
        }
      });

      console.log(`⚖️ DMCA request ${action}d: ${requestId} by ${adminId}`);
      return { success: true };

    } catch (error) {
      console.error('DMCA request processing failed:', error);
      return { success: false, error: 'Processing failed' };
    }
  }

  // Takedown content (mark as removed)
  private async takedownContent(contentId: string, dmcaRequestId: string, adminId: string): Promise<void> {
    try {
      // Mark content as taken down
      await storage.updateMediaAsset(contentId, {
        status: 'removed',
        removalReason: 'dmca_takedown',
        removedBy: adminId,
        removedAt: new Date(),
        dmcaRequestId: dmcaRequestId
      });

      // Remove from CDN/storage
      await this.removeContentFromCDN(contentId);

      // Notify content owner
      const content = await storage.getMediaAsset(contentId);
      if (content) {
        await performanceOptimizationService.queueJob('send_email', {
          to: content.ownerEmail,
          subject: 'Content Removal Notice - DMCA Takedown',
          template: 'dmca_takedown_notice',
          data: {
            contentId,
            dmcaRequestId,
            appealProcess: 'https://boyfanz.com/dmca-appeal'
          }
        });
      }

    } catch (error) {
      console.error(`Failed to takedown content ${contentId}:`, error);
    }
  }

  // ===== HASH-BASED RE-UPLOAD PREVENTION =====

  // Generate content hashes for duplicate detection
  async generateContentHashes(contentId: string, fileUrl: string): Promise<ContentHash> {
    try {
      // Download content for hashing
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);

      // Generate MD5 and SHA256 hashes
      const md5Hash = createHash('md5').update(data).digest('hex');
      const sha256Hash = createHash('sha256').update(data).digest('hex');

      const contentHash: ContentHash = {
        contentId,
        md5Hash,
        sha256Hash,
        createdAt: new Date()
      };

      // For images/videos, generate perceptual hash (simulated)
      if (this.isMediaFile(fileUrl)) {
        contentHash.perceptualHash = this.generatePerceptualHash(data);
      }

      // Store hash
      await storage.createContentHash(contentHash);
      this.hashCache.set(contentId, contentHash);

      console.log(`🔢 Generated hashes for content: ${contentId}`);
      return contentHash;

    } catch (error) {
      console.error('Content hash generation failed:', error);
      throw error;
    }
  }

  // Check for duplicate content before upload
  async checkForDuplicateContent(fileData: Uint8Array): Promise<{
    isDuplicate: boolean;
    originalContentId?: string;
    confidence: number;
  }> {
    try {
      const md5Hash = createHash('md5').update(fileData).digest('hex');
      const sha256Hash = createHash('sha256').update(fileData).digest('hex');

      // Check exact matches first
      const exactMatch = await storage.findContentByHash(md5Hash, sha256Hash);
      if (exactMatch) {
        return {
          isDuplicate: true,
          originalContentId: exactMatch.contentId,
          confidence: 1.0
        };
      }

      // For media files, check perceptual similarity
      const perceptualHash = this.generatePerceptualHash(fileData);
      if (perceptualHash) {
        const similarContent = await storage.findSimilarContent(perceptualHash, 0.95);
        if (similarContent) {
          return {
            isDuplicate: true,
            originalContentId: similarContent.contentId,
            confidence: 0.95
          };
        }
      }

      return { isDuplicate: false, confidence: 0 };

    } catch (error) {
      console.error('Duplicate content check failed:', error);
      return { isDuplicate: false, confidence: 0 };
    }
  }

  // Blacklist content hashes to prevent re-upload
  private async blacklistContentHashes(contentIds: string[]): Promise<void> {
    try {
      for (const contentId of contentIds) {
        const hash = await storage.getContentHash(contentId);
        if (hash) {
          await storage.blacklistContentHash({
            ...hash,
            blacklistedAt: new Date(),
            reason: 'dmca_takedown'
          });
        }
      }
      console.log(`🚫 Blacklisted ${contentIds.length} content hashes`);
    } catch (error) {
      console.error('Content hash blacklisting failed:', error);
    }
  }

  // ===== CONTENT BUNDLES SYSTEM =====

  // Create content bundle with promotional pricing
  async createContentBundle(params: {
    creatorId: string;
    title: string;
    description: string;
    contentIds: string[];
    discountPercentage: number;
    tags?: string[];
    promoCode?: string;
    validUntil?: Date;
    maxRedemptions?: number;
  }): Promise<{ success: boolean; bundleId?: string; error?: string }> {
    try {
      // Validate content ownership
      const ownedContent = await this.validateContentOwnership(params.creatorId, params.contentIds);
      if (ownedContent.length !== params.contentIds.length) {
        return { success: false, error: 'Some content items are not owned by creator' };
      }

      // Calculate bundle price
      const totalPrice = ownedContent.reduce((sum, content) => sum + (content.price || 0), 0);
      const discountedPrice = Math.round(totalPrice * (1 - params.discountPercentage / 100));

      const bundleId = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const bundle: ContentBundle = {
        id: bundleId,
        creatorId: params.creatorId,
        title: params.title,
        description: params.description,
        price: discountedPrice,
        discountPercentage: params.discountPercentage,
        contentIds: params.contentIds,
        tags: params.tags || [],
        promoCode: params.promoCode,
        validUntil: params.validUntil,
        maxRedemptions: params.maxRedemptions,
        redemptions: 0,
        isActive: true,
        createdAt: new Date()
      };

      // Store bundle
      await storage.createContentBundle(bundle);
      this.bundleCache.set(bundleId, bundle);

      // Create audit log
      await storage.createAuditLog({
        actorId: params.creatorId,
        action: 'content_bundle_created',
        targetType: 'content_bundle',
        targetId: bundleId,
        diffJson: {
          itemCount: params.contentIds.length,
          totalPrice,
          discountedPrice,
          discountPercentage: params.discountPercentage
        }
      });

      console.log(`📦 Content bundle created: ${bundleId} - ${params.contentIds.length} items, ${params.discountPercentage}% off`);
      return { success: true, bundleId };

    } catch (error) {
      console.error('Content bundle creation failed:', error);
      return { success: false, error: 'Bundle creation failed' };
    }
  }

  // Purchase content bundle
  async purchaseContentBundle(
    bundleId: string, 
    buyerId: string, 
    promoCode?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const bundle = await this.getContentBundle(bundleId);
      if (!bundle) {
        return { success: false, error: 'Bundle not found' };
      }

      if (!bundle.isActive) {
        return { success: false, error: 'Bundle is no longer active' };
      }

      if (bundle.validUntil && new Date() > bundle.validUntil) {
        return { success: false, error: 'Bundle has expired' };
      }

      if (bundle.maxRedemptions && bundle.redemptions >= bundle.maxRedemptions) {
        return { success: false, error: 'Bundle redemption limit reached' };
      }

      // Validate promo code if provided
      if (promoCode && bundle.promoCode !== promoCode) {
        return { success: false, error: 'Invalid promo code' };
      }

      // Check if user already owns any content in bundle
      const alreadyOwned = await this.checkContentOwnership(buyerId, bundle.contentIds);
      if (alreadyOwned.length > 0) {
        return { success: false, error: 'You already own some content in this bundle' };
      }

      // Process payment and grant access
      const transactionId = await this.processBundlePurchase(bundle, buyerId);
      
      // Update redemption count
      bundle.redemptions++;
      await storage.updateContentBundle(bundleId, bundle);
      this.bundleCache.set(bundleId, bundle);

      console.log(`📦 Bundle purchased: ${bundleId} by ${buyerId} - Transaction: ${transactionId}`);
      return { success: true, transactionId };

    } catch (error) {
      console.error('Bundle purchase failed:', error);
      return { success: false, error: 'Purchase failed' };
    }
  }

  // Get creator's content bundles
  async getCreatorBundles(creatorId: string, includeInactive: boolean = false): Promise<ContentBundle[]> {
    try {
      const bundles = await storage.getCreatorContentBundles(creatorId, includeInactive);
      return bundles.map(bundle => ({
        ...bundle,
        // Add calculated fields
        originalPrice: bundle.contentIds.length * 1000, // Simplified calculation
        savings: Math.round((bundle.discountPercentage / 100) * bundle.price)
      }));
    } catch (error) {
      console.error('Failed to get creator bundles:', error);
      return [];
    }
  }

  // ===== HELPER METHODS =====

  private async validateContentOwnership(creatorId: string, contentIds: string[]): Promise<any[]> {
    const ownedContent = [];
    for (const contentId of contentIds) {
      const content = await storage.getMediaAsset(contentId);
      if (content && content.ownerId === creatorId) {
        ownedContent.push(content);
      }
    }
    return ownedContent;
  }

  private async checkContentOwnership(userId: string, contentIds: string[]): Promise<string[]> {
    const ownedIds = [];
    for (const contentId of contentIds) {
      const hasAccess = await storage.userHasContentAccess(userId, contentId);
      if (hasAccess) {
        ownedIds.push(contentId);
      }
    }
    return ownedIds;
  }

  private async processBundlePurchase(bundle: ContentBundle, buyerId: string): Promise<string> {
    // Create transaction record
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Grant access to all content in bundle
    for (const contentId of bundle.contentIds) {
      await storage.grantContentAccess(buyerId, contentId, 'bundle_purchase', bundle.id);
    }

    // Record transaction
    await storage.createTransaction({
      id: transactionId,
      userId: buyerId,
      type: 'bundle_purchase',
      amount: bundle.price,
      currency: 'USD',
      status: 'completed',
      metadata: {
        bundleId: bundle.id,
        contentIds: bundle.contentIds,
        discountPercentage: bundle.discountPercentage
      }
    });

    return transactionId;
  }

  private async getContentBundle(bundleId: string): Promise<ContentBundle | null> {
    // Check cache first
    if (this.bundleCache.has(bundleId)) {
      return this.bundleCache.get(bundleId)!;
    }

    // Fetch from database
    const bundle = await storage.getContentBundle(bundleId);
    if (bundle) {
      this.bundleCache.set(bundleId, bundle);
    }

    return bundle;
  }

  private isMediaFile(url: string): boolean {
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.avi', '.webm'];
    return mediaExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  private generatePerceptualHash(data: Uint8Array): string {
    // Simplified perceptual hash generation (real implementation would use image processing)
    const hash = createHash('sha256').update(data.slice(0, 1024)).digest('hex');
    return hash.substring(0, 16); // Return first 16 chars as simplified perceptual hash
  }

  private async removeContentFromCDN(contentId: string): Promise<void> {
    try {
      // Implementation would integrate with CDN provider to remove content
      console.log(`🗑️ Removing content ${contentId} from CDN`);
      
      // Queue background job for CDN removal
      await performanceOptimizationService.queueJob('remove_from_cdn', {
        contentId
      }, { priority: 'high' });
      
    } catch (error) {
      console.error(`Failed to remove content ${contentId} from CDN:`, error);
    }
  }
}

export const contentManagementService = new ContentManagementService();