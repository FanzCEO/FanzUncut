import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  user: any;
}

export default function Sidebar({ user }: SidebarProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const isActive = (path: string) => location === path;
  
  const handleMobileLinkClick = () => {
    setMobileOpen(false);
  };
  
  const navItems = [
    { path: "/", icon: "fas fa-home", label: "Home" },
    { path: "/infinity-feed", icon: "fas fa-infinity", label: "Infinity Feed" },
    { path: "/fanz-money-center", icon: "fas fa-wallet", label: "FanzMoneyCenter" },
    { path: `/creator/${user?.id}`, icon: "fas fa-user", label: "My page" },
    { path: "/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { path: "/purchased", icon: "fas fa-shopping-bag", label: "Purchased" },
    { path: "/messages", icon: "fas fa-comments", label: "Messages", dot: true },
    { path: "/search", icon: "fas fa-search", label: "Explore" },
    { path: "/subscriptions", icon: "fas fa-star", label: "Subscriptions" },
    { path: "/release-forms", icon: "fas fa-file-contract", label: "Release Forms" },
    { path: "/nearby", icon: "fas fa-map-marker-alt", label: "Near by me" },
  ] as Array<{ path: string; icon: string; label: string; dot?: boolean; badge?: string }>;

  // Add streaming and events items to main nav for easy access
  if (user?.role === 'creator' || user?.role === 'admin' || user?.role === 'moderator') {
    navItems.splice(2, 0, { path: "/streams", icon: "fas fa-broadcast-tower", label: "Live Streams" });
    navItems.splice(3, 0, { path: "/events", icon: "fas fa-calendar-star", label: "Live Events" });
  } else {
    // Fans can view events too
    navItems.splice(2, 0, { path: "/events", icon: "fas fa-calendar-star", label: "Live Events" });
  }

  const adminItems = [
    { path: "/admin/dashboard", icon: "fas fa-tachometer-alt", label: "Admin Dashboard" },
    { path: "/admin/complaints", icon: "fas fa-exclamation-triangle", label: "Complaints Management" },
    { path: "/admin/withdrawals", icon: "fas fa-money-bill-wave", label: "Withdrawals & Payouts" },
    { path: "/admin/verification", icon: "fas fa-shield-alt", label: "Verification Requests" },
    { path: "/admin/moderation", icon: "fas fa-tasks", label: "Moderation Queue", badge: "7" },
    { path: "/admin/users", icon: "fas fa-users", label: "User Management" },
    { path: "/admin/delegation", icon: "fas fa-key", label: "Delegation Manager" },
    { path: "/admin/themes", icon: "fas fa-palette", label: "Theme Manager" },
    { path: "/admin/reports", icon: "fas fa-chart-bar", label: "Reports & Analytics" },
  ];

  const contentManagementItems = [
    { path: "/admin/posts", icon: "fas fa-file-alt", label: "Posts Management" },
    { path: "/admin/streaming", icon: "fas fa-broadcast-tower", label: "Live Streaming" },
    { path: "/admin/stories", icon: "fas fa-clock", label: "Stories Management" },
    { path: "/admin/shop", icon: "fas fa-store", label: "Shop Management" },
    { path: "/admin/categories", icon: "fas fa-folder-tree", label: "Categories Management" },
  ];

  const financialManagementItems = [
    { path: "/admin/transactions", icon: "fas fa-exchange-alt", label: "Transactions" },
    { path: "/admin/billing", icon: "fas fa-file-invoice", label: "Billing Management" },
    { path: "/admin/tax-rates", icon: "fas fa-percentage", label: "Tax Rates" },
    { path: "/admin/payment-settings", icon: "fas fa-cogs", label: "Payment Settings" },
    { path: "/admin/deposits", icon: "fas fa-wallet", label: "Deposits" },
  ];

  const systemManagementItems = [
    { path: "/admin/announcements", icon: "fas fa-bullhorn", label: "Announcements" },
    { path: "/admin/push-notifications", icon: "fas fa-bell", label: "Push Notifications" },
    { path: "/admin/system-settings", icon: "fas fa-cog", label: "System Settings" },
    { path: "/admin/storage", icon: "fas fa-hdd", label: "Storage Management" },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 md:h-20 items-center px-4 md:px-6 border-b border-border">
        <div className="flex items-center gap-2 md:gap-3">
          <img 
            src="/boyfanz-logo.png" 
            alt="BoyFanz Logo" 
            className="h-8 md:h-12 w-auto"
          />
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg md:text-xl neon-sign tracking-wider">BoyFanz</span>
            <span className="text-xs neon-sign-golden font-heading font-semibold tracking-wide uppercase hidden sm:block">Every Man's Playground</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4" data-testid="sidebar-nav">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              onClick={isMobile ? handleMobileLinkClick : undefined}
              className={cn(
                "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                isActive(item.path)
                  ? "active bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <i className={`${item.icon} w-5 h-5 md:w-4 md:h-4`}></i>
              {item.label}
              {item.badge && (
                <span className={cn(
                  "ml-auto text-xs px-2 py-0.5 rounded-full",
                  item.badge === "KYC" 
                    ? "bg-yellow-500 text-yellow-900"
                    : "bg-primary text-primary-foreground"
                )}>
                  {item.badge}
                </span>
              )}
              {item.dot && (
                <span className="ml-auto w-2 h-2 bg-primary rounded-full notification-dot"></span>
              )}
            </Link>
          ))}
        </div>

        {/* Creator Section */}
        {(user?.role === 'creator' || user?.role === 'admin' || user?.role === 'moderator') && (
          <div className="mt-6 md:mt-8">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Creator
            </h3>
            <div className="mt-2 space-y-1">
              <Link 
                href="/streams/create"
                onClick={isMobile ? handleMobileLinkClick : undefined}
                className={cn(
                  "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                  isActive("/streams/create")
                    ? "active bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid="nav-create-stream"
              >
                <i className="fas fa-video w-5 h-5 md:w-4 md:h-4"></i>
                Create Stream
              </Link>
              <Link 
                href="/events/host"
                onClick={isMobile ? handleMobileLinkClick : undefined}
                className={cn(
                  "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                  isActive("/events/host")
                    ? "active bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid="nav-host-event"
              >
                <i className="fas fa-calendar-plus w-5 h-5 md:w-4 md:h-4"></i>
                Host Event
              </Link>
              <Link 
                href="/earnings"
                onClick={isMobile ? handleMobileLinkClick : undefined}
                className={cn(
                  "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                  isActive("/earnings")
                    ? "active bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid="nav-earnings"
              >
                <i className="fas fa-chart-line w-5 h-5 md:w-4 md:h-4"></i>
                Earnings
              </Link>
            </div>
          </div>
        )}

        {/* Support Section */}
        <div className="mt-6 md:mt-8">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Support & Help
          </h3>
          <div className="mt-2 space-y-1">
            <Link 
              href="/help"
              onClick={isMobile ? handleMobileLinkClick : undefined}
              className={cn(
                "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                isActive("/help")
                  ? "active bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-help-center"
            >
              <i className="fas fa-question-circle w-5 h-5 md:w-4 md:h-4"></i>
              Help Center
            </Link>
            <Link 
              href="/help/wiki"
              onClick={isMobile ? handleMobileLinkClick : undefined}
              className={cn(
                "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                isActive("/help/wiki")
                  ? "active bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-ai-wiki"
            >
              <i className="fas fa-brain w-5 h-5 md:w-4 md:h-4"></i>
              AI Wiki
            </Link>
            <Link 
              href="/help/tutorials"
              onClick={isMobile ? handleMobileLinkClick : undefined}
              className={cn(
                "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                isActive("/help/tutorials")
                  ? "active bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-tutorials"
            >
              <i className="fas fa-play-circle w-5 h-5 md:w-4 md:h-4"></i>
              Tutorials
            </Link>
            <Link 
              href="/help/tickets"
              onClick={isMobile ? handleMobileLinkClick : undefined}
              className={cn(
                "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                isActive("/help/tickets")
                  ? "active bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-support-tickets"
            >
              <i className="fas fa-ticket-alt w-5 h-5 md:w-4 md:h-4"></i>
              Support Tickets
            </Link>
            <Link 
              href="/help/chat"
              onClick={isMobile ? handleMobileLinkClick : undefined}
              className={cn(
                "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                isActive("/help/chat")
                  ? "active bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-ai-chat"
            >
              <i className="fas fa-robot w-5 h-5 md:w-4 md:h-4"></i>
              AI Chat Support
            </Link>
            <Link 
              href="/blog"
              onClick={isMobile ? handleMobileLinkClick : undefined}
              className={cn(
                "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                isActive("/blog")
                  ? "active bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-blog"
            >
              <i className="fas fa-blog w-5 h-5 md:w-4 md:h-4"></i>
              Blog
            </Link>
            <Link 
              href="/contact"
              onClick={isMobile ? handleMobileLinkClick : undefined}
              className={cn(
                "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                isActive("/contact")
                  ? "active bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-contact"
            >
              <i className="fas fa-envelope w-5 h-5 md:w-4 md:h-4"></i>
              Contact
            </Link>
          </div>
        </div>

        {/* Admin Section */}
        {(user?.role === 'admin' || user?.role === 'moderator') && (
          <div className="mt-6 md:mt-8">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administration
            </h3>
            <div className="mt-2 space-y-1">
              {adminItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={isMobile ? handleMobileLinkClick : undefined}
                  className={cn(
                    "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                    isActive(item.path)
                      ? "active bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`${item.icon} w-5 h-5 md:w-4 md:h-4`}></i>
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Content Management Section */}
        {(user?.role === 'admin' || user?.role === 'moderator') && (
          <div className="mt-6 md:mt-8">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Content Management
            </h3>
            <div className="mt-2 space-y-1">
              {contentManagementItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={isMobile ? handleMobileLinkClick : undefined}
                  className={cn(
                    "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                    isActive(item.path)
                      ? "active bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`${item.icon} w-5 h-5 md:w-4 md:h-4`}></i>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Financial Management Section */}
        {user?.role === 'admin' && (
          <div className="mt-6 md:mt-8">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Financial Management
            </h3>
            <div className="mt-2 space-y-1">
              {financialManagementItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={isMobile ? handleMobileLinkClick : undefined}
                  className={cn(
                    "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                    isActive(item.path)
                      ? "active bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`${item.icon} w-5 h-5 md:w-4 md:h-4`}></i>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* System Management Section */}
        {user?.role === 'admin' && (
          <div className="mt-6 md:mt-8">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              System Management
            </h3>
            <div className="mt-2 space-y-1">
              {systemManagementItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={isMobile ? handleMobileLinkClick : undefined}
                  className={cn(
                    "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
                    isActive(item.path)
                      ? "active bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`${item.icon} w-5 h-5 md:w-4 md:h-4`}></i>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="mt-6 md:mt-8">
          <Link 
            href="/settings"
            onClick={isMobile ? handleMobileLinkClick : undefined}
            className={cn(
              "sidebar-link flex items-center gap-3 px-3 py-3 md:py-2 rounded-md text-sm font-medium transition-all touch-target min-h-[44px] md:min-h-[36px]",
              isActive("/settings")
                ? "active bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            data-testid="nav-settings"
          >
            <i className="fas fa-cog w-5 h-5 md:w-4 md:h-4"></i>
            Settings
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={user?.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"} 
            alt="User Avatar" 
            className="h-8 w-8 md:h-10 md:w-10 rounded-full ring-2 ring-primary/20"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{user?.username}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile sidebar using Sheet
  if (isMobile) {
    return (
      <>
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur border border-border"
          onClick={() => setMobileOpen(true)}
          data-testid="mobile-menu-trigger"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile sidebar sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-80 p-0 bg-card border-r retro-border smoky-bg">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r retro-border smoky-bg" data-testid="sidebar">
      {sidebarContent}
    </aside>
  );
}