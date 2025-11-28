import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeMessages, usePresence } from '@/hooks/useWebSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  MessageCircle, 
  Image,
  Video,
  DollarSign,
  MoreVertical,
  Search,
  Lock,
  Unlock,
  CreditCard
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  type: 'text' | 'photo' | 'video' | 'audio' | 'tip' | 'welcome';
  content?: string;
  mediaUrl?: string;
  priceCents: number;
  isPaid: boolean;
  isMassMessage: boolean;
  readAt?: string;
  createdAt: string;
  sender?: {
    username: string;
    profileImageUrl?: string;
  };
}

interface Conversation {
  userId: string;
  username: string;
  profileImageUrl?: string;
  lastMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
}

const ConversationList = ({ 
  conversations, 
  selectedUserId, 
  onSelectConversation 
}: { 
  conversations: Conversation[];
  selectedUserId?: string;
  onSelectConversation: (userId: string) => void;
}) => {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <div
          key={conversation.userId}
          className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
            selectedUserId === conversation.userId ? 'bg-accent' : ''
          }`}
          onClick={() => onSelectConversation(conversation.userId)}
          data-testid={`conversation-${conversation.userId}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={conversation.profileImageUrl} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {conversation.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {conversation.isOnline && (
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate" data-testid={`username-${conversation.userId}`}>
                  {conversation.username}
                </span>
                {conversation.lastMessage && (
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(conversation.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              
              {conversation.lastMessage && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {conversation.lastMessage.type === 'text' 
                    ? conversation.lastMessage.content 
                    : `${conversation.lastMessage.type} message`
                  }
                </p>
              )}
            </div>

            {conversation.unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs min-w-[20px] h-5 flex items-center justify-center">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const MessageBubble = ({ message, isOwn, onPurchase }: { 
  message: Message; 
  isOwn: boolean; 
  onPurchase: (message: Message) => void;
}) => {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isPaidMessage = message.priceCents > 0;
  const canViewContent = isOwn || !isPaidMessage || message.isPaid;

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
      data-testid={`message-${message.id}`}
    >
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn 
          ? 'bg-primary text-primary-foreground' 
          : isPaidMessage && !canViewContent 
            ? 'bg-gradient-to-r from-red-600/20 to-red-700/20 border border-red-500/30'
            : 'bg-muted'
      }`}>
        {message.type === 'tip' && (
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <DollarSign className="h-4 w-4" />
            <span className="font-semibold">
              {formatCurrency(message.priceCents)} tip
            </span>
          </div>
        )}

        {/* Paid Message Header */}
        {isPaidMessage && !isOwn && (
          <div className="flex items-center gap-2 mb-2 text-red-400">
            {canViewContent ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            <span className="text-xs font-semibold">
              {canViewContent ? 'Unlocked' : 'Paid Message'} - {formatCurrency(message.priceCents)}
            </span>
          </div>
        )}

        {/* Message Content */}
        {message.type === 'text' && (
          <>
            {canViewContent ? (
              <p className="text-sm">{message.content}</p>
            ) : (
              <div className="text-center py-2">
                <Lock className="h-6 w-6 mx-auto mb-2 text-red-400" />
                <p className="text-xs text-muted-foreground mb-3">
                  This message is locked. Pay {formatCurrency(message.priceCents)} to unlock.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onPurchase(message)}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid={`unlock-message-${message.id}`}
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  Unlock {formatCurrency(message.priceCents)}
                </Button>
              </div>
            )}
          </>
        )}

        {(message.type === 'photo' || message.type === 'video') && (
          <div className="mb-2">
            {canViewContent && message.mediaUrl ? (
              <>
                <img 
                  src={message.mediaUrl} 
                  alt="Message media"
                  className="rounded max-w-full h-auto"
                />
                {message.content && (
                  <p className="text-sm mt-2">{message.content}</p>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <Lock className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p className="text-xs text-muted-foreground mb-3">
                  Premium media content - Pay {formatCurrency(message.priceCents)} to unlock.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onPurchase(message)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  Unlock {formatCurrency(message.priceCents)}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          <span className="text-xs opacity-75">
            {formatTime(message.createdAt)}
          </span>
          {message.readAt && isOwn && (
            <span className="text-xs opacity-75">Read</span>
          )}
          {isPaidMessage && isOwn && (
            <Badge variant="outline" className="text-xs bg-green-600/20 text-green-400 border-green-600/30">
              {formatCurrency(message.priceCents)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Messages() {
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [newMessage, setNewMessage] = useState('');
  const [isPaidMessage, setIsPaidMessage] = useState(false);
  const [messagePrice, setMessagePrice] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState<Message | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = 'current-user'; // This would come from auth context
  
  // Real-time messaging hooks
  const { messages: realtimeMessages, isTyping, handleTyping, markAsRead } = useRealtimeMessages(selectedUserId || undefined);
  const presenceStatus = usePresence(selectedUserId ? [selectedUserId] : []);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/messages/conversations'],
  });

  // Combine API messages with real-time messages
  const { data: apiMessages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages', selectedUserId],
    enabled: !!selectedUserId,
  });
  
  // Merge API and real-time messages, removing duplicates
  const messages = [...apiMessages, ...realtimeMessages]
    .filter((msg, index, self) => 
      index === self.findIndex(m => m.id === msg.id)
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle typing indicator
  const handleInputChange = useCallback((value: string) => {
    setNewMessage(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator
    if (value && selectedUserId) {
      handleTyping(true);
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 2000);
    } else if (!value && selectedUserId) {
      handleTyping(false);
    }
  }, [selectedUserId, handleTyping]);
  
  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (selectedUserId && messages.length > 0) {
      const unreadMessageIds = messages
        .filter(msg => msg.receiverId === currentUserId && !msg.readAt)
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0) {
        markAsRead(unreadMessageIds);
      }
    }
  }, [selectedUserId, messages, markAsRead, currentUserId]);

  const { data: currentUser } = useQuery<{ id: string; role: string }>({
    queryKey: ['/api/auth/me'],
  });

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      // First send via WebSocket for instant delivery
      const { default: websocketService } = await import('@/services/websocketService');
      
      if (selectedUserId) {
        websocketService.sendMessage(
          selectedUserId,
          messageData.content,
          messageData.type,
          messageData.mediaUrl,
          messageData.priceCents
        );
      }
      
      // Then save to database via API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(messageData),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations'] });
      setNewMessage('');
      setIsPaidMessage(false);
      setMessagePrice('');
      toast({
        title: "Message sent!",
        description: isPaidMessage ? `Paid message sent for $${messagePrice}` : "Message sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Purchase Message Mutation  
  const purchaseMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/messages/${messageId}/purchase`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (!response.ok) throw new Error('Failed to purchase message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedUserId] });
      setShowPaymentDialog(null);
      toast({
        title: "Message unlocked!",
        description: "You can now view the message content.",
      });
    },
    onError: (error) => {
      toast({
        title: "Payment failed",
        description: "Unable to process payment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    const priceCents = isPaidMessage && messagePrice ? parseFloat(messagePrice) * 100 : 0;

    sendMessageMutation.mutate({
      receiverId: selectedUserId,
      type: 'text',
      content: newMessage,
      priceCents,
      isPaid: isPaidMessage
    });
  };

  const handlePurchaseMessage = (message: Message) => {
    purchaseMessageMutation.mutate(message.id);
  };

  const isCreator = currentUser?.role === 'creator';

  return (
    <div className="h-[calc(100vh-2rem)] max-h-[800px] border rounded-lg overflow-hidden bg-background" data-testid="messages-page">
      <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
        {/* Conversations List */}
        <div className="border-r border-border bg-muted/30">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search conversations..."
                className="pl-10"
                data-testid="search-conversations"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100%-120px)]">
            <div className="p-4">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <ConversationList
                  conversations={conversations}
                  selectedUserId={selectedUserId}
                  onSelectConversation={setSelectedUserId}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col">
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversations.find(c => c.userId === selectedUserId)?.profileImageUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conversations.find(c => c.userId === selectedUserId)?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold" data-testid="chat-username">
                        {conversations.find(c => c.userId === selectedUserId)?.username}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {conversations.find(c => c.userId === selectedUserId)?.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  <div>
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === currentUserId}
                        onPurchase={handlePurchaseMessage}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border bg-muted/30">
                {/* Paid Message Settings (Creators Only) */}
                {isCreator && (
                  <div className="mb-3 p-3 bg-card rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="paid-message" className="text-sm font-medium">
                        Charge for this message
                      </Label>
                      <Switch
                        id="paid-message"
                        checked={isPaidMessage}
                        onCheckedChange={setIsPaidMessage}
                        data-testid="paid-message-toggle"
                      />
                    </div>
                    {isPaidMessage && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="999.99"
                          value={messagePrice}
                          onChange={(e) => setMessagePrice(e.target.value)}
                          placeholder="0.00"
                          className="w-20 text-sm"
                          data-testid="message-price-input"
                        />
                        <span className="text-xs text-muted-foreground">USD</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" data-testid="attach-image">
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" data-testid="attach-video">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" data-testid="send-tip">
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={
                        isPaidMessage && messagePrice
                          ? `Type paid message ($${messagePrice})...`
                          : "Type a message..."
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      data-testid="message-input"
                      className={isPaidMessage ? "border-red-500/50 focus:border-red-500" : ""}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || (isPaidMessage && !messagePrice) || sendMessageMutation.isPending}
                      data-testid="send-message"
                      className={isPaidMessage ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="h-4 w-4 animate-spin border-2 border-background border-t-transparent rounded-full" />
                      ) : isPaidMessage ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}