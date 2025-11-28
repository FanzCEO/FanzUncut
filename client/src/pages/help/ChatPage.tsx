import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Clock, 
  Users,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Headphones,
  FileText,
  Camera,
  Paperclip
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'agent' | 'bot';
  timestamp: string;
  sender?: {
    name: string;
    avatar: string;
    role: string;
  };
  metadata?: {
    isTyping?: boolean;
    confidence?: number;
    suggestedActions?: Array<{ title: string; action: string }>;
  };
}

interface ChatSession {
  id: string;
  status: 'waiting' | 'connected' | 'ended';
  startedAt: string;
  endedAt?: string;
  agent?: {
    name: string;
    avatar: string;
    status: 'online' | 'busy' | 'away';
  };
  queuePosition?: number;
  estimatedWaitTime?: number;
}

interface ChatSupport {
  isAvailable: boolean;
  queueLength: number;
  averageWaitTime: string;
  activeAgents: number;
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
}

export function ChatPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [chatType, setChatType] = useState<'ai' | 'live'>('ai');
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch chat support info
  const { data: chatSupport } = useQuery<ChatSupport>({
    queryKey: ['/api/help/chat/info'],
    staleTime: 2 * 60 * 1000
  });

  // Fetch chat messages for current session
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/help/chat/messages', currentSession?.id],
    enabled: !!currentSession?.id,
    refetchInterval: 2000, // Poll for new messages
    staleTime: 0
  });

  // Send message mutation
  const sendMessageMutation = useMutation<ChatMessage, Error, { content: string; sessionId?: string }>({
    mutationFn: async ({ content, sessionId }) => {
      const endpoint = chatType === 'ai' ? '/api/help/chat/ai' : '/api/help/chat/live';
      return apiRequest<ChatMessage>(endpoint, {
        method: 'POST',
        body: { 
          content, 
          sessionId,
          type: 'user_message'
        }
      });
    },
    onSuccess: (newMessage, variables) => {
      // Add user message to cache immediately
      queryClient.setQueryData<ChatMessage[]>(
        ['/api/help/chat/messages', variables.sessionId], 
        (old = []) => [...old, newMessage]
      );
      
      // If this is first message, it might create a session
      if (!currentSession && newMessage) {
        // Refetch session info
        queryClient.invalidateQueries({ queryKey: ['/api/help/chat/session'] });
      }
    }
  });

  // Start live chat session
  const startLiveChatMutation = useMutation<ChatSession, Error>({
    mutationFn: async () => {
      return apiRequest<ChatSession>('/api/help/chat/live/start', {
        method: 'POST',
        body: { userInfo: { name: user?.firstName + ' ' + user?.lastName, email: user?.email } }
      });
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      setChatType('live');
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const messageContent = message;
    setMessage(''); // Clear input immediately

    try {
      await sendMessageMutation.mutateAsync({ 
        content: messageContent, 
        sessionId: currentSession?.id 
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(messageContent); // Restore message on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startAIChat = () => {
    setChatType('ai');
    setCurrentSession(null); // AI doesn't need sessions
  };

  const startLiveChat = () => {
    startLiveChatMutation.mutate();
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900/20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-500/20 backdrop-blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-3 rounded-full">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Live Chat Support
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Get instant help from our AI assistant or connect with a live support agent.
            </p>

            {/* Chat Options */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
              <Card className="bg-gray-800/50 border-gray-700 flex-1">
                <CardContent className="p-6 text-center">
                  <Bot className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">AI Assistant</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Instant answers powered by AI. Available 24/7.
                  </p>
                  <Button 
                    onClick={startAIChat}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={chatType === 'ai'}
                    data-testid="button-start-ai-chat"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {chatType === 'ai' ? 'Active' : 'Start AI Chat'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 flex-1">
                <CardContent className="p-6 text-center">
                  <Headphones className="h-12 w-12 text-pink-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Live Agent</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Chat with a human support agent.
                  </p>
                  {chatSupport?.isAvailable ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center text-xs text-gray-400">
                        <Users className="h-3 w-3 mr-1" />
                        {chatSupport.activeAgents} agents online
                        <Separator orientation="vertical" className="mx-2 h-3" />
                        <Clock className="h-3 w-3 mr-1" />
                        ~{chatSupport.averageWaitTime} wait
                      </div>
                      <Button 
                        onClick={startLiveChat}
                        className="w-full bg-pink-600 hover:bg-pink-700"
                        disabled={chatType === 'live' || startLiveChatMutation.isPending}
                        data-testid="button-start-live-chat"
                      >
                        {startLiveChatMutation.isPending ? (
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <User className="h-4 w-4 mr-2" />
                        )}
                        {chatType === 'live' ? 'Connected' : 'Connect to Agent'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                        Agents Offline
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Available during business hours: {chatSupport?.businessHours.start} - {chatSupport?.businessHours.end}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Card className="bg-gray-800/50 border-gray-700 h-[600px] flex flex-col">
          
          {/* Chat Header */}
          <CardHeader className="border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {chatType === 'ai' ? (
                  <>
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      <Bot className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">AI Assistant</CardTitle>
                      <p className="text-sm text-gray-400">Always available to help</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-pink-600/20 rounded-lg">
                      {currentSession?.agent ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={currentSession.agent.avatar} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Users className="h-6 w-6 text-pink-400" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-white">
                        {currentSession?.agent?.name || 'Connecting...'}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {currentSession?.status === 'connected' ? (
                          <>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            Connected
                          </>
                        ) : currentSession?.status === 'waiting' ? (
                          <>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            Queue position: {currentSession.queuePosition}
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            Offline
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="text-right">
                <Badge variant={chatType === 'ai' ? 'default' : 'secondary'}>
                  {chatType === 'ai' ? 'AI Chat' : 'Live Support'}
                </Badge>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
              {messages.length === 0 && !messagesLoading ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {chatType === 'ai' ? 'Start chatting with AI Assistant' : 'Waiting for connection...'}
                  </h3>
                  <p className="text-gray-400">
                    {chatType === 'ai' ? 
                      'Type your question below to get instant help.' :
                      'An agent will join you shortly.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                        <div className="flex items-start gap-2">
                          {msg.type !== 'user' && (
                            <Avatar className="h-8 w-8 mt-1">
                              {msg.sender?.avatar ? (
                                <AvatarImage src={msg.sender.avatar} />
                              ) : (
                                <AvatarFallback>
                                  {msg.type === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          )}
                          
                          <div className="flex-1">
                            <div className={`rounded-lg px-4 py-2 ${
                              msg.type === 'user' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-700 text-white'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              
                              {msg.metadata?.confidence && msg.type === 'bot' && (
                                <div className="mt-2 text-xs text-gray-300">
                                  Confidence: {Math.round(msg.metadata.confidence * 100)}%
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              {msg.type !== 'user' && msg.sender && (
                                <span>{msg.sender.name}</span>
                              )}
                              <span>{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span>
                            </div>
                            
                            {msg.metadata?.suggestedActions && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {msg.metadata.suggestedActions.map((action, index) => (
                                  <Button 
                                    key={index}
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs bg-gray-700 border-gray-600 hover:bg-gray-600"
                                    onClick={() => setMessage(action.action)}
                                  >
                                    {action.title}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {sendMessageMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {chatType === 'ai' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Input Area */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Textarea
                  placeholder={`Type your ${chatType === 'ai' ? 'question' : 'message'}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="bg-gray-900 border-gray-600 text-white resize-none"
                  rows={2}
                  data-testid="textarea-message"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                  data-testid="button-attach"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? (
                    <RotateCcw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {chatType === 'live' && currentSession?.status === 'waiting' && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center text-yellow-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    You're #{currentSession.queuePosition} in queue. 
                    Estimated wait time: {currentSession.estimatedWaitTime} minutes.
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}