import axios from 'axios';

interface CrossmintMintRequest {
  recipient: string; // email:user@example.com:polygon or wallet:0x...
  metadata: {
    name: string;
    description: string;
    image: string; // Public HTTPS URL
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  reuploadLinkedFiles?: boolean;
}

interface CrossmintMintResponse {
  actionId: string;
  clientSecret?: string;
}

interface CrossmintStatusResponse {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  tokenId?: string;
  contractAddress?: string;
  transactionHash?: string;
  error?: string;
  metadata?: any;
}

interface MintNFTOptions {
  recipientEmail?: string;
  recipientWallet?: string;
  blockchain?: 'polygon' | 'ethereum' | 'base' | 'arbitrum' | 'solana';
  metadata: {
    name: string;
    description: string;
    imageUrl: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

export class NFTMintingService {
  private apiKey: string | null;
  private baseUrl = 'https://www.crossmint.com/api/2022-06-09';
  private collectionId: string; // Default collection

  constructor() {
    this.apiKey = process.env.CROSSMINT_API_KEY || null;
    this.collectionId = process.env.CROSSMINT_COLLECTION_ID || 'default';
  }

  /**
   * Check if Crossmint API is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey !== '';
  }

  /**
   * Mint NFT using Crossmint (blockchain-agnostic)
   * Supports email-to-wallet (creates custodial wallet automatically)
   */
  async mintNFT(options: MintNFTOptions): Promise<CrossmintMintResponse> {
    if (!this.isConfigured()) {
      throw new Error('Crossmint API key not configured');
    }

    // Build recipient string
    let recipient: string;
    if (options.recipientEmail) {
      const blockchain = options.blockchain || 'polygon';
      recipient = `email:${options.recipientEmail}:${blockchain}`;
    } else if (options.recipientWallet) {
      recipient = `wallet:${options.recipientWallet}`;
    } else {
      throw new Error('Either recipientEmail or recipientWallet must be provided');
    }

    const request: CrossmintMintRequest = {
      recipient,
      metadata: {
        name: options.metadata.name,
        description: options.metadata.description,
        image: options.metadata.imageUrl,
        attributes: options.metadata.attributes || [],
      },
      reuploadLinkedFiles: true, // Crossmint will upload to IPFS
    };

    try {
      const response = await axios.post<CrossmintMintResponse>(
        `${this.baseUrl}/collections/${this.collectionId}/nfts`,
        request,
        {
          headers: {
            'x-api-key': this.apiKey!,
            'content-type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || error.response.data?.error || error.response.statusText;
        throw new Error(`Crossmint API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Check minting status
   */
  async getMintStatus(actionId: string): Promise<CrossmintStatusResponse> {
    if (!this.isConfigured()) {
      throw new Error('Crossmint API key not configured');
    }

    try {
      const response = await axios.get<CrossmintStatusResponse>(
        `${this.baseUrl}/actions/${actionId}`,
        {
          headers: {
            'x-api-key': this.apiKey!,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Crossmint API error: ${error.response.data?.message || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Get NFTs owned by a wallet address
   */
  async getOwnedNFTs(walletAddress: string, blockchain: string = 'polygon'): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('Crossmint API key not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/wallets/${blockchain}:${walletAddress}/nfts`,
        {
          headers: {
            'x-api-key': this.apiKey!,
          },
        }
      );

      return response.data.nfts || [];
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Crossmint API error: ${error.response.data?.message || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Verify NFT ownership (token-gating)
   * Returns true if wallet owns the NFT
   */
  async verifyOwnership(
    walletAddress: string,
    contractAddress: string,
    tokenId: string,
    blockchain: string = 'polygon'
  ): Promise<boolean> {
    try {
      const ownedNFTs = await this.getOwnedNFTs(walletAddress, blockchain);
      
      return ownedNFTs.some(
        nft => 
          nft.contractAddress?.toLowerCase() === contractAddress.toLowerCase() &&
          nft.tokenId === tokenId
      );
    } catch (error) {
      console.error('Error verifying NFT ownership:', error);
      return false;
    }
  }

  /**
   * Calculate royalty amount
   */
  calculateRoyalty(salePriceCents: number, royaltyPercentage: number): number {
    // royaltyPercentage is in basis points (1000 = 10%)
    return Math.floor((salePriceCents * royaltyPercentage) / 10000);
  }

  /**
   * Build NFT metadata JSON (ERC-721/1155 standard)
   */
  buildMetadata(options: {
    name: string;
    description: string;
    imageUrl: string;
    externalUrl?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    unlockableContent?: string;
  }): object {
    return {
      name: options.name,
      description: options.description,
      image: options.imageUrl,
      external_url: options.externalUrl,
      attributes: options.attributes || [],
      properties: {
        unlockable_content: options.unlockableContent,
      },
    };
  }
}

export const nftMintingService = new NFTMintingService();
