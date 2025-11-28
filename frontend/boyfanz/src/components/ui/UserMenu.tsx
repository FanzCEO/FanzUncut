'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, Settings, LogOut, Crown, Shield, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const getRoleIcon = () => {
    switch (user.role) {
      case 'admin':
        return <Shield className="w-3 h-3 text-secondary" />;
      case 'creator':
        return <Crown className="w-3 h-3 text-secondary" />;
      default:
        return null;
    }
  };

  const getRoleBadge = () => {
    switch (user.role) {
      case 'admin':
        return 'Admin';
      case 'creator':
        return 'Creator';
      case 'moderator':
        return 'Mod';
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1 rounded-lg hover:bg-surface/50 transition-colors"
      >
        <div className="relative">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center neon-border-subtle">
            <span className="text-accent font-bold text-sm">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          {user.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-secondary rounded-full flex items-center justify-center">
              {getRoleIcon()}
            </div>
          )}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-text flex items-center space-x-1">
            <span>{user.displayName}</span>
            {getRoleBadge() && (
              <span className="text-xs px-1.5 py-0.5 bg-secondary/20 text-secondary rounded">
                {getRoleBadge()}
              </span>
            )}
          </div>
          <div className="text-xs text-text-secondary">@{user.username}</div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-2xl neon-border z-50">
          {/* User Info Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-accent font-bold text-lg">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                {user.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
                    {getRoleIcon()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text truncate">
                  {user.displayName}
                </div>
                <div className="text-xs text-text-secondary">@{user.username}</div>
                <div className="text-xs text-text-secondary">{user.email}</div>
              </div>
            </div>
            
            {/* Creator Stats */}
            {user.isCreator && user.creatorProfile && (
              <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>{user.creatorProfile.followers.toLocaleString()} followers</span>
                </div>
                <div className="text-secondary font-medium">
                  ${user.creatorProfile.subscriptionPrice}/mo
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-text hover:bg-background transition-colors"
            >
              <User className="w-4 h-4 mr-3" />
              Dashboard
            </Link>
            
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-text hover:bg-background transition-colors"
            >
              <Settings className="w-4 h-4 mr-3" />
              Profile Settings
            </Link>

            {user.isCreator && (
              <Link
                href="/creator-studio"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-text hover:bg-background transition-colors"
              >
                <Crown className="w-4 h-4 mr-3" />
                Creator Studio
              </Link>
            )}

            {user.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-text hover:bg-background transition-colors"
              >
                <Shield className="w-4 h-4 mr-3" />
                Admin Panel
              </Link>
            )}
          </div>

          <div className="border-t border-border py-2">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-text hover:bg-background transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}