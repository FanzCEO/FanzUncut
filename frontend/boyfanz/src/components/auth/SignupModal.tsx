'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2, User, Crown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth, SignupData } from '@/contexts/AuthContext';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const { signup, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<SignupData>({
    username: '',
    email: '',
    password: '',
    displayName: '',
    accountType: 'fan',
    agreedToTerms: false,
    isOver18: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.displayName) {
      newErrors.displayName = 'Display name is required';
    }
    
    if (!formData.isOver18) {
      newErrors.isOver18 = 'You must be 18 or older to join';
    }
    
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the terms and conditions';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    const result = await signup(formData);
    
    if (result.success) {
      onClose();
      setFormData({
        username: '',
        email: '',
        password: '',
        displayName: '',
        accountType: 'fan',
        agreedToTerms: false,
        isOver18: false
      });
    } else {
      setErrors({ form: result.error || 'Signup failed' });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({
      username: '',
      email: '',
      password: '',
      displayName: '',
      accountType: 'fan',
      agreedToTerms: false,
      isOver18: false
    });
    setErrors({});
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join the Underground" maxWidth="lg">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-heading text-primary underground-glow mb-2">
            Welcome to the Brotherhood
          </h3>
          <p className="text-text-secondary">
            Create your account and enter the underground community.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleInputChange('accountType', 'fan')}
                className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                  formData.accountType === 'fan'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface hover:border-border/80 text-text'
                }`}
              >
                <User className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Fan</div>
                  <div className="text-sm opacity-80">Explore and support creators</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => handleInputChange('accountType', 'creator')}
                className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                  formData.accountType === 'creator'
                    ? 'border-secondary bg-secondary/10 text-secondary'
                    : 'border-border bg-surface hover:border-border/80 text-text'
                }`}
              >
                <Crown className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Creator</div>
                  <div className="text-sm opacity-80">Share content and build your audience</div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              label="Username"
              placeholder="Enter username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              error={errors.username}
              disabled={isLoading}
            />

            <Input
              type="text"
              label="Display Name"
              placeholder="Your display name"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              error={errors.displayName}
              disabled={isLoading}
            />
          </div>

          <Input
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            error={errors.email}
            disabled={isLoading}
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={errors.password}
              hint="Must be at least 6 characters"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-text-secondary hover:text-text transition-colors"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="isOver18"
                checked={formData.isOver18}
                onChange={(e) => handleInputChange('isOver18', e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                disabled={isLoading}
              />
              <label htmlFor="isOver18" className="text-sm text-text">
                I confirm that I am 18 years of age or older
                {errors.isOver18 && <div className="text-primary mt-1">{errors.isOver18}</div>}
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="agreedToTerms"
                checked={formData.agreedToTerms}
                onChange={(e) => handleInputChange('agreedToTerms', e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                disabled={isLoading}
              />
              <label htmlFor="agreedToTerms" className="text-sm text-text">
                I agree to the{' '}
                <a href="#" className="text-secondary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-secondary hover:underline">Privacy Policy</a>
                {errors.agreedToTerms && <div className="text-primary mt-1">{errors.agreedToTerms}</div>}
              </label>
            </div>
          </div>

          {errors.form && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary">{errors.form}</p>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full neon-glow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Join the Underground'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm text-text-secondary hover:text-primary transition-colors"
                disabled={isLoading}
              >
                Already have an account? <span className="text-secondary font-semibold">Sign In</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}