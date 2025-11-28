import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, DollarSign, Users, Eye, Clock, Upload, CreditCard, FileText, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { formatRelativeTime } from "@/lib/dateUtils";

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: recentMedia, isLoading: mediaLoading } = useQuery({
    queryKey: ['/api/media'],
    select: (data) => Array.isArray(data) ? data.slice(0, 3) : [], // Get only first 3 items
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications'],
    select: (data) => Array.isArray(data) ? data.slice(0, 4) : [], // Get only first 4 items
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-accent text-accent-foreground';
      case 'pending': return 'bg-yellow-500 text-yellow-50';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getNotificationIcon = (kind: string) => {
    switch (kind) {
      case 'payout': return 'fas fa-dollar-sign';
      case 'moderation': return 'fas fa-check';
      case 'kyc': return 'fas fa-shield-alt';
      case 'fan_activity': return 'fas fa-user-plus';
      default: return 'fas fa-info-circle';
    }
  };

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold" data-testid="total-revenue">
                  ${statsLoading ? "..." : ((stats as any)?.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="text-primary h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUp className="text-accent h-4 w-4 mr-1" />
              <span className="text-accent">+12.5%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Fans</p>
                <p className="text-2xl font-bold" data-testid="active-fans">
                  {statsLoading ? "..." : ((stats as any)?.activeFans || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Users className="text-secondary h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUp className="text-accent h-4 w-4 mr-1" />
              <span className="text-accent">+8.2%</span>
              <span className="text-muted-foreground ml-1">new this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Content Views</p>
                <p className="text-2xl font-bold" data-testid="content-views">
                  {statsLoading ? "..." : `${Math.floor(((stats as any)?.contentViews || 0) / 1000)}K`}
                </p>
              </div>
              <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Eye className="text-accent h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUp className="text-accent h-4 w-4 mr-1" />
              <span className="text-accent">+23.1%</span>
              <span className="text-muted-foreground ml-1">engagement up</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold text-yellow-500" data-testid="pending-reviews">
                  {statsLoading ? "..." : (stats as any)?.pendingReviews || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="text-yellow-500 h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">Awaiting moderation</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Media Uploads */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Uploads</CardTitle>
              <Link href="/media">
                <a className="text-primary hover:text-primary/80 text-sm font-medium" data-testid="view-all-media">
                  View All
                </a>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {mediaLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="h-16 w-16 bg-muted rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentMedia?.map((media: any) => (
                  <div key={media.id} className="flex items-center gap-4" data-testid={`media-item-${media.id}`}>
                    <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                      <i className="fas fa-image text-muted-foreground"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`media-title-${media.id}`}>
                        {media.title}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`media-date-${media.id}`}>
                        {formatRelativeTime(media.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(media.status)} data-testid={`media-status-${media.id}`}>
                        {media.status}
                      </Badge>
                      <Button variant="ghost" size="sm" data-testid={`media-options-${media.id}`}>
                        <i className="fas fa-ellipsis-h"></i>
                      </Button>
                    </div>
                  </div>
                ))}
                {(!recentMedia || recentMedia.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No media uploads yet
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle>Activity Feed</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {notificationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="h-8 w-8 bg-muted rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {notifications?.map((notification: any) => (
                  <div key={notification.id} className="flex items-start gap-3" data-testid={`notification-${notification.id}`}>
                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className={`${getNotificationIcon(notification.kind)} text-primary text-sm`}></i>
                    </div>
                    <div>
                      <p className="text-sm" data-testid={`notification-message-${notification.id}`}>
                        {notification.payloadJson?.message || 'Notification'}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`notification-time-${notification.id}`}>
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/media">
              <Button className="glow-effect w-full justify-start gap-3 h-auto p-4" data-testid="upload-content-button">
                <Upload className="h-5 w-5" />
                <span>Upload Content</span>
              </Button>
            </Link>
            
            <Link href="/payouts">
              <Button variant="secondary" className="w-full justify-start gap-3 h-auto p-4" data-testid="request-payout-button">
                <CreditCard className="h-5 w-5" />
                <span>Request Payout</span>
              </Button>
            </Link>
            
            <Link href="/compliance">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto p-4" data-testid="view-compliance-button">
                <FileText className="h-5 w-5" />
                <span>View Compliance</span>
              </Button>
            </Link>
            
            <Link href="/settings">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto p-4" data-testid="settings-button">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
