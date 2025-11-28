import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { verify } from 'jsonwebtoken';
import { db } from './db';
import { users, messages, notifications } from '@shared/schema';
import { eq, and, or, desc, gte, sql } from 'drizzle-orm';
import { logger } from './logger';

// Types for WebSocket connections and messages
interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  rooms?: Set<string>;
  lastActivity?: Date;
}

interface WSMessage {
  type: 'auth' | 'message' | 'presence' | 'typing' | 'read_receipt' | 
        'tip' | 'stream_update' | 'content_published' | 'notification' |
        'moderation_alert' | 'purchase_complete' | 'ping' | 'pong' | 
        'ack' | 'message_history' | 'online_users' | 'connection' | 'error';
  data?: any;
  messageId?: string;
  targetUserId?: string;
  roomId?: string;
  timestamp?: string;
}

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesPerMinute: number;
  reconnections: number;
  avgLatency: number;
}

// Connection management
class WebSocketManager {
  private wss: WebSocketServer;
  private connections: Map<string, AuthenticatedWebSocket> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private typingIndicators: Map<string, Map<string, NodeJS.Timeout>> = new Map();
  private messageQueue: Map<string, WSMessage[]> = new Map();
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesPerMinute: 0,
    reconnections: 0,
    avgLatency: 0
  };
  private messageRateLimit: Map<string, number[]> = new Map();
  private heartbeatInterval!: NodeJS.Timeout;
  
  constructor(port: number = 3001) {
    try {
      this.wss = new WebSocketServer({ 
        port,
        perMessageDeflate: {
          zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
          },
          zlibInflateOptions: {
            chunkSize: 10 * 1024
          },
          clientNoContextTakeover: true,
          serverNoContextTakeover: true,
          serverMaxWindowBits: 10,
          concurrencyLimit: 10,
          threshold: 1024
        },
        maxPayload: 10 * 1024 * 1024 // 10MB max message size
      });
      
      this.wss.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.warn(`Port ${port} already in use, WebSocket functionality may be limited during hot reload`);
        } else {
          logger.error('WebSocket server error:', error);
        }
      });
      
      this.setupWebSocketServer();
      this.startHeartbeat();
      this.startMetricsCollection();
      
      logger.info(`WebSocket server started on port ${port}`);
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        logger.warn(`Port ${port} already in use - WebSocket server not started (likely hot reload)`);
        // Create a dummy server that does nothing but prevents crashes
        this.wss = { on: () => {}, close: () => {} } as any;
      } else {
        throw error;
      }
    }
  }
  
  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
      const { query } = parse(request.url || '', true);
      
      ws.isAlive = true;
      ws.rooms = new Set();
      ws.lastActivity = new Date();
      
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;
      
      // Setup ping-pong heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastActivity = new Date();
      });
      
      ws.on('message', async (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          logger.error({ error }, 'Error handling WebSocket message');
          this.sendError(ws, 'Invalid message format');
        }
      });
      
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
      
      ws.on('error', (error) => {
        logger.error({ error }, 'WebSocket error');
        this.handleDisconnect(ws);
      });
      
      // Send initial connection success
      this.send(ws, {
        type: 'connection',
        data: { status: 'connected', timestamp: new Date().toISOString() }
      });
    });
  }
  
  private async handleMessage(ws: AuthenticatedWebSocket, message: WSMessage) {
    // Rate limiting check
    if (!this.checkRateLimit(ws.userId || 'anonymous')) {
      return this.sendError(ws, 'Rate limit exceeded. Please slow down.');
    }
    
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message);
        break;
        
      case 'message':
        if (!ws.userId) return this.sendError(ws, 'Not authenticated');
        await this.handleDirectMessage(ws, message);
        break;
        
      case 'presence':
        if (!ws.userId) return this.sendError(ws, 'Not authenticated');
        await this.handlePresenceUpdate(ws, message);
        break;
        
      case 'typing':
        if (!ws.userId) return this.sendError(ws, 'Not authenticated');
        await this.handleTypingIndicator(ws, message);
        break;
        
      case 'read_receipt':
        if (!ws.userId) return this.sendError(ws, 'Not authenticated');
        await this.handleReadReceipt(ws, message);
        break;
        
      case 'message_history':
        if (!ws.userId) return this.sendError(ws, 'Not authenticated');
        await this.handleMessageHistory(ws, message);
        break;
        
      case 'online_users':
        if (!ws.userId) return this.sendError(ws, 'Not authenticated');
        await this.handleOnlineUsersRequest(ws, message);
        break;
        
      case 'ping':
        this.send(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
        
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }
  
  private async handleAuth(ws: AuthenticatedWebSocket, message: WSMessage) {
    try {
      const { token, userId } = message.data;
      
      // Verify authentication (you can use session or JWT)
      if (!userId) {
        return this.sendError(ws, 'Invalid authentication');
      }
      
      // Check if user exists
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        return this.sendError(ws, 'User not found');
      }
      
      // Close existing connection for this user if any
      const existingConnection = this.connections.get(userId);
      if (existingConnection) {
        this.send(existingConnection, {
          type: 'connection',
          data: { status: 'disconnected', reason: 'new_connection' }
        });
        existingConnection.close();
      }
      
      // Store authenticated connection
      ws.userId = userId;
      this.connections.set(userId, ws);
      
      // Join user's personal room
      this.joinRoom(ws, `user:${userId}`);
      
      // Update user online status
      await db.update(users)
        .set({ 
          onlineStatus: true,
          lastSeenAt: new Date()
        })
        .where(eq(users.id, userId));
      
      // Send queued messages if any
      const queuedMessages = this.messageQueue.get(userId);
      if (queuedMessages && queuedMessages.length > 0) {
        for (const msg of queuedMessages) {
          this.send(ws, msg);
        }
        this.messageQueue.delete(userId);
      }
      
      // Send authentication success
      this.send(ws, {
        type: 'auth',
        data: { 
          status: 'authenticated',
          userId,
          reconnection: !!existingConnection
        }
      });
      
      // Notify friends about online status
      await this.broadcastPresenceUpdate(userId, 'online');
      
      logger.info(`User ${userId} authenticated on WebSocket`);
      
    } catch (error) {
      logger.error({ error }, 'Authentication error');
      this.sendError(ws, 'Authentication failed');
    }
  }
  
  private async handleDirectMessage(ws: AuthenticatedWebSocket, message: WSMessage) {
    try {
      const { targetUserId, content, type = 'text', mediaUrl, priceCents = 0 } = message.data;
      
      if (!targetUserId || !content) {
        return this.sendError(ws, 'Missing required message fields');
      }
      
      // Save message to database
      const [savedMessage] = await db.insert(messages).values({
        senderId: ws.userId!,
        receiverId: targetUserId,
        type,
        content,
        mediaUrl,
        priceCents,
        isPaid: priceCents === 0,
        isMassMessage: false,
        createdAt: new Date()
      }).returning();
      
      // Create message payload
      const messagePayload: WSMessage = {
        type: 'message',
        data: {
          id: savedMessage.id,
          senderId: ws.userId,
          receiverId: targetUserId,
          type,
          content,
          mediaUrl,
          priceCents,
          isPaid: savedMessage.isPaid,
          createdAt: savedMessage.createdAt,
          messageId: savedMessage.id
        },
        messageId: savedMessage.id,
        timestamp: new Date().toISOString()
      };
      
      // Send acknowledgment to sender
      this.send(ws, {
        type: 'ack',
        messageId: savedMessage.id,
        timestamp: new Date().toISOString()
      });
      
      // Send to recipient if online
      const recipientWs = this.connections.get(targetUserId);
      if (recipientWs) {
        this.send(recipientWs, messagePayload);
      } else {
        // Queue message for offline user
        this.queueMessage(targetUserId, messagePayload);
      }
      
    } catch (error) {
      logger.error({ error }, 'Error handling direct message');
      this.sendError(ws, 'Failed to send message');
    }
  }
  
  private async handlePresenceUpdate(ws: AuthenticatedWebSocket, message: WSMessage) {
    const { status } = message.data;
    
    if (status === 'online' || status === 'away' || status === 'offline') {
      await db.update(users)
        .set({ 
          onlineStatus: status === 'online',
          lastSeenAt: new Date()
        })
        .where(eq(users.id, ws.userId!));
      
      await this.broadcastPresenceUpdate(ws.userId!, status);
    }
  }
  
  private async handleTypingIndicator(ws: AuthenticatedWebSocket, message: WSMessage) {
    const { targetUserId, isTyping } = message.data;
    
    if (!targetUserId) return;
    
    // Clear existing typing timeout
    const userTypingMap = this.typingIndicators.get(ws.userId!) || new Map();
    const existingTimeout = userTypingMap.get(targetUserId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Send typing indicator to target user
    const targetWs = this.connections.get(targetUserId);
    if (targetWs) {
      this.send(targetWs, {
        type: 'typing',
        data: {
          userId: ws.userId,
          isTyping
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Set timeout to clear typing indicator after 5 seconds
    if (isTyping) {
      const timeout = setTimeout(() => {
        const targetWs = this.connections.get(targetUserId);
        if (targetWs) {
          this.send(targetWs, {
            type: 'typing',
            data: {
              userId: ws.userId,
              isTyping: false
            },
            timestamp: new Date().toISOString()
          });
        }
        userTypingMap.delete(targetUserId);
      }, 5000);
      
      userTypingMap.set(targetUserId, timeout);
      this.typingIndicators.set(ws.userId!, userTypingMap);
    } else {
      userTypingMap.delete(targetUserId);
    }
  }
  
  private async handleReadReceipt(ws: AuthenticatedWebSocket, message: WSMessage) {
    const { messageIds, senderId } = message.data;
    
    if (!messageIds || !Array.isArray(messageIds)) return;
    
    // Update messages as read in database
    await db.update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.receiverId, ws.userId!),
          eq(messages.senderId, senderId),
          sql`${messages.id} = ANY(${messageIds})`
        )
      );
    
    // Send read receipt to sender if online
    const senderWs = this.connections.get(senderId);
    if (senderWs) {
      this.send(senderWs, {
        type: 'read_receipt',
        data: {
          messageIds,
          readBy: ws.userId,
          readAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  private async handleMessageHistory(ws: AuthenticatedWebSocket, message: WSMessage) {
    const { targetUserId, limit = 50, offset = 0 } = message.data;
    
    if (!targetUserId) return;
    
    // Fetch message history from database
    const messageHistory = await db.select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, ws.userId!),
            eq(messages.receiverId, targetUserId)
          ),
          and(
            eq(messages.senderId, targetUserId),
            eq(messages.receiverId, ws.userId!)
          )
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
    
    this.send(ws, {
      type: 'message_history',
      data: {
        messages: messageHistory.reverse(), // Reverse to get chronological order
        targetUserId,
        hasMore: messageHistory.length === limit
      },
      timestamp: new Date().toISOString()
    });
  }
  
  private async handleOnlineUsersRequest(ws: AuthenticatedWebSocket, message: WSMessage) {
    const { roomId } = message.data;
    
    if (roomId) {
      // Get users in specific room
      const usersInRoom = this.rooms.get(roomId) || new Set();
      this.send(ws, {
        type: 'online_users',
        data: {
          roomId,
          users: Array.from(usersInRoom),
          count: usersInRoom.size
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Get all online users
      const onlineUsers = Array.from(this.connections.keys());
      this.send(ws, {
        type: 'online_users',
        data: {
          users: onlineUsers,
          count: onlineUsers.length
        },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  private async broadcastPresenceUpdate(userId: string, status: string) {
    // Get user's connections (friends, followers, etc.)
    // For now, broadcast to all online users
    const presenceMessage: WSMessage = {
      type: 'presence',
      data: {
        userId,
        status,
        lastSeenAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    for (const [connectionUserId, connection] of this.connections) {
      if (connectionUserId !== userId) {
        this.send(connection, presenceMessage);
      }
    }
  }
  
  private handleDisconnect(ws: AuthenticatedWebSocket) {
    if (!ws.userId) return;
    
    // Remove from connections
    this.connections.delete(ws.userId);
    this.metrics.activeConnections--;
    
    // Remove from all rooms
    if (ws.rooms) {
      for (const roomId of ws.rooms) {
        this.leaveRoom(ws, roomId);
      }
    }
    
    // Clear typing indicators
    const userTypingMap = this.typingIndicators.get(ws.userId);
    if (userTypingMap) {
      for (const timeout of userTypingMap.values()) {
        clearTimeout(timeout);
      }
      this.typingIndicators.delete(ws.userId);
    }
    
    // Update user offline status
    db.update(users)
      .set({ 
        onlineStatus: false,
        lastSeenAt: new Date()
      })
      .where(eq(users.id, ws.userId))
      .catch(err => logger.error({ error: err }, 'Error updating offline status'));
    
    // Notify others about offline status
    this.broadcastPresenceUpdate(ws.userId, 'offline')
      .catch(err => logger.error({ error: err }, 'Error broadcasting offline status'));
    
    logger.info(`User ${ws.userId} disconnected`);
  }
  
  // Room management
  private joinRoom(ws: AuthenticatedWebSocket, roomId: string) {
    if (!ws.rooms) ws.rooms = new Set();
    ws.rooms.add(roomId);
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(ws.userId!);
  }
  
  private leaveRoom(ws: AuthenticatedWebSocket, roomId: string) {
    if (!ws.rooms) return;
    ws.rooms.delete(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(ws.userId!);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }
  
  // Broadcast to room
  public broadcastToRoom(roomId: string, message: WSMessage, excludeUserId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    for (const userId of room) {
      if (userId !== excludeUserId) {
        const connection = this.connections.get(userId);
        if (connection) {
          this.send(connection, message);
        }
      }
    }
  }
  
  // Public broadcast methods for external services
  public async sendNotification(userId: string, notification: any) {
    const ws = this.connections.get(userId);
    const notificationMessage: WSMessage = {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    };
    
    if (ws) {
      this.send(ws, notificationMessage);
    } else {
      this.queueMessage(userId, notificationMessage);
    }
  }
  
  public async sendTipNotification(receiverId: string, tipData: any) {
    const ws = this.connections.get(receiverId);
    const tipMessage: WSMessage = {
      type: 'tip',
      data: tipData,
      timestamp: new Date().toISOString()
    };
    
    if (ws) {
      this.send(ws, tipMessage);
    } else {
      this.queueMessage(receiverId, tipMessage);
    }
  }
  
  public async sendStreamUpdate(streamData: any) {
    const streamMessage: WSMessage = {
      type: 'stream_update',
      data: streamData,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all connected users
    for (const connection of this.connections.values()) {
      this.send(connection, streamMessage);
    }
  }
  
  public async sendContentPublished(creatorId: string, contentData: any) {
    // Get creator's followers (simplified for now)
    const contentMessage: WSMessage = {
      type: 'content_published',
      data: {
        creatorId,
        ...contentData
      },
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all connected users (in production, only to followers)
    for (const connection of this.connections.values()) {
      this.send(connection, contentMessage);
    }
  }
  
  public async sendModerationAlert(moderatorIds: string[], alertData: any) {
    const alertMessage: WSMessage = {
      type: 'moderation_alert',
      data: alertData,
      timestamp: new Date().toISOString()
    };
    
    for (const moderatorId of moderatorIds) {
      const ws = this.connections.get(moderatorId);
      if (ws) {
        this.send(ws, alertMessage);
      } else {
        this.queueMessage(moderatorId, alertMessage);
      }
    }
  }
  
  public async sendPurchaseComplete(userId: string, purchaseData: any) {
    const ws = this.connections.get(userId);
    const purchaseMessage: WSMessage = {
      type: 'purchase_complete',
      data: purchaseData,
      timestamp: new Date().toISOString()
    };
    
    if (ws) {
      this.send(ws, purchaseMessage);
    } else {
      this.queueMessage(userId, purchaseMessage);
    }
  }
  
  // Message queue for offline users
  private queueMessage(userId: string, message: WSMessage) {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    
    const queue = this.messageQueue.get(userId)!;
    queue.push(message);
    
    // Limit queue size to prevent memory issues
    if (queue.length > 100) {
      queue.shift(); // Remove oldest message
    }
  }
  
  // Rate limiting
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userTimestamps = this.messageRateLimit.get(userId) || [];
    
    // Remove timestamps older than 1 minute
    const recentTimestamps = userTimestamps.filter(ts => now - ts < 60000);
    
    // Allow max 30 messages per minute
    if (recentTimestamps.length >= 30) {
      return false;
    }
    
    recentTimestamps.push(now);
    this.messageRateLimit.set(userId, recentTimestamps);
    return true;
  }
  
  // Heartbeat to keep connections alive
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: any) => {
        const authenticatedWs = ws as AuthenticatedWebSocket;
        
        if (authenticatedWs.isAlive === false) {
          logger.info(`Terminating inactive connection for user ${authenticatedWs.userId}`);
          return authenticatedWs.terminate();
        }
        
        authenticatedWs.isAlive = false;
        authenticatedWs.ping();
      });
    }, 30000); // 30 seconds
  }
  
  // Metrics collection
  private startMetricsCollection() {
    setInterval(() => {
      const messageCount = Array.from(this.messageRateLimit.values())
        .reduce((sum, timestamps) => sum + timestamps.length, 0);
      
      this.metrics.messagesPerMinute = messageCount;
      
      // Log metrics
      logger.info({ 
        metrics: this.metrics,
        rooms: this.rooms.size,
        queuedMessages: this.messageQueue.size
      }, 'WebSocket Metrics');
      
      // Clear old rate limit data
      this.messageRateLimit.clear();
    }, 60000); // Every minute
  }
  
  // Helper methods
  private send(ws: AuthenticatedWebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  private sendError(ws: AuthenticatedWebSocket, error: string) {
    this.send(ws, {
      type: 'error',
      data: { message: error },
      timestamp: new Date().toISOString()
    });
  }
  
  // Cleanup
  public close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
    logger.info('WebSocket server closed');
  }
  
  // Get metrics
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager(3001);

// Export for use in other services
export const sendWebSocketNotification = wsManager.sendNotification.bind(wsManager);
export const sendWebSocketTip = wsManager.sendTipNotification.bind(wsManager);
export const sendWebSocketStreamUpdate = wsManager.sendStreamUpdate.bind(wsManager);
export const sendWebSocketContentPublished = wsManager.sendContentPublished.bind(wsManager);
export const sendWebSocketModerationAlert = wsManager.sendModerationAlert.bind(wsManager);
export const sendWebSocketPurchaseComplete = wsManager.sendPurchaseComplete.bind(wsManager);
export const broadcastToRoom = wsManager.broadcastToRoom.bind(wsManager);