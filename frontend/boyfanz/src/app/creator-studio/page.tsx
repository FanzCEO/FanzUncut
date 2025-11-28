'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Upload, 
  BarChart3, 
  DollarSign, 
  Users, 
  Heart, 
  Eye, 
  Plus,
  Edit3,
  Trash2,
  TrendingUp,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserMenu } from '@/components/ui/UserMenu';
import { FileUpload } from '@/components/upload/FileUpload';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface ContentItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  thumbnail: string;
  createdAt: string;
  likes: number;
  views: number;
  earnings: number;
  isPublished: boolean;
  isSubscriptionOnly: boolean;
  tags: string[];
}

function CreatorStudioContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'upload' | 'analytics' | 'settings'>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    tags: '',
    isSubscriptionOnly: true,
    price: 0
  });

  // Mock data - in real app this would come from API
  const stats = {
    totalEarnings: 2847.50,
    monthlyEarnings: 425.30,
    totalFollowers: user?.creatorProfile?.followers || 0,
    totalViews: 124500,
    totalLikes: 8920,
    contentCount: 87
  };

  const recentContent: ContentItem[] = [
    {
      id: '1',
      title: 'Underground Training Session',
      type: 'video',
      thumbnail: '/api/placeholder/300/200',
      createdAt: '2024-01-15',
      likes: 234,
      views: 1250,
      earnings: 45.30,
      isPublished: true,
      isSubscriptionOnly: true,
      tags: ['fitness', 'training', 'underground']
    },
    {
      id: '2',
      title: 'Alpha Mindset Tips',
      type: 'image',
      thumbnail: '/api/placeholder/300/200',
      createdAt: '2024-01-14',
      likes: 189,
      views: 890,
      earnings: 23.50,
      isPublished: true,
      isSubscriptionOnly: false,
      tags: ['mindset', 'alpha', 'tips']
    },
    {
      id: '3',
      title: 'Behind the Scenes',
      type: 'video',
      thumbnail: '/api/placeholder/300/200',
      createdAt: '2024-01-13',
      likes: 156,
      views: 670,
      earnings: 18.90,
      isPublished: true,
      isSubscriptionOnly: true,
      tags: ['behind-scenes', 'personal']
    }
  ];

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Uploading files:', files);
      console.log('Upload form data:', uploadForm);
      
      // In real app, you'd send files and form data to your API
      
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        description: '',
        tags: '',
        isSubscriptionOnly: true,
        price: 0
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

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
                Creator Studio
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-heading text-text mb-2">Creator Studio</h1>
                <p className="text-text-secondary">
                  Manage your content, track performance, and grow your audience.
                </p>
              </div>
              <Button
                onClick={() => setShowUploadModal(true)}
                className="neon-glow"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Content
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-border mb-8">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'content', label: 'Content', icon: Upload },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'content' | 'analytics' | 'settings')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary underground-glow'
                      : 'border-transparent text-text-secondary hover:text-text hover:border-border'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <DollarSign className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-secondary">
                      ${stats.totalEarnings.toFixed(2)}
                    </div>
                    <div className="text-text-secondary text-sm">Total Earnings</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-primary underground-glow">
                      {stats.totalFollowers.toLocaleString()}
                    </div>
                    <div className="text-text-secondary text-sm">Followers</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Eye className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-secondary">
                      {stats.totalViews.toLocaleString()}
                    </div>
                    <div className="text-text-secondary text-sm">Total Views</div>
                  </CardContent>
                </Card>

                <Card variant="neon">
                  <CardContent className="p-6 text-center">
                    <Heart className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-heading text-primary underground-glow">
                      {stats.totalLikes.toLocaleString()}
                    </div>
                    <div className="text-text-secondary text-sm">Total Likes</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Content */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-heading text-text">Recent Content</h2>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('content')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentContent.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 bg-surface/50 rounded-lg">
                        <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center">
                          <span className="text-primary text-xs">{item.type.toUpperCase()}</span>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium text-text">{item.title}</h3>
                          <p className="text-sm text-text-secondary">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-text-secondary">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{item.views}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4" />
                            <span>{item.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4" />
                            <span>${item.earnings}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'content' && (
            <div>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-heading text-text">All Content</h2>
                    <Button
                      onClick={() => setShowUploadModal(true)}
                      className="neon-glow"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Upload New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentContent.map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="aspect-video bg-surface/50 flex items-center justify-center">
                          <span className="text-text-secondary">{item.type.toUpperCase()}</span>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium text-text mb-2">{item.title}</h3>
                          <div className="flex items-center justify-between text-sm text-text-secondary mb-3">
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.isSubscriptionOnly 
                                ? 'bg-primary/20 text-primary' 
                                : 'bg-surface text-text-secondary'
                            }`}>
                              {item.isSubscriptionOnly ? 'Subscribers Only' : 'Free'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-text-secondary">
                              <span>👀 {item.views}</span>
                              <span>❤️ {item.likes}</span>
                              <span>💰 ${item.earnings}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="sm">
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-heading text-text mb-2">Analytics Dashboard</h3>
              <p className="text-text-secondary mb-6">
                Detailed analytics and insights coming soon.
              </p>
              <Button variant="outline">Coming Soon</Button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-heading text-text">Creator Settings</h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Input
                    label="Monthly Subscription Price"
                    type="number"
                    step="0.01"
                    min="0.99"
                    max="999.99"
                    value={user.creatorProfile?.subscriptionPrice || 9.99}
                    hint="Price in USD for monthly subscriptions"
                  />
                  
                  <Input
                    label="Creator Bio"
                    value={user.creatorProfile?.bio || ''}
                    placeholder="Tell your audience about yourself..."
                  />
                  
                  <div className="flex justify-end">
                    <Button className="neon-glow">
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Content"
        maxWidth="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Title"
              placeholder="Give your content a catchy title"
              value={uploadForm.title}
              onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
            />
            
            <Input
              label="Description"
              placeholder="Describe your content..."
              value={uploadForm.description}
              onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
            />
            
            <Input
              label="Tags (comma separated)"
              placeholder="fitness, workout, alpha, underground"
              value={uploadForm.tags}
              onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
            />
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="subscriptionOnly"
                checked={uploadForm.isSubscriptionOnly}
                onChange={(e) => setUploadForm(prev => ({ ...prev, isSubscriptionOnly: e.target.checked }))}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="subscriptionOnly" className="text-sm text-text">
                Subscribers only content
              </label>
            </div>
          </div>
          
          <FileUpload
            onUpload={handleUpload}
            isUploading={isUploading}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function CreatorStudio() {
  return (
    <ProtectedRoute requireAuth={true} requireRole="creator">
      <CreatorStudioContent />
    </ProtectedRoute>
  );
}