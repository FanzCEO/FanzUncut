'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Heart, Share2, MessageCircle, Users, Calendar, MapPin, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import { UserMenu } from '@/components/ui/UserMenu';

// Mock creator data - in real app this would come from API based on params.id
const creator = {
  id: '1',
  username: 'alpha_muscle_god',
  displayName: 'Alpha Muscle God',
  avatar: '/api/placeholder/150/150',
  coverImage: '/api/placeholder/800/300',
  bio: 'Underground bodybuilder and fitness alpha. Raw, unfiltered content for true men who appreciate real masculine power. No games, just pure alpha energy.',
  stats: {
    followers: '12.5K',
    posts: '387',
    likes: '95.2K',
  },
  location: 'Los Angeles, CA',
  joinDate: 'January 2023',
  isLive: false,
  isVerified: true,
  subscriptionPrice: 19.99,
  tags: ['Fitness', 'Alpha', 'Muscle', 'Underground'],
  posts: [
    {
      id: '1',
      type: 'image',
      thumbnail: '/api/placeholder/300/400',
      title: 'Underground Gym Session',
      likes: 234,
      duration: null,
      isLocked: false,
    },
    {
      id: '2',
      type: 'video',
      thumbnail: '/api/placeholder/300/400',
      title: 'Alpha Training Secrets',
      likes: 567,
      duration: '12:45',
      isLocked: true,
    },
    {
      id: '3',
      type: 'image',
      thumbnail: '/api/placeholder/300/400',
      title: 'Raw Power',
      likes: 189,
      duration: null,
      isLocked: true,
    },
    {
      id: '4',
      type: 'video',
      thumbnail: '/api/placeholder/300/400',
      title: 'Behind the Scenes',
      likes: 445,
      duration: '8:32',
      isLocked: false,
    },
  ]
};

export default function CreatorProfile() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('content');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-surface/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/explore" className="text-text-secondary hover:text-primary transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-xl font-heading text-primary underground-glow font-bold">
                BoyFanz
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <>
                  <Button 
                    variant="outline" 
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

      <div className="pt-16">
        {/* Cover Image */}
        <div className="relative h-64 md:h-80 bg-surface overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="relative -mt-20 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-surface border-4 border-primary neon-border overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30" />
                </div>
                {creator.isVerified && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center border-2 border-background">
                    <Check className="w-4 h-4 text-background" />
                  </div>
                )}
                {creator.isLive && (
                  <div className="absolute -top-2 -right-2 bg-primary px-2 py-1 rounded-full text-xs font-semibold text-accent pulse-red">
                    LIVE
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-3xl font-heading text-text font-bold mb-1">
                      {creator.displayName}
                    </h1>
                    <p className="text-text-secondary mb-2">@{creator.username}</p>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary mb-4">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {creator.location}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Joined {creator.joinDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsFollowing(!isFollowing)}
                      className={isFollowing ? 'border-primary text-primary' : ''}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-primary' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    
                    <Button
                      onClick={() => setIsSubscribed(!isSubscribed)}
                      className={isSubscribed ? 'bg-secondary hover:bg-secondary/90' : 'neon-glow'}
                    >
                      {isSubscribed ? 'Subscribed' : `Subscribe $${creator.subscriptionPrice}/mo`}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-heading text-primary underground-glow">
                  {creator.stats.followers}
                </div>
                <div className="text-text-secondary text-sm">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-heading text-secondary">
                  {creator.stats.posts}
                </div>
                <div className="text-text-secondary text-sm">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-heading text-primary underground-glow">
                  {creator.stats.likes}
                </div>
                <div className="text-text-secondary text-sm">Likes</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-border mb-8">
            <nav className="flex space-x-8">
              {[
                { id: 'content', label: 'Content', count: creator.posts.length },
                { id: 'about', label: 'About' },
                { id: 'live', label: 'Live' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary underground-glow'
                      : 'border-transparent text-text-secondary hover:text-text hover:border-border'
                  }`}
                >
                  {tab.label}
                  {tab.count && <span className="ml-2 text-xs">({tab.count})</span>}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="pb-12">
            {activeTab === 'content' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.posts.map((post) => (
                  <Card key={post.id} className="group cursor-pointer hover:shadow-red-glow transition-all">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
                      
                      {/* Lock Overlay for Subscribers Only */}
                      {post.isLocked && !isSubscribed && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                          <div className="text-center">
                            <X className="w-8 h-8 text-primary mx-auto mb-2" />
                            <p className="text-sm text-text-secondary">Subscribe to unlock</p>
                          </div>
                        </div>
                      )}

                      {/* Video Play Button */}
                      {post.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center neon-glow">
                            <Play className="w-6 h-6 text-accent ml-1" />
                          </div>
                        </div>
                      )}

                      {/* Video Duration */}
                      {post.duration && (
                        <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs text-text">
                          {post.duration}
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-medium text-text mb-2 truncate">{post.title}</h3>
                      <div className="flex items-center justify-between text-sm text-text-secondary">
                        <span className="flex items-center">
                          <Heart className="w-4 h-4 mr-1" />
                          {post.likes}
                        </span>
                        <span className="flex items-center">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Comments
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="max-w-2xl">
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-heading text-text">About</h2>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-text mb-2">Bio</h3>
                      <p className="text-text-secondary leading-relaxed">{creator.bio}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-text mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {creator.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-surface border border-border rounded-full text-sm text-text-secondary"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-text mb-2">Subscription Benefits</h3>
                      <ul className="space-y-2 text-text-secondary">
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-secondary mr-2" />
                          Access to exclusive content
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-secondary mr-2" />
                          Direct messaging
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-secondary mr-2" />
                          Custom requests
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-secondary mr-2" />
                          Live stream access
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'live' && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <Users className="w-16 h-16 text-text-secondary mx-auto mb-4" />
                  <h3 className="text-xl font-heading text-text mb-2">No Live Streams</h3>
                  <p className="text-text-secondary mb-6">
                    {creator.displayName} is not currently live. Subscribe to get notified when they go live!
                  </p>
                  {!isSubscribed && (
                    <Button className="neon-glow">
                      Subscribe for Live Access
                    </Button>
                  )}
                </div>
              </div>
            )}
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
