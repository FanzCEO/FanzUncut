import { useEffect, useState, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CheckCircle2, Shield, Video, Image as ImageIcon, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

const POSTS_PER_AD = 4;

interface Post {
  id: string;
  creatorId: string;
  creatorHandle: string;
  creatorName: string;
  creatorAvatar: string;
  type: string;
  visibility: string;
  title: string | null;
  content: string | null;
  mediaUrls: string[];
  thumbnailUrl: string | null;
  priceCents: number;
  isSubscribed: boolean;
  isFreeToView: boolean;
  isAgeVerified: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
}

interface AdBlock {
  id: string;
  type: 'ad';
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
}

export default function InfinityFeed() {
  const { user } = useAuth();
  const loader = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['/api/infinity-feed'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/infinity-feed?page=${pageParam}`);
      if (!response.ok) throw new Error('Failed to fetch feed');
      return response.json() as Promise<{ posts: Post[]; hasMore: boolean }>;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );
    
    if (loader.current) {
      observer.observe(loader.current);
    }
    
    return () => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  const renderPost = (post: Post, index: number) => {
    const canView = post.isFreeToView || post.isSubscribed;
    const needsVerification = !post.isAgeVerified && !post.isSubscribed;
    const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;

    return (
      <Card 
        key={post.id} 
        className="glass-card border-red-900/20 hover:border-red-500/40 transition-all duration-300 overflow-hidden group"
        data-testid={`post-card-${post.id}`}
      >
        <CardContent className="p-0">
          {/* Creator Header */}
          <Link href={`/creator/${post.creatorId}`}>
            <div className="p-4 flex items-center gap-3 border-b border-red-900/20 cursor-pointer hover:bg-red-950/20 transition-colors" data-testid={`creator-header-${post.id}`}>
              <div className="relative">
                <img 
                  src={post.creatorAvatar || '/default-avatar.png'} 
                  alt={post.creatorName}
                  className="w-12 h-12 rounded-full border-2 border-gold-500/50"
                  data-testid={`creator-avatar-${post.id}`}
                />
                {post.isAgeVerified && (
                  <CheckCircle2 className="absolute -top-1 -right-1 w-5 h-5 text-green-500 bg-black rounded-full" data-testid={`verified-badge-${post.id}`} />
                )}
              </div>
              <div>
                <div className="font-bebas text-lg text-gold-500" data-testid={`creator-name-${post.id}`}>{post.creatorName}</div>
                <div className="text-sm text-muted-foreground" data-testid={`creator-handle-${post.id}`}>@{post.creatorHandle}</div>
              </div>
            </div>
          </Link>

          {/* Media Content */}
          {hasMedia && (
            <div className="relative bg-black/60 aspect-video group-hover:bg-black/80 transition-colors" data-testid={`media-container-${post.id}`}>
              {canView && !needsVerification ? (
                <>
                  {post.type === 'video' ? (
                    <div className="relative w-full h-full">
                      <video 
                        className="w-full h-full object-cover"
                        poster={post.thumbnailUrl || undefined}
                        controls
                        data-testid={`video-player-${post.id}`}
                      >
                        <source src={post.mediaUrls[0]} type="video/mp4" />
                      </video>
                      <Play className="absolute top-4 right-4 w-8 h-8 text-red-500" />
                    </div>
                  ) : (
                    <img 
                      src={post.mediaUrls[0]} 
                      alt={post.title || 'Post media'}
                      className="w-full h-full object-cover"
                      data-testid={`image-media-${post.id}`}
                    />
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center backdrop-blur-xl bg-black/80" data-testid={`locked-content-${post.id}`}>
                  <div className="relative">
                    {post.thumbnailUrl && (
                      <img 
                        src={post.thumbnailUrl} 
                        alt="Blurred preview"
                        className="w-full h-full object-cover blur-2xl opacity-20 absolute inset-0"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-4 p-8">
                      <Lock className="w-16 h-16 text-red-500 neon-glow-red" />
                      <div className="text-center space-y-2">
                        <p className="font-bebas text-2xl text-red-500" data-testid={`lock-reason-${post.id}`}>
                          {needsVerification 
                            ? "Age Verification Required" 
                            : post.priceCents > 0 
                              ? `Unlock for $${(post.priceCents / 100).toFixed(2)}`
                              : "Subscribe to View"}
                        </p>
                        {needsVerification && (
                          <p className="text-sm text-muted-foreground max-w-xs">
                            Verify your age via VerifyMy to access free content
                          </p>
                        )}
                      </div>
                      <Link href={`/creator/${post.creatorId}`}>
                        <Button 
                          className="glass-button-neon"
                          data-testid={`unlock-button-${post.id}`}
                        >
                          {needsVerification ? (
                            <>
                              <Shield className="w-4 h-4 mr-2" />
                              Verify Age
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              {post.priceCents > 0 ? 'Unlock' : 'Subscribe'}
                            </>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post Content */}
          <div className="p-4 space-y-3">
            {post.title && (
              <h3 className="font-bebas text-xl text-gold-500" data-testid={`post-title-${post.id}`}>{post.title}</h3>
            )}
            {post.content && (
              <p className="text-sm text-foreground/80 line-clamp-3" data-testid={`post-content-${post.id}`}>{post.content}</p>
            )}
            
            {/* Post Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-red-900/20">
              <span data-testid={`views-count-${post.id}`}>{post.viewsCount} views</span>
              <span data-testid={`likes-count-${post.id}`}>{post.likesCount} likes</span>
              <span data-testid={`comments-count-${post.id}`}>{post.commentsCount} comments</span>
            </div>
            
            {/* View Full Post */}
            <Link href={`/post/${post.id}`}>
              <Button variant="ghost" className="w-full glass-button" data-testid={`view-post-${post.id}`}>
                View Full Post
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAd = (index: number): AdBlock => {
    // Ad placeholder - replace with actual ad service integration
    const ads: AdBlock[] = [
      {
        id: `ad-${index}`,
        type: 'ad',
        title: 'Premium Creator Tools',
        description: 'Unlock advanced analytics and monetization features',
        imageUrl: '/ad-placeholder.jpg',
      },
      {
        id: `ad-${index}`,
        type: 'ad',
        title: 'FanzToken Early Access',
        description: 'Be first to join the creator economy revolution',
      },
      {
        id: `ad-${index}`,
        type: 'ad',
        title: 'Boost Your Earnings',
        description: 'Get discovered by thousands of new fans',
      },
    ];
    
    return ads[index % ads.length];
  };

  const renderAdBlock = (ad: AdBlock, index: number) => {
    return (
      <Card 
        key={ad.id} 
        className="glass-panel border-gold-500/30 overflow-hidden"
        data-testid={`ad-block-${index}`}
      >
        <CardContent className="p-6 text-center space-y-3">
          <div className="inline-block px-3 py-1 bg-gold-500/20 border border-gold-500/40 rounded-full">
            <p className="text-xs font-bebas tracking-widest text-gold-500" data-testid={`ad-label-${index}`}>SPONSORED</p>
          </div>
          {ad.imageUrl && (
            <img src={ad.imageUrl} alt={ad.title} className="w-full h-32 object-cover rounded-lg" />
          )}
          <h3 className="font-bebas text-2xl text-gold-500" data-testid={`ad-title-${index}`}>{ad.title}</h3>
          <p className="text-sm text-muted-foreground" data-testid={`ad-description-${index}`}>{ad.description}</p>
          <Button 
            className="glass-button-gold w-full"
            data-testid={`ad-cta-${index}`}
          >
            Learn More
          </Button>
        </CardContent>
      </Card>
    );
  };

  const mixedContent = posts.reduce<(Post | AdBlock)[]>((acc, post, index) => {
    acc.push(post);
    // Insert ad every 4th post
    if ((index + 1) % POSTS_PER_AD === 0) {
      acc.push(renderAd(Math.floor(index / POSTS_PER_AD)));
    }
    return acc;
  }, []);

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="glass-card border-red-500/50 p-8">
          <p className="text-red-500 font-bebas text-xl">Error loading feed. Please try again.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 border-red-900/30">
        <h1 className="font-bebas text-4xl text-red-500 neon-glow-red mb-2" data-testid="feed-title">
          INFINITY FEED
        </h1>
        <p className="text-muted-foreground" data-testid="feed-description">
          Discover endless content from creators you follow and new stars to explore
        </p>
      </div>

      {/* Feed Grid */}
      <div 
        className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        data-testid="feed-grid"
      >
        {mixedContent.map((item, index) => 
          'type' in item && item.type === 'ad' 
            ? renderAdBlock(item as AdBlock, index)
            : renderPost(item as Post, index)
        )}
      </div>

      {/* Loading Indicator */}
      <div ref={loader} className="flex justify-center py-8" data-testid="loading-indicator">
        {(isLoading || isFetchingNextPage) && (
          <div className="flex items-center gap-3 text-red-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-bebas text-lg">
              {isLoading ? 'Loading feed...' : 'Loading more content...'}
            </span>
          </div>
        )}
        {!hasNextPage && posts.length > 0 && !isLoading && (
          <p className="text-muted-foreground font-bebas text-lg" data-testid="end-message">
            You've reached the end of the feed
          </p>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && posts.length === 0 && (
        <Card className="glass-card border-red-900/30 p-12 text-center" data-testid="empty-state">
          <h3 className="font-bebas text-2xl text-gold-500 mb-4">No Posts Yet</h3>
          <p className="text-muted-foreground mb-6">
            Start following creators to see their content in your feed
          </p>
          <Link href="/search">
            <Button className="glass-button-neon" data-testid="discover-creators">
              Discover Creators
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
