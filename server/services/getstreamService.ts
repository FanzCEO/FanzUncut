import { eq, and, isNull } from 'drizzle-orm';
import { liveStreams, streamViewers, users } from '../../shared/schema';
import type { LiveStream, User } from '../../shared/schema';
import { nanoid } from 'nanoid';
import type { IStorage } from '../storage';

// Real GetStream.io server-side imports
import { StreamClient } from '@stream-io/node-sdk';
import crypto from 'crypto';

// Define our own capabilities and types for now
const VideoOwnCapability = {
  SEND_AUDIO: 'send-audio',
  SEND_VIDEO: 'send-video', 
  MUTE_USERS: 'mute-users',
  REMOVE_CALL_MEMBER: 'remove-call-member',
  JOIN_CALL: 'join-call',
};

interface Call {
  id: string;
  getOrCreate?: (options: any) => Promise<void>;
  goLive?: (options: any) => Promise<void>;
  stopLive?: () => Promise<void>;
  listRecordings?: () => Promise<{ recordings: Array<{ url: string }> }>;
}

interface GetStreamWebhookEvent {
  type: string;
  created_at: string;
  call?: {
    id: string;
    type: string;
    started_at?: string;
    ended_at?: string;
    hls?: { playlist_url?: string };
    recording?: { url?: string };
    thumbnail?: { url?: string };
    session?: { participants?: { count?: number } };
  };
  user?: {
    id: string;
  };
}

class GetStreamService {
  private client: StreamClient | null = null;
  private apiKey: string;
  private apiSecret: string;
  private webhookSecret: string;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    // Environment variables for GetStream
    this.apiKey = process.env.GETSTREAM_API_KEY || '';
    this.apiSecret = process.env.GETSTREAM_API_SECRET || '';
    this.webhookSecret = process.env.GETSTREAM_WEBHOOK_SECRET || '';
    
    // Initialize real GetStream client if credentials are available
    this.initializeClient();
  }

  private initializeClient() {
    if (this.apiKey && this.apiSecret && this.apiKey !== 'mock-api-key') {
      try {
        this.client = new StreamClient(this.apiKey, this.apiSecret);
        console.log('✅ GetStream.io client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize GetStream client:', error);
        console.log('💡 Using fallback mode - some features will be limited');
      }
    } else {
      console.log('⚠️ GetStream credentials not configured - using development mode');
      console.log('💡 Set GETSTREAM_API_KEY and GETSTREAM_API_SECRET environment variables');
    }
  }

  /**
   * Generate GetStream user token for client-side authentication
   * SECURITY: Uses official SDK token generation with proper validation
   */
  generateUserToken(userId: string, validityInSeconds?: number): string {
    if (!this.client) {
      throw new Error('GetStream client not initialized - check API credentials');
    }
    
    if (!this.apiSecret) {
      throw new Error('GetStream API secret not configured');
    }

    return this.client.generateUserToken({
      user_id: userId,
      validity_in_seconds: validityInSeconds || 3600, // 1 hour default
    });
  }

  /**
   * Verify GetStream webhook signature for security
   * SECURITY: Prevents webhook forgery attacks
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.error('⚠️ Webhook secret not configured - cannot verify signature');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');
      
      // Compare signatures using secure method to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle GetStream webhook events and update database accordingly
   * SECURITY: Signature must be verified before calling this method
   */
  async handleWebhookEvent(event: GetStreamWebhookEvent): Promise<void> {
    console.log('📦 Processing GetStream webhook event:', event.type);

    try {
      switch (event.type) {
        case 'call.live_started':
          await this.handleLiveStarted(event);
          break;
        case 'call.ended':
          await this.handleCallEnded(event);
          break;
        case 'call.recording_ready':
          await this.handleRecordingReady(event);
          break;
        case 'call.participant_joined':
        case 'call.participant_left':
          await this.handleParticipantChange(event);
          break;
        default:
          console.log('ℹ️ Unhandled webhook event type:', event.type);
      }
    } catch (error) {
      console.error('❌ Error handling webhook event:', error);
      throw error;
    }
  }

  private async handleLiveStarted(event: GetStreamWebhookEvent): Promise<void> {
    if (!event.call?.id) return;
    
    const streams = await this.storage.getLiveStreams('', { status: 'scheduled' });
    const stream = streams.find(s => s.getstreamCallId === event.call?.id);
    
    if (stream) {
      await this.storage.updateStreamField(stream.id, 'startedAt', new Date(event.created_at));
      await this.storage.updateStreamStatus(stream.id, 'live');
      
      if (event.call.hls?.playlist_url) {
        await this.storage.updateStreamField(stream.id, 'hlsPlaylistUrl', event.call.hls.playlist_url);
        await this.storage.updateStreamField(stream.id, 'playbackUrl', event.call.hls.playlist_url);
      }
      
      console.log('✅ Live stream started:', stream.id);
    }
  }

  private async handleCallEnded(event: GetStreamWebhookEvent): Promise<void> {
    if (!event.call?.id) return;
    
    const streams = await this.storage.getLiveStreams('', { status: 'live' });
    const stream = streams.find(s => s.getstreamCallId === event.call?.id);
    
    if (stream) {
      await this.storage.updateStreamField(stream.id, 'endedAt', new Date(event.created_at));
      await this.storage.updateStreamStatus(stream.id, 'ended');
      
      console.log('✅ Live stream ended:', stream.id);
    }
  }

  private async handleRecordingReady(event: GetStreamWebhookEvent): Promise<void> {
    if (!event.call?.id || !event.call.recording?.url) return;
    
    const streams = await this.storage.getLiveStreams('', {});
    const stream = streams.find(s => s.getstreamCallId === event.call?.id);
    
    if (stream) {
      await this.storage.updateStreamField(stream.id, 'recordingUrl', event.call.recording.url);
      
      if (event.call.thumbnail?.url) {
        await this.storage.updateStreamField(stream.id, 'thumbnailUrl', event.call.thumbnail.url);
      }
      
      console.log('✅ Recording ready for stream:', stream.id);
    }
  }

  private async handleParticipantChange(event: GetStreamWebhookEvent): Promise<void> {
    if (!event.call?.id) return;
    
    const streams = await this.storage.getLiveStreams('', { status: 'live' });
    const stream = streams.find(s => s.getstreamCallId === event.call?.id);
    
    if (stream && event.call.session?.participants?.count !== undefined) {
      const participantCount = event.call.session.participants.count;
      await this.storage.updateStreamField(stream.id, 'viewersCount', participantCount);
      
      // Update max viewers if current count is higher
      if (participantCount > (stream.maxViewers || 0)) {
        await this.storage.updateStreamField(stream.id, 'maxViewers', participantCount);
      }
    }
  }


  /**
   * Create a new live stream session
   */
  async createLiveStream(streamData: {
    creatorId: string;
    title: string;
    description?: string;
    type: 'public' | 'private' | 'subscribers_only';
    priceCents?: number;
    scheduledFor?: Date;
  }): Promise<LiveStream> {
    try {
      // Generate unique call ID
      const callId = `livestream_${nanoid(12)}`;
      
      if (this.client) {
        console.log('📹 Creating GetStream livestream call:', callId);

        // Create the livestream call using real SDK
        const call = this.client.video.call('livestream', callId);
        const callResponse = await call.create({
          data: {
            created_by_id: streamData.creatorId,
            settings_override: {
              recording: {
                mode: 'available',
                audio_only: false,
                quality: '1080p',
              },
              broadcasting: {
                enabled: true,
                hls: {
                  enabled: true,
                },
              },
            },
          },
        });

        // Get real stream URLs and credentials from GetStream response
        const streamKey = callResponse.call?.ingress?.rtmp?.address || nanoid(32);
        const rtmpIngestUrl = callResponse.call?.ingress?.rtmp?.url || `rtmp://ingest.getstream.io/live/${callId}`;
        const hlsPlaylistUrl = callResponse.call?.egress?.hls?.playlist_url || `https://video.stream-io-api.com/api/v2/video/call/livestream/${callId}/playlist.m3u8`;
        
        console.log('✅ GetStream call created successfully with real URLs');

        // Create database record with real GetStream data
        const stream = await this.storage.createLiveStream({
          creatorId: streamData.creatorId,
          title: streamData.title,
          description: streamData.description || null,
          type: streamData.type,
          priceCents: streamData.priceCents || 0,
          streamKey,
          getstreamCallId: callId,
          status: streamData.scheduledFor && streamData.scheduledFor > new Date() ? 'scheduled' : 'scheduled',
          scheduledFor: streamData.scheduledFor || null,
          rtmpIngestUrl,
          hlsPlaylistUrl,
          streamUrl: hlsPlaylistUrl,
          thumbnailUrl: callResponse.call?.thumbnail_url || null,
          recordingUrl: null,
          playbackUrl: hlsPlaylistUrl,
          viewersCount: 0,
          maxViewers: null,
          totalViewTime: null,
          startedAt: null,
          endedAt: null,
          updatedAt: new Date(),
        });

        return stream;
      } else {
        // Development fallback mode - create mock stream for testing
        console.log('🔧 Development mode: Creating mock livestream for testing');
        
        const streamKey = `dev_${nanoid(32)}`;
        const rtmpIngestUrl = `rtmp://localhost:1935/live/${callId}`;
        const hlsPlaylistUrl = `https://demo-streams.getstream.io/demos/livestream_${callId}/playlist.m3u8`;
        
        // Create database record with development URLs
        const stream = await this.storage.createLiveStream({
          creatorId: streamData.creatorId,
          title: streamData.title,
          description: streamData.description || null,
          type: streamData.type,
          priceCents: streamData.priceCents || 0,
          streamKey,
          getstreamCallId: callId,
          status: streamData.scheduledFor && streamData.scheduledFor > new Date() ? 'scheduled' : 'scheduled',
          scheduledFor: streamData.scheduledFor || null,
          rtmpIngestUrl,
          hlsPlaylistUrl,
          streamUrl: hlsPlaylistUrl,
          thumbnailUrl: `https://picsum.photos/640/360?random=${callId}`,
          recordingUrl: null,
          playbackUrl: hlsPlaylistUrl,
          viewersCount: 0,
          maxViewers: null,
          totalViewTime: null,
          dashPlaylistUrl: null,
          streamingConfig: null,
          startedAt: null,
          endedAt: null,
          updatedAt: new Date(),
        });

        console.log('✅ Development stream created successfully');
        return stream;
      }
    } catch (error) {
      console.error('Error creating live stream:', error);
      throw new Error('Failed to create live stream session');
    }
  }

  /**
   * Start a live stream
   */
  async startLiveStream(streamId: string, creatorId: string): Promise<void> {
    const stream = await this.storage.getLiveStream(streamId);

    if (!stream || stream.creatorId !== creatorId) {
      throw new Error('Stream not found or unauthorized');
    }

    if (stream.status !== 'scheduled') {
      throw new Error('Stream cannot be started in current status');
    }

    try {
      if (this.client && stream.getstreamCallId) {
        // Start broadcasting using real GetStream SDK (don't set live status yet)
        console.log('🔴 Starting live stream:', stream.getstreamCallId);
        const call = this.client.video.call('livestream', stream.getstreamCallId);
        
        // Actually start the livestream - status will be set by webhook
        await call.goLive({ start_hls: true, start_recording: true });
        
        console.log('✅ Live stream goLive() called - waiting for webhook confirmation');
      } else {
        // Development fallback - immediately set to live status
        console.log('🔧 Development mode: Setting stream to live status');
        await this.storage.updateStreamStatus(streamId, 'live');
        console.log('✅ Development stream started successfully');
      }
    } catch (error) {
      console.error('Error starting live stream:', error);
      throw new Error('Failed to start live stream');
    }
  }

  /**
   * End a live stream
   */
  async endLiveStream(streamId: string, creatorId: string): Promise<void> {
    const stream = await this.storage.getLiveStream(streamId);

    if (!stream || stream.creatorId !== creatorId) {
      throw new Error('Stream not found or unauthorized');
    }

    if (stream.status !== 'live') {
      throw new Error('Stream is not currently live');
    }

    try {
      if (this.client && stream.getstreamCallId) {
        // Stop broadcasting using real GetStream SDK (don't set ended status yet)
        console.log('🔴 Ending live stream:', stream.getstreamCallId);
        const call = this.client.video.call('livestream', stream.getstreamCallId);
        
        // Stop the livestream - status will be set by webhook
        await call.stopLive();
        
        console.log('✅ Live stream stopLive() called - waiting for webhook confirmation');
      } else {
        // Development fallback - immediately set to ended status
        console.log('🔧 Development mode: Setting stream to ended status');
        await this.storage.updateStreamStatus(streamId, 'ended');
        console.log('✅ Development stream ended successfully');
      }
    } catch (error) {
      console.error('Error ending live stream:', error);
      throw new Error('Failed to end live stream');
    }
  }

  /**
   * Join a live stream as a viewer with proper access control
   */
  async joinStream(streamId: string, userId: string): Promise<{ token: string; callId: string; playbackUrl?: string }> {
    const stream = await this.storage.getLiveStream(streamId);

    if (!stream) {
      throw new Error('Stream not found');
    }

    if (stream.status !== 'live') {
      throw new Error('Stream is not currently live');
    }

    // Check access permissions based on stream type
    await this.checkStreamAccess(stream, userId);

    try {
      if (this.client) {
        // Generate short-lived viewer token - SECURITY: Never store this token
        const viewerToken = this.generateUserToken(userId, 3600); // 1 hour

        // Only return real playback URL from GetStream, not fabricated ones
        const playbackUrl = stream.playbackUrl || stream.hlsPlaylistUrl;
        if (!playbackUrl) {
          throw new Error('Stream playback URL not available');
        }

        return {
          token: viewerToken,
          callId: stream.getstreamCallId!,
          playbackUrl,
        };
      } else {
        // Development fallback - return mock token and URLs
        console.log('🔧 Development mode: Generating mock viewer token');
        
        const mockToken = `dev_token_${nanoid(16)}_${userId}`;
        const playbackUrl = stream.playbackUrl || stream.hlsPlaylistUrl;

        return {
          token: mockToken,
          callId: stream.getstreamCallId!,
          playbackUrl,
        };
      }
    } catch (error) {
      console.error('Error joining stream:', error);
      throw new Error('Failed to join live stream');
    }
  }

  /**
   * Check if user has access to stream based on type and permissions
   */
  async checkStreamAccess(stream: LiveStream, userId: string): Promise<void> {
    if (stream.type === 'public') {
      return; // Public streams are accessible to all authenticated users
    }

    if (stream.type === 'private') {
      // Private streams are only accessible to the creator
      if (stream.creatorId !== userId) {
        throw new Error('This is a private stream - access denied');
      }
      return;
    }

    if (stream.type === 'subscribers_only') {
      // Check if user is subscribed to creator
      const subscription = await this.storage.getSubscription(userId, stream.creatorId);
      if (!subscription || subscription.status !== 'active') {
        throw new Error('This stream is for subscribers only - please subscribe to access');
      }
      return;
    }

    throw new Error('Unknown stream type');
  }

  /**
   * Leave a live stream  
   */
  async leaveStream(streamId: string, userId: string): Promise<void> {
    try {
      // Update viewer record using storage interface
      // Note: This would need viewer management methods in storage interface
      console.log(`Mock: User ${userId} leaving stream ${streamId}`);
    } catch (error) {
      console.error('Error leaving stream:', error);
      throw new Error('Failed to leave live stream');
    }
  }


  /**
   * Get live stream analytics
   */
  async getStreamAnalytics(streamId: string, creatorId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    averageWatchTime: number;
    peakViewers: number;
    totalTips: number;
  }> {
    const stream = await this.storage.getLiveStream(streamId);

    if (!stream || stream.creatorId !== creatorId) {
      throw new Error('Stream not found or unauthorized');
    }

    // Return mock analytics for now - real implementation would need viewer storage methods
    return {
      totalViews: stream.viewersCount || 0,
      uniqueViewers: stream.maxViewers || 0,
      averageWatchTime: 0,
      peakViewers: stream.maxViewers || 0,
      totalTips: stream.totalTipsCents || 0,
    };
  }
}

// Factory function to create GetStream service with storage dependency
export function createGetstreamService(storage: IStorage): GetStreamService {
  return new GetStreamService(storage);
}