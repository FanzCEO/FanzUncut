import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Users, 
  Star, 
  Filter,
  Shield,
  Heart,
  TrendingUp
} from 'lucide-react';
import { Link } from 'wouter';

interface Creator {
  userId: string;
  monthlyPriceCents: number;
  isVerified: boolean;
  verificationBadge: string;
  categories: string[];
  totalSubscribers: number;
  isOnline: boolean;
  user?: {
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

const CreatorCard = ({ creator }: { creator: Creator }) => {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group" data-testid={`creator-card-${creator.userId}`}>
      <div className="relative">
        <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 p-6 flex items-center justify-center">
          <Avatar className="h-24 w-24 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
            <AvatarImage src={creator.user?.profileImageUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {creator.user?.username?.[0]?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {creator.isOnline && (
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
              • Online
            </Badge>
          </div>
        )}

        {creator.verificationBadge !== 'none' && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              {creator.verificationBadge === 'featured' ? 'Featured' : 'Verified'}
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-lg" data-testid={`creator-name-${creator.userId}`}>
            {creator.user?.username || 'Creator'}
            {creator.isVerified && (
              <Shield className="h-4 w-4 text-primary" />
            )}
          </CardTitle>
          
          <CardDescription className="mt-1">
            {creator.user?.firstName && creator.user?.lastName && 
              `${creator.user.firstName} ${creator.user.lastName}`
            }
          </CardDescription>
        </div>

        <div className="flex flex-wrap justify-center gap-1 mt-3">
          {creator.categories.slice(0, 2).map((category, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {category}
            </Badge>
          ))}
          {creator.categories.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{creator.categories.length - 2}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span data-testid={`subscriber-count-${creator.userId}`}>{creator.totalSubscribers}</span>
          </div>
          <div className="font-semibold text-primary" data-testid={`monthly-price-${creator.userId}`}>
            {formatCurrency(creator.monthlyPriceCents)}/mo
          </div>
        </div>

        <div className="space-y-2">
          <Link href={`/creator/${creator.userId}`}>
            <Button className="w-full" data-testid={`view-profile-${creator.userId}`}>
              View Profile
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="w-full" data-testid={`follow-${creator.userId}`}>
            <Heart className="h-4 w-4 mr-2" />
            Follow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function SearchCreators() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: creators = [], isLoading } = useQuery<Creator[]>({
    queryKey: ['/api/creators', { search: searchQuery, category: selectedCategory }],
  });

  const categories = [
    'All', 'Gaming', 'Fitness', 'Music', 'Art', 'Cooking', 
    'Fashion', 'Tech', 'Travel', 'Lifestyle', 'Education'
  ];

  const featuredCreators = creators.filter(c => c.verificationBadge === 'featured');
  const verifiedCreators = creators.filter(c => c.isVerified && c.verificationBadge !== 'featured');
  const regularCreators = creators.filter(c => !c.isVerified && c.verificationBadge === 'none');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardHeader>
                  <div className="h-4 w-32 bg-muted rounded mx-auto" />
                  <div className="h-3 w-24 bg-muted rounded mx-auto" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-8 bg-muted rounded" />
                    <div className="h-6 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" data-testid="search-creators">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Discover Creators
          </h1>
          <p className="text-muted-foreground">
            Find and follow amazing creators across all categories
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Search creators by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === (category === 'All' ? '' : category) ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category === 'All' ? '' : category)}
                data-testid={`category-${category.toLowerCase()}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {creators.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No creators found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or browse all categories
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Featured Creators */}
            {featuredCreators.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Featured Creators</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {featuredCreators.map((creator) => (
                    <CreatorCard key={creator.userId} creator={creator} />
                  ))}
                </div>
              </div>
            )}

            {/* Trending Creators */}
            {verifiedCreators.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Trending Creators</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {verifiedCreators.map((creator) => (
                    <CreatorCard key={creator.userId} creator={creator} />
                  ))}
                </div>
              </div>
            )}

            {/* All Creators */}
            {regularCreators.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">More Creators</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {regularCreators.map((creator) => (
                    <CreatorCard key={creator.userId} creator={creator} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}