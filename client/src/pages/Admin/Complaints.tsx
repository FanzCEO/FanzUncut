import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  AlertTriangle, 
  Search, 
  Filter, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  UserX,
  FileText,
  TrendingUp,
  Users,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Eye,
  MessageCircle,
  Plus,
  Download,
  RefreshCw
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  submitterId: string;
  submitterName: string;
  submitterEmail: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  escalationReason?: string;
  tags: string[];
  attachments: any[];
}

interface ComplaintComment {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

interface ComplaintStats {
  totalComplaints: number;
  openComplaints: number;
  resolvedComplaints: number;
  avgResolutionTime: number;
  complaintsByCategory: Array<{ category: string; count: number; }>;
  complaintsByPriority: Array<{ priority: string; count: number; }>;
}

export default function ComplaintsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  // Fetch complaints with filters
  const { data: complaintsData, isLoading: complaintsLoading, refetch } = useQuery({
    queryKey: ['/api/admin/complaints', {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      sortBy,
      sortOrder,
      limit,
      offset: page * limit
    }],
    enabled: user?.role === 'admin'
  });

  // Fetch complaint statistics
  const { data: statsData } = useQuery({
    queryKey: ['/api/admin/complaints/stats'],
    enabled: user?.role === 'admin'
  });

  // Fetch comments for selected complaint
  const { data: commentsData } = useQuery({
    queryKey: ['/api/admin/complaints', selectedComplaint?.id, 'comments'],
    enabled: !!selectedComplaint && user?.role === 'admin'
  });

  // Mutations for complaint actions
  const assignMutation = useMutation({
    mutationFn: (data: { complaintId: string; assignedToId: string }) =>
      apiRequest('POST', `/api/admin/complaints/${data.complaintId}/assign`, { assignedToId: data.assignedToId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/complaints'] });
      toast({ title: "Complaint assigned successfully" });
    }
  });

  const escalateMutation = useMutation({
    mutationFn: (data: { complaintId: string; reason: string }) =>
      apiRequest('POST', `/api/admin/complaints/${data.complaintId}/escalate`, { reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/complaints'] });
      toast({ title: "Complaint escalated successfully" });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (data: { complaintId: string; resolution: string }) =>
      apiRequest('POST', `/api/admin/complaints/${data.complaintId}/resolve`, { resolution: data.resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/complaints'] });
      toast({ title: "Complaint resolved successfully" });
      setSelectedComplaint(null);
      setShowDetails(false);
    }
  });

  const commentMutation = useMutation({
    mutationFn: (data: { complaintId: string; content: string; isInternal: boolean }) =>
      apiRequest('POST', `/api/admin/complaints/${data.complaintId}/comments`, { content: data.content, isInternal: data.isInternal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/complaints'] });
      setNewComment('');
      toast({ title: "Comment added successfully" });
    }
  });

  // Filter complaints based on search and filters
  const filteredComplaints = useMemo(() => {
    const complaintsResponse = complaintsData as { complaints: Complaint[] } | undefined;
    if (!complaintsResponse?.complaints) return [];
    
    return complaintsResponse.complaints.filter((complaint: Complaint) => {
      const matchesSearch = searchQuery === '' || 
        complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.submitterEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [complaintsData, searchQuery]);

  // Helper functions
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'content_violation': return 'bg-red-500 text-white';
      case 'user_behavior': return 'bg-orange-500 text-white';
      case 'technical_issue': return 'bg-blue-500 text-white';
      case 'billing_dispute': return 'bg-green-500 text-white';
      case 'dmca': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white';
      case 'in_progress': return 'bg-yellow-500 text-white';
      case 'resolved': return 'bg-green-500 text-white';
      case 'closed': return 'bg-gray-500 text-white';
      case 'escalated': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6" data-testid="access-denied">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Access denied. Admin privileges required to manage complaints.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = statsData as ComplaintStats | undefined;

  return (
    <div className="space-y-6" data-testid="complaints-management-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">
            Complaints Management
          </h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage and resolve user complaints and platform issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm" data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Complaints</p>
                <p className="text-2xl font-bold" data-testid="total-complaints">
                  {stats?.totalComplaints || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Complaints</p>
                <p className="text-2xl font-bold" data-testid="open-complaints">
                  {stats?.openComplaints || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold" data-testid="resolved-complaints">
                  {stats?.resolvedComplaints || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                <p className="text-2xl font-bold" data-testid="avg-resolution-time">
                  {stats?.avgResolutionTime ? `${Math.round(stats.avgResolutionTime)}h` : '0h'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="content_violation">Content Violation</SelectItem>
                <SelectItem value="user_behavior">User Behavior</SelectItem>
                <SelectItem value="technical_issue">Technical Issue</SelectItem>
                <SelectItem value="billing_dispute">Billing Dispute</SelectItem>
                <SelectItem value="dmca">DMCA</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="select-priority-filter">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="priority-desc">Priority High to Low</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Complaints Queue</CardTitle>
          <CardDescription>
            {filteredComplaints.length} complaints found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {complaintsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map((complaint: Complaint) => (
                <div
                  key={complaint.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`complaint-card-${complaint.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{complaint.title}</h3>
                        <Badge className={getCategoryColor(complaint.category)}>
                          {complaint.category.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(complaint.priority)}>
                          {complaint.priority}
                        </Badge>
                        <Badge className={getStatusColor(complaint.status)}>
                          {complaint.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-2 line-clamp-2">
                        {complaint.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By: {complaint.submitterName}</span>
                        <span>Created: {format(new Date(complaint.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        {complaint.assignedToName && (
                          <span>Assigned to: {complaint.assignedToName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setShowDetails(true);
                        }}
                        data-testid={`button-view-${complaint.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setShowComments(true);
                        }}
                        data-testid={`button-comments-${complaint.id}`}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Comments
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complaint Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>
              Manage and resolve complaint #{selectedComplaint?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <p className="text-sm text-muted-foreground">{selectedComplaint.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge className={getStatusColor(selectedComplaint.status)}>
                    {selectedComplaint.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Badge className={getCategoryColor(selectedComplaint.category)}>
                    {selectedComplaint.category.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Badge className={getPriorityColor(selectedComplaint.priority)}>
                    {selectedComplaint.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedComplaint.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Submitted by</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedComplaint.submitterName} ({selectedComplaint.submitterEmail})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created at</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedComplaint.createdAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              {selectedComplaint.status !== 'resolved' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => escalateMutation.mutate({
                      complaintId: selectedComplaint.id,
                      reason: 'Manual escalation'
                    })}
                    variant="outline"
                    disabled={escalateMutation.isPending}
                    data-testid="button-escalate"
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Escalate
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button data-testid="button-resolve">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Resolve Complaint</DialogTitle>
                        <DialogDescription>
                          Provide a resolution for this complaint
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Enter resolution details..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          data-testid="textarea-resolution"
                        />
                        <Button
                          onClick={() => {
                            resolveMutation.mutate({
                              complaintId: selectedComplaint.id,
                              resolution: newComment
                            });
                          }}
                          disabled={resolveMutation.isPending || !newComment.trim()}
                          data-testid="button-confirm-resolve"
                        >
                          Confirm Resolution
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}