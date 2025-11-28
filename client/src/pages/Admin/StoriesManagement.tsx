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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Clock, Users, Search, Filter, MoreHorizontal, AlertTriangle, Download, 
  Upload, CheckCircle, XCircle, Eye, EyeOff, Calendar, Activity, Star, 
  Trash2, Edit, Flag, Play, Pause, StopCircle, Settings, Shield,
  TrendingUp, BarChart3, PieChart, DollarSign, MessageSquare,
  RefreshCw, Zap, Timer, Archive, FileImage, Heart, Share,
  Sparkles, Globe, Lock, RotateCcw, AlarmClock, Hourglass,
  Layers, TrendingDown, Award, Target, Database, Gauge
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

export default function StoriesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [expirationFilter, setExpirationFilter] = useState('all');
  const [engagementFilter, setEngagementFilter] = useState('all');
  const [promotionFilter, setPromotionFilter] = useState('all');
  const [moderationFilter, setModerationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  
  // Pagination and Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk Operations
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Dialogs and Modals
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [showBulkOperationDialog, setShowBulkOperationDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showExpirationDialog, setShowExpirationDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [bulkOperation, setBulkOperation] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');

  // Real-time updates
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch stories with comprehensive filtering
  const { data: storiesData, isLoading, error, refetch } = useQuery({
    queryKey: [
      '/api/admin/stories', 
      {
        searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        creatorId: creatorFilter !== 'all' ? creatorFilter : undefined,
        expiration: expirationFilter !== 'all' ? expirationFilter : undefined,
        engagement: engagementFilter !== 'all' ? engagementFilter : undefined,
        promotion: promotionFilter !== 'all' ? promotionFilter : undefined,
        moderation: moderationFilter !== 'all' ? moderationFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        dateRange: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder
      }
    ],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
    refetchInterval: autoRefresh ? 60000 : false // Refresh every minute for expiration updates
  });

  // Fetch real-time analytics
  const { data: storiesStats } = useQuery({
    queryKey: ['/api/admin/stories/stats'],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Fetch trending stories analytics
  const { data: trendingStats } = useQuery({
    queryKey: ['/api/admin/stories/trending'],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
    refetchInterval: autoRefresh ? 60000 : false
  });

  // Fetch creators for filter
  const { data: creators } = useQuery({
    queryKey: ['/api/admin/creators'],
    enabled: user?.role === 'admin' || user?.role === 'moderator'
  });

  const stories = storiesData?.stories || [];
  const totalStories = storiesData?.total || 0;
  const totalPages = Math.ceil(totalStories / pageSize);
  
  // Mutations
  const moderateStoryMutation = useMutation({
    mutationFn: (data: { storyId: string; action: string; reason?: string; notes?: string }) => 
      apiRequest('/api/admin/stories/moderate', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Story moderated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
      setShowModerationDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to moderate story", variant: "destructive" });
    }
  });

  const bulkOperationMutation = useMutation({
    mutationFn: (data: { storyIds: string[]; operation: string; data?: any }) => 
      apiRequest('/api/admin/stories/bulk', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Bulk operation completed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
      setSelectedStories([]);
      setShowBulkOperationDialog(false);
    },
    onError: () => {
      toast({ title: "Bulk operation failed", variant: "destructive" });
    }
  });

  const updateStoryMutation = useMutation({
    mutationFn: (data: { storyId: string; updates: any }) => 
      apiRequest(`/api/admin/stories/${data.storyId}`, {
        method: 'PATCH',
        body: JSON.stringify(data.updates)
      }),
    onSuccess: () => {
      toast({ title: "Story updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
      setShowStoryDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to update story", variant: "destructive" });
    }
  });

  const extendExpirationMutation = useMutation({
    mutationFn: (data: { storyId: string; hours: number }) => 
      apiRequest('/api/admin/stories/extend', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Story expiration extended successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
    },
    onError: () => {
      toast({ title: "Failed to extend story expiration", variant: "destructive" });
    }
  });

  const archiveStoryMutation = useMutation({
    mutationFn: (storyId: string) => 
      apiRequest(`/api/admin/stories/${storyId}/archive`, {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({ title: "Story archived successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
    },
    onError: () => {
      toast({ title: "Failed to archive story", variant: "destructive" });
    }
  });

  const deleteStoryMutation = useMutation({
    mutationFn: (storyId: string) => 
      apiRequest(`/api/admin/stories/${storyId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({ title: "Story deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
    },
    onError: () => {
      toast({ title: "Failed to delete story", variant: "destructive" });
    }
  });

  // Helper functions
  const getStatusBadge = (story: any) => {
    const now = new Date();
    const expiresAt = new Date(story.expiresAt);
    
    if (isAfter(now, expiresAt)) {
      return <Badge className="bg-gray-500 text-white"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    
    if (story.status === 'active') {
      const timeLeft = expiresAt.getTime() - now.getTime();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      
      if (hoursLeft < 1) {
        return <Badge className="bg-red-500 text-white animate-pulse"><AlarmClock className="w-3 h-3 mr-1" />Expiring Soon</Badge>;
      } else if (hoursLeft < 6) {
        return <Badge className="bg-orange-500 text-white"><Hourglass className="w-3 h-3 mr-1" />Active ({hoursLeft}h left)</Badge>;
      } else {
        return <Badge className="bg-green-500 text-white"><Sparkles className="w-3 h-3 mr-1" />Active</Badge>;
      }
    }
    
    if (story.status === 'archived') {
      return <Badge className="bg-blue-500 text-white"><Archive className="w-3 h-3 mr-1" />Archived</Badge>;
    }
    
    return <Badge variant="outline">Unknown</Badge>;
  };

  const getPromotionBadge = (story: any) => {
    if (story.isPromoted) {
      return <Badge className="bg-yellow-500 text-white"><Star className="w-3 h-3 mr-1" />Promoted</Badge>;
    }
    if (story.isFeatured) {
      return <Badge className="bg-purple-500 text-white"><Award className="w-3 h-3 mr-1" />Featured</Badge>;
    }
    return null;
  };

  const getModerationStatus = (story: any) => {
    if (story.moderationStatus === 'approved') {
      return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    }
    if (story.moderationStatus === 'rejected') {
      return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    }
    if (story.moderationStatus === 'flagged') {
      return <Badge className="bg-orange-500 text-white"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>;
    }
    return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const getEngagementLevel = (story: any) => {
    const totalEngagement = (story.viewsCount || 0) + (story.likesCount || 0) + (story.repliesCount || 0);
    
    if (totalEngagement > 1000) {
      return <Badge className="bg-green-500 text-white">High Engagement</Badge>;
    } else if (totalEngagement > 100) {
      return <Badge className="bg-yellow-500 text-white">Medium Engagement</Badge>;
    } else if (totalEngagement > 10) {
      return <Badge className="bg-blue-500 text-white">Low Engagement</Badge>;
    } else {
      return <Badge className="bg-gray-500 text-white">No Engagement</Badge>;
    }
  };

  const formatTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    
    if (isAfter(now, expires)) {
      return "Expired";
    }
    
    return formatDistanceToNow(expires, { addSuffix: true });
  };

  const handleStorySelect = (storyId: string, checked: boolean) => {
    if (checked) {
      setSelectedStories([...selectedStories, storyId]);
    } else {
      setSelectedStories(selectedStories.filter(id => id !== storyId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStories(stories.map((s: any) => s.id));
    } else {
      setSelectedStories([]);
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
      storyIds: selectedStories,
      operation: bulkOperation,
      data
    });
  };

  const filteredStories = useMemo(() => {
    if (!searchQuery) return stories;
    
    return stories.filter((story: any) => 
      story.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.creator?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stories, searchQuery]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
      }, 60000); // Refresh every minute for expiration updates
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  if (user?.role !== 'admin' && user?.role !== 'moderator') {
    return (
      <div className="space-y-6" data-testid="access-denied">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Access denied. Admin or moderator privileges required to manage stories.
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
            Failed to load stories. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="stories-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">Stories Management</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Ephemeral content moderation, analytics, and expiration management
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              data-testid="auto-refresh-toggle"
            />
            <span className="text-sm text-muted-foreground">Auto-refresh</span>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setShowAnalyticsDialog(true)}>
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowExpirationDialog(true)}>
            <Timer className="h-4 w-4" />
            Expiration Manager
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Stories</p>
                <p className="text-xl font-bold text-green-500" data-testid="active-stories">
                  {storiesStats?.activeStories || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlarmClock className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
                <p className="text-xl font-bold text-red-500" data-testid="expiring-stories">
                  {storiesStats?.expiringSoon || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Views</p>
                <p className="text-xl font-bold text-blue-500" data-testid="total-views">
                  {storiesStats?.totalViews?.toLocaleString() || 0}
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
                <p className="text-xl font-bold text-yellow-500" data-testid="pending-stories">
                  {storiesStats?.pendingReview || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Star className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Promoted</p>
                <p className="text-xl font-bold text-purple-500" data-testid="promoted-stories">
                  {storiesStats?.promotedStories || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Engagement</p>
                <p className="text-xl font-bold text-orange-500" data-testid="avg-engagement">
                  {storiesStats?.avgEngagement || '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Archive className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Archived</p>
                <p className="text-xl font-bold text-cyan-500" data-testid="archived-stories">
                  {storiesStats?.archivedStories || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-xl font-bold text-pink-500" data-testid="stories-today">
                  {storiesStats?.storiesToday || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filtering & Story Management */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stories Content Management & Analytics</CardTitle>
              <CardDescription>
                Manage ephemeral content with expiration tracking, engagement analytics, and bulk operations
              </CardDescription>
            </div>
            {selectedStories.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedStories.length} selected</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkOperation('approve')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Stories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('reject')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Stories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('promote')}>
                      <Star className="h-4 w-4 mr-2" />
                      Promote Stories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('extend')}>
                      <Timer className="h-4 w-4 mr-2" />
                      Extend Expiration
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('archive')}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Stories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('delete')}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Stories
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
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="story-search-input"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
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

            <Select value={engagementFilter} onValueChange={setEngagementFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Engagement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engagement</SelectItem>
                <SelectItem value="high">High Engagement</SelectItem>
                <SelectItem value="medium">Medium Engagement</SelectItem>
                <SelectItem value="low">Low Engagement</SelectItem>
                <SelectItem value="none">No Engagement</SelectItem>
              </SelectContent>
            </Select>

            <Select value={promotionFilter} onValueChange={setPromotionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Promotion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stories</SelectItem>
                <SelectItem value="promoted">Promoted</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>

            <Select value={expirationFilter} onValueChange={setExpirationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Expiration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Times</SelectItem>
                <SelectItem value="1h">Less than 1 Hour</SelectItem>
                <SelectItem value="6h">Less than 6 Hours</SelectItem>
                <SelectItem value="12h">Less than 12 Hours</SelectItem>
                <SelectItem value="24h">Less than 24 Hours</SelectItem>
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
              </SelectContent>
            </Select>
          </div>

          {/* Stories Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedStories.length === stories.length && stories.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Story Content</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Status & Expiration</TableHead>
                  <TableHead>Moderation</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Performance</TableHead>
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
                ) : filteredStories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No stories found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStories.map((story: any) => (
                    <TableRow key={story.id} data-testid={`story-row-${story.id}`}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedStories.includes(story.id)}
                          onCheckedChange={(checked) => handleStorySelect(story.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                            {story.mediaUrl ? (
                              <img 
                                src={story.mediaUrl} 
                                alt="Story"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <FileImage className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            {story.type === 'video' && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="h-4 w-4 text-white bg-black/50 rounded-full p-1" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-muted-foreground truncate">
                              {story.content?.substring(0, 80)}...
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {story.type}
                              </Badge>
                              {story.location && (
                                <Badge variant="outline" className="text-xs">
                                  {story.location}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created {format(new Date(story.createdAt), "MMM d, h:mm a")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img 
                            src={story.creator?.profileImageUrl || '/default-avatar.png'} 
                            alt={story.creator?.username}
                            className="h-8 w-8 rounded-full ring-2 ring-primary/20"
                          />
                          <div>
                            <p className="font-medium text-sm">{story.creator?.username}</p>
                            <p className="text-xs text-muted-foreground">{story.creator?.role}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(story)}
                          <div className="text-xs text-muted-foreground">
                            Expires {formatTimeLeft(story.expiresAt)}
                          </div>
                          {story.expiresAt && (
                            <div className="w-full bg-muted rounded-full h-1">
                              <div 
                                className={cn(
                                  "h-1 rounded-full transition-all",
                                  isAfter(new Date(), new Date(story.expiresAt)) 
                                    ? "bg-gray-500" 
                                    : "bg-gradient-to-r from-green-500 to-red-500"
                                )}
                                style={{ 
                                  width: `${Math.max(0, Math.min(100, 
                                    ((new Date(story.expiresAt).getTime() - new Date().getTime()) / 
                                    (24 * 60 * 60 * 1000)) * 100
                                  ))}%` 
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getModerationStatus(story)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getEngagementLevel(story)}
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {story.viewsCount?.toLocaleString() || 0}
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {story.likesCount || 0}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {story.repliesCount || 0}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getPromotionBadge(story)}
                          {story.impressions && (
                            <div className="text-xs text-muted-foreground">
                              {story.impressions.toLocaleString()} impressions
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {story.engagementRate && (
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span className="text-xs">{story.engagementRate}%</span>
                            </div>
                          )}
                          {story.completionRate && (
                            <div className="flex items-center gap-1">
                              <Gauge className="h-3 w-3" />
                              <span className="text-xs">{story.completionRate}%</span>
                            </div>
                          )}
                          {story.shareCount && (
                            <div className="flex items-center gap-1">
                              <Share className="h-3 w-3" />
                              <span className="text-xs">{story.shareCount}</span>
                            </div>
                          )}
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
                              setSelectedStory(story);
                              setShowStoryDialog(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedStory(story);
                              setShowModerationDialog(true);
                            }}>
                              <Flag className="h-4 w-4 mr-2" />
                              Moderate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              extendExpirationMutation.mutate({
                                storyId: story.id,
                                hours: 24
                              });
                            }}>
                              <Timer className="h-4 w-4 mr-2" />
                              Extend 24h
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => archiveStoryMutation.mutate(story.id)}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive Story
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Star className="h-4 w-4 mr-2" />
                              Toggle Promotion
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteStoryMutation.mutate(story.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Story
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
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalStories)} of {totalStories} stories
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

      {/* Story Moderation Dialog */}
      <Dialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderate Story</DialogTitle>
            <DialogDescription>
              Apply moderation actions to this story. All actions are logged for audit purposes.
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
                  <SelectItem value="approve">Approve Story</SelectItem>
                  <SelectItem value="reject">Reject Story</SelectItem>
                  <SelectItem value="flag">Flag for Review</SelectItem>
                  <SelectItem value="promote">Promote Story</SelectItem>
                  <SelectItem value="archive">Archive Story</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Reason & Notes</label>
              <Textarea
                placeholder="Provide detailed reasoning for this moderation action..."
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
              moderateStoryMutation.mutate({
                storyId: selectedStory?.id,
                action: moderationReason,
                notes: moderationNotes
              });
            }}>
              Apply Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Operation Dialog */}
      <Dialog open={showBulkOperationDialog} onOpenChange={setShowBulkOperationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Story Operation</DialogTitle>
            <DialogDescription>
              Apply {bulkOperation} to {selectedStories.length} selected stories.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bulkOperation === 'moderate' && (
              <>
                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <Textarea
                    placeholder="Reason for bulk moderation..."
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
            {bulkOperation === 'extend' && (
              <Alert>
                <Timer className="h-4 w-4" />
                <AlertDescription>
                  This will extend the expiration time for all selected stories by 24 hours.
                </AlertDescription>
              </Alert>
            )}
            {bulkOperation === 'delete' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This will permanently delete all selected stories and cannot be undone.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkOperationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeBulkOperation}
              variant={bulkOperation === 'delete' ? 'destructive' : 'default'}
            >
              Execute {bulkOperation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}