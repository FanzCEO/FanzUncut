import { Router, Request, Response } from 'express';
import { db } from '../db';
import { nftAssets, mediaAssets } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { nftMintingService } from '../services/nftMintingService';
import { isAuthenticated } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schema for minting NFT
const mintNFTSchema = z.object({
  mediaAssetId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  royaltyPercentage: z.number().min(0).max(5000).default(1000), // Max 50%, default 10%
  mintPriceCents: z.number().min(0),
  blockchain: z.enum(['ethereum', 'polygon', 'base', 'arbitrum', 'solana']).default('polygon'),
  isExclusive: z.boolean().default(true),
  unlockableContentUrl: z.string().optional(),
});

// ===== MINTING & CREATION =====

// Mint NFT from media asset
router.post('/mint', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    
    const validationResult = mintNFTSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const data = validationResult.data;

    // Verify media asset exists and belongs to user
    const [mediaAsset] = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, data.mediaAssetId),
          eq(mediaAssets.userId, userId)
        )
      );

    if (!mediaAsset) {
      return res.status(404).json({
        success: false,
        error: 'Media asset not found or access denied',
      });
    }

    // Check if NFT already exists for this media
    const [existingNFT] = await db
      .select()
      .from(nftAssets)
      .where(eq(nftAssets.mediaAssetId, data.mediaAssetId));

    if (existingNFT) {
      return res.status(400).json({
        success: false,
        error: 'NFT already minted for this media asset',
      });
    }

    // Get user email for Crossmint email-to-wallet
    const userEmail = req.session.userEmail || `user${userId}@boyfanz.com`;

    // Create NFT record in database (pending mint)
    const [nftAsset] = await db
      .insert(nftAssets)
      .values({
        mediaAssetId: data.mediaAssetId,
        ownerId: userId,
        blockchain: data.blockchain,
        status: 'minting',
        royaltyPercentage: data.royaltyPercentage,
        // Store additional data in metadata (JSON)
        metadata: {
          mintPriceCents: data.mintPriceCents,
          isExclusive: data.isExclusive,
          unlockableContentUrl: data.unlockableContentUrl,
        },
      })
      .returning();

    // Return immediately - mint in background
    res.json({
      success: true,
      nftAsset,
      message: 'NFT minting initiated. This may take a few minutes.',
    });

    // Mint NFT using Crossmint (background process)
    if (nftMintingService.isConfigured()) {
      setImmediate(async () => {
        try {
          const mintResponse = await nftMintingService.mintNFT({
            recipientEmail: userEmail,
            blockchain: data.blockchain,
            metadata: {
              name: data.name,
              description: data.description,
              imageUrl: mediaAsset.url,
              attributes: [
                { trait_type: 'Creator', value: userId },
                { trait_type: 'Media Type', value: mediaAsset.mediaType || 'unknown' },
                { trait_type: 'Royalty', value: `${data.royaltyPercentage / 100}%` },
              ],
            },
          });

          // CRITICAL: Store actionId immediately for recovery
          await db
            .update(nftAssets)
            .set({
              metadata: {
                ...(nftAsset.metadata as object || {}),
                actionId: mintResponse.actionId,
                mintStartedAt: new Date().toISOString(),
              },
            })
            .where(eq(nftAssets.id, nftAsset.id));

          // Poll for mint completion
          const pollStatus = async () => {
            const status = await nftMintingService.getMintStatus(mintResponse.actionId);
            
            if (status.status === 'completed') {
              // Fetch current metadata from DB (contains actionId)
              const [current] = await db
                .select()
                .from(nftAssets)
                .where(eq(nftAssets.id, nftAsset.id));
              
              await db
                .update(nftAssets)
                .set({
                  status: 'minted',
                  tokenId: status.tokenId,
                  contractAddress: status.contractAddress,
                  transactionHash: status.transactionHash,
                  metadataUri: status.metadata?.metadataUri,
                  // Preserve actionId + add completion time
                  metadata: {
                    ...(current?.metadata as object || {}),
                    mintCompletedAt: new Date().toISOString(),
                  },
                })
                .where(eq(nftAssets.id, nftAsset.id));
              
              console.log(`✅ NFT minted successfully: ${nftAsset.id}`);
            } else if (status.status === 'failed') {
              await db
                .update(nftAssets)
                .set({
                  status: 'failed',
                })
                .where(eq(nftAssets.id, nftAsset.id));
              
              console.error(`❌ NFT minting failed: ${status.error}`);
            } else {
              // Still pending - poll again in 5 seconds
              setTimeout(pollStatus, 5000);
            }
          };

          pollStatus();
        } catch (error: any) {
          await db
            .update(nftAssets)
            .set({ status: 'failed' })
            .where(eq(nftAssets.id, nftAsset.id));
          
          console.error(`❌ NFT minting error for ${nftAsset.id}:`, error.message);
        }
      });
    } else {
      console.warn('⚠️ Crossmint API not configured. NFT will remain in minting state.');
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get user's NFTs (owned)
router.get('/my-nfts', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const nfts = await db
      .select({
        nft: nftAssets,
        media: mediaAssets,
      })
      .from(nftAssets)
      .leftJoin(mediaAssets, eq(nftAssets.mediaAssetId, mediaAssets.id))
      .where(eq(nftAssets.ownerId, userId))
      .orderBy(desc(nftAssets.createdAt));

    return res.json({
      success: true,
      nfts,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get single NFT details
router.get('/nfts/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const nftId = req.params.id;

    const [result] = await db
      .select({
        nft: nftAssets,
        media: mediaAssets,
      })
      .from(nftAssets)
      .leftJoin(mediaAssets, eq(nftAssets.mediaAssetId, mediaAssets.id))
      .where(eq(nftAssets.id, nftId));

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found',
      });
    }

    return res.json({
      success: true,
      nft: result.nft,
      media: result.media,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== TOKEN-GATING =====

// Verify NFT ownership (for content access)
router.post('/verify-ownership', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { nftId, walletAddress } = req.body;

    if (!nftId) {
      return res.status(400).json({
        success: false,
        error: 'nftId is required',
      });
    }

    const [nft] = await db
      .select()
      .from(nftAssets)
      .where(eq(nftAssets.id, nftId));

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found',
      });
    }

    // If wallet address provided, verify on-chain ownership
    if (walletAddress && nft.contractAddress && nft.tokenId) {
      const ownsNFT = await nftMintingService.verifyOwnership(
        walletAddress,
        nft.contractAddress,
        nft.tokenId,
        nft.blockchain
      );

      return res.json({
        success: true,
        ownsNFT,
        nft,
      });
    }

    // Otherwise, check database ownership
    const userId = req.session.userId!;
    const ownsNFT = nft.ownerId === userId;

    return res.json({
      success: true,
      ownsNFT,
      nft,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Check access to exclusive content
router.get('/content-access/:mediaAssetId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const mediaAssetId = req.params.mediaAssetId;

    // Check if content has NFT requirement
    const [nft] = await db
      .select()
      .from(nftAssets)
      .where(eq(nftAssets.mediaAssetId, mediaAssetId));

    if (!nft) {
      // No NFT requirement - content is public
      return res.json({
        success: true,
        hasAccess: true,
        reason: 'No NFT requirement',
      });
    }

    // Check if content is exclusive (from metadata)
    const isExclusive = (nft.metadata as any)?.isExclusive ?? true;
    if (!isExclusive) {
      return res.json({
        success: true,
        hasAccess: true,
        reason: 'NFT exists but content is not exclusive',
      });
    }

    // Check if user owns the NFT
    const ownsNFT = nft.ownerId === userId;

    return res.json({
      success: true,
      hasAccess: ownsNFT,
      reason: ownsNFT ? 'User owns NFT' : 'NFT required for access',
      nft,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== MARKETPLACE (Basic) =====

// List NFTs for sale
router.get('/marketplace', async (req: Request, res: Response) => {
  try {
    const nfts = await db
      .select({
        nft: nftAssets,
        media: mediaAssets,
      })
      .from(nftAssets)
      .leftJoin(mediaAssets, eq(nftAssets.mediaAssetId, mediaAssets.id))
      .where(eq(nftAssets.status, 'minted'))
      .orderBy(desc(nftAssets.createdAt))
      .limit(50);

    return res.json({
      success: true,
      nfts,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as nftContentRoutes };
