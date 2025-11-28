import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { 
  Star,
  Crown,
  Calendar,
  DollarSign,
  Users,
  TrendingUp
} from 'lucide-react';

interface Subscription {
  id: string;
  creatorId: string;
  tier: string;
  pricePerMonth: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'cancelled' | 'expired';
  autoRenew: boolean;
  creator: {
    username: string;
    profileImageUrl?: string;
    isVerified: boolean;
    followerCount: number;
  };
}

export default function Subscriptions() {
  const { user } = useAuth();

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions'],
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-96" />
          </div>
          
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const inactiveSubscriptions = subscriptions.filter(sub => sub.status !== 'active');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" data-testid="subscriptions-page">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Star className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">
            My Subscriptions
          </h1>
          <p className="text-muted-foreground">
            Manage your creator subscriptions and access premium content
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold" data-testid="active-count">
                  {activeSubscriptions.length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Spend</p>
                <p className="text-2xl font-bold" data-testid="monthly-spend">
                  {formatCurrency(activeSubscriptions.reduce((sum, sub) => sum + sub.pricePerMonth, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Creators</p>
                <p className="text-2xl font-bold" data-testid="total-creators">
                  {subscriptions.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {subscriptions.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="space-y-4">
              <Star className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No subscriptions yet</h3>
                <p className="text-muted-foreground mb-6">
                  Subscribe to your favorite creators to get exclusive content and perks.
                </p>
                <Link href="/search">
                  <Button data-testid="find-creators-button">
                    Find Creators to Subscribe
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Active Subscriptions
              </h2>
              <div className="space-y-4">
                {activeSubscriptions.map((subscription) => (
                  <Card key={subscription.id} className="hover:shadow-lg transition-all duration-200" data-testid={`subscription-${subscription.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Link href={`/creator/${subscription.creatorId}`}>
                            <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-primary/20">
                              <AvatarImage src={subscription.creator.profileImageUrl} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {subscription.creator.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          
                          <div className="flex-1">
                            <Link href={`/creator/${subscription.creatorId}`}>
                              <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                                <h3 className="font-semibold" data-testid={`creator-name-${subscription.id}`}>
                                  {subscription.creator.username}
                                </h3>
                                {subscription.creator.isVerified && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    ✓
                                  </Badge>
                                )}
                              </div>
                            </Link>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{subscription.tier} Tier</span>
                              <span>•</span>
                              <span>{subscription.creator.followerCount.toLocaleString()} followers</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatCurrency(subscription.pricePerMonth)}
                            <span className="text-sm text-muted-foreground font-normal">/month</span>
                          </div>
                          <Badge variant="outline" className={getStatusColor(subscription.status)}>
                            {subscription.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Started {formatDate(subscription.startDate)}</span>
                          </div>
                          {subscription.autoRenew && (
                            <Badge variant="outline" className="text-xs">
                              Auto-renew
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Link href={`/creator/${subscription.creatorId}`}>
                            <Button variant="outline" size="sm" data-testid={`view-creator-${subscription.id}`}>
                              View Creator
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" data-testid={`manage-${subscription.id}`}>
                            Manage
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Subscriptions */}
          {inactiveSubscriptions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
                Past Subscriptions
              </h2>
              <div className="space-y-4">
                {inactiveSubscriptions.map((subscription) => (
                  <Card key={subscription.id} className="opacity-75" data-testid={`past-subscription-${subscription.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={subscription.creator.profileImageUrl} />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              {subscription.creator.username[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <h3 className="font-medium">{subscription.creator.username}</h3>
                            <p className="text-sm text-muted-foreground">{subscription.tier} Tier</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant="outline" className={getStatusColor(subscription.status)}>
                            {subscription.status}
                          </Badge>
                          {subscription.endDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Ended {formatDate(subscription.endDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}