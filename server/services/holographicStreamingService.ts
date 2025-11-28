import { db } from '../db';
import {
  holographicStreams,
  holographicSessions,
  holographicAvatars,
  liveStreams,
  users,
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface CreateHolographicStreamRequest {
  liveStreamId: string;
  mode?: 'vr' | 'ar' | 'mixed' | '360' | 'spatial';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  environmentPreset?: string;
  maxConcurrentViewers?: number;
}

export interface JoinHolographicSessionRequest {
  holographicStreamId: string;
  userId: string;
  deviceType?: string;
  browserAgent?: string;
  webxrMode?: string;
}

export interface UpdateAvatarPositionRequest {
  sessionId: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number; w: number };
  viewDirection?: { x: number; y: number; z: number };
}

export interface CreateAvatarRequest {
  userId: string;
  modelType?: string;
  modelUrl?: string;
  colorScheme?: any;
}

export class HolographicStreamingService {
  /**
   * Enable holographic mode for a live stream
   */
  async createHolographicStream(request: CreateHolographicStreamRequest): Promise<any> {
    // Check if live stream exists
    const [stream] = await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.id, request.liveStreamId));

    if (!stream) {
      throw new Error('Live stream not found');
    }

    // Check if already holographic
    const [existing] = await db
      .select()
      .from(holographicStreams)
      .where(eq(holographicStreams.liveStreamId, request.liveStreamId));

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(holographicStreams)
        .set({
          mode: request.mode || existing.mode,
          quality: request.quality || existing.quality,
          environmentPreset: request.environmentPreset || existing.environmentPreset,
          maxConcurrentViewers: request.maxConcurrentViewers || existing.maxConcurrentViewers,
          updatedAt: new Date(),
        })
        .where(eq(holographicStreams.id, existing.id))
        .returning();

      return updated;
    }

    // Create new holographic stream
    const [holographicStream] = await db
      .insert(holographicStreams)
      .values({
        liveStreamId: request.liveStreamId,
        mode: request.mode || 'vr',
        quality: request.quality || 'medium',
        environmentPreset: request.environmentPreset || 'studio',
        maxConcurrentViewers: request.maxConcurrentViewers || 50,
      })
      .returning();

    return holographicStream;
  }

  /**
   * Join a holographic stream session (VR/AR viewer)
   */
  async joinHolographicSession(request: JoinHolographicSessionRequest): Promise<any> {
    // Check if stream exists and is active
    const [stream] = await db
      .select({
        holographicStream: holographicStreams,
        liveStream: liveStreams,
      })
      .from(holographicStreams)
      .innerJoin(liveStreams, eq(holographicStreams.liveStreamId, liveStreams.id))
      .where(eq(holographicStreams.id, request.holographicStreamId));

    if (!stream) {
      throw new Error('Holographic stream not found');
    }

    if (stream.liveStream.status !== 'live') {
      throw new Error('Stream is not currently live');
    }

    // Check concurrent viewer limit
    const activeViewers = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(holographicSessions)
      .where(
        and(
          eq(holographicSessions.holographicStreamId, request.holographicStreamId),
          eq(holographicSessions.isActive, true)
        )
      );

    const currentCount = activeViewers[0]?.count || 0;
    if (currentCount >= (stream.holographicStream.maxConcurrentViewers || 50)) {
      throw new Error('Holographic stream at maximum capacity');
    }

    // End any existing active sessions for this user
    await db
      .update(holographicSessions)
      .set({
        isActive: false,
        leftAt: new Date(),
      })
      .where(
        and(
          eq(holographicSessions.holographicStreamId, request.holographicStreamId),
          eq(holographicSessions.userId, request.userId),
          eq(holographicSessions.isActive, true)
        )
      );

    // Create new session
    const [session] = await db
      .insert(holographicSessions)
      .values({
        holographicStreamId: request.holographicStreamId,
        userId: request.userId,
        deviceType: request.deviceType,
        browserAgent: request.browserAgent,
        webxrMode: request.webxrMode || 'immersive-vr',
        renderQuality: stream.holographicStream.quality,
        isActive: true,
      })
      .returning();

    return {
      session,
      streamConfig: stream.holographicStream,
    };
  }

  /**
   * Update avatar position in holographic space
   */
  async updateAvatarPosition(request: UpdateAvatarPositionRequest): Promise<any> {
    const updates: any = {
      avatarPosition: request.position,
      lastActivityAt: new Date(),
    };

    if (request.rotation) {
      updates.avatarRotation = request.rotation;
    }

    if (request.viewDirection) {
      updates.viewDirection = request.viewDirection;
    }

    const [updated] = await db
      .update(holographicSessions)
      .set(updates)
      .where(eq(holographicSessions.id, request.sessionId))
      .returning();

    return updated;
  }

  /**
   * Leave holographic session
   */
  async leaveHolographicSession(sessionId: string): Promise<any> {
    const [session] = await db
      .update(holographicSessions)
      .set({
        isActive: false,
        leftAt: new Date(),
      })
      .where(eq(holographicSessions.id, sessionId))
      .returning();

    return session;
  }

  /**
   * Get active holographic sessions for a stream
   */
  async getActiveSessions(holographicStreamId: string): Promise<any[]> {
    const sessions = await db
      .select({
        session: holographicSessions,
        user: {
          id: users.id,
          username: users.username,
        },
      })
      .from(holographicSessions)
      .innerJoin(users, eq(holographicSessions.userId, users.id))
      .where(
        and(
          eq(holographicSessions.holographicStreamId, holographicStreamId),
          eq(holographicSessions.isActive, true)
        )
      )
      .orderBy(desc(holographicSessions.joinedAt));

    return sessions;
  }

  /**
   * Create or update user's holographic avatar
   */
  async upsertAvatar(request: CreateAvatarRequest): Promise<any> {
    const [existing] = await db
      .select()
      .from(holographicAvatars)
      .where(eq(holographicAvatars.userId, request.userId));

    if (existing) {
      // Update existing avatar
      const [updated] = await db
        .update(holographicAvatars)
        .set({
          modelType: request.modelType || existing.modelType,
          modelUrl: request.modelUrl || existing.modelUrl,
          colorScheme: request.colorScheme || existing.colorScheme,
          updatedAt: new Date(),
        })
        .where(eq(holographicAvatars.id, existing.id))
        .returning();

      return updated;
    }

    // Create new avatar
    const [avatar] = await db
      .insert(holographicAvatars)
      .values({
        userId: request.userId,
        modelType: request.modelType || 'humanoid',
        modelUrl: request.modelUrl,
        colorScheme: request.colorScheme || {},
      })
      .returning();

    return avatar;
  }

  /**
   * Get user's avatar
   */
  async getAvatar(userId: string): Promise<any> {
    const [avatar] = await db
      .select()
      .from(holographicAvatars)
      .where(eq(holographicAvatars.userId, userId));

    if (!avatar) {
      // Return default avatar
      return {
        userId,
        modelType: 'humanoid',
        colorScheme: { primary: '#FF0000', secondary: '#D4A959' },
        idleAnimation: 'standing',
      };
    }

    return avatar;
  }

  /**
   * Get holographic stream details
   */
  async getHolographicStream(liveStreamId: string): Promise<any> {
    const [stream] = await db
      .select()
      .from(holographicStreams)
      .where(eq(holographicStreams.liveStreamId, liveStreamId));

    return stream;
  }

  /**
   * Update session performance metrics
   */
  async updateSessionMetrics(
    sessionId: string,
    frameRate: number,
    latencyMs: number
  ): Promise<void> {
    await db
      .update(holographicSessions)
      .set({
        currentFrameRate: frameRate,
        latencyMs,
        lastActivityAt: new Date(),
      })
      .where(eq(holographicSessions.id, sessionId));
  }

  /**
   * Enable hand/eye tracking for session
   */
  async updateTrackingState(
    sessionId: string,
    handsTracked: boolean,
    eyeGazeTracked: boolean,
    gestureData?: any
  ): Promise<any> {
    const [session] = await db
      .update(holographicSessions)
      .set({
        handsTracked,
        eyeGazeTracked,
        gestureData: gestureData || {},
        lastActivityAt: new Date(),
      })
      .where(eq(holographicSessions.id, sessionId))
      .returning();

    return session;
  }
}

export const holographicStreamingService = new HolographicStreamingService();
