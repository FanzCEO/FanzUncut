import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  MessageCircle, 
  User, 
  Search, 
  Settings, 
  Upload,
  Heart,
  TrendingUp,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  user?: {
    id: string;
    username: string;
    role: string;
    avatar?: string;
  };
  className?: string;
}

// Enhanced navigation with mobile responsiveness and accessibility
export function EnhancedNavigation({ user, className }: NavigationProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Navigation items configuration
  const navigationItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/',
      testId: 'nav-home'
    },
    {
      icon: Search,
      label: 'Explore',
      href: '/explore',
      testId: 'nav-explore'
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      href: '/messages',
      testId: 'nav-messages',
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      icon: Heart,
      label: 'Liked',
      href: '/liked',
      testId: 'nav-liked'
    },
    {
      icon: TrendingUp,
      label: 'Analytics',
      href: '/analytics',
      testId: 'nav-analytics',
      requiresCreator: true
    }
  ];

  // Action items (right side)
  const actionItems = [
    {
      icon: Upload,
      label: 'Upload',
      href: '/upload',
      testId: 'nav-upload',
      variant: 'primary' as const,
      requiresCreator: true
    },
    {
      icon: Bell,
      label: 'Notifications',
      href: '/notifications',
      testId: 'nav-notifications'
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/settings',
      testId: 'nav-settings'
    }
  ];

  // Check if user is creator or admin
  const isCreatorOrAdmin = user?.role === 'creator' || user?.role === 'admin';

  // Filter items based on user permissions
  const filteredNavItems = navigationItems.filter(item => 
    !item.requiresCreator || isCreatorOrAdmin
  );
  
  const filteredActionItems = actionItems.filter(item => 
    !item.requiresCreator || isCreatorOrAdmin
  );

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, href: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = href;
    }
  };

  // Check if current path is active
  const isActivePath = (href: string) => {
    return location === href || (href !== '/' && location.startsWith(href));
  };

  return (
    <nav 
      className={cn(
        "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50",
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link 
              href="/"
              className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md p-1"
              data-testid="logo-link"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">BF</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                BoyFanz
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {filteredNavItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href}
              >
                <Button
                  variant={isActivePath(item.href) ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "flex items-center space-x-2 relative",
                    isActivePath(item.href) && "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                  )}
                  data-testid={item.testId}
                  onKeyDown={(e) => handleKeyDown(e, item.href)}
                  aria-current={isActivePath(item.href) ? "page" : undefined}
                >
                  <item.icon size={18} />
                  <span className="hidden lg:inline">{item.label}</span>
                  {item.badge && (
                    <span 
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                      aria-label={`${item.badge} unread messages`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop Action Items */}
          <div className="hidden md:flex items-center space-x-2">
            {filteredActionItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href}
              >
                <Button
                  variant={(item.variant === "primary" ? "default" : item.variant) || "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                  data-testid={item.testId}
                  onKeyDown={(e) => handleKeyDown(e, item.href)}
                >
                  <item.icon size={18} />
                  <span className="hidden xl:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
            
            {/* User Profile */}
            {user && (
              <Link href="/profile">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                  data-testid="nav-profile"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={`${user.username}'s avatar`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <span className="hidden xl:inline">{user.username}</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle mobile menu"
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div 
            id="mobile-menu"
            className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Navigation Items */}
              {filteredNavItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                >
                  <Button
                    variant={isActivePath(item.href) ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start relative",
                      isActivePath(item.href) && "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                    )}
                    data-testid={`mobile-${item.testId}`}
                    role="menuitem"
                  >
                    <item.icon size={18} className="mr-3" />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              ))}
              
              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
              
              {/* Action Items */}
              {filteredActionItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                >
                  <Button
                    variant={item.variant || "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    data-testid={`mobile-${item.testId}`}
                    role="menuitem"
                  >
                    <item.icon size={18} className="mr-3" />
                    {item.label}
                  </Button>
                </Link>
              ))}

              {/* User Profile (Mobile) */}
              {user && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                  <Link href="/profile">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      data-testid="mobile-nav-profile"
                      role="menuitem"
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden mr-3">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={`${user.username}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      {user.username}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Mobile-optimized bottom navigation for touch devices
export function MobileBottomNavigation({ user }: NavigationProps) {
  const [location] = useLocation();
  
  const bottomNavItems = [
    { icon: Home, label: 'Home', href: '/', testId: 'bottom-nav-home' },
    { icon: Search, label: 'Explore', href: '/explore', testId: 'bottom-nav-explore' },
    { icon: Upload, label: 'Upload', href: '/upload', testId: 'bottom-nav-upload', requiresCreator: true },
    { icon: MessageCircle, label: 'Messages', href: '/messages', testId: 'bottom-nav-messages' },
    { icon: User, label: 'Profile', href: '/profile', testId: 'bottom-nav-profile' }
  ];

  const isCreatorOrAdmin = user?.role === 'creator' || user?.role === 'admin';
  const filteredItems = bottomNavItems.filter(item => 
    !item.requiresCreator || isCreatorOrAdmin
  );

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden z-50"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex">
        {filteredItems.map((item) => (
          <Link 
            key={item.href}
            href={item.href}
            className="flex-1"
          >
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full h-16 flex flex-col items-center justify-center space-y-1 rounded-none",
                location === item.href && "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              )}
              data-testid={item.testId}
              aria-current={location === item.href ? "page" : undefined}
            >
              <item.icon size={20} />
              <span className="text-xs">{item.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </nav>
  );
}