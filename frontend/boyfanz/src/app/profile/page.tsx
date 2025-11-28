'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, EyeOff, Shield, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserMenu } from '@/components/ui/UserMenu';

function ProfileContent() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    bio: user?.creatorProfile?.bio || '',
    subscriptionPrice: user?.creatorProfile?.subscriptionPrice || 9.99,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Ensure user is available (ProtectedRoute handles the check)
  if (!user) return null;

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const newErrors: Record<string, string> = {};
    
    // Basic validation
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSaving(false);
      return;
    }
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user data
      const updatedUser = {
        ...user,
        displayName: formData.displayName,
        email: formData.email,
        creatorProfile: user.creatorProfile ? {
          ...user.creatorProfile,
          bio: formData.bio,
          subscriptionPrice: formData.subscriptionPrice
        } : undefined
      };
      
      updateUser(updatedUser);
      setIsEditing(false);
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      
    } catch {
      setErrors({ form: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isCreator = user.role === 'creator' || user.isCreator;

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
                Profile Settings
              </span>
            </div>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-heading text-text mb-2">Profile Settings</h1>
            <p className="text-text-secondary">
              Manage your account information and preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Overview */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-heading text-text">Profile Overview</h2>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-accent font-bold text-2xl">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {user.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                        {user.role === 'admin' ? (
                          <Shield className="w-3 h-3 text-background" />
                        ) : user.role === 'creator' ? (
                          <Crown className="w-3 h-3 text-background" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-heading text-text mb-1">
                    {user.displayName}
                  </h3>
                  <p className="text-text-secondary text-sm mb-2">@{user.username}</p>
                  <p className="text-text-secondary text-sm">
                    {user.role === 'admin' ? 'Platform Administrator' : 
                     user.role === 'creator' ? 'Content Creator' : 
                     'Community Member'}
                  </p>
                  
                  {isCreator && user.creatorProfile && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-lg font-heading text-primary underground-glow">
                            {user.creatorProfile.followers.toLocaleString()}
                          </div>
                          <div className="text-xs text-text-secondary">Followers</div>
                        </div>
                        <div>
                          <div className="text-lg font-heading text-secondary">
                            ${user.creatorProfile.subscriptionPrice}
                          </div>
                          <div className="text-xs text-text-secondary">Per Month</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Settings Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <h2 className="text-xl font-heading text-text">Account Information</h2>
                  <Button
                    variant={isEditing ? "ghost" : "outline"}
                    onClick={() => {
                      if (isEditing) {
                        // Reset form data when canceling
                        setFormData({
                          displayName: user.displayName,
                          email: user.email,
                          bio: user.creatorProfile?.bio || '',
                          subscriptionPrice: user.creatorProfile?.subscriptionPrice || 9.99,
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                        setErrors({});
                      }
                      setIsEditing(!isEditing);
                    }}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-text">Basic Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Display Name"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        disabled={!isEditing}
                        error={errors.displayName}
                      />
                      
                      <Input
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                        error={errors.email}
                      />
                    </div>

                    <Input
                      label="Username"
                      value={user.username}
                      disabled
                      hint="Username cannot be changed"
                    />
                  </div>

                  {/* Creator Settings */}
                  {isCreator && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-text">Creator Settings</h3>
                      
                      <Input
                        label="Bio"
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Tell your audience about yourself..."
                      />
                      
                      <Input
                        label="Monthly Subscription Price"
                        type="number"
                        step="0.01"
                        min="0.99"
                        max="999.99"
                        value={formData.subscriptionPrice}
                        onChange={(e) => handleInputChange('subscriptionPrice', parseFloat(e.target.value) || 0)}
                        disabled={!isEditing}
                        hint="Price in USD for monthly subscriptions"
                      />
                    </div>
                  )}

                  {/* Password Change */}
                  {isEditing && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-text">Change Password</h3>
                      <p className="text-sm text-text-secondary">
                        Leave blank to keep current password
                      </p>
                      
                      <div className="relative">
                        <Input
                          label="Current Password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.currentPassword}
                          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                          error={errors.currentPassword}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-8 text-text-secondary hover:text-text transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      <Input
                        label="New Password"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        error={errors.newPassword}
                        hint="Must be at least 6 characters"
                      />
                      
                      <Input
                        label="Confirm New Password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        error={errors.confirmPassword}
                      />
                    </div>
                  )}

                  {/* Form Errors */}
                  {errors.form && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm text-primary">{errors.form}</p>
                    </div>
                  )}

                  {/* Save Button */}
                  {isEditing && (
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="neon-glow"
                      >
                        {isSaving ? (
                          <>
                            <Eye className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ProfileContent />
    </ProtectedRoute>
  );
}
