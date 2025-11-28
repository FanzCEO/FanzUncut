import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Book, 
  PlayCircle, 
  MessageSquare, 
  Ticket, 
  TrendingUp,
  Star,
  ThumbsUp,
  Clock,
  ArrowRight,
  Sparkles,
  Bot,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AISearchInterface } from '@/components/help/AISearchInterface';
import { EnhancedAIChatBot } from '@/components/help/EnhancedAIChatBot.tsx';

interface HelpMetrics {
  totalArticles: number;
  totalTutorials: number;
  resolvedTickets: number;
  averageResponseTime: string;
  satisfactionScore: number;
}

interface RecommendedContent {
  id: string;
  type: 'article' | 'tutorial' | 'faq';
  title: string;
  excerpt: string;
  url: string;
  tags: string[];
  metadata: {
    views?: number;
    rating?: number;
    difficulty?: string;
    duration?: number;
  };
}

export function HelpCenter() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);

  // Fetch help center metrics
  const { data: metrics } = useQuery<HelpMetrics>({
    queryKey: ['/api/help/metrics'],
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch personalized recommendations
  const { data: recommendations } = useQuery<RecommendedContent[]>({
    queryKey: ['/api/help/recommendations'],
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Quick action buttons
  const quickActions = [
    {
      title: 'Submit Support Ticket',
      description: 'Get help from our support team',
      icon: Ticket,
      url: '/help/tickets/new',
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      urgent: true
    },
    {
      title: 'Browse Knowledge Base',
      description: 'Find answers in our wiki',
      icon: Book,
      url: '/help/wiki',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Interactive Tutorials',
      description: 'Learn with step-by-step guides',
      icon: PlayCircle,
      url: '/help/tutorials',
      color: 'bg-green-500/10 text-green-600 dark:text-green-400'
    },
    {
      title: 'Live Chat Support',
      description: 'Chat with our support team',
      icon: MessageSquare,
      url: '/help/chat',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
    }
  ];

  // Popular help topics
  const popularTopics = [
    'Account Verification',
    'Payment Processing',
    'Content Upload',
    'Privacy Settings',
    'Revenue Sharing',
    'Content Moderation',
    'Mobile App',
    'Streaming Setup'
  ];

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setLocation(`/help/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900/20">
      {/* Hero Section with AI-Powered Search */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-yellow-500/20 backdrop-blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-red-600 to-yellow-500 p-3 rounded-full">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-6 bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">
              BoyFanz Help Center
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Get instant help with our AI-powered support system. Find answers, learn with tutorials, 
              or connect with our expert support team.
            </p>

            {/* AI Search Interface */}
            <div className="max-w-4xl mx-auto">
              <AISearchInterface 
                onSearch={handleSearch}
                placeholder="Ask me anything about BoyFanz..."
                showSuggestions={true}
              />
            </div>

            {/* Quick metrics */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{metrics.totalArticles}</div>
                  <div className="text-sm text-gray-300">Knowledge Articles</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{metrics.totalTutorials}</div>
                  <div className="text-sm text-gray-300">Interactive Tutorials</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{metrics.averageResponseTime}</div>
                  <div className="text-sm text-gray-300">Avg Response Time</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{metrics.satisfactionScore}★</div>
                  <div className="text-sm text-gray-300">Satisfaction Score</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Quick Actions */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            How can we help you today?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.url}>
                <Card className="group bg-gray-800/50 border-gray-700 hover:border-red-500/50 transition-all duration-300 hover:scale-105 cursor-pointer">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-red-400 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      {action.description}
                    </p>
                    {action.urgent && (
                      <Badge variant="destructive" className="text-xs">
                        Urgent Support
                      </Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all ml-auto mt-2" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Topics & Recommendations */}
        <section className="mb-16">
          <Tabs defaultValue="popular" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
              <TabsTrigger value="popular" className="data-[state=active]:bg-red-600">
                Popular Topics
              </TabsTrigger>
              <TabsTrigger value="recommended" className="data-[state=active]:bg-red-600">
                Recommended for You
              </TabsTrigger>
              <TabsTrigger value="recent" className="data-[state=active]:bg-red-600">
                Recently Updated
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="popular" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {popularTopics.map((topic, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start h-auto p-4 bg-gray-800/50 border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"
                    onClick={() => handleSearch(topic)}
                  >
                    <div className="text-left">
                      <div className="font-medium text-white">{topic}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {Math.floor(Math.random() * 50) + 10} articles
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="recommended" className="mt-6">
              {recommendations && recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((item, index) => (
                    <Link key={index} href={item.url}>
                      <Card className="bg-gray-800/50 border-gray-700 hover:border-red-500/50 transition-all duration-300 hover:scale-105 cursor-pointer">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <Badge variant="secondary" className="mb-2">
                              {item.type}
                            </Badge>
                            {item.metadata.rating && (
                              <div className="flex items-center text-yellow-400">
                                <Star className="h-3 w-3 fill-current" />
                                <span className="text-xs ml-1">{item.metadata.rating}</span>
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-lg text-white line-clamp-2">
                            {item.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                            {item.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            {item.metadata.views && (
                              <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {item.metadata.views} views
                              </div>
                            )}
                            {item.metadata.duration && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {item.metadata.duration} min
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bot className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No recommendations yet
                  </h3>
                  <p className="text-gray-400">
                    Start exploring our help content to get personalized recommendations.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recent" className="mt-6">
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Recently Updated Content
                </h3>
                <p className="text-gray-400">
                  Check back soon for the latest updates to our help content.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Help Categories */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Browse by Category
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                title: 'Getting Started', 
                description: 'New to BoyFanz? Start here for setup guides and basics.',
                icon: PlayCircle,
                count: 24,
                color: 'from-blue-500 to-cyan-500'
              },
              { 
                title: 'Account & Billing', 
                description: 'Manage your account, payments, and subscription.',
                icon: Users,
                count: 18,
                color: 'from-green-500 to-emerald-500'
              },
              { 
                title: 'Content Creation', 
                description: 'Tips and tools for creating amazing content.',
                icon: Sparkles,
                count: 32,
                color: 'from-purple-500 to-pink-500'
              },
              { 
                title: 'Technical Support', 
                description: 'Troubleshooting and technical assistance.',
                icon: MessageSquare,
                count: 15,
                color: 'from-red-500 to-orange-500'
              },
              { 
                title: 'Privacy & Safety', 
                description: 'Keep your account and content secure.',
                icon: ThumbsUp,
                count: 12,
                color: 'from-yellow-500 to-amber-500'
              },
              { 
                title: 'Community Guidelines', 
                description: 'Learn about our community standards.',
                icon: Book,
                count: 8,
                color: 'from-indigo-500 to-blue-500'
              }
            ].map((category, index) => (
              <Card key={index} className="group bg-gray-800/50 border-gray-700 hover:border-red-500/50 transition-all duration-300 hover:scale-105 cursor-pointer">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-red-400 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {category.count} articles
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Support CTA */}
        <section className="text-center">
          <Card className="bg-gradient-to-r from-red-600/20 to-yellow-500/20 border-red-500/30">
            <CardContent className="p-8">
              <MessageSquare className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Still need help?
              </h3>
              <p className="text-gray-300 mb-6">
                Our support team is here to help you with any questions or issues.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => setLocation('/help/tickets/new')}
                  data-testid="button-create-ticket"
                >
                  <Ticket className="h-5 w-5 mr-2" />
                  Create Support Ticket
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                  onClick={() => setShowAIChat(true)}
                  data-testid="button-ai-chat"
                >
                  <Bot className="h-5 w-5 mr-2" />
                  Try AI Assistant
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Enhanced AI Chat Bot */}
      <EnhancedAIChatBot 
        isOpen={showAIChat} 
        onClose={() => setShowAIChat(false)} 
      />
    </div>
  );
}