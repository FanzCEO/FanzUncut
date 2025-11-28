import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { 
  PlayCircle, 
  Clock, 
  Users, 
  Star,
  BookOpen,
  CheckCircle,
  ArrowRight,
  Filter,
  ChevronDown,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AISearchInterface } from '@/components/help/AISearchInterface';

interface Tutorial {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  steps: number;
  completedSteps?: number;
  progress?: number; // percentage
  rating: number;
  enrollments: number;
  thumbnailUrl: string;
  instructor: {
    name: string;
    avatar: string;
  };
  tags: string[];
  isCompleted?: boolean;
  lastAccessed?: string;
  status: 'published' | 'draft';
}

interface TutorialCategory {
  name: string;
  slug: string;
  count: number;
  description: string;
  color: string;
}

export function TutorialsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating' | 'duration'>('popular');

  // Fetch tutorial categories
  const { data: categories } = useQuery<TutorialCategory[]>({
    queryKey: ['/api/help/tutorials/categories'],
    staleTime: 10 * 60 * 1000
  });

  // Fetch tutorials
  const { data: tutorialsData, isLoading } = useQuery<{
    tutorials: Tutorial[];
    totalCount: number;
    hasMore: boolean;
  }>({
    queryKey: ['/api/help/tutorials', { 
      search: searchQuery, 
      category: selectedCategory,
      difficulty: selectedDifficulty,
      sort: sortBy,
      page: 1,
      limit: 20
    }],
    staleTime: 5 * 60 * 1000
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900/20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-500/20 backdrop-blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-green-600 to-blue-500 p-3 rounded-full">
                <PlayCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Interactive Tutorials
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Step-by-step guided tutorials to master every feature of BoyFanz. Learn at your own pace.
            </p>

            {/* Search Interface */}
            <div className="max-w-3xl mx-auto">
              <AISearchInterface 
                onSearch={handleSearch}
                placeholder="Search tutorials..."
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
          
          {/* Sidebar - Filters */}
          <div className="lg:w-1/4">
            <div className="space-y-6 sticky top-6">
              {/* Categories */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
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
                    All Tutorials
                    <Badge variant="secondary" className="ml-auto">
                      {tutorialsData?.totalCount || 0}
                    </Badge>
                  </Button>
                  
                  {categories?.map((category) => (
                    <Button
                      key={category.slug}
                      variant={selectedCategory === category.slug ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.slug === selectedCategory ? '' : category.slug)}
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

              {/* Difficulty Filter */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Difficulty
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {['beginner', 'intermediate', 'advanced'].map((difficulty) => (
                    <Button
                      key={difficulty}
                      variant={selectedDifficulty === difficulty ? "default" : "outline"}
                      className="w-full justify-start capitalize"
                      onClick={() => setSelectedDifficulty(difficulty === selectedDifficulty ? '' : difficulty)}
                      data-testid={`filter-difficulty-${difficulty}`}
                    >
                      <Badge className={getDifficultyColor(difficulty) + ' mr-2'}>
                        {difficulty}
                      </Badge>
                      {difficulty}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:w-3/4">
            
            {/* Sort & View Options */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {selectedCategory ? 
                  categories?.find(c => c.slug === selectedCategory)?.name || 'Tutorials' :
                  'All Tutorials'
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
                    Recently Added
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('rating')} className="text-white">
                    Highest Rated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('duration')} className="text-white">
                    Shortest Duration
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tutorials Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                    <div className="h-48 bg-gray-700 rounded-t-lg"></div>
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
                {tutorialsData?.tutorials?.map((tutorial) => (
                  <Link key={tutorial.id} href={`/help/tutorials/${tutorial.slug}`}>
                    <Card className="group bg-gray-800/50 border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:scale-105 cursor-pointer h-full">
                      {/* Thumbnail */}
                      <div className="relative h-48 bg-gradient-to-r from-green-600 to-blue-600 rounded-t-lg overflow-hidden">
                        {tutorial.thumbnailUrl ? (
                          <img 
                            src={tutorial.thumbnailUrl} 
                            alt={tutorial.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <PlayCircle className="h-16 w-16 text-white/80" />
                          </div>
                        )}
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                            <Play className="h-8 w-8 text-white fill-current" />
                          </div>
                        </div>

                        {/* Duration Badge */}
                        <Badge className="absolute top-3 right-3 bg-black/60 text-white">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(tutorial.duration)}
                        </Badge>

                        {/* Completion Badge */}
                        {tutorial.isCompleted && (
                          <Badge className="absolute top-3 left-3 bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                      
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {tutorial.category}
                          </Badge>
                          <Badge className={getDifficultyColor(tutorial.difficulty)}>
                            {tutorial.difficulty}
                          </Badge>
                        </div>
                        
                        <CardTitle className="text-lg text-white line-clamp-2 group-hover:text-green-400 transition-colors">
                          {tutorial.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                          {tutorial.description}
                        </p>

                        {/* Progress Bar (if started) */}
                        {tutorial.progress !== undefined && tutorial.progress > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                              <span>Progress</span>
                              <span>{Math.round(tutorial.progress)}%</span>
                            </div>
                            <Progress value={tutorial.progress} className="h-2" />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {tutorial.enrollments}
                            </div>
                            <div className="flex items-center">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {tutorial.steps} steps
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 fill-current text-yellow-400 mr-1" />
                            {tutorial.rating.toFixed(1)}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <img 
                              src={tutorial.instructor.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face"}
                              alt={tutorial.instructor.name}
                              className="h-6 w-6 rounded-full mr-2"
                            />
                            <span className="text-xs text-gray-400">{tutorial.instructor.name}</span>
                          </div>
                          
                          <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Load More */}
            {tutorialsData?.hasMore && (
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  data-testid="button-load-more"
                >
                  Load More Tutorials
                </Button>
              </div>
            )}

            {/* No Results */}
            {tutorialsData?.tutorials?.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <PlayCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No tutorials found
                </h3>
                <p className="text-gray-400">
                  {searchQuery || selectedCategory || selectedDifficulty ? 
                    'Try adjusting your search or filters.' :
                    'Check back soon for new tutorials.'
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