import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { 
  ShoppingBag,
  Star,
  Eye,
  Clock,
  Download
} from 'lucide-react';

interface PurchasedItem {
  id: string;
  postId: string;
  creatorId: string;
  pricePaid: number;
  purchasedAt: string;
  post: {
    title: string;
    type: string;
    thumbnailUrl?: string;
    mediaUrls: string[];
  };
  creator: {
    username: string;
    profileImageUrl?: string;
    isVerified: boolean;
  };
}

export default function Purchased() {
  const { user } = useAuth();

  const { data: purchases = [], isLoading } = useQuery<PurchasedItem[]>({
    queryKey: ['/api/purchases'],
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-96" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardHeader>
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" data-testid="purchased-page">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShoppingBag className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">
            Purchased Content
          </h1>
          <p className="text-muted-foreground">
            Content you've purchased from creators
          </p>
        </div>
      </div>

      {purchases.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="space-y-4">
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't purchased any content yet. Explore creators and discover premium content.
                </p>
                <Link href="/search">
                  <Button data-testid="explore-creators-button">
                    Explore Creators
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="overflow-hidden hover:shadow-lg transition-all duration-200" data-testid={`purchase-${purchase.id}`}>
              <Link href={`/post/${purchase.postId}`}>
                <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-accent/10 cursor-pointer group">
                  {purchase.post.thumbnailUrl ? (
                    <img 
                      src={purchase.post.thumbnailUrl} 
                      alt={purchase.post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Eye className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-black/60 text-white">
                      {formatCurrency(purchase.pricePaid)}
                    </Badge>
                  </div>
                </div>
              </Link>

              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <Link href={`/creator/${purchase.creatorId}`}>
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarImage src={purchase.creator.profileImageUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {purchase.creator.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/creator/${purchase.creatorId}`}>
                      <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                        <span className="text-sm font-medium truncate">
                          {purchase.creator.username}
                        </span>
                        {purchase.creator.isVerified && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </div>
                </div>

                <CardTitle className="text-base leading-tight line-clamp-2" data-testid={`purchase-title-${purchase.id}`}>
                  {purchase.post.title}
                </CardTitle>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(purchase.purchasedAt)}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {purchase.post.type}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Link href={`/post/${purchase.postId}`}>
                    <Button size="sm" className="flex-1" data-testid={`view-content-${purchase.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Content
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" data-testid={`download-${purchase.id}`}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}