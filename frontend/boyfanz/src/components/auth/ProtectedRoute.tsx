'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Shield, Crown, User } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: 'fan' | 'creator' | 'moderator' | 'admin';
  fallbackPath?: string;
  showLoginPrompt?: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireRole,
  fallbackPath = '/',
  showLoginPrompt = true
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // If auth is not required, always render
    if (!requireAuth) {
      setShouldRender(true);
      return;
    }

    // If auth is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      if (!showLoginPrompt) {
        router.push(fallbackPath);
        return;
      }
      setShouldRender(true);
      return;
    }

    // If specific role is required
    if (requireRole && user) {
      const hasRequiredRole = checkRole(user.role, requireRole);
      if (!hasRequiredRole) {
        router.push(fallbackPath);
        return;
      }
    }

    // All checks passed
    setShouldRender(true);
  }, [user, isAuthenticated, isLoading, requireAuth, requireRole, router, fallbackPath, showLoginPrompt]);

  // Helper function to check role hierarchy
  const checkRole = (userRole: string, requiredRole: string): boolean => {
    const roleHierarchy = {
      fan: 0,
      creator: 1,
      moderator: 2,
      admin: 3
    };

    const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
    const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 999;

    return userRoleLevel >= requiredRoleLevel;
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if we shouldn't
  if (!shouldRender) {
    return null;
  }

  // Show login prompt if auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated && showLoginPrompt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-heading text-text mb-4">
            Authentication Required
          </h1>
          
          <p className="text-text-secondary mb-6">
            You need to be signed in to access this page. Join the underground community to continue.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button variant="outline">
                Return to Home
              </Button>
            </Link>
            <Button className="neon-glow" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if role is insufficient
  if (requireRole && user && !checkRole(user.role, requireRole)) {
    const getRoleIcon = () => {
      switch (requireRole) {
        case 'admin':
          return <Shield className="w-8 h-8 text-primary" />;
        case 'creator':
          return <Crown className="w-8 h-8 text-secondary" />;
        default:
          return <User className="w-8 h-8 text-primary" />;
      }
    };

    const getRoleLabel = () => {
      switch (requireRole) {
        case 'admin':
          return 'Administrator';
        case 'creator':
          return 'Creator';
        case 'moderator':
          return 'Moderator';
        default:
          return 'User';
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            {getRoleIcon()}
          </div>
          
          <h1 className="text-2xl font-heading text-text mb-4">
            Access Denied
          </h1>
          
          <p className="text-text-secondary mb-6">
            This page requires {getRoleLabel()} privileges. Your current role ({user.role}) does not have sufficient permissions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button variant="outline">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button className="neon-glow">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}