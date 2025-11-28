'use client';

import Link from 'next/link';
import { ArrowLeft, Users, Shield, Crown, Eye, Activity, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserMenu } from '@/components/ui/UserMenu';

function AdminContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full bg-surface/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-text-secondary hover:text-primary transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <Link href="/" className="text-2xl font-heading text-primary underground-glow font-bold">
                BoyFanz
              </Link>
              <span className="text-sm text-text-secondary font-body">
                Admin Panel
              </span>
            </div>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-heading text-text">Admin Panel</h1>
                <p className="text-text-secondary">
                  Platform administration and moderation controls
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card variant="neon">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-heading text-primary underground-glow">
                  2,847
                </div>
                <div className="text-text-secondary text-sm">Total Users</div>
              </CardContent>
            </Card>

            <Card variant="neon">
              <CardContent className="p-6 text-center">
                <Crown className="w-8 h-8 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-heading text-secondary">
                  156
                </div>
                <div className="text-text-secondary text-sm">Active Creators</div>
              </CardContent>
            </Card>

            <Card variant="neon">
              <CardContent className="p-6 text-center">
                <Eye className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-heading text-primary underground-glow">
                  23
                </div>
                <div className="text-text-secondary text-sm">Pending Reviews</div>
              </CardContent>
            </Card>

            <Card variant="neon">
              <CardContent className="p-6 text-center">
                <Activity className="w-8 h-8 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-heading text-secondary">
                  $12.4K
                </div>
                <div className="text-text-secondary text-sm">Revenue Today</div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User Management */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-heading text-text flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  User Management
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  View All Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Pending Verifications
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Banned Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  User Reports
                </Button>
              </CardContent>
            </Card>

            {/* Content Moderation */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-heading text-text flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Content Moderation
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Moderation Queue
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Flagged Content
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  DMCA Requests
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Auto-Mod Settings
                </Button>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-heading text-text flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  System Settings
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Platform Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Payment Config
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Security Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  System Logs
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-heading text-text">Recent Admin Activity</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-text">User @badactor123 was banned</h3>
                      <p className="text-sm text-text-secondary">By {user?.displayName} • 2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                    <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center">
                      <Eye className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-text">Content flagged for review</h3>
                      <p className="text-sm text-text-secondary">Reported by multiple users • 4 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <Crown className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-text">Creator @newcreator verified</h3>
                      <p className="text-sm text-text-secondary">KYC verification completed • 6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <ProtectedRoute requireAuth={true} requireRole="admin">
      <AdminContent />
    </ProtectedRoute>
  );
}