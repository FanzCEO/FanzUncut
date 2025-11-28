import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { 
  Search, 
  Book, 
  Star, 
  Users, 
  Clock, 
  Filter,
  ArrowRight,
  ChevronDown,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { AISearchInterface } from '@/components/help/AISearchInterface';

interface WikiArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
  views: number;
  rating: number;
  helpful: number;
  notHelpful: number;
  lastUpdated: string;
  author: {
    name: string;
    role: string;
  };
  metadata: {
    readTime: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
}

interface WikiCategory {
  name: string;
  slug: string;
  count: number;
  description: string;
}

export function WikiPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');

  // Fetch wiki categories
  const { data: categories } = useQuery<WikiCategory[]>({
    queryKey: ['/api/help/wiki/categories'],
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Fetch wiki articles
  const { data: articlesData, isLoading } = useQuery<{
    articles: WikiArticle[];
    totalCount: number;
    hasMore: boolean;
  }>({
    queryKey: ['/api/help/wiki', { 
      search: searchQuery, 
      category: selectedCategory,
      sort: sortBy,
      page: 1,
      limit: 20
    }],
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryFilter = (categorySlug: string) => {
    setSelectedCategory(categorySlug === selectedCategory ? '' : categorySlug);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900/20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-500/20 backdrop-blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-500 p-3 rounded-full">
                <Book className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Knowledge Base & Wiki
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Comprehensive guides, tutorials, and documentation to help you master BoyFanz.
            </p>

            {/* Search Interface */}
            <div className="max-w-3xl mx-auto">
              <AISearchInterface 
                onSearch={handleSearch}
                placeholder="Search knowledge base..."
                showSuggestions={true}
                compact={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Categories & Filters */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar - Categories */}
          <div className="lg:w-1/4">
            <Card className="bg-gray-800/50 border-gray-700 sticky top-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={selectedCategory === '' ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('')}
                  data-testid="filter-all-categories"
                >
                  All Articles
                  <Badge variant="secondary" className="ml-auto">
                    {articlesData?.totalCount || 0}
                  </Badge>
                </Button>
                
                {categories?.map((category) => (
                  <Button
                    key={category.slug}
                    variant={selectedCategory === category.slug ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleCategoryFilter(category.slug)}
                    data-testid={`filter-category-${category.slug}`}
                  >
                    {category.name}
                    <Badge variant="secondary" className="ml-auto">
                      {category.count}
                    </Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:w-3/4">
            
            {/* Sort & View Options */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {selectedCategory ? 
                  categories?.find(c => c.slug === selectedCategory)?.name || 'Articles' :
                  'All Articles'
                }
                {searchQuery && (
                  <span className="text-lg font-normal text-gray-400 ml-2">
                    for "{searchQuery}"
                  </span>
                )}
              </h2>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-gray-800 border-gray-700 text-white">
                    Sort by {sortBy} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem onClick={() => setSortBy('popular')} className="text-white">
                    Most Popular
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('recent')} className="text-white">
                    Recently Updated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('rating')} className="text-white">
                    Highest Rated
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Articles Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-700 rounded"></div>
                        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articlesData?.articles?.map((article) => (
                  <Link key={article.id} href={`/help/wiki/${article.slug}`}>
                    <Card className="group bg-gray-800/50 border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {article.category}
                          </Badge>
                          <Badge className={getDifficultyColor(article.metadata.difficulty)}>
                            {article.metadata.difficulty}
                          </Badge>
                        </div>
                        
                        <CardTitle className="text-lg text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {article.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                          {article.excerpt}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center">
                              <Eye className="h-3 w-3 mr-1" />
                              {article.views} views
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {article.metadata.readTime} min
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 fill-current text-yellow-400 mr-1" />
                            {article.rating.toFixed(1)}
                          </div>
                        </div>
                        
                        <Separator className="bg-gray-700 mb-4" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-500">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {article.helpful}
                            <ThumbsDown className="h-3 w-3 ml-2 mr-1" />
                            {article.notHelpful}
                          </div>
                          
                          <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Load More / Pagination */}
            {articlesData?.hasMore && (
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  data-testid="button-load-more"
                >
                  Load More Articles
                </Button>
              </div>
            )}

            {/* No Results */}
            {articlesData?.articles?.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Book className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No articles found
                </h3>
                <p className="text-gray-400">
                  {searchQuery || selectedCategory ? 
                    'Try adjusting your search or filters.' :
                    'Check back soon for new content.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}