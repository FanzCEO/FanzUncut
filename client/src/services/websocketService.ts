import { queryClient } from '@/lib/queryClient';

// WebSocket connection state management
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface WebSocketMessage {
  type: string;
  data?: any;
  messageId?: string;
  timestamp?: string;
}

interface ReconnectionConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
}

interface MessageHandler {
  (message: WebSocketMessage): void | Promise<void>;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private eventHandlers: Map<string, Set<MessageHandler>> = new Map();
  private userId: string | null = null;
  private sessionToken: string | null = null;
  private onlineUsers: Set<string> = new Set();
  private typingUsers: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly reconnectionConfig: ReconnectionConfig = {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 1.5,
  };

  constructor() {
    // Initialize event handlers map
    this.setupDefaultHandlers();
  }

  // Connect to WebSocket server
  public connect(userId: string, token?: string) {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.userId = userId;
    this.sessionToken = token || null;
    this.connectionState = 'connecting';

    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const wsUrl = `${protocol}//${host}:3001`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);
      
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleReconnection();
    }
  }

  // Disconnect from WebSocket
  public disconnect() {
    this.connectionState = 'disconnected';
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.messageQueue = [];
    this.onlineUsers.clear();
    this.typingUsers.clear();
  }

  // Setup WebSocket event handlers
  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      
      // Authenticate the connection
      this.send({
        type: 'auth',
        data: {
          userId: this.userId,
          token: this.sessionToken,
        },
      });
      
      // Process queued messages
      this.processMessageQueue();
      
      // Start ping interval
      this.startPingInterval();
      
      // Emit connection event
      this.emit('connection', { status: 'connected' });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error });
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', event);
      this.connectionState = 'disconnected';
      this.clearTimers();
      
      this.emit('connection', { 
        status: 'disconnected',
        code: event.code,
        reason: event.reason,
      });
      
      // Attempt reconnection if not intentional disconnect
      if (event.code !== 1000) {
        this.handleReconnection();
      }
    };
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage) {
    // Handle system messages
    switch (message.type) {
      case 'auth':
        if (message.data?.status === 'authenticated') {
          console.log('WebSocket authenticated');
          this.emit('authenticated', message.data);
        }
        break;
        
      case 'pong':
        // Heartbeat response received
        break;
        
      case 'error':
        console.error('WebSocket error message:', message.data);
        this.emit('error', message.data);
        break;
        
      case 'ack':
        // Message acknowledgment
        this.emit('message_ack', message);
        break;
        
      case 'presence':
        this.handlePresenceUpdate(message);
        break;
        
      case 'typing':
        this.handleTypingIndicator(message);
        break;
        
      case 'message':
        this.handleDirectMessage(message);
        break;
        
      case 'notification':
        this.handleNotification(message);
        break;
        
      case 'tip':
        this.handleTipNotification(message);
        break;
        
      case 'stream_update':
        this.handleStreamUpdate(message);
        break;
        
      case 'content_published':
        this.handleContentPublished(message);
        break;
        
      case 'moderation_alert':
        this.handleModerationAlert(message);
        break;
        
      case 'purchase_complete':
        this.handlePurchaseComplete(message);
        break;
        
      case 'message_history':
        this.emit('message_history', message.data);
        break;
        
      case 'online_users':
        this.handleOnlineUsers(message);
        break;
        
      case 'read_receipt':
        this.emit('read_receipt', message.data);
        break;
    }
    
    // Emit to all registered handlers
    this.emit(message.type, message.data || message);
  }

  // Message type handlers
  private handlePresenceUpdate(message: WebSocketMessage) {
    const { userId, status, lastSeenAt } = message.data;
    
    if (status === 'online') {
      this.onlineUsers.add(userId);
    } else {
      this.onlineUsers.delete(userId);
    }
    
    // Invalidate user queries to update UI
    queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
    
    this.emit('presence_update', message.data);
  }

  private handleTypingIndicator(message: WebSocketMessage) {
    const { userId, isTyping } = message.data;
    
    if (isTyping) {
      // Clear existing timeout for this user
      const existingTimeout = this.typingUsers.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Set timeout to clear typing indicator after 5 seconds
      const timeout = setTimeout(() => {
        this.typingUsers.delete(userId);
        this.emit('typing_update', { userId, isTyping: false });
      }, 5000);
      
      this.typingUsers.set(userId, timeout);
    } else {
      const timeout = this.typingUsers.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        this.typingUsers.delete(userId);
      }
    }
    
    this.emit('typing_update', message.data);
  }

  private handleDirectMessage(message: WebSocketMessage) {
    // Invalidate message queries to update UI
    queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    
    // Show notification for new message
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('New Message', {
        body: message.data.content || 'You have a new message',
        icon: '/boyfanz-logo.png',
      });
    }
    
    this.emit('new_message', message.data);
  }

  private handleNotification(message: WebSocketMessage) {
    // Invalidate notifications query
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(message.data.title || 'BoyFanz Notification', {
        body: message.data.message || 'You have a new notification',
        icon: '/boyfanz-logo.png',
      });
    }
    
    this.emit('new_notification', message.data);
  }

  private handleTipNotification(message: WebSocketMessage) {
    // Invalidate earnings and transaction queries
    queryClient.invalidateQueries({ queryKey: ['/api/earnings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    
    // Play sound effect if enabled
    const audio = new Audio('/sounds/tip-received.mp3');
    audio.play().catch(e => console.log('Could not play tip sound:', e));
    
    this.emit('tip_received', message.data);
  }

  private handleStreamUpdate(message: WebSocketMessage) {
    // Invalidate stream queries
    queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
    queryClient.invalidateQueries({ queryKey: ['/api/streams', message.data.streamId] });
    
    this.emit('stream_update', message.data);
  }

  private handleContentPublished(message: WebSocketMessage) {
    // Invalidate feed and creator content queries
    queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
    queryClient.invalidateQueries({ queryKey: ['/api/creators', message.data.creatorId, 'posts'] });
    
    this.emit('content_published', message.data);
  }

  private handleModerationAlert(message: WebSocketMessage) {
    // Invalidate moderation queue
    queryClient.invalidateQueries({ queryKey: ['/api/moderation'] });
    
    // Play alert sound
    const audio = new Audio('/sounds/alert.mp3');
    audio.play().catch(e => console.log('Could not play alert sound:', e));
    
    this.emit('moderation_alert', message.data);
  }

  private handlePurchaseComplete(message: WebSocketMessage) {
    // Invalidate purchased content queries
    queryClient.invalidateQueries({ queryKey: ['/api/purchased'] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    
    this.emit('purchase_complete', message.data);
  }

  private handleOnlineUsers(message: WebSocketMessage) {
    const { users, count } = message.data;
    
    this.onlineUsers.clear();
    users.forEach((userId: string) => this.onlineUsers.add(userId));
    
    this.emit('online_users', message.data);
  }

  // Send message to server
  public send(message: WebSocketMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, queueing message');
      this.messageQueue.push(message);
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  // Process queued messages
  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Reconnection logic with exponential backoff
  private handleReconnection() {
    if (this.connectionState === 'reconnecting') return;
    if (this.reconnectAttempts >= this.reconnectionConfig.maxAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts', {});
      return;
    }
    
    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectionConfig.initialDelay * Math.pow(this.reconnectionConfig.multiplier, this.reconnectAttempts - 1),
      this.reconnectionConfig.maxDelay
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.reconnectionConfig.maxAttempts})`);
    
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId, this.sessionToken || undefined);
      }
    }, delay);
  }

  // Heartbeat mechanism
  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  // Clear timers
  private clearTimers() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Clear all typing timeouts
    this.typingUsers.forEach(timeout => clearTimeout(timeout));
    this.typingUsers.clear();
  }

  // Event emitter functionality
  public on(event: string, handler: MessageHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  public off(event: string, handler: MessageHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler({ type: event, data });
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Setup default handlers
  private setupDefaultHandlers() {
    // Log connection state changes
    this.on('connection', (message) => {
      console.log('WebSocket connection state:', message.data);
    });
    
    // Log errors
    this.on('error', (message) => {
      console.error('WebSocket error:', message.data);
    });
  }

  // Public API methods
  
  // Send a direct message
  public sendMessage(targetUserId: string, content: string, type: 'text' | 'photo' | 'video' | 'audio' = 'text', mediaUrl?: string, priceCents?: number) {
    return this.send({
      type: 'message',
      data: {
        targetUserId,
        content,
        type,
        mediaUrl,
        priceCents: priceCents || 0,
      },
    });
  }

  // Send typing indicator
  public sendTyping(targetUserId: string, isTyping: boolean) {
    return this.send({
      type: 'typing',
      data: {
        targetUserId,
        isTyping,
      },
    });
  }

  // Send read receipt
  public sendReadReceipt(messageIds: string[], senderId: string) {
    return this.send({
      type: 'read_receipt',
      data: {
        messageIds,
        senderId,
      },
    });
  }

  // Request message history
  public requestMessageHistory(targetUserId: string, limit: number = 50, offset: number = 0) {
    return this.send({
      type: 'message_history',
      data: {
        targetUserId,
        limit,
        offset,
      },
    });
  }

  // Request online users
  public requestOnlineUsers(roomId?: string) {
    return this.send({
      type: 'online_users',
      data: {
        roomId,
      },
    });
  }

  // Update presence
  public updatePresence(status: 'online' | 'away' | 'offline') {
    return this.send({
      type: 'presence',
      data: {
        status,
      },
    });
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // Get all online users
  public getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  // Check if user is typing
  public isUserTyping(userId: string): boolean {
    return this.typingUsers.has(userId);
  }

  // Get connection state
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // Check if connected
  public isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Export for direct usage
export default websocketService;