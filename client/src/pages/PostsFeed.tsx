import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Play,
  Camera,
  Video,
  Music,
  Type,
  Clock,
  Users,
  Eye,
  MoreVertical
} from 'lucide-react';

interface Post {
  id: string;
  creatorId: string;
  type: 'photo' | 'video' | 'audio' | 'text' | 'reel' | 'story' | 'live';
  visibility: 'free' | 'premium' | 'subscribers_only';
  title?: string;
  content?: string;
  priceCents: number;
  mediaUrls: string[];
  thumbnailUrl?: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
  creator?: {
    username: string;
    profileImageUrl?: string;
    isVerified: boolean;
  };
}

const PostTypeIcon = ({ type }: { type: string }) => {
  const icons = {
    photo: Camera,
    video: Video,
    audio: Music,
    text: Type,
    reel: Play,
    story: Clock,
    live: Users,
  };
  const Icon = icons[type as keyof typeof icons] || Camera;
  return <Icon className="h-4 w-4" />;
};

const PostCard = ({ post }: { post: Post }) => {
  const { toast } = useToast();

  const handleLike = async () => {
    try {
      const response = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to like post');
      }
      
      toast({
        title: "Liked!",
        description: "Added to your likes",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200" data-testid={`post-card-${post.id}`}>
      {/* Post Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/creator/${post.creatorId}`}>
              <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                <AvatarImage src={post.creator?.profileImageUrl} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {post.creator?.username?.[0]?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div>
              <Link href={`/creator/${post.creatorId}`}>
                <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                  <span className="font-semibold text-sm" data-testid={`creator-name-${post.id}`}>
                    {post.creator?.username || 'Creator'}
                  </span>
                  {post.creator?.isVerified && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      ✓
                    </Badge>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <PostTypeIcon type={post.type} />
                <span className="capitalize">{post.type}</span>
                <span>•</span>
                <span data-testid={`post-time-${post.id}`}>{formatTimeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {post.visibility === 'premium' && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                {formatCurrency(post.priceCents)}
              </Badge>
            )}
            {post.visibility === 'subscribers_only' && (
              <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
                Subscribers
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {post.title && (
          <CardTitle className="text-lg leading-tight" data-testid={`post-title-${post.id}`}>
            {post.title}
          </CardTitle>
        )}
      </CardHeader>

      {/* Post Content */}
      <CardContent className="pt-0">
        {post.content && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3" data-testid={`post-content-${post.id}`}>
            {post.content}
          </p>
        )}

        {/* Media Preview */}
        {(post.thumbnailUrl || post.mediaUrls.length > 0) && (
          <Link href={`/post/${post.id}`}>
            <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg overflow-hidden cursor-pointer hover:opacity-95 transition-opacity group">
              {post.thumbnailUrl ? (
                <img 
                  src={post.thumbnailUrl} 
                  alt={post.title || 'Post media'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : post.mediaUrls[0] ? (
                <img 
                  src={post.mediaUrls[0]} 
                  alt={post.title || 'Post media'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <PostTypeIcon type={post.type} />
                </div>
              )}
              
              {post.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/60 rounded-full p-4 group-hover:bg-black/80 transition-colors">
                    <Play className="h-8 w-8 text-white fill-current" />
                  </div>
                </div>
              )}

              {post.type === 'live' && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-red-500 text-white animate-pulse">
                    LIVE
                  </Badge>
                </div>
              )}

              {post.mediaUrls.length > 1 && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="text-xs">
                    +{post.mediaUrls.length - 1}
                  </Badge>
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {post.hashtags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-xs text-primary hover:text-primary/80 cursor-pointer">
                #{tag}
              </span>
            ))}
            {post.hashtags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{post.hashtags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2 hover:text-red-400 hover:bg-red-400/10"
              onClick={handleLike}
              data-testid={`like-button-${post.id}`}
            >
              <Heart className="h-4 w-4" />
              <span className="text-sm" data-testid={`likes-count-${post.id}`}>
                {post.likesCount}
              </span>
            </Button>

            <Link href={`/post/${post.id}`}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-2 hover:text-blue-400 hover:bg-blue-400/10"
                data-testid={`comments-button-${post.id}`}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm" data-testid={`comments-count-${post.id}`}>
                  {post.commentsCount}
                </span>
              </Button>
            </Link>

            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2 hover:text-green-400 hover:bg-green-400/10"
              data-testid={`share-button-${post.id}`}
            >
              <Share className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </Button>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span data-testid={`views-count-${post.id}`}>{post.viewsCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PostsFeed() {
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['/api/posts/feed'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg mb-4" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" data-testid="posts-feed">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Your Feed
          </h1>
          <p className="text-muted-foreground">
            Latest posts from creators you follow
          </p>
        </div>

        {posts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start following creators to see their posts in your feed
                  </p>
                  <Link href="/search">
                    <Button data-testid="discover-creators-button">
                      Discover Creators
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}