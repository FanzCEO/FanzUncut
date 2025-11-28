import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bell,
  RotateCcw,
  ChevronDown,
  Home,
  Edit,
  MessageCircle,
  Wallet,
  Users,
  Film,
  Award,
  Settings,
  Shield,
  Lock,
  MapPin,
  Eye,
  DollarSign,
  CreditCard,
  Banknote,
  Menu,
  X
} from "lucide-react";
import { Link } from 'wouter';
import { useState } from 'react';

interface Notification {
  id: string;
  userId: string;
  kind: 'payout' | 'moderation' | 'kyc' | 'system' | 'fan_activity';
  payloadJson: {
    message?: string;
    username?: string;
    action?: string;
  };
  readAt?: string;
  createdAt: string;
}

// Mock notification data based on the screenshots
const mockNotifications = [
  {
    id: '1',
    type: 'subscription',
    username: 'max4496',
    action: 'has subscribed to your content',
    time: '8 minutes ago',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face',
    readAt: undefined
  },
  {
    id: '2',
    type: 'subscription',
    username: 'david1942',
    action: 'has subscribed to your content',
    time: 'yesterday',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-19T10:00:00Z'
  },
  {
    id: '3',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post Needing to take care of business',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: undefined
  },
  {
    id: '4',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post Random pics and videos',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  },
  {
    id: '5',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post Jerk off during work',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  },
  {
    id: '6',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post With @DFWCowboyTopXL Episode 1 of many',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  },
  {
    id: '7',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post Get you some!',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  },
  {
    id: '8',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post Just sitting here working from the couch with my d...',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  },
  {
    id: '9',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post Just some fun. @Damienwinters is on one of these',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  },
  {
    id: '10',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post Need some help with this',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  },
  {
    id: '11',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post My twink days',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  },
  {
    id: '12',
    type: 'like',
    username: 'nicholas1808',
    action: 'like you post FANZ in florida @Damienwinters',
    time: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    readAt: '2024-09-17T14:30:00Z'
  }
];

const sidebarSections = [
  {
    title: "ACCOUNT",
    items: [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
      { icon: Eye, label: "My page", href: "/creator/me" },
      { icon: Edit, label: "Edit my page", href: "/creator/me/edit" },
      { icon: MessageCircle, label: "Conversations", href: "/messages" },
      { icon: Wallet, label: "Wallet", href: "/wallet" },
      { icon: Users, label: "Referrals", href: "/referrals" },
      { icon: Film, label: "My stories", href: "/stories" },
      { icon: Award, label: "Verified account!", href: "/verify", highlight: true }
    ]
  },
  {
    title: "LIVE STREAMING PRIVATE",
    items: [
      { icon: Settings, label: "Settings", href: "/streaming/settings" },
      { icon: MessageCircle, label: "Requests received", href: "/streaming/requests" },
      { icon: MessageCircle, label: "Requests sent", href: "/streaming/sent" }
    ]
  },
  {
    title: "SUBSCRIPTION",
    items: [
      { icon: DollarSign, label: "Subscription price", href: "/subscriptions/price" },
      { icon: Users, label: "My subscribers", href: "/subscriptions/subscribers" },
      { icon: Users, label: "My subscriptions", href: "/subscriptions/mine" }
    ]
  },
  {
    title: "PRIVACY AND SECURITY",
    items: [
      { icon: Shield, label: "Privacy and Security", href: "/settings/privacy" },
      { icon: Lock, label: "Password", href: "/settings/password" },
      { icon: MapPin, label: "Block Countries", href: "/settings/countries" },
      { icon: Eye, label: "Restricted users", href: "/settings/restricted" }
    ]
  },
  {
    title: "PAYMENTS",
    items: [
      { icon: CreditCard, label: "Payments", href: "/payments" },
      { icon: DollarSign, label: "Payments received", href: "/payments/received" },
      { icon: Banknote, label: "Payout method", href: "/payouts" },
      { icon: DollarSign, label: "Withdrawals", href: "/withdrawals" }
    ]
  }
];

export default function Notifications() {
  const [filter, setFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  // Utility function to format timestamps
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 86400 * 7) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return 'over a week ago';
  };

  // Function to normalize notification type for filtering
  const getNotificationType = (notification: any) => {
    if (notification.kind) {
      // API notification
      if (notification.kind === 'fan_activity') {
        const message = notification.payloadJson?.message || '';
        if (message.includes('subscribed')) return 'subscription';
        if (message.includes('like')) return 'like';
        if (message.includes('comment')) return 'comment';
      }
      return notification.kind;
    }
    // Mock notification
    return notification.type;
  };

  // Use real API data
  const { data: apiNotifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  // Refresh notifications
  const handleRefresh = () => {
    refetch();
  };

  // Transform API notifications to match UI format or use mock data as fallback
  const allNotifications = apiNotifications.length > 0 ? 
    apiNotifications.map(notification => ({
      id: notification.id,
      type: getNotificationType(notification),
      username: notification.payloadJson?.username || 'User',
      action: notification.payloadJson?.action || notification.payloadJson?.message || 'performed an action',
      time: formatTimeAgo(notification.createdAt),
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face&${notification.id}`,
      readAt: notification.readAt
    })) : mockNotifications;

  // Filter notifications based on selected filter
  const filteredNotifications = filter === "all" ? allNotifications : 
    allNotifications.filter(notification => {
      const notificationType = getNotificationType(notification);
      switch (filter) {
        case 'subscription':
        case 'subscriptions':
          return notificationType === 'subscription' || (notificationType === 'fan_activity' && notification.action.includes('subscribed'));
        case 'like':
        case 'likes':
          return notificationType === 'like' || (notificationType === 'fan_activity' && notification.action.includes('like'));
        case 'comments':
          return notificationType === 'comment' || (notificationType === 'fan_activity' && notification.action.includes('comment'));
        default:
          return true;
      }
    });

  return (
    <div className="flex min-h-screen bg-background text-foreground" data-testid="notifications-page">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 w-72 bg-card border-r border-border p-6 overflow-y-auto transform transition-transform duration-200 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {sidebarSections.map((section, sectionIdx) => (
          <div key={section.title} className={`${sectionIdx > 0 ? 'mt-8' : ''}`}>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={item.href}>
                    <div className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      <span className={`${item.highlight ? 'text-primary font-medium' : 'text-foreground'}`}>
                        {item.label}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-menu-button"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold" data-testid="page-title">
                  Notifications
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  data-testid="refresh-button"
                >
                  <RotateCcw className={`h-5 w-5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-muted-foreground text-sm" data-testid="page-description">
                New subscribers, likes and new comments
              </p>
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="p-1">
                <Settings className="h-4 w-4" />
              </Button>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-24 h-8 text-sm" data-testid="filter-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="subscriptions">Subscriptions</SelectItem>
                  <SelectItem value="likes">Likes</SelectItem>
                  <SelectItem value="comments">Comments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 border-b border-border/40 animate-pulse">
                  <div className="h-12 w-12 bg-muted rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded mb-2 w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notifications List */}
          {!isLoading && (
            <>
              {filteredNotifications.length === 0 ? (
                <Card className="text-center py-16">
                  <CardContent>
                    <Bell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                    <p className="text-muted-foreground">
                      {filter === "all" 
                        ? "You don't have any notifications yet."
                        : `No ${filter} notifications found.`
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-0">
                  {filteredNotifications.map((notification, index) => (
                    <div 
                      key={notification.id}
                      className={`flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors border-b border-border/40 last:border-b-0 ${!notification.readAt ? 'bg-primary/5' : ''}`}
                      data-testid={`notification-${notification.id}`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={notification.avatar} 
                            alt={notification.username}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {notification.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Verified Badge */}
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                          <Award className="h-3 w-3 text-white" />
                        </div>
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground" data-testid={`notification-message-${notification.id}`}>
                          <span className="font-medium">{notification.username}</span>{' '}
                          <span className="text-muted-foreground">{notification.action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`notification-time-${notification.id}`}>
                          {notification.time}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.readAt && (
                        <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Load More */}
              {filteredNotifications.length > 0 && filteredNotifications.length >= 10 && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline" className="px-8" disabled>
                    Load More (Coming Soon)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
