import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
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
  ArrowLeft,
  Send
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

interface Comment {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  createdAt: string;
  user?: {
    username: string;
    profileImageUrl?: string;
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

const CommentItem = ({ comment }: { comment: Comment }) => {
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

  return (
    <div className="flex gap-3 py-3" data-testid={`comment-${comment.id}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.user?.profileImageUrl} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {comment.user?.username?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm" data-testid={`comment-username-${comment.id}`}>
            {comment.user?.username || 'User'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>
        
        <p className="text-sm" data-testid={`comment-content-${comment.id}`}>
          {comment.content}
        </p>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs hover:text-red-400">
            <Heart className="h-3 w-3 mr-1" />
            {comment.likesCount}
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function PostView() {
  const [, params] = useRoute('/post/:postId');
  const { user } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const postId = params?.postId;

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['/api/posts', postId],
    enabled: !!postId,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['/api/posts', postId, 'comments'],
    enabled: !!postId,
  });

  const handleLike = async () => {
    try {
      const response = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
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

  const handleComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: newComment,
        }),
      });

      if (response.ok) {
        setNewComment('');
        toast({
          title: "Comment posted!",
          description: "Your comment has been added",
        });
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto text-center py-12">
          <CardContent>
            <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This post doesn't exist or has been removed.
            </p>
            <Link href="/feed">
              <Button>Back to Feed</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" data-testid="post-view">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/feed">
            <Button variant="ghost" className="gap-2" data-testid="back-to-feed">
              <ArrowLeft className="h-4 w-4" />
              Back to Feed
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Post Content */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              {/* Post Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link href={`/creator/${post.creatorId}`}>
                      <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                        <AvatarImage src={post.creator?.profileImageUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {post.creator?.username?.[0]?.toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    
                    <div>
                      <Link href={`/creator/${post.creatorId}`}>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                          <span className="font-semibold" data-testid="creator-username">
                            {post.creator?.username || 'Creator'}
                          </span>
                          {post.creator?.isVerified && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <PostTypeIcon type={post.type} />
                        <span className="capitalize">{post.type}</span>
                        <span>•</span>
                        <span data-testid="post-time">{formatTimeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {post.visibility === 'premium' && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {formatCurrency(post.priceCents)}
                      </Badge>
                    )}
                    {post.visibility === 'subscribers_only' && (
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                        Subscribers Only
                      </Badge>
                    )}
                  </div>
                </div>

                {post.title && (
                  <CardTitle className="text-xl leading-tight mt-4" data-testid="post-title">
                    {post.title}
                  </CardTitle>
                )}
              </CardHeader>

              {/* Post Content */}
              <CardContent className="pt-0">
                {post.content && (
                  <p className="text-muted-foreground mb-6" data-testid="post-content">
                    {post.content}
                  </p>
                )}

                {/* Media Display */}
                {post.mediaUrls.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {post.mediaUrls.map((url, index) => (
                      <div key={index} className="relative">
                        {post.type === 'video' ? (
                          <video 
                            controls 
                            className="w-full rounded-lg"
                            poster={post.thumbnailUrl}
                          >
                            <source src={url} type="video/mp4" />
                          </video>
                        ) : post.type === 'audio' ? (
                          <audio controls className="w-full">
                            <source src={url} type="audio/mpeg" />
                          </audio>
                        ) : (
                          <img 
                            src={url} 
                            alt={`Post media ${index + 1}`}
                            className="w-full rounded-lg"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {post.hashtags.map((tag, idx) => (
                      <span key={idx} className="text-sm text-primary hover:text-primary/80 cursor-pointer">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-6">
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2 hover:text-red-400 hover:bg-red-400/10"
                      onClick={handleLike}
                      data-testid="like-button"
                    >
                      <Heart className="h-5 w-5" />
                      <span data-testid="likes-count">{post.likesCount}</span>
                    </Button>

                    <Button variant="ghost" className="flex items-center gap-2 hover:text-blue-400 hover:bg-blue-400/10">
                      <MessageCircle className="h-5 w-5" />
                      <span data-testid="comments-count">{post.commentsCount}</span>
                    </Button>

                    <Button variant="ghost" className="flex items-center gap-2 hover:text-green-400 hover:bg-green-400/10">
                      <Share className="h-5 w-5" />
                      <span>Share</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span data-testid="views-count">{post.viewsCount} views</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comments Section */}
          <div className="space-y-6">
            {/* Creator Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={post.creator?.profileImageUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {post.creator?.username?.[0]?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{post.creator?.username}</h3>
                    <p className="text-sm text-muted-foreground">Creator</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href={`/creator/${post.creatorId}`}>
                    <Button className="w-full" data-testid="view-profile">
                      View Profile
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full" data-testid="follow-creator">
                    Follow
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Comment */}
                {user && (
                  <div className="mb-6">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          data-testid="comment-input"
                        />
                        <Button 
                          size="sm" 
                          onClick={handleComment}
                          disabled={!newComment.trim()}
                          data-testid="post-comment"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Comment
                        </Button>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-1">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No comments yet</p>
                      <p className="text-xs">Be the first to comment!</p>
                    </div>
                  ) : (
                    comments.map((comment, index) => (
                      <div key={comment.id}>
                        <CommentItem comment={comment} />
                        {index < comments.length - 1 && <Separator />}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}