import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, X, Send, HelpCircle, BookOpen, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Welcome to BoyFanz AI Assistant! I can help you with platform questions, tutorials, and walkthroughs. What would you like to know?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickActions = [
    { icon: HelpCircle, label: 'Platform Help', action: 'help' },
    { icon: BookOpen, label: 'AI Wiki', action: 'wiki' },
    { icon: Zap, label: 'Tutorials', action: 'tutorials' }
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: getAIResponse(inputMessage),
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickAction = (action: string) => {
    let message = '';
    switch (action) {
      case 'help':
        message = 'How can I help you with the BoyFanz platform?';
        break;
      case 'wiki':
        message = 'Show me information from the AI wiki';
        break;
      case 'tutorials':
        message = 'I need help with tutorials and walkthroughs';
        break;
    }
    setInputMessage(message);
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('help') || input.includes('support')) {
      return 'I can help you with account setup, content creation, earnings, compliance, and more. What specific area do you need assistance with?';
    }
    
    if (input.includes('wiki') || input.includes('information')) {
      return 'The AI Wiki contains comprehensive information about platform features, policies, and best practices. You can access creator guides, fan tutorials, compliance requirements, and technical documentation.';
    }
    
    if (input.includes('tutorial') || input.includes('walkthrough')) {
      return 'Our AI-assisted tutorials cover: Account Setup, Content Creation, Monetization Strategies, Compliance Guidelines, Fan Engagement, and Analytics. Which tutorial would you like to start with?';
    }
    
    if (input.includes('earnings') || input.includes('money') || input.includes('payout')) {
      return 'For earnings questions: Check your dashboard for real-time stats, set up direct deposit in Settings, and view detailed analytics. Payouts are processed within 24-48 hours.';
    }
    
    if (input.includes('upload') || input.includes('content')) {
      return 'To upload content: Go to Media section, ensure all content meets compliance guidelines, add proper tags and descriptions, and set appropriate pricing if applicable.';
    }
    
    return 'I understand you need assistance. Could you be more specific about what you\'d like to know? I can help with platform features, tutorials, compliance, earnings, and more.';
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          <Button
            onClick={() => setIsOpen(true)}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
              "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800",
              "border-2 border-red-500/50",
              "glow-effect hover:shadow-xl hover:scale-110"
            )}
            data-testid="ai-chatbot-toggle"
            aria-label="Open AI Assistant"
          >
            <MessageCircle className="h-6 w-6 text-white" />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 rounded-full animate-pulse" />
          </Button>
        ) : (
          <Card className={cn(
            "w-80 h-96 bg-card/95 backdrop-blur-sm border-red-500/30",
            "shadow-2xl neon-border"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display seedy-neon-red">
                  AI ASSISTANT
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 hover:bg-red-500/20"
                  data-testid="ai-chatbot-close"
                  aria-label="Close AI Assistant"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-1 mt-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.action}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickAction(action.action)}
                    className="h-8 px-2 text-xs hover:bg-red-500/20 seedy-neon-white"
                    data-testid={`ai-quick-${action.action}`}
                  >
                    <action.icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            
            <Separator className="bg-red-500/20" />
            
            <CardContent className="p-0 flex flex-col h-full">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.sender === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3 text-sm",
                          message.sender === 'user'
                            ? "bg-red-600 text-white ml-auto"
                            : "bg-muted seedy-neon-white mr-auto"
                        )}
                        data-testid={`message-${message.sender}-${message.id}`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3 text-sm seedy-neon-white">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Input Area */}
              <div className="p-4 pt-2">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 club-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    data-testid="ai-chat-input"
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    disabled={!inputMessage.trim() || isTyping}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="ai-chat-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}