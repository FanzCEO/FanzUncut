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
  MessageSquare, Search, Filter, MoreHorizontal, Shield, AlertTriangle, 
  Download, Eye, EyeOff, CheckCircle, XCircle, Flag, Trash2, Edit,
  Calendar, Activity, Star, TrendingUp, TrendingDown, Heart, 
  BarChart3, PieChart, Users, Clock, Ban, Check
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  userId: string;
  postId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
    role: string;
  };
  post: {
    id: string;
    title: string;
    type: string;
    creatorId: string;
  };
  moderation?: {
    id: string;
    status: string;
    reason?: string;
    moderatorId?: string;
    sentimentScore?: number;
    toxicityScore: number;
    spamScore: number;
    aiConfidence: number;
    autoModerated: boolean;
    reviewRequired: boolean;
  };
}

interface CommentAnalytics {
  totalComments: number;
  flaggedComments: number;
  approvedComments: number;
  rejectedComments: number;
  averageSentiment: number;
  toxicityRate: number;
  spamRate: number;
}

export default function CommentsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [postIdFilter, setPostIdFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [toxicityFilter, setToxicityFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  
  // Pagination and Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk Operations
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Dialogs
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [showBulkModerationDialog, setShowBulkModerationDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  
  // Moderation form
  const [moderationStatus, setModerationStatus] = useState('approved');
  const [moderationReason, setModerationReason] = useState('');
  const [bulkModerationAction, setBulkModerationAction] = useState('approve');
  const [bulkModerationReason, setBulkModerationReason] = useState('');

  // Analytics date range
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [analyticsDateTo, setAnalyticsDateTo] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Fetch comments with filtering
  const { data: commentsData, isLoading, error, refetch } = useQuery<Comment[]>({
    queryKey: [
      '/api/admin/comments', 
      {
        searchQuery,
        postId: postIdFilter || undefined,
        userId: userIdFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sentimentScore: sentimentFilter !== 'all' ? sentimentFilter : undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy,
        sortOrder
      }
    ],
    enabled: user?.role === 'admin'
  });

  // Fetch comment analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<CommentAnalytics>({
    queryKey: ['/api/admin/comments/analytics', { dateFrom: analyticsDateFrom, dateTo: analyticsDateTo }],
    enabled: user?.role === 'admin' && showAnalyticsDialog
  });

  const comments: Comment[] = commentsData || [];
  const totalComments = comments.length;
  const totalPages = Math.ceil(totalComments / pageSize);
  
  // Mutations
  const moderateCommentMutation = useMutation({
    mutationFn: (data: { 
      commentId: string; 
      status: string; 
      reason?: string;
      sentimentScore?: number;
      toxicityScore?: number;
      spamScore?: number;
    }) => 
      apiRequest('POST', `/api/admin/comments/${data.commentId}/moderate`, data),
    onSuccess: () => {
      toast({ title: "Comment moderated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/comments'] });
      setShowModerationDialog(false);
      setSelectedComment(null);
    },
    onError: () => {
      toast({ title: "Failed to moderate comment", variant: "destructive" });
    }
  });

  const bulkModerationMutation = useMutation({
    mutationFn: (data: { commentIds: string[]; action: string; reason?: string }) => 
      apiRequest('POST', '/api/admin/comments/bulk-moderate', data),
    onSuccess: () => {
      toast({ title: "Bulk moderation completed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/comments'] });
      setSelectedComments([]);
      setShowBulkModerationDialog(false);
    },
    onError: () => {
      toast({ title: "Bulk moderation failed", variant: "destructive" });
    }
  });

  // Helper functions
  const getSentimentBadge = (score?: number) => {
    if (score === undefined) return <Badge variant="secondary">Unknown</Badge>;
    if (score >= 0.7) return <Badge className="bg-green-500">Positive</Badge>;
    if (score >= 0.3) return <Badge className="bg-yellow-500">Neutral</Badge>;
    return <Badge className="bg-red-500">Negative</Badge>;
  };

  const getToxicityBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-red-600">High Risk</Badge>;
    if (score >= 0.5) return <Badge className="bg-orange-500">Medium Risk</Badge>;
    if (score >= 0.2) return <Badge className="bg-yellow-500">Low Risk</Badge>;
    return <Badge className="bg-green-500">Safe</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'flagged':
        return <Badge className="bg-orange-500"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>;
      case 'hidden':
        return <Badge className="bg-gray-500"><EyeOff className="w-3 h-3 mr-1" />Hidden</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedComments(comments.map((comment: Comment) => comment.id));
    } else {
      setSelectedComments([]);
    }
  };

  const handleSelectComment = (commentId: string, checked: boolean) => {
    if (checked) {
      setSelectedComments(prev => [...prev, commentId]);
    } else {
      setSelectedComments(prev => prev.filter(id => id !== commentId));
    }
  };

  const handleModerationSubmit = () => {
    if (!selectedComment) return;
    
    moderateCommentMutation.mutate({
      commentId: selectedComment.id,
      status: moderationStatus,
      reason: moderationReason,
      sentimentScore: selectedComment.moderation?.sentimentScore,
      toxicityScore: selectedComment.moderation?.toxicityScore || 0,
      spamScore: selectedComment.moderation?.spamScore || 0
    });
  };

  const handleBulkModeration = () => {
    if (selectedComments.length === 0) return;
    
    bulkModerationMutation.mutate({
      commentIds: selectedComments,
      action: bulkModerationAction,
      reason: bulkModerationReason
    });
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setPostIdFilter('');
    setUserIdFilter('');
    setStatusFilter('all');
    setSentimentFilter('all');
    setToxicityFilter('all');
    setDateRangeFilter('all');
    setCurrentPage(1);
  };

  // Get analytics summary
  const getAnalyticsSummary = () => {
    if (!analytics) return null;
    
    const data = analytics as CommentAnalytics;
    return {
      totalComments: data.totalComments || 0,
      moderationRate: data.totalComments > 0 ? ((data.flaggedComments || 0) / data.totalComments * 100).toFixed(1) : '0',
      approvalRate: data.totalComments > 0 ? ((data.approvedComments || 0) / data.totalComments * 100).toFixed(1) : '0',
      averageSentiment: data.averageSentiment?.toFixed(2) || '0.00',
      toxicityRate: (data.toxicityRate * 100).toFixed(1) || '0',
      spamRate: (data.spamRate * 100).toFixed(1) || '0'
    };
  };

  if (!user || user.role !== 'admin') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this page.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load comments. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" data-testid="comments-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Comments Management</h1>
          <p className="text-muted-foreground">
            Monitor and moderate user comments with advanced filtering and sentiment analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAnalyticsDialog(true)}
            data-testid="button-analytics"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          {selectedComments.length > 0 && (
            <Button 
              onClick={() => setShowBulkModerationDialog(true)}
              data-testid="button-bulk-moderate"
            >
              <Shield className="w-4 h-4 mr-2" />
              Bulk Moderate ({selectedComments.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Comments</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Post ID</label>
              <Input
                placeholder="Filter by post..."
                value={postIdFilter}
                onChange={(e) => setPostIdFilter(e.target.value)}
                data-testid="input-post-filter"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Filter by user..."
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                data-testid="input-user-filter"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sentiment</label>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger data-testid="select-sentiment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Toxicity Level</label>
              <Select value={toxicityFilter} onValueChange={setToxicityFilter}>
                <SelectTrigger data-testid="select-toxicity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="safe">Safe</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFilters} data-testid="button-reset-filters">
              Reset Filters
            </Button>
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments ({totalComments})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-32" data-testid="select-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedComments.length === comments.length && comments.length > 0}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Toxicity</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment: Comment) => (
                    <TableRow key={comment.id} data-testid={`row-comment-${comment.id}`}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedComments.includes(comment.id)}
                          onCheckedChange={(checked) => handleSelectComment(comment.id, !!checked)}
                          data-testid={`checkbox-comment-${comment.id}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={comment.content}>
                          {comment.content}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                            {comment.user.displayName?.[0] || comment.user.username[0]}
                          </div>
                          <div>
                            <div className="font-medium">{comment.user.displayName || comment.user.username}</div>
                            <div className="text-xs text-muted-foreground">{comment.user.role}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate max-w-32" title={comment.post.title}>
                            {comment.post.title}
                          </div>
                          <div className="text-xs text-muted-foreground">{comment.post.type}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(comment.moderation?.status)}
                      </TableCell>
                      <TableCell>
                        {getSentimentBadge(comment.moderation?.sentimentScore)}
                      </TableCell>
                      <TableCell>
                        {getToxicityBadge(comment.moderation?.toxicityScore || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Progress value={(comment.moderation?.aiConfidence || 0) * 100} className="w-16 h-2" />
                          <span className="text-xs">{((comment.moderation?.aiConfidence || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{format(new Date(comment.createdAt), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'HH:mm')}</div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${comment.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedComment(comment);
                                setShowCommentDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedComment(comment);
                                setModerationStatus(comment.moderation?.status || 'pending');
                                setModerationReason(comment.moderation?.reason || '');
                                setShowModerationDialog(true);
                              }}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Moderate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalComments)} of {totalComments} comments
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comment Details Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comment Details</DialogTitle>
            <DialogDescription>
              View detailed information about this comment
            </DialogDescription>
          </DialogHeader>
          {selectedComment && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Content</h4>
                <div className="p-3 bg-muted rounded-md">
                  {selectedComment.content}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">User Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Username:</strong> {selectedComment.user.username}</p>
                    <p><strong>Display Name:</strong> {selectedComment.user.displayName}</p>
                    <p><strong>Role:</strong> {selectedComment.user.role}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Post Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Title:</strong> {selectedComment.post.title}</p>
                    <p><strong>Type:</strong> {selectedComment.post.type}</p>
                    <p><strong>Post ID:</strong> {selectedComment.post.id}</p>
                  </div>
                </div>
              </div>

              {selectedComment.moderation && (
                <div>
                  <h4 className="font-semibold mb-2">AI Analysis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Sentiment Score:</strong> {selectedComment.moderation.sentimentScore?.toFixed(2) || 'N/A'}</p>
                      <p><strong>Toxicity Score:</strong> {selectedComment.moderation.toxicityScore.toFixed(2)}</p>
                    </div>
                    <div>
                      <p><strong>Spam Score:</strong> {selectedComment.moderation.spamScore.toFixed(2)}</p>
                      <p><strong>AI Confidence:</strong> {(selectedComment.moderation.aiConfidence * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p><strong>Created:</strong> {format(new Date(selectedComment.createdAt), 'PPpp')}</p>
                <p><strong>Updated:</strong> {format(new Date(selectedComment.updatedAt), 'PPpp')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Moderation Dialog */}
      <Dialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderate Comment</DialogTitle>
            <DialogDescription>
              Set the moderation status and provide a reason if needed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={moderationStatus} onValueChange={setModerationStatus}>
                <SelectTrigger data-testid="select-moderation-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                  <SelectItem value="flagged">Flag for Review</SelectItem>
                  <SelectItem value="hidden">Hide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
              <Textarea
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="Provide a reason for this moderation action..."
                data-testid="textarea-moderation-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModerationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleModerationSubmit}
              disabled={moderateCommentMutation.isPending}
              data-testid="button-submit-moderation"
            >
              {moderateCommentMutation.isPending ? "Processing..." : "Apply Moderation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Moderation Dialog */}
      <Dialog open={showBulkModerationDialog} onOpenChange={setShowBulkModerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Moderate Comments</DialogTitle>
            <DialogDescription>
              Apply moderation action to {selectedComments.length} selected comments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <Select value={bulkModerationAction} onValueChange={setBulkModerationAction}>
                <SelectTrigger data-testid="select-bulk-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve All</SelectItem>
                  <SelectItem value="reject">Reject All</SelectItem>
                  <SelectItem value="flag">Flag All</SelectItem>
                  <SelectItem value="hide">Hide All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
              <Textarea
                value={bulkModerationReason}
                onChange={(e) => setBulkModerationReason(e.target.value)}
                placeholder="Provide a reason for this bulk action..."
                data-testid="textarea-bulk-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModerationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkModeration}
              disabled={bulkModerationMutation.isPending}
              data-testid="button-submit-bulk-moderation"
            >
              {bulkModerationMutation.isPending ? "Processing..." : `Apply to ${selectedComments.length} Comments`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comments Analytics</DialogTitle>
            <DialogDescription>
              View detailed analytics and insights about comment moderation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <Input
                  type="date"
                  value={analyticsDateFrom}
                  onChange={(e) => setAnalyticsDateFrom(e.target.value)}
                  data-testid="input-analytics-from"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <Input
                  type="date"
                  value={analyticsDateTo}
                  onChange={(e) => setAnalyticsDateTo(e.target.value)}
                  data-testid="input-analytics-to"
                />
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : analytics && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(() => {
                  const summary = getAnalyticsSummary();
                  if (!summary) return null;
                  
                  return (
                    <>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.totalComments}</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Moderation Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.moderationRate}%</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.approvalRate}%</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.averageSentiment}</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Toxicity Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.toxicityRate}%</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Spam Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.spamRate}%</div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}