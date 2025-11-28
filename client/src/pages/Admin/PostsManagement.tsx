import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FileText, Image, Video, Music, Users, Search, Filter, MoreHorizontal, 
  AlertTriangle, Download, Upload, CheckCircle, XCircle, Eye, EyeOff,
  Calendar, Activity, Star, Trash2, Edit, Flag, Play, Pause,
  TrendingUp, BarChart3, PieChart, Clock, DollarSign, MessageSquare,
  RefreshCw, Settings, Filter as FilterIcon, SortAsc, SortDesc
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

export default function PostsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [moderationFilter, setModerationFilter] = useState('all');
  const [revenueFilter, setRevenueFilter] = useState('all');
  
  // Pagination and Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk Operations
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Dialogs
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [showBulkOperationDialog, setShowBulkOperationDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [bulkOperation, setBulkOperation] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');

  // Fetch posts with comprehensive filtering
  const { data: postsData, isLoading, error, refetch } = useQuery({
    queryKey: [
      '/api/admin/posts', 
      {
        searchQuery,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        visibility: visibilityFilter !== 'all' ? visibilityFilter : undefined,
        creatorId: creatorFilter !== 'all' ? creatorFilter : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        dateRange: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
        moderationStatus: moderationFilter !== 'all' ? moderationFilter : undefined,
        revenueRange: revenueFilter !== 'all' ? revenueFilter : undefined,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder
      }
    ],
    enabled: user?.role === 'admin' || user?.role === 'moderator'
  });

  // Fetch analytics stats
  const { data: postsStats } = useQuery({
    queryKey: ['/api/admin/posts/stats'],
    enabled: user?.role === 'admin' || user?.role === 'moderator'
  });

  // Fetch creators for filter
  const { data: creators } = useQuery({
    queryKey: ['/api/admin/creators'],
    enabled: user?.role === 'admin' || user?.role === 'moderator'
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['/api/admin/categories'],
    enabled: user?.role === 'admin' || user?.role === 'moderator'
  });

  const posts = postsData?.posts || [];
  const totalPosts = postsData?.total || 0;
  const totalPages = Math.ceil(totalPosts / pageSize);
  
  // Mutations
  const moderatePostMutation = useMutation({
    mutationFn: (data: { postId: string; action: string; reason?: string; notes?: string }) => 
      apiRequest('/api/admin/posts/moderate', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Post moderated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
      setShowModerationDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to moderate post", variant: "destructive" });
    }
  });

  const bulkOperationMutation = useMutation({
    mutationFn: (data: { postIds: string[]; operation: string; data?: any }) => 
      apiRequest('/api/admin/posts/bulk', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Bulk operation completed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
      setSelectedPosts([]);
      setShowBulkOperationDialog(false);
    },
    onError: () => {
      toast({ title: "Bulk operation failed", variant: "destructive" });
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: (data: { postId: string; updates: any }) => 
      apiRequest(`/api/admin/posts/${data.postId}`, {
        method: 'PATCH',
        body: JSON.stringify(data.updates)
      }),
    onSuccess: () => {
      toast({ title: "Post updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
      setShowPostDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to update post", variant: "destructive" });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => 
      apiRequest(`/api/admin/posts/${postId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({ title: "Post deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
    },
    onError: () => {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  });

  // Helper functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'reel': return <Play className="w-4 h-4" />;
      case 'story': return <Clock className="w-4 h-4" />;
      case 'live': return <Activity className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'photo': return 'bg-blue-500 text-white';
      case 'video': return 'bg-purple-500 text-white';
      case 'audio': return 'bg-green-500 text-white';
      case 'text': return 'bg-gray-500 text-white';
      case 'reel': return 'bg-orange-500 text-white';
      case 'story': return 'bg-pink-500 text-white';
      case 'live': return 'bg-red-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'free': return <Badge className="bg-green-500 text-white">Free</Badge>;
      case 'premium': return <Badge className="bg-yellow-500 text-white">Premium</Badge>;
      case 'subscribers_only': return <Badge className="bg-purple-500 text-white">Subscribers</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getModerationStatus = (post: any) => {
    if (post.moderationStatus === 'approved') {
      return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    }
    if (post.moderationStatus === 'rejected') {
      return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    }
    if (post.moderationStatus === 'flagged') {
      return <Badge className="bg-orange-500 text-white"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>;
    }
    return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const handlePostSelect = (postId: string, checked: boolean) => {
    if (checked) {
      setSelectedPosts([...selectedPosts, postId]);
    } else {
      setSelectedPosts(selectedPosts.filter(id => id !== postId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPosts(posts.map((p: any) => p.id));
    } else {
      setSelectedPosts([]);
    }
  };

  const handleBulkOperation = (operation: string) => {
    setBulkOperation(operation);
    setShowBulkOperationDialog(true);
  };

  const executeBulkOperation = () => {
    let data: any = {};
    
    if (bulkOperation === 'moderate') {
      data.reason = moderationReason;
      data.notes = moderationNotes;
    }
    
    bulkOperationMutation.mutate({
      postIds: selectedPosts,
      operation: bulkOperation,
      data
    });
  };

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    
    return posts.filter((post: any) => 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.creator?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.hashtags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [posts, searchQuery]);

  if (user?.role !== 'admin' && user?.role !== 'moderator') {
    return (
      <div className="space-y-6" data-testid="access-denied">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Access denied. Admin or moderator privileges required to manage posts.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Failed to load posts. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="posts-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">Posts Management</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Comprehensive content moderation and analytics dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowAnalyticsDialog(true)}>
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Posts
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Posts</p>
                <p className="text-xl font-bold" data-testid="total-posts">
                  {postsStats?.totalPosts || totalPosts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Review</p>
                <p className="text-xl font-bold text-yellow-500" data-testid="pending-posts">
                  {postsStats?.pendingPosts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-xl font-bold text-green-500" data-testid="approved-posts">
                  {postsStats?.approvedPosts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rejected</p>
                <p className="text-xl font-bold text-red-500" data-testid="rejected-posts">
                  {postsStats?.rejectedPosts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Flag className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Flagged</p>
                <p className="text-xl font-bold text-orange-500" data-testid="flagged-posts">
                  {postsStats?.flaggedPosts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Views</p>
                <p className="text-xl font-bold text-blue-500" data-testid="total-views">
                  {postsStats?.totalViews?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold text-purple-500" data-testid="total-revenue">
                  ${(postsStats?.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-xl font-bold text-cyan-500" data-testid="posts-today">
                  {postsStats?.postsToday || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Advanced Content Filtering & Moderation</CardTitle>
              <CardDescription>
                Use multiple filters to efficiently moderate and analyze content
              </CardDescription>
            </div>
            {selectedPosts.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedPosts.length} selected</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkOperation('approve')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('reject')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('flag')}>
                      <Flag className="h-4 w-4 mr-2" />
                      Flag Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('feature')}>
                      <Star className="h-4 w-4 mr-2" />
                      Feature Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('delete')}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('export')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="post-search-input"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-testid="type-filter">
                <SelectValue placeholder="Post Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger data-testid="visibility-filter">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="subscribers_only">Subscribers Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={moderationFilter} onValueChange={setModerationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Moderation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>

            <Select value={creatorFilter} onValueChange={setCreatorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Creator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {creators?.map((creator: any) => (
                  <SelectItem key={creator.id} value={creator.id}>
                    {creator.username || creator.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((category: any) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>

            <Select value={revenueFilter} onValueChange={setRevenueFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Revenue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Revenue</SelectItem>
                <SelectItem value="free">Free Only</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
                <SelectItem value="high">High Revenue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Posts Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedPosts.length === posts.length && posts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Type & Visibility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-muted rounded animate-pulse" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post: any) => (
                    <TableRow key={post.id} data-testid={`post-row-${post.id}`}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedPosts.includes(post.id)}
                          onCheckedChange={(checked) => handlePostSelect(post.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {post.thumbnailUrl ? (
                              <img 
                                src={post.thumbnailUrl} 
                                alt={post.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                {getTypeIcon(post.type)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate" data-testid={`post-title-${post.id}`}>
                              {post.title || "Untitled"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {post.content?.substring(0, 60)}...
                            </p>
                            {post.hashtags?.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {post.hashtags.slice(0, 2).map((tag: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                                {post.hashtags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{post.hashtags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img 
                            src={post.creator?.profileImageUrl || '/default-avatar.png'} 
                            alt={post.creator?.username}
                            className="h-8 w-8 rounded-full ring-2 ring-primary/20"
                          />
                          <div>
                            <p className="font-medium text-sm">{post.creator?.username}</p>
                            <p className="text-xs text-muted-foreground">{post.creator?.role}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={cn("text-xs", getTypeColor(post.type))}>
                            {getTypeIcon(post.type)}
                            <span className="ml-1 capitalize">{post.type}</span>
                          </Badge>
                          {getVisibilityBadge(post.visibility)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getModerationStatus(post)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.viewsCount?.toLocaleString() || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {post.commentsCount || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          ${((post.priceCents || 0) / 100).toFixed(2)}
                        </div>
                        {post.totalEarnings && (
                          <div className="text-xs text-muted-foreground">
                            Earned: ${(post.totalEarnings / 100).toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(post.createdAt), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(post.createdAt), "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPost(post);
                              setShowPostDialog(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedPost(post);
                              setShowModerationDialog(true);
                            }}>
                              <Flag className="h-4 w-4 mr-2" />
                              Moderate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Post
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deletePostMutation.mutate(post.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalPosts)} of {totalPosts} posts
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moderation Dialog */}
      <Dialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderate Post</DialogTitle>
            <DialogDescription>
              Review and moderate this post. Your decision will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Action</label>
              <Select value={moderationReason} onValueChange={setModerationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select moderation action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve Post</SelectItem>
                  <SelectItem value="reject">Reject Post</SelectItem>
                  <SelectItem value="flag">Flag for Review</SelectItem>
                  <SelectItem value="feature">Feature Post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Add moderation notes..."
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModerationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              moderatePostMutation.mutate({
                postId: selectedPost?.id,
                action: moderationReason,
                notes: moderationNotes
              });
            }}>
              Apply Moderation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Operation Dialog */}
      <Dialog open={showBulkOperationDialog} onOpenChange={setShowBulkOperationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Operation</DialogTitle>
            <DialogDescription>
              Apply {bulkOperation} to {selectedPosts.length} selected posts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bulkOperation === 'moderate' && (
              <>
                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <Textarea
                    placeholder="Reason for moderation..."
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={moderationNotes}
                    onChange={(e) => setModerationNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkOperationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={executeBulkOperation}>
              Execute {bulkOperation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}