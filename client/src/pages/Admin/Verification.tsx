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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  AlertTriangle, 
  Search, 
  Filter, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  TrendingUp,
  Users,
  AlertCircle,
  Eye,
  Download,
  RefreshCw,
  User,
  Camera,
  CreditCard,
  Calendar,
  MapPin,
  Building
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

interface Verification {
  id: string;
  type: 'kyc' | 'age' | 'costar' | '2257';
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  documents: VerificationDocument[];
  personalInfo?: any;
  addressInfo?: any;
  rejectionReason?: string;
  expiresAt?: string;
}

interface VerificationDocument {
  id: string;
  type: string;
  url: string;
  status: string;
  uploadedAt: string;
  aiConfidence?: number;
  manualReview?: boolean;
}

interface VerificationStats {
  totalVerifications: number;
  pendingVerifications: number;
  approvedVerifications: number;
  rejectedVerifications: number;
  verificationsByType: Array<{ type: string; count: number; }>;
  verificationsByStatus: Array<{ status: string; count: number; }>;
  avgProcessingTime: number;
}

export default function VerificationManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVerifications, setSelectedVerifications] = useState<string[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  // Fetch verifications with filters
  const { data: verificationsData, isLoading: verificationsLoading, refetch } = useQuery({
    queryKey: ['/api/admin/verifications', {
      type: typeFilter !== 'all' ? typeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      sortBy,
      sortOrder,
      limit,
      offset: page * limit
    }],
    enabled: user?.role === 'admin'
  });

  // Fetch verification statistics
  const { data: statsData } = useQuery({
    queryKey: ['/api/admin/verifications/stats'],
    enabled: user?.role === 'admin'
  });

  // Fetch documents for selected verification
  const { data: documentsData } = useQuery({
    queryKey: ['/api/admin/verifications', selectedVerification?.id, 'documents'],
    enabled: !!selectedVerification && user?.role === 'admin'
  });

  // Mutations for verification actions
  const updateKycMutation = useMutation({
    mutationFn: (data: { verificationId: string; status: string; notes?: string }) =>
      apiRequest('PATCH', `/api/admin/verifications/kyc/${data.verificationId}`, { status: data.status, notes: data.notes, reviewedBy: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verifications'] });
      toast({ title: "KYC verification updated successfully" });
      setSelectedVerification(null);
      setShowDetails(false);
      setReviewNotes('');
    }
  });

  const updateAgeMutation = useMutation({
    mutationFn: (data: { verificationId: string; status: string; notes?: string }) =>
      apiRequest('PATCH', `/api/admin/verifications/age/${data.verificationId}`, { status: data.status, notes: data.notes, reviewedBy: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verifications'] });
      toast({ title: "Age verification updated successfully" });
      setSelectedVerification(null);
      setShowDetails(false);
      setReviewNotes('');
    }
  });

  const updateCostarMutation = useMutation({
    mutationFn: (data: { verificationId: string; status: string; notes?: string }) =>
      apiRequest('PATCH', `/api/admin/verifications/costar/${data.verificationId}`, { status: data.status, notes: data.notes, reviewedBy: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verifications'] });
      toast({ title: "Co-star verification updated successfully" });
      setSelectedVerification(null);
      setShowDetails(false);
      setReviewNotes('');
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { verificationIds: string[]; updates: any }) =>
      apiRequest('POST', '/api/admin/verifications/bulk', { verificationIds: data.verificationIds, updates: data.updates }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verifications'] });
      toast({ 
        title: `${variables.verificationIds.length} verifications updated successfully` 
      });
      setSelectedVerifications([]);
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: { verificationId: string; note: string }) =>
      apiRequest('POST', `/api/admin/verifications/${data.verificationId}/notes`, { note: data.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verifications'] });
      setReviewNotes('');
      toast({ title: "Note added successfully" });
    }
  });

  // Filter verifications based on search
  const filteredVerifications = useMemo(() => {
    const verificationsResponse = verificationsData as { verifications: Verification[] } | undefined;
    if (!verificationsResponse?.verifications) return [];
    
    return verificationsResponse.verifications.filter((verification: Verification) => {
      const matchesSearch = searchQuery === '' || 
        verification.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        verification.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        verification.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [verificationsData, searchQuery]);

  // Helper functions
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'kyc': return 'bg-blue-500 text-white';
      case 'age': return 'bg-green-500 text-white';
      case 'costar': return 'bg-purple-500 text-white';
      case '2257': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 text-white';
      case 'under_review': return 'bg-blue-500 text-white';
      case 'approved': return 'bg-green-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'expired': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'id_front': 
      case 'id_back': return <CreditCard className="h-4 w-4" />;
      case 'selfie': return <Camera className="h-4 w-4" />;
      case 'proof_of_address': return <MapPin className="h-4 w-4" />;
      case 'birth_certificate': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getMutationForType = (type: string) => {
    switch (type) {
      case 'kyc': return updateKycMutation;
      case 'age': return updateAgeMutation;
      case 'costar': return updateCostarMutation;
      default: return updateKycMutation;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6" data-testid="access-denied">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Access denied. Admin privileges required to manage verifications.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = statsData as VerificationStats | undefined;

  return (
    <div className="space-y-6" data-testid="verification-management-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">
            Verification Management
          </h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage identity verification and compliance requests
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
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Verifications</p>
                <p className="text-2xl font-bold" data-testid="total-verifications">
                  {stats?.totalVerifications || 0}
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
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold" data-testid="pending-verifications">
                  {stats?.pendingVerifications || 0}
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
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold" data-testid="approved-verifications">
                  {stats?.approvedVerifications || 0}
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
                <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                <p className="text-2xl font-bold" data-testid="avg-processing-time">
                  {stats?.avgProcessingTime ? `${Math.round(stats.avgProcessingTime)}h` : '0h'}
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
                placeholder="Search verifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-testid="select-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="kyc">KYC Verification</SelectItem>
                <SelectItem value="age">Age Verification</SelectItem>
                <SelectItem value="costar">Co-star Verification</SelectItem>
                <SelectItem value="2257">2257 Compliance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
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
                <SelectItem value="submittedAt-desc">Newest First</SelectItem>
                <SelectItem value="submittedAt-asc">Oldest First</SelectItem>
                <SelectItem value="type-asc">Type A-Z</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedVerifications.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedVerifications.length} verification(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkUpdateMutation.mutate({
                    verificationIds: selectedVerifications,
                    updates: { status: 'approved' }
                  })}
                  disabled={bulkUpdateMutation.isPending}
                  data-testid="button-bulk-approve"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkUpdateMutation.mutate({
                    verificationIds: selectedVerifications,
                    updates: { status: 'rejected' }
                  })}
                  disabled={bulkUpdateMutation.isPending}
                  data-testid="button-bulk-reject"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verifications Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
          <CardDescription>
            {filteredVerifications.length} verification requests found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verificationsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVerifications.map((verification: Verification) => (
                <div
                  key={verification.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`verification-card-${verification.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedVerifications.includes(verification.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVerifications([...selectedVerifications, verification.id]);
                          } else {
                            setSelectedVerifications(selectedVerifications.filter(id => id !== verification.id));
                          }
                        }}
                        data-testid={`checkbox-${verification.id}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{verification.userName}</h3>
                          <Badge className={getTypeColor(verification.type)}>
                            {verification.type.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusColor(verification.status)}>
                            {verification.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {verification.documents.length} document(s)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Email:</span> {verification.userEmail}
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span> {format(new Date(verification.submittedAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                          {verification.reviewedAt && (
                            <div>
                              <span className="font-medium">Reviewed:</span> {format(new Date(verification.reviewedAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          )}
                          {verification.expiresAt && (
                            <div>
                              <span className="font-medium">Expires:</span> {format(new Date(verification.expiresAt), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setShowDocuments(true);
                        }}
                        data-testid={`button-documents-${verification.id}`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Documents
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setShowDetails(true);
                        }}
                        data-testid={`button-review-${verification.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Review</DialogTitle>
            <DialogDescription>
              Review and approve/reject verification #{selectedVerification?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">User</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedVerification.userName} ({selectedVerification.userEmail})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Verification Type</label>
                  <Badge className={getTypeColor(selectedVerification.type)}>
                    {selectedVerification.type.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Current Status</label>
                  <Badge className={getStatusColor(selectedVerification.status)}>
                    {selectedVerification.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Submitted</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedVerification.submittedAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Documents</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {selectedVerification.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 border rounded">
                      {getDocumentIcon(doc.type)}
                      <span className="text-sm">{doc.type.replace('_', ' ')}</span>
                      {doc.aiConfidence && (
                        <Badge variant="outline" className="ml-auto">
                          AI: {doc.aiConfidence}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Add review notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-2"
                  data-testid="textarea-review-notes"
                />
              </div>

              {(selectedVerification.status === 'pending' || selectedVerification.status === 'under_review') && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      const mutation = getMutationForType(selectedVerification.type);
                      mutation.mutate({
                        verificationId: selectedVerification.id,
                        status: 'approved',
                        notes: reviewNotes
                      });
                    }}
                    disabled={updateKycMutation.isPending || updateAgeMutation.isPending || updateCostarMutation.isPending}
                    data-testid="button-approve-verification"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const mutation = getMutationForType(selectedVerification.type);
                      mutation.mutate({
                        verificationId: selectedVerification.id,
                        status: 'rejected',
                        notes: reviewNotes
                      });
                    }}
                    disabled={updateKycMutation.isPending || updateAgeMutation.isPending || updateCostarMutation.isPending}
                    data-testid="button-reject-verification"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addNoteMutation.mutate({
                      verificationId: selectedVerification.id,
                      note: reviewNotes
                    })}
                    disabled={addNoteMutation.isPending || !reviewNotes.trim()}
                    data-testid="button-add-note"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}