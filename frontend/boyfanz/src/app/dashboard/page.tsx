'use client';

import Link from 'next/link';
import { Users, Heart, Eye, Star, Calendar, Settings, Crown, Shield, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserMenu } from '@/components/ui/UserMenu';

function DashboardContent() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  const isCreator = user.role === 'creator' || user.isCreator;
  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full bg-surface/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-heading text-primary underground-glow font-bold">
                BoyFanz
              </Link>
              <span className="text-sm text-text-secondary font-body">
                Dashboard
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-text-secondary hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/explore" className="text-text-secondary hover:text-primary transition-colors">
                Explore
              </Link>
              <span className="text-primary">Dashboard</span>
            </div>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-accent font-bold text-xl">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                {user.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
                    {user.role === 'admin' ? (
                      <Shield className="w-3 h-3 text-background" />
                    ) : user.role === 'creator' ? (
                      <Crown className="w-3 h-3 text-background" />
                    ) : null}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-heading text-text">
                  Welcome back, {user.displayName}
                </h1>
                <p className="text-text-secondary">
                  {user.role === 'admin' ? 'Platform Administrator' : 
                   user.role === 'creator' ? 'Content Creator' : 
                   'Community Member'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isCreator && user.creatorProfile && (
              <>
                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-primary underground-glow">
                      {user.creatorProfile.followers.toLocaleString()}
                    </div>
                    <div className="text-text-secondary text-sm">Followers</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Heart className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-secondary">
                      {user.creatorProfile.posts}
                    </div>
                    <div className="text-text-secondary text-sm">Posts</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Star className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-primary underground-glow">
                      ${user.creatorProfile.subscriptionPrice}
                    </div>
                    <div className="text-text-secondary text-sm">Monthly Rate</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Eye className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-secondary">
                      12.5K
                    </div>
                    <div className="text-text-secondary text-sm">Total Views</div>
                  </CardContent>
                </Card>
              </>
            )}

            {!isCreator && (
              <>
                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Heart className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-primary underground-glow">
                      {user.subscriptions.length}
                    </div>
                    <div className="text-text-secondary text-sm">Subscriptions</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Users className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-secondary">
                      24
                    </div>
                    <div className="text-text-secondary text-sm">Following</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-primary underground-glow">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="text-text-secondary text-sm">Member Since</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Star className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-secondary">
                      {user.isVerified ? 'Verified' : 'Unverified'}
                    </div>
                    <div className="text-text-secondary text-sm">Account Status</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-heading text-text">Quick Actions</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isCreator && (
                    <>
                      <Link href="/creator-studio">
                        <Button variant="outline" className="w-full justify-start">
                          <Crown className="w-4 h-4 mr-3" />
                          Creator Studio
                        </Button>
                      </Link>
                      <Button variant="outline" className="w-full justify-start">
                        <Plus className="w-4 h-4 mr-3" />
                        New Post
                      </Button>
                    </>
                  )}
                  
                  <Link href="/profile">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-3" />
                      Profile Settings
                    </Button>
                  </Link>
                  
                  <Link href="/explore">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-3" />
                      Explore Creators
                    </Button>
                  </Link>

                  {isAdmin && (
                    <Link href="/admin">
                      <Button variant="outline" className="w-full justify-start">
                        <Shield className="w-4 h-4 mr-3" />
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity / Content */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-heading text-text">
                    {isCreator ? 'Recent Content' : 'Recent Activity'}
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isCreator ? (
                      // Creator Content
                      <>
                        <div className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                          <div className="w-16 h-16 bg-primary/20 rounded-lg"></div>
                          <div className="flex-1">
                            <h3 className="font-medium text-text">Underground Training Session</h3>
                            <p className="text-sm text-text-secondary">Posted 2 hours ago</p>
                            <div className="flex items-center space-x-4 text-sm text-text-secondary mt-1">
                              <span>👀 234 views</span>
                              <span>❤️ 45 likes</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                          <div className="w-16 h-16 bg-secondary/20 rounded-lg"></div>
                          <div className="flex-1">
                            <h3 className="font-medium text-text">Alpha Mindset Tips</h3>
                            <p className="text-sm text-text-secondary">Posted 1 day ago</p>
                            <div className="flex items-center space-x-4 text-sm text-text-secondary mt-1">
                              <span>👀 1.2K views</span>
                              <span>❤️ 89 likes</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Fan Activity
                      <>
                        <div className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                          <Heart className="w-8 h-8 text-primary" />
                          <div className="flex-1">
                            <h3 className="font-medium text-text">Liked a post by @alpha_muscle_god</h3>
                            <p className="text-sm text-text-secondary">2 hours ago</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                          <Users className="w-8 h-8 text-secondary" />
                          <div className="flex-1">
                            <h3 className="font-medium text-text">Started following @ironwolf</h3>
                            <p className="text-sm text-text-secondary">1 day ago</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                          <Star className="w-8 h-8 text-primary" />
                          <div className="flex-1">
                            <h3 className="font-medium text-text">Subscribed to @roughrider</h3>
                            <p className="text-sm text-text-secondary">3 days ago</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
