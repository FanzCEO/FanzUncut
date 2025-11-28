'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
}

export function LoginModal({ isOpen, onClose, onSwitchToSignup }: LoginModalProps) {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      onClose();
      setFormData({ email: '', password: '' });
    } else {
      setErrors({ form: result.error || 'Login failed' });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({ email: '', password: '' });
    setErrors({});
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Welcome Back">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-heading text-primary underground-glow mb-2">
            Enter the Underground
          </h3>
          <p className="text-text-secondary">
            Sign in to access exclusive content and connect with the brotherhood.
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="bg-background/50 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-text mb-2">Demo Accounts:</h4>
          <div className="space-y-1 text-sm text-text-secondary">
            <div><strong>Admin:</strong> admin@boyfanz.com / admin123</div>
            <div><strong>Creator:</strong> creator@boyfanz.com / creator123</div>
            <div><strong>Fan:</strong> fan@boyfanz.com / fan123</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={errors.password}
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
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-sm text-text-secondary hover:text-primary transition-colors"
                disabled={isLoading}
              >
                Don&apos;t have an account? <span className="text-secondary font-semibold">Join the Underground</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}