'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MediaPlayer } from '@/components/media/MediaPlayer';
import { UserMenu } from '@/components/ui/UserMenu';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';

// Mock content data - in real app this would come from API based on params.id
const mockContent = {
  id: '1',
  type: 'video' as const,
  title: 'Underground Training Session - Alpha Male Workout',
  thumbnail: '/api/placeholder/800/450',
  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  duration: '15:32',
  isSubscriptionOnly: true,
  creatorId: '2',
  creatorName: 'alpha_muscle_god',
  likes: 234,
  isLiked: false,
  views: 1250,
  description: `Join me in the underground gym for an intense alpha male training session. This raw, unfiltered workout will push your limits and help you achieve that dominant masculine physique.

In this exclusive content:
• High-intensity compound movements
• Alpha mindset training
• Underground gym atmosphere
• Real motivation from a true alpha

This is not for the weak. Only serious men who want to transform their bodies and minds should watch. Let's get after it, brothers.`,
  tags: ['fitness', 'training', 'underground', 'alpha', 'workout', 'masculine'],
  createdAt: '2024-01-15T10:00:00Z',
  creator: {
    id: '2',
    username: 'alpha_muscle_god',
    displayName: 'Alpha Muscle God',
    avatar: '/api/placeholder/80/80',
    followers: 12500,
    subscriptionPrice: 19.99,
    isVerified: true,
    bio: 'Underground bodybuilder and fitness alpha. Raw, unfiltered content for true men who appreciate real masculine power.'
  },
  relatedContent: [
    {
      id: '2',
      title: 'Alpha Mindset Tips',
      thumbnail: '/api/placeholder/300/200',
      type: 'image' as const,
      isSubscriptionOnly: false,
      views: 890
    },
    {
      id: '3',
      title: 'Behind the Scenes',
      thumbnail: '/api/placeholder/300/200',
      type: 'video' as const,
      isSubscriptionOnly: true,
      views: 670
    }
  ]
};

export default function ContentPage() {
  const { user, isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isLiked, setIsLiked] = useState(mockContent.isLiked);
  const [likesCount, setLikesCount] = useState(mockContent.likes);
  
  // Check if user is subscribed to this creator
  const isSubscribed = user?.subscriptions?.includes(mockContent.creatorId) || false;

  const handleLike = (mediaId: string) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    
    // In real app, you'd send like/unlike to API
    console.log('Toggled like for media:', mediaId);
  };

  const handleShare = (mediaId: string) => {
    if (navigator.share) {
      navigator.share({
        title: mockContent.title,
        text: mockContent.description,
        url: window.location.href
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
    console.log('Shared media:', mediaId);
  };

  const handleReport = (mediaId: string) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    // In real app, you'd show a report modal or send report to API
    console.log('Reported media:', mediaId);
    alert('Content reported. Thank you for helping keep BoyFanz safe.');
  };

  const handleSubscribe = (creatorId: string) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    // In real app, you'd handle subscription logic here
    console.log('Subscribe to creator:', creatorId);
    // For demo, we could update the user's subscriptions
  };

  const mediaData = {
    ...mockContent,
    isLiked,
    likes: likesCount
  };

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full bg-surface/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/explore" className="text-text-secondary hover:text-primary transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <Link href="/" className="text-2xl font-heading text-primary underground-glow font-bold">
                BoyFanz
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowLogin(true)}
                  >
                    Sign In
                  </Button>
                  <Button 
                    size="sm" 
                    className="neon-glow"
                    onClick={() => setShowSignup(true)}
                  >
                    Join Now
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <MediaPlayer
                media={mediaData}
                isSubscribed={isSubscribed}
                onLike={handleLike}
                onShare={handleShare}
                onReport={handleReport}
                onSubscribe={handleSubscribe}
              />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Creator Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-accent font-bold text-lg">
                        {mockContent.creator.displayName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-text font-semibold">
                        {mockContent.creator.displayName}
                      </h3>
                      <p className="text-text-secondary text-sm">
                        @{mockContent.creator.username}
                      </p>
                      <p className="text-text-secondary text-sm">
                        {mockContent.creator.followers.toLocaleString()} followers
                      </p>
                    </div>
                  </div>

                  <p className="text-text-secondary text-sm mb-4 leading-relaxed">
                    {mockContent.creator.bio}
                  </p>

                  {!isSubscribed && (
                    <Button
                      onClick={() => handleSubscribe(mockContent.creatorId)}
                      className="w-full neon-glow"
                    >
                      Subscribe for ${mockContent.creator.subscriptionPrice}/mo
                    </Button>
                  )}

                  {isSubscribed && (
                    <div className="text-center">
                      <span className="text-secondary font-semibold">✓ Subscribed</span>
                      <p className="text-text-secondary text-sm mt-1">
                        Thank you for supporting this creator
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Related Content */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-heading text-text font-semibold mb-4">
                    More from @{mockContent.creator.username}
                  </h3>
                  
                  <div className="space-y-4">
                    {mockContent.relatedContent.map((item) => (
                      <Link
                        key={item.id}
                        href={`/content/${item.id}`}
                        className="block"
                      >
                        <div className="flex space-x-3 p-3 rounded-lg hover:bg-surface/50 transition-colors">
                          <div className="w-20 h-14 bg-surface rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-text-secondary text-xs">
                              {item.type.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-text font-medium text-sm truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center justify-between text-xs text-text-secondary mt-1">
                              <span>{item.views} views</span>
                              {item.isSubscriptionOnly && (
                                <span className="px-2 py-0.5 bg-primary/20 text-primary rounded">
                                  Sub
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Content Stats */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-heading text-text font-semibold mb-4">
                    Content Stats
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Views</span>
                      <span className="text-text">{mockContent.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Likes</span>
                      <span className="text-text">{likesCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Published</span>
                      <span className="text-text">
                        {new Date(mockContent.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Modals */}
      <LoginModal 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)}
        onSwitchToSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />
      
      <SignupModal 
        isOpen={showSignup} 
        onClose={() => setShowSignup(false)}
        onSwitchToLogin={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
      />
    </div>
  );
}