import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  MessageSquare, 
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
  User,
  Loader2,
  RefreshCw,
  Settings,
  BookOpen,
  PlayCircle,
  Ticket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    suggestedActions?: Array<{ title: string; url: string; icon?: string }>;
    relatedContent?: Array<{ title: string; url: string; type: string }>;
    sources?: Array<{ title: string; url: string }>;
  };
}

interface EnhancedAIChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  compact?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'center';
}

export function EnhancedAIChatBot({
  isOpen,
  onClose,
  initialMessage,
  compact = false,
  position = 'bottom-right'
}: EnhancedAIChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        content: initialMessage || "Hi! I'm your AI assistant. I can help you find information, guide you through tutorials, or assist with any questions about BoyFanz. What would you like to know?",
        timestamp: new Date(),
        metadata: {
          confidence: 1.0,
          suggestedActions: [
            { title: 'Browse Knowledge Base', url: '/help/wiki', icon: 'book' },
            { title: 'Start Tutorial', url: '/help/tutorials', icon: 'play' },
            { title: 'Create Support Ticket', url: '/help/tickets/new', icon: 'ticket' },
          ]
        }
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, initialMessage, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Chat mutation for sending messages
  const chatMutation = useMutation<{
    success: boolean;
    data: {
      answer: string;
      confidence: number;
      suggestedActions: Array<{ title: string; url: string }>;
      relatedContent: Array<{ title: string; url: string; type: string }>;
      sources?: Array<{ title: string; url: string }>;
    };
  }, Error, string>({
    mutationFn: async (message: string) => {
      return apiRequest<{
        success: boolean;
        data: {
          answer: string;
          confidence: number;
          suggestedActions: Array<{ title: string; url: string }>;
          relatedContent: Array<{ title: string; url: string; type: string }>;
          sources?: Array<{ title: string; url: string }>;
        };
      }>('/api/help/ask', {
        method: 'POST',
        body: { 
          query: message,
          context: {
            sessionId,
            previousMessages: messages.slice(-5) // Send last 5 messages for context
          }
        }
      });
    },
    onMutate: (message) => {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        content: message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
    },
    onSuccess: (response) => {
      setIsTyping(false);
      if (response.success) {
        const botMessage: ChatMessage = {
          id: `bot_${Date.now()}`,
          type: 'bot',
          content: response.data.answer,
          timestamp: new Date(),
          metadata: {
            confidence: response.data.confidence,
            suggestedActions: response.data.suggestedActions,
            relatedContent: response.data.relatedContent,
            sources: response.data.sources
          }
        };
        setMessages(prev => [...prev, botMessage]);
      }
    },
    onError: () => {
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: "I'm sorry, I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;
    
    chatMutation.mutate(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMessageFeedback = async (messageId: string, helpful: boolean) => {
    // Track feedback for AI improvement
    try {
      await apiRequest<{ success: boolean }>('/api/help/feedback', {
        method: 'POST',
        body: { messageId, helpful, sessionId }
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const clearChat = () => {
    setMessages([]);
    // Re-add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome_new',
      type: 'bot',
      content: "Chat cleared! How can I help you today?",
      timestamp: new Date(),
      metadata: {
        confidence: 1.0,
        suggestedActions: [
          { title: 'Browse Knowledge Base', url: '/help/wiki', icon: 'book' },
          { title: 'Start Tutorial', url: '/help/tutorials', icon: 'play' },
          { title: 'Create Support Ticket', url: '/help/tickets/new', icon: 'ticket' },
        ]
      }
    };
    setMessages([welcomeMessage]);
  };

  if (!isOpen) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'bottom-6 right-6';
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'article': return BookOpen;
      case 'tutorial': return PlayCircle;
      case 'ticket': return Ticket;
      default: return ExternalLink;
    }
  };

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300",
      getPositionClasses(),
      compact ? "w-80 h-96" : "w-96 h-[600px]",
      isMinimized && "h-14"
    )}>
      <Card className="bg-gray-900 border-gray-700 shadow-2xl h-full flex flex-col">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-red-600 to-yellow-500">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-1.5 rounded-full">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">AI Assistant</h3>
              <p className="text-xs text-white/80">
                {isTyping ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={message.id} className={cn(
                      "flex",
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      <div className={cn(
                        "max-w-[80%] rounded-lg p-3",
                        message.type === 'user' 
                          ? 'bg-red-600 text-white' 
                          : message.type === 'system'
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          : 'bg-gray-800 text-gray-100'
                      )}>
                        {/* Message header for bot messages */}
                        {message.type === 'bot' && (
                          <div className="flex items-center space-x-2 mb-2">
                            <Bot className="h-4 w-4 text-red-400" />
                            <span className="text-xs text-gray-400">AI Assistant</span>
                            {message.metadata?.confidence && (
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(message.metadata.confidence * 100)}% confident
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Message content */}
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>

                        {/* Message actions for bot messages */}
                        {message.type === 'bot' && (
                          <div className="mt-3 space-y-2">
                            {/* Suggested Actions */}
                            {message.metadata?.suggestedActions && message.metadata.suggestedActions.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs text-gray-400 mb-1">Suggested actions:</div>
                                {message.metadata.suggestedActions.map((action, actionIndex) => (
                                  <Button
                                    key={actionIndex}
                                    variant="outline"
                                    size="sm"
                                    className="mr-2 mb-1 text-xs border-gray-600 hover:border-red-500"
                                    onClick={() => window.open(action.url, '_self')}
                                  >
                                    {action.title}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                ))}
                              </div>
                            )}

                            {/* Related Content */}
                            {message.metadata?.relatedContent && message.metadata.relatedContent.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs text-gray-400 mb-1">Related content:</div>
                                {message.metadata.relatedContent.slice(0, 3).map((content, contentIndex) => {
                                  const ContentIcon = getMessageIcon(content.type);
                                  return (
                                    <div key={contentIndex} className="flex items-center space-x-2 text-xs">
                                      <ContentIcon className="h-3 w-3 text-gray-500" />
                                      <button
                                        className="text-blue-400 hover:text-blue-300 underline"
                                        onClick={() => window.open(content.url, '_self')}
                                      >
                                        {content.title}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Message feedback and actions */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-500 hover:text-green-400"
                                  onClick={() => handleMessageFeedback(message.id, true)}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                                  onClick={() => handleMessageFeedback(message.id, false)}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
                                  onClick={() => copyToClipboard(message.content)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="text-xs text-gray-500">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Timestamp for user messages */}
                        {message.type === 'user' && (
                          <div className="text-xs text-white/70 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 rounded-lg p-3 max-w-[80%]">
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-red-400" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                  disabled={chatMutation.isPending}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || chatMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  data-testid="button-send-message"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1 mt-2">
                {[
                  "How do I upload content?",
                  "Account verification",
                  "Payment issues",
                  "Privacy settings"
                ].map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                    onClick={() => setInputValue(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}