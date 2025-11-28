import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  Book, 
  PlayCircle, 
  MessageCircle,
  Filter,
  SortAsc,
  Clock,
  TrendingUp,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface SearchResult {
  id: string;
  type: 'article' | 'tutorial' | 'faq';
  title: string;
  excerpt: string;
  content: string;
  url: string;
  relevanceScore: number;
  tags: string[];
  category?: string;
  metadata: {
    views?: number;
    rating?: number;
    difficulty?: string;
    duration?: number;
  };
}

interface SearchResponse {
  success: boolean;
  data: {
    results: SearchResult[];
    totalCount: number;
    suggestions: string[];
    facets: {
      categories: Array<{ name: string; count: number }>;
      types: Array<{ name: string; count: number }>;
      tags: Array<{ name: string; count: number }>;
    };
  };
  meta: {
    query: string;
    totalResults: number;
    hasMore: boolean;
  };
}

interface AISearchInterfaceProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  showFilters?: boolean;
  showResults?: boolean;
  compact?: boolean;
  className?: string;
}

export function AISearchInterface({
  onSearch,
  placeholder = "Search help content...",
  showSuggestions = true,
  showFilters = false,
  showResults = true,
  compact = false,
  className
}: AISearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Search suggestions query
  const { data: searchSuggestions } = useQuery<string[]>({
    queryKey: ['/api/help/search/suggestions'],
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: showSuggestions
  });

  // Search mutation
  const searchMutation = useMutation<SearchResponse, Error, {
    query: string;
    type: string;
    category?: string;
  }>({
    mutationFn: async (searchParams) => {
      const params = new URLSearchParams({
        q: searchParams.query,
        type: searchParams.type,
        ...(searchParams.category && { category: searchParams.category })
      });
      
      return apiRequest<SearchResponse>(`/api/help/search?${params}`);
    },
    onMutate: () => {
      setIsSearching(true);
    },
    onSuccess: (response) => {
      if (response.success) {
        setSearchResults(response.data.results);
        setSuggestions(response.data.suggestions);
      }
      setIsSearching(false);
    },
    onError: () => {
      setIsSearching(false);
    }
  });

  // Natural language query mutation
  const nlQueryMutation = useMutation<{
    success: boolean;
    data: {
      answer: string;
      confidence: number;
      suggestedActions: Array<{ title: string; url: string }>;
      relatedContent: SearchResult[];
    };
  }, Error, string>({
    mutationFn: async (nlQuery: string) => {
      return apiRequest<{
        success: boolean;
        data: {
          answer: string;
          confidence: number;
          suggestedActions: Array<{ title: string; url: string }>;
          relatedContent: SearchResult[];
        };
      }>('/api/help/ask', {
        method: 'POST',
        body: { query: nlQuery }
      });
    }
  });

  const handleSearch = async () => {
    if (!query.trim()) return;

    // Track search analytics
    queryClient.invalidateQueries({ queryKey: ['/api/help/analytics'] });

    // Determine if this is a natural language query or keyword search
    const isNaturalLanguage = query.includes('?') || 
                             query.toLowerCase().includes('how') ||
                             query.toLowerCase().includes('what') ||
                             query.toLowerCase().includes('why') ||
                             query.toLowerCase().includes('when') ||
                             query.toLowerCase().includes('where');

    if (isNaturalLanguage) {
      nlQueryMutation.mutate(query);
    } else {
      searchMutation.mutate({
        query,
        type: selectedType,
        category: selectedCategory
      });
    }

    if (onSearch) {
      onSearch(query);
    }

    setShowSuggestionsDropdown(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestionsDropdown(false);
    // Auto-search when clicking suggestion
    setTimeout(() => {
      searchMutation.mutate({
        query: suggestion,
        type: selectedType,
        category: selectedCategory
      });
    }, 100);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return Book;
      case 'tutorial': return PlayCircle;
      case 'faq': return MessageCircle;
      default: return Search;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'article': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'tutorial': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'faq': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className={cn(
          "relative flex items-center",
          compact ? "gap-2" : "gap-4"
        )}>
          {/* Main Search Input */}
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Sparkles className="h-5 w-5" />
            </div>
            
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.length > 2 && showSuggestions) {
                  setShowSuggestionsDropdown(true);
                }
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                if (query.length > 2 && showSuggestions) {
                  setShowSuggestionsDropdown(true);
                }
              }}
              className={cn(
                "pl-12 pr-4 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-400",
                compact ? "h-10" : "h-14 text-lg"
              )}
              data-testid="input-help-search"
            />

            {/* Search Suggestions Dropdown */}
            {showSuggestionsDropdown && showSuggestions && (
              <Card className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-800 border-gray-700 max-h-80 overflow-y-auto">
                <CardContent className="p-0">
                  {/* Popular Searches */}
                  {searchSuggestions && (
                    <div className="p-4">
                      <div className="text-sm text-gray-400 mb-2 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Popular Searches
                      </div>
                      <div className="space-y-1">
                        {(searchSuggestions || []).slice(0, 5).map((suggestion: string, index: number) => (
                          <button
                            key={index}
                            className="w-full text-left px-2 py-1 text-white hover:bg-gray-700 rounded text-sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Suggestions based on current query */}
                  {suggestions.length > 0 && (
                    <>
                      <Separator className="border-gray-700" />
                      <div className="p-4">
                        <div className="text-sm text-gray-400 mb-2 flex items-center">
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI Suggestions
                        </div>
                        <div className="space-y-1">
                          {suggestions.slice(0, 3).map((suggestion, index) => (
                            <button
                              key={index}
                              className="w-full text-left px-2 py-1 text-white hover:bg-gray-700 rounded text-sm"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Search Filters */}
          {showFilters && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={compact ? "sm" : "default"} className="border-white/20 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                <DropdownMenuItem onClick={() => setSelectedType('all')}>
                  All Content
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType('articles')}>
                  Articles Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType('tutorials')}>
                  Tutorials Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedType('faq')}>
                  FAQ Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Search Button */}
          <Button 
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            size={compact ? "sm" : "default"}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="button-search"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {!compact && <span className="ml-2">Search</span>}
          </Button>
        </div>
      </div>

      {/* Natural Language Response */}
      {nlQueryMutation.data?.success && (
        <Card className="mt-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="bg-purple-500/20 p-2 rounded-lg mr-4">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">AI Assistant Response</h3>
                <p className="text-gray-300 mb-4">{nlQueryMutation.data.data.answer}</p>
                
                {nlQueryMutation.data.data.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {nlQueryMutation.data.data.suggestedActions.map((action: { title: string; url: string }, index: number) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm"
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        onClick={() => window.open(action.url, '_self')}
                      >
                        {action.title}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  Confidence: {Math.round(nlQueryMutation.data.data.confidence * 100)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Search Results ({searchResults.length})
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSearchResults([])}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4">
            {searchResults.map((result, index) => {
              const TypeIcon = getTypeIcon(result.type);
              return (
                <Card 
                  key={index} 
                  className="bg-gray-800/50 border-gray-700 hover:border-red-500/50 transition-all cursor-pointer"
                  onClick={() => window.open(result.url, '_self')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getTypeColor(result.type)}>
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {result.type}
                          </Badge>
                          {result.metadata.rating && (
                            <div className="flex items-center text-yellow-400 text-sm">
                              ★ {result.metadata.rating}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Score: {Math.round(result.relevanceScore)}%
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-white mb-2 line-clamp-2">
                          {result.title}
                        </h4>
                        
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                          {result.excerpt}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {result.metadata.views && (
                            <span>{result.metadata.views} views</span>
                          )}
                          {result.metadata.duration && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {result.metadata.duration} min
                            </span>
                          )}
                          {result.category && (
                            <span>in {result.category}</span>
                          )}
                        </div>
                      </div>
                      
                      <ArrowRight className="h-5 w-5 text-gray-500 ml-4" />
                    </div>
                    
                    {result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {result.tags.slice(0, 3).map((tag, tagIndex) => (
                          <Badge 
                            key={tagIndex} 
                            variant="secondary" 
                            className="text-xs bg-gray-700 text-gray-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}