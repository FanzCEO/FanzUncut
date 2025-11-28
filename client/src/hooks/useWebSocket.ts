import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import websocketService from '@/services/websocketService';

export interface WebSocketMessage {
  type: string;
  data?: any;
  messageId?: string;
  timestamp?: string;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());
  
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Connection management
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      websocketService.disconnect();
      setIsConnected(false);
      setConnectionState('disconnected');
      return;
    }

    // Auto-connect if enabled (default)
    if (optionsRef.current.autoConnect !== false) {
      websocketService.connect(user.id);
    }

    // Set up event handlers
    const handleConnection = (message: WebSocketMessage) => {
      const status = message.data?.status;
      setConnectionState(status === 'connected' ? 'connected' : 'disconnected');
      setIsConnected(status === 'connected');
      
      if (status === 'connected') {
        optionsRef.current.onConnect?.();
      } else {
        optionsRef.current.onDisconnect?.();
      }
    };

    const handleReconnecting = (message: WebSocketMessage) => {
      setConnectionState('reconnecting');
      setIsConnected(false);
    };

    const handleError = (message: WebSocketMessage) => {
      console.error('WebSocket error:', message.data);
      optionsRef.current.onError?.(message.data);
    };

    const handleMessage = (message: WebSocketMessage) => {
      setLastMessage(message);
      optionsRef.current.onMessage?.(message);
    };

    const handleNewMessage = (message: WebSocketMessage) => {
      // Show toast notification for new messages
      const data = message.data;
      if (data?.senderId !== user.id) {
        toast({
          title: 'New Message',
          description: `${data?.senderName || 'Someone'} sent you a message`,
        });
      }
    };

    const handleNotification = (message: WebSocketMessage) => {
      const data = message.data;
      toast({
        title: data?.title || 'Notification',
        description: data?.message || 'You have a new notification',
      });
    };

    const handleTip = (message: WebSocketMessage) => {
      const data = message.data;
      toast({
        title: '💰 Tip Received!',
        description: `${data?.senderName || 'Someone'} sent you $${(data?.amountCents || 0) / 100}`,
        className: 'bg-green-500 text-white',
      });
    };

    const handlePresence = (message: WebSocketMessage) => {
      // Update online users list
      if (message.data?.status === 'online') {
        setOnlineUsers(prev => [...new Set([...prev, message.data.userId])]);
      } else if (message.data?.status === 'offline') {
        setOnlineUsers(prev => prev.filter(id => id !== message.data.userId));
      }
    };

    const handleTyping = (message: WebSocketMessage) => {
      const { userId, isTyping } = message.data || {};
      if (userId) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (isTyping) {
            newMap.set(userId, true);
          } else {
            newMap.delete(userId);
          }
          return newMap;
        });
      }
    };

    const handleOnlineUsers = (message: WebSocketMessage) => {
      const users = message.data?.users || [];
      setOnlineUsers(users);
    };

    // Register event handlers
    websocketService.on('connection', handleConnection);
    websocketService.on('reconnecting', handleReconnecting);
    websocketService.on('error', handleError);
    websocketService.on('message', handleMessage);
    websocketService.on('new_message', handleNewMessage);
    websocketService.on('new_notification', handleNotification);
    websocketService.on('tip_received', handleTip);
    websocketService.on('presence_update', handlePresence);
    websocketService.on('typing_update', handleTyping);
    websocketService.on('online_users', handleOnlineUsers);

    // Cleanup
    return () => {
      websocketService.off('connection', handleConnection);
      websocketService.off('reconnecting', handleReconnecting);
      websocketService.off('error', handleError);
      websocketService.off('message', handleMessage);
      websocketService.off('new_message', handleNewMessage);
      websocketService.off('new_notification', handleNotification);
      websocketService.off('tip_received', handleTip);
      websocketService.off('presence_update', handlePresence);
      websocketService.off('typing_update', handleTyping);
      websocketService.off('online_users', handleOnlineUsers);
      
      // Don't disconnect on cleanup as other components might be using the connection
    };
  }, [isAuthenticated, user?.id, toast]);

  // Public API methods
  const sendMessage = useCallback((targetUserId: string, content: string, type?: 'text' | 'photo' | 'video' | 'audio', mediaUrl?: string, priceCents?: number) => {
    return websocketService.sendMessage(targetUserId, content, type, mediaUrl, priceCents);
  }, []);

  const sendTyping = useCallback((targetUserId: string, isTyping: boolean) => {
    return websocketService.sendTyping(targetUserId, isTyping);
  }, []);

  const sendReadReceipt = useCallback((messageIds: string[], senderId: string) => {
    return websocketService.sendReadReceipt(messageIds, senderId);
  }, []);

  const requestMessageHistory = useCallback((targetUserId: string, limit?: number, offset?: number) => {
    return websocketService.requestMessageHistory(targetUserId, limit, offset);
  }, []);

  const requestOnlineUsers = useCallback((roomId?: string) => {
    return websocketService.requestOnlineUsers(roomId);
  }, []);

  const updatePresence = useCallback((status: 'online' | 'away' | 'offline') => {
    return websocketService.updatePresence(status);
  }, []);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.includes(userId);
  }, [onlineUsers]);

  const isUserTyping = useCallback((userId: string) => {
    return typingUsers.get(userId) === true;
  }, [typingUsers]);

  const connect = useCallback(() => {
    if (user?.id) {
      websocketService.connect(user.id);
    }
  }, [user?.id]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  return {
    isConnected,
    connectionState,
    lastMessage,
    onlineUsers,
    typingUsers: Array.from(typingUsers.keys()),
    sendMessage,
    sendTyping,
    sendReadReceipt,
    requestMessageHistory,
    requestOnlineUsers,
    updatePresence,
    isUserOnline,
    isUserTyping,
    connect,
    disconnect,
  };
}

// Hook for real-time messages
export function useRealtimeMessages(conversationUserId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { sendTyping, sendReadReceipt, requestMessageHistory } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'message' && conversationUserId) {
        const data = message.data;
        if (data?.senderId === conversationUserId || data?.receiverId === conversationUserId) {
          setMessages(prev => [...prev, data]);
        }
      } else if (message.type === 'typing_update' && message.data?.userId === conversationUserId) {
        setIsTyping(message.data?.isTyping || false);
      } else if (message.type === 'message_history' && conversationUserId) {
        setMessages(message.data?.messages || []);
      }
    },
  });

  // Request message history on mount
  useEffect(() => {
    if (conversationUserId) {
      requestMessageHistory(conversationUserId);
    }
  }, [conversationUserId, requestMessageHistory]);

  // Send typing indicator
  const handleTyping = useCallback((typing: boolean) => {
    if (conversationUserId) {
      sendTyping(conversationUserId, typing);
    }
  }, [conversationUserId, sendTyping]);

  // Mark messages as read
  const markAsRead = useCallback((messageIds: string[]) => {
    if (conversationUserId && messageIds.length > 0) {
      sendReadReceipt(messageIds, conversationUserId);
    }
  }, [conversationUserId, sendReadReceipt]);

  return {
    messages,
    isTyping,
    handleTyping,
    markAsRead,
  };
}

// Hook for presence tracking
export function usePresence(userIds: string[] = []) {
  const [presenceStatus, setPresenceStatus] = useState<Map<string, boolean>>(new Map());
  const { onlineUsers, isUserOnline } = useWebSocket();

  useEffect(() => {
    const newStatus = new Map<string, boolean>();
    userIds.forEach(userId => {
      newStatus.set(userId, isUserOnline(userId));
    });
    setPresenceStatus(newStatus);
  }, [userIds, onlineUsers, isUserOnline]);

  return presenceStatus;
}

// Hook for live stream real-time updates
export function useLiveStreamUpdates(streamId?: string) {
  const [viewerCount, setViewerCount] = useState(0);
  const [tips, setTips] = useState<any[]>([]);
  
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'stream_update' && message.data?.streamId === streamId) {
        setViewerCount(message.data?.viewerCount || 0);
      } else if (message.type === 'tip_received' && message.data?.streamId === streamId) {
        setTips(prev => [...prev, message.data]);
      }
    },
  });

  return {
    viewerCount,
    tips,
  };
}