import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { 
  Calendar, 
  User, 
  Clock,
  Search,
  Filter,
  BookOpen,
  TrendingUp,
  Star
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  category: string;
  tags: string[];
  publishedAt: string;
  readTime: number;
  author: {
    name: string;
    avatar?: string;
    role: string;
  };
  viewsCount: number;
  likesCount: number;
  isFeatured: boolean;
}

const BlogPostCard = ({ post, featured = false }: { post: BlogPost; featured?: boolean }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card 
      className={`overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group ${
        featured ? 'md:col-span-2 lg:col-span-3' : ''
      }`}
      data-testid={`blog-post-${post.id}`}
    >
      <div className={`relative ${featured ? 'aspect-video md:aspect-[21/9]' : 'aspect-video'}`}>
        {post.featuredImage ? (
          <img 
            src={post.featuredImage} 
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-muted-foreground opacity-50" />
          </div>
        )}
        
        {post.isFeatured && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-primary text-primary-foreground">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}

        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="text-xs">
            {post.category}
          </Badge>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {post.author.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium" data-testid={`author-${post.id}`}>{post.author.name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{post.author.role}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              <span data-testid={`date-${post.id}`}>{formatDate(post.publishedAt)}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{post.readTime} min read</span>
            </div>
          </div>
        </div>

        <CardTitle className={`mb-3 line-clamp-2 group-hover:text-primary transition-colors ${
          featured ? 'text-2xl' : 'text-lg'
        }`} data-testid={`title-${post.id}`}>
          {post.title}
        </CardTitle>

        <CardDescription className={`mb-4 ${featured ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'}`} data-testid={`excerpt-${post.id}`}>
          {post.excerpt}
        </CardDescription>

        <div className="flex flex-wrap gap-1 mb-4">
          {post.tags.slice(0, 3).map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {post.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{post.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {post.viewsCount} views
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {post.likesCount} likes
            </span>
          </div>
          
          <Button variant="ghost" size="sm" className="text-xs" data-testid={`read-more-${post.id}`}>
            Read More →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Mock data for demo
  const mockPosts: BlogPost[] = [
    {
      id: '1',
      title: 'The Future of Creator Economy: Trends to Watch in 2024',
      excerpt: 'Explore the latest trends shaping the creator economy landscape, from AI-powered content creation to decentralized monetization models.',
      content: '',
      featuredImage: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=400&fit=crop',
      category: 'Industry',
      tags: ['Creator Economy', 'Trends', 'AI', 'Monetization'],
      publishedAt: '2024-03-15',
      readTime: 8,
      author: {
        name: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b04b?w=100&h=100&fit=crop&crop=face',
        role: 'Industry Analyst'
      },
      viewsCount: 1250,
      likesCount: 89,
      isFeatured: true
    },
    {
      id: '2',
      title: 'Building Authentic Connections: A Creator\'s Guide',
      excerpt: 'Learn how successful creators build genuine relationships with their audience and maintain engagement over time.',
      content: '',
      category: 'Creator Tips',
      tags: ['Engagement', 'Community', 'Growth'],
      publishedAt: '2024-03-12',
      readTime: 6,
      author: {
        name: 'Alex Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        role: 'Content Strategist'
      },
      viewsCount: 890,
      likesCount: 67,
      isFeatured: false
    },
    {
      id: '3',
      title: 'Platform Updates: New Features for Enhanced Creator Experience',
      excerpt: 'Discover the latest platform updates designed to help creators monetize their content more effectively.',
      content: '',
      category: 'Platform News',
      tags: ['Updates', 'Features', 'Monetization'],
      publishedAt: '2024-03-10',
      readTime: 4,
      author: {
        name: 'BoyFanz Team',
        role: 'Platform Team'
      },
      viewsCount: 2100,
      likesCount: 156,
      isFeatured: false
    }
  ];

  const { data: posts = mockPosts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog/posts', { search: searchQuery, category: selectedCategory }],
    initialData: mockPosts
  });

  const categories = ['All', 'Industry', 'Creator Tips', 'Platform News', 'Tutorials', 'Success Stories'];
  
  const featuredPosts = posts.filter(post => post.isFeatured);
  const regularPosts = posts.filter(post => !post.isFeatured);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-6 w-full bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
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
    <div className="container mx-auto px-4 py-8" data-testid="blog-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Creator Hub Blog
          </h1>
          <p className="text-muted-foreground">
            Insights, tips, and updates from the creator economy
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Search blog posts..."
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
                data-testid={`category-${category.toLowerCase().replace(' ', '-')}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {posts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No blog posts found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or check back later for new content
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Featured Posts */}
            {featuredPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Star className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Featured Posts</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredPosts.map((post) => (
                    <BlogPostCard key={post.id} post={post} featured={true} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Posts */}
            {regularPosts.length > 0 && (
              <div>
                {featuredPosts.length > 0 && (
                  <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Latest Posts</h2>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularPosts.map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Newsletter Signup */}
        <Card className="mt-12 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Stay Updated</h3>
            <p className="text-muted-foreground mb-6">
              Get the latest creator economy insights delivered to your inbox
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1"
                data-testid="newsletter-email"
              />
              <Button data-testid="newsletter-subscribe">
                Subscribe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}