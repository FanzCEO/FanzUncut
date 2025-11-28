import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  DollarSign, 
  AlertTriangle, 
  Search, 
  Filter, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  TrendingUp,
  Users,
  AlertCircle,
  Shield,
  Eye,
  Download,
  RefreshCw,
  Banknote,
  Building,
  Wallet
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

interface Payout {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  provider: string;
  accountDetails: any;
  status: string;
  processingFee: number;
  taxWithholding: number;
  finalAmount: number;
  fraudScore?: number;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  notes?: string;
  auditTrail: any[];
}

interface PayoutStats {
  totalPayouts: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalAmount: number;
  avgPayoutAmount: number;
  payoutsByStatus: Array<{ status: string; count: number; amount: number; }>;
  payoutsByProvider: Array<{ provider: string; count: number; amount: number; }>;
}

export default function WithdrawalsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [batchAction, setBatchAction] = useState('');
  const [sortBy, setSortBy] = useState('requestedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Fetch payouts with filters
  const { data: payoutsData, isLoading: payoutsLoading, refetch } = useQuery({
    queryKey: ['/api/admin/payouts', {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      provider: providerFilter !== 'all' ? providerFilter : undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      sortBy,
      sortOrder,
      limit,
      offset: page * limit
    }],
    enabled: user?.role === 'admin'
  });

  // Fetch payout statistics
  const { data: statsData } = useQuery({
    queryKey: ['/api/admin/payouts/stats'],
    enabled: user?.role === 'admin'
  });

  // Fetch audit trail for selected payout
  const { data: auditData } = useQuery({
    queryKey: ['/api/admin/payouts', selectedPayout?.id, 'audit'],
    enabled: !!selectedPayout && user?.role === 'admin'
  });

  // Mutations for payout actions
  const updateStatusMutation = useMutation({
    mutationFn: (data: { payoutId: string; status: string; notes?: string }) =>
      apiRequest('PATCH', `/api/admin/payouts/${data.payoutId}/status`, { status: data.status, notes: data.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
      toast({ title: "Payout status updated successfully" });
    }
  });

  const batchProcessMutation = useMutation({
    mutationFn: (data: { payoutIds: string[]; action: 'approve' | 'reject' | 'process' }) =>
      apiRequest('POST', '/api/admin/payouts/batch', { payoutIds: data.payoutIds, action: data.action }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
      toast({ 
        title: `${variables.payoutIds.length} payouts ${variables.action}ed successfully` 
      });
      setSelectedPayouts([]);
    }
  });

  const fraudCheckMutation = useMutation({
    mutationFn: async (data: { payoutId: string; userId: string; amount: number }) => {
      const response = await apiRequest('POST', `/api/admin/payouts/${data.payoutId}/fraud-check`, { userId: data.userId, amount: data.amount });
      return await response.json();
    },
    onSuccess: (data: { fraudScore: number }) => {
      toast({ 
        title: `Fraud Score: ${data.fraudScore}%`,
        description: data.fraudScore > 70 ? "High risk transaction" : "Low risk transaction"
      });
    }
  });

  // Filter payouts based on search
  const filteredPayouts = useMemo(() => {
    const payoutsResponse = payoutsData as { payouts: Payout[] } | undefined;
    if (!payoutsResponse?.payouts) return [];
    
    return payoutsResponse.payouts.filter((payout: Payout) => {
      const matchesSearch = searchQuery === '' || 
        payout.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payout.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payout.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [payoutsData, searchQuery]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 text-white';
      case 'approved': return 'bg-blue-500 text-white';
      case 'processing': return 'bg-purple-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'failed': return 'bg-red-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'bank_transfer': return <Building className="h-4 w-4" />;
      case 'paypal': return <Wallet className="h-4 w-4" />;
      case 'crypto': return <Banknote className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getFraudRiskColor = (score?: number) => {
    if (!score) return 'bg-gray-500 text-white';
    if (score > 70) return 'bg-red-500 text-white';
    if (score > 40) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6" data-testid="access-denied">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Access denied. Admin privileges required to manage withdrawals.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = statsData as PayoutStats | undefined;

  return (
    <div className="space-y-6" data-testid="withdrawals-management-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">
            Withdrawals & Payouts
          </h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage payout requests and financial transactions
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
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold" data-testid="total-payouts">
                  {stats?.totalPayouts || 0}
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
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold" data-testid="pending-payouts">
                  {stats?.pendingPayouts || 0}
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
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold" data-testid="completed-payouts">
                  {stats?.completedPayouts || 0}
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
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold" data-testid="total-amount">
                  {stats?.totalAmount ? formatCurrency(stats.totalAmount) : '$0'}
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search payouts..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger data-testid="select-provider-filter">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Min Amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              type="number"
              data-testid="input-min-amount"
            />
            <Input
              placeholder="Max Amount"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              type="number"
              data-testid="input-max-amount"
            />
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requestedAt-desc">Newest First</SelectItem>
                <SelectItem value="requestedAt-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Amount High to Low</SelectItem>
                <SelectItem value="amount-asc">Amount Low to High</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedPayouts.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedPayouts.length} payout(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchProcessMutation.mutate({
                    payoutIds: selectedPayouts,
                    action: 'approve'
                  })}
                  disabled={batchProcessMutation.isPending}
                  data-testid="button-batch-approve"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchProcessMutation.mutate({
                    payoutIds: selectedPayouts,
                    action: 'reject'
                  })}
                  disabled={batchProcessMutation.isPending}
                  data-testid="button-batch-reject"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchProcessMutation.mutate({
                    payoutIds: selectedPayouts,
                    action: 'process'
                  })}
                  disabled={batchProcessMutation.isPending}
                  data-testid="button-batch-process"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Process Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payouts Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Payout Requests Queue</CardTitle>
          <CardDescription>
            {filteredPayouts.length} payout requests found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payoutsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayouts.map((payout: Payout) => (
                <div
                  key={payout.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`payout-card-${payout.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedPayouts.includes(payout.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPayouts([...selectedPayouts, payout.id]);
                          } else {
                            setSelectedPayouts(selectedPayouts.filter(id => id !== payout.id));
                          }
                        }}
                        data-testid={`checkbox-${payout.id}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {formatCurrency(payout.amount, payout.currency)}
                          </h3>
                          <Badge className={getStatusColor(payout.status)}>
                            {payout.status.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getProviderIcon(payout.provider)}
                            <span className="text-sm text-muted-foreground capitalize">
                              {payout.provider.replace('_', ' ')}
                            </span>
                          </div>
                          {payout.fraudScore && (
                            <Badge className={getFraudRiskColor(payout.fraudScore)}>
                              Risk: {payout.fraudScore}%
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">User:</span> {payout.userName} ({payout.userEmail})
                          </div>
                          <div>
                            <span className="font-medium">Requested:</span> {format(new Date(payout.requestedAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                          <div>
                            <span className="font-medium">Processing Fee:</span> {formatCurrency(payout.processingFee)}
                          </div>
                          <div>
                            <span className="font-medium">Final Amount:</span> {formatCurrency(payout.finalAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fraudCheckMutation.mutate({
                          payoutId: payout.id,
                          userId: payout.userId,
                          amount: payout.amount
                        })}
                        disabled={fraudCheckMutation.isPending}
                        data-testid={`button-fraud-check-${payout.id}`}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Fraud Check
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPayout(payout);
                          setShowDetails(true);
                        }}
                        data-testid={`button-view-${payout.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
            <DialogDescription>
              Manage payout request #{selectedPayout?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount Requested</label>
                  <p className="text-2xl font-bold">{formatCurrency(selectedPayout.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge className={getStatusColor(selectedPayout.status)}>
                    {selectedPayout.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Provider</label>
                  <div className="flex items-center gap-2">
                    {getProviderIcon(selectedPayout.provider)}
                    <span className="capitalize">{selectedPayout.provider.replace('_', ' ')}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Final Amount</label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(selectedPayout.finalAmount)}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Fee Breakdown</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Processing Fee:</span>
                    <p className="font-medium">{formatCurrency(selectedPayout.processingFee)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tax Withholding:</span>
                    <p className="font-medium">{formatCurrency(selectedPayout.taxWithholding)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Amount:</span>
                    <p className="font-medium text-green-600">{formatCurrency(selectedPayout.finalAmount)}</p>
                  </div>
                </div>
              </div>

              {selectedPayout.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => updateStatusMutation.mutate({
                      payoutId: selectedPayout.id,
                      status: 'approved'
                    })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => updateStatusMutation.mutate({
                      payoutId: selectedPayout.id,
                      status: 'rejected'
                    })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-reject"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAuditTrail(true);
                    }}
                    data-testid="button-audit-trail"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Audit Trail
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