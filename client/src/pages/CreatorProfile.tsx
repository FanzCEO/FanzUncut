import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  MessageCircle, 
  Star, 
  Users, 
  DollarSign, 
  Camera,
  Video,
  Calendar,
  Shield,
  ExternalLink
} from 'lucide-react';

interface CreatorProfile {
  userId: string;
  monthlyPriceCents: number;
  isVerified: boolean;
  verificationBadge: string;
  coverImageUrl?: string;
  welcomeMessageEnabled: boolean;
  welcomeMessageText?: string;
  welcomeMessagePriceCents: number;
  categories: string[];
  totalEarningsCents: number;
  totalSubscribers: number;
  isOnline: boolean;
  lastActiveAt: string;
  user?: {
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

interface Post {
  id: string;
  type: string;
  title?: string;
  content?: string;
  visibility: string;
  priceCents: number;
  thumbnailUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export default function CreatorProfile() {
  const [, params] = useRoute('/creator/:userId');
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const userId = params?.userId;

  const { data: creator, isLoading } = useQuery<CreatorProfile>({
    queryKey: ['/api/creator-profiles', userId],
    enabled: !!userId,
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['/api/posts/creator', userId],
    enabled: !!userId,
  });

  const handleSubscribe = async () => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please login to subscribe to creators",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creatorId: userId }),
      });

      if (response.ok) {
        toast({
          title: "Subscribed!",
          description: `You're now subscribed to ${creator?.user?.username}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Subscription Failed",
          description: error.message || "Failed to subscribe",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader className="text-center">
            <CardTitle>Creator Not Found</CardTitle>
            <CardDescription>
              This creator profile doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Image */}
      <div className="relative h-64 bg-gradient-to-r from-primary/20 to-accent/20">
        {creator.coverImageUrl && (
          <img 
            src={creator.coverImageUrl} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <Card className="bg-card/95 backdrop-blur border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/20" data-testid="creator-avatar">
                    <AvatarImage src={creator.user?.profileImageUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {creator.user?.username?.[0]?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold" data-testid="creator-username">
                        {creator.user?.username || 'Creator'}
                      </h1>
                      {creator.isVerified && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {creator.isOnline && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                          • Online
                        </Badge>
                      )}
                    </div>

                    <p className="text-muted-foreground mb-4">
                      {creator.user?.firstName && creator.user?.lastName && 
                        `${creator.user.firstName} ${creator.user.lastName}`
                      }
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {creator.categories.map((category, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span data-testid="subscriber-count">{creator.totalSubscribers} subscribers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>Creator</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Recent Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No posts yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.map((post) => (
                      <Card key={post.id} className="overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer" data-testid={`post-${post.id}`}>
                        <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 relative">
                          {post.thumbnailUrl ? (
                            <img 
                              src={post.thumbnailUrl} 
                              alt={post.title || 'Post'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              {post.type === 'video' ? (
                                <Video className="h-8 w-8 text-muted-foreground" />
                              ) : (
                                <Camera className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          
                          {post.visibility === 'premium' && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="bg-primary/90 text-primary-foreground text-xs">
                                ${(post.priceCents / 100).toFixed(2)}
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        <CardContent className="p-3">
                          <h3 className="font-medium line-clamp-1 mb-2">
                            {post.title || 'Untitled Post'}
                          </h3>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {post.likesCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {post.commentsCount}
                              </span>
                            </div>
                            <span className="capitalize">{post.type}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Subscription Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <DollarSign className="h-5 w-5" />
                  Subscribe
                </CardTitle>
                <CardDescription>
                  Get exclusive access to {creator.user?.username}'s content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid="monthly-price">
                    {formatCurrency(creator.monthlyPriceCents)}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubscribe}
                  data-testid="subscribe-button"
                >
                  Subscribe Now
                </Button>

                {creator.welcomeMessageEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Welcome Message</h4>
                      <p className="text-xs text-muted-foreground">
                        {creator.welcomeMessageText || "Get a special welcome message!"}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {formatCurrency(creator.welcomeMessagePriceCents)}
                        </span>
                        <Button size="sm" variant="outline">
                          Purchase
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Message Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Send Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" data-testid="message-button">
                  Send Private Message
                </Button>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Send Tip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[5, 10, 25].map((amount) => (
                    <Button key={amount} variant="outline" size="sm" className="text-xs">
                      ${amount}
                    </Button>
                  ))}
                </div>
                <Button className="w-full" data-testid="tip-button">
                  Send Custom Tip
                </Button>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" size="sm">
                  Share Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}