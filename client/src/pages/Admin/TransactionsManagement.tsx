import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Filter,
  Search,
  MoreHorizontal,
  CreditCard,
  Banknote,
  Wallet,
  AlertCircle,
  FileText,
  Calendar,
  Users,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Shield,
  Flag
} from "lucide-react";

// TypeScript interfaces
interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  userId: string;
  username?: string;
  userEmail?: string;
  paymentMethod: string;
  gatewayProvider: string;
  paymentReference: string;
  description: string;
  metadata: any;
  fraudScore: number;
  riskLevel: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionFilters {
  page: number;
  limit: number;
  type?: string;
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  sortBy: string;
  sortOrder: string;
  search?: string;
}

interface TransactionAnalytics {
  totalTransactions: number;
  totalVolume: number;
  averageAmount: number;
  successRate: number;
  revenueChart: Array<{ date: string; amount: number; count: number }>;
  statusDistribution: Array<{ status: string; count: number; percentage: number }>;
  paymentMethodDistribution: Array<{ method: string; count: number; amount: number }>;
  fraudAlerts: number;
  riskLevelDistribution: Array<{ level: string; count: number }>;
}

interface FraudAlert {
  id: string;
  transactionId: string;
  riskScore: number;
  riskLevel: string;
  reason: string;
  status: string;
  createdAt: string;
}

const STATUS_COLORS = {
  completed: "bg-green-500",
  pending: "bg-yellow-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-500",
  refunded: "bg-blue-500",
  disputed: "bg-purple-500"
};

const RISK_COLORS = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500"
};

export default function TransactionsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<string>('csv');

  // Data fetching
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['/api/admin/financial/transactions', filters],
    queryFn: () => apiRequest(`/api/admin/financial/transactions?${new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString()}`)
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/financial/transactions/analytics', filters.startDate, filters.endDate],
    queryFn: () => apiRequest(`/api/admin/financial/transactions/analytics?${new URLSearchParams({
      startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: filters.endDate || new Date().toISOString().split('T')[0],
      groupBy: 'day'
    }).toString()}`)
  });

  const { data: fraudAlerts } = useQuery({
    queryKey: ['/api/admin/financial/fraud/alerts'],
    queryFn: () => apiRequest('/api/admin/financial/fraud/alerts?status=pending&limit=10')
  });

  // Mutations
  const refundMutation = useMutation({
    mutationFn: ({ transactionId, data }: { transactionId: string; data: any }) =>
      apiRequest(`/api/admin/financial/transactions/${transactionId}/refund`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Refund processed successfully" });
      refetchTransactions();
      setSelectedTransaction(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to process refund", variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ transactionId, data }: { transactionId: string; data: any }) =>
      apiRequest(`/api/admin/financial/transactions/${transactionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Transaction status updated" });
      refetchTransactions();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    }
  });

  const bulkOperationMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/admin/financial/transactions/bulk', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (result) => {
      toast({ title: "Success", description: `Bulk operation completed. Processed ${result.processed} transactions.` });
      refetchTransactions();
      setSelectedTransactions([]);
      setBulkAction('');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Bulk operation failed", variant: "destructive" });
    }
  });

  // Event handlers
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId) 
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === transactions?.data?.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions?.data?.map((t: Transaction) => t.id) || []);
    }
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedTransactions.length === 0) return;

    bulkOperationMutation.mutate({
      transactionIds: selectedTransactions,
      operation: bulkAction,
      data: bulkAction === 'update_status' ? { status: 'flagged' } : {}
    });
  };

  const handleRefund = () => {
    if (!selectedTransaction) return;

    const amount = refundAmount ? parseFloat(refundAmount) * 100 : undefined;
    
    refundMutation.mutate({
      transactionId: selectedTransaction.id,
      data: {
        reason: refundReason,
        amount
      }
    });
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams({
        format: exportFormat,
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await fetch(`/api/admin/financial/transactions/export?${queryParams}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "Transactions exported successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export transactions", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (transactionsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading transactions...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="transactions-management">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Transaction Management</h1>
          <p className="text-muted-foreground">Monitor and manage all platform transactions</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => refetchTransactions()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-transactions">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-transactions">
                {analytics.totalTransactions?.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.successRate}% success rate
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transaction Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-volume">
                {formatCurrency(analytics.totalVolume)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(analytics.averageAmount)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-fraud-alerts">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-fraud-alerts">
                {analytics.fraudAlerts}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires review
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-success-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-success-rate">
                {analytics.successRate}%
              </div>
              <Progress value={analytics.successRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card data-testid="filters-panel">
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Transaction ID, User..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  data-testid="input-search"
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={filters.type || ''}
                  onValueChange={(value) => handleFilterChange('type', value)}
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="tip">Tip</SelectItem>
                    <SelectItem value="payout">Payout</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={filters.paymentMethod || ''}
                  onValueChange={(value) => handleFilterChange('paymentMethod', value)}
                >
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Methods</SelectItem>
                    <SelectItem value="card">Credit Card</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateRange">Date Range</Label>
                <div className="flex space-x-2">
                  <Input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    data-testid="input-start-date"
                  />
                  <Input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="fraud" data-testid="tab-fraud">Fraud Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {/* Bulk Actions */}
          {selectedTransactions.length > 0 && (
            <Card data-testid="bulk-actions">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {selectedTransactions.length} selected
                  </span>
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-[200px]" data-testid="select-bulk-action">
                      <SelectValue placeholder="Choose action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flag_for_review">Flag for Review</SelectItem>
                      <SelectItem value="export">Export Selected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleBulkAction}
                    disabled={!bulkAction || bulkOperationMutation.isPending}
                    data-testid="button-execute-bulk"
                  >
                    Execute
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions Table */}
          <Card data-testid="transactions-table">
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                Showing {transactions?.data?.length || 0} of {transactions?.total || 0} transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTransactions.length === transactions?.data?.length}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.data?.map((transaction: Transaction) => (
                    <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTransactions.includes(transaction.id)}
                          onCheckedChange={() => handleSelectTransaction(transaction.id)}
                          data-testid={`checkbox-select-${transaction.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.username}</div>
                          <div className="text-sm text-muted-foreground">{transaction.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-type-${transaction.id}`}>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${STATUS_COLORS[transaction.status as keyof typeof STATUS_COLORS]} text-white`}
                          data-testid={`badge-status-${transaction.id}`}
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          {transaction.paymentMethod}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div 
                            className={`w-2 h-2 rounded-full ${RISK_COLORS[transaction.riskLevel as keyof typeof RISK_COLORS]}`}
                          />
                          <span className="text-sm">{transaction.fraudScore}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${transaction.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedTransaction(transaction)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedTransaction(transaction)}>
                              <Flag className="h-4 w-4 mr-2" />
                              Process Refund
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Revenue Chart */}
              <Card data-testid="chart-revenue">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analytics.revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card data-testid="chart-status-distribution">
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percentage }) => `${status} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.statusDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card data-testid="chart-payment-methods">
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.paymentMethodDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="method" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Risk Level Distribution */}
              <Card data-testid="chart-risk-distribution">
                <CardHeader>
                  <CardTitle>Risk Level Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.riskLevelDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fraud" className="space-y-4">
          <Card data-testid="fraud-alerts">
            <CardHeader>
              <CardTitle>Recent Fraud Alerts</CardTitle>
              <CardDescription>Transactions requiring manual review</CardDescription>
            </CardHeader>
            <CardContent>
              {fraudAlerts?.data?.length > 0 ? (
                <div className="space-y-4">
                  {fraudAlerts.data.map((alert: FraudAlert) => (
                    <Alert key={alert.id} data-testid={`alert-${alert.id}`}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              Transaction {alert.transactionId.slice(0, 8)}... - Risk Score: {alert.riskScore}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {alert.reason} • {formatDate(alert.createdAt)}
                            </div>
                          </div>
                          <Badge 
                            className={`${RISK_COLORS[alert.riskLevel as keyof typeof RISK_COLORS]} text-white`}
                          >
                            {alert.riskLevel}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No fraud alerts at this time
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-transaction-details">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Transaction ID: {selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <div className="font-medium text-lg">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={`${STATUS_COLORS[selectedTransaction.status as keyof typeof STATUS_COLORS]} text-white`}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
                <div>
                  <Label>Type</Label>
                  <div>{selectedTransaction.type}</div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <div>{selectedTransaction.paymentMethod}</div>
                </div>
                <div>
                  <Label>Gateway</Label>
                  <div>{selectedTransaction.gatewayProvider}</div>
                </div>
                <div>
                  <Label>Risk Score</Label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${RISK_COLORS[selectedTransaction.riskLevel as keyof typeof RISK_COLORS]}`}
                    />
                    <span>{selectedTransaction.fraudScore}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <div className="text-sm">{selectedTransaction.description}</div>
              </div>

              {selectedTransaction.status === 'completed' && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">Process Refund</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="refundAmount">Refund Amount</Label>
                      <Input
                        id="refundAmount"
                        type="number"
                        step="0.01"
                        placeholder={`Max: ${(selectedTransaction.amount / 100).toFixed(2)}`}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        data-testid="input-refund-amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="refundReason">Reason</Label>
                      <Select value={refundReason} onValueChange={setRefundReason}>
                        <SelectTrigger data-testid="select-refund-reason">
                          <SelectValue placeholder="Select reason..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer_request">Customer Request</SelectItem>
                          <SelectItem value="duplicate_charge">Duplicate Charge</SelectItem>
                          <SelectItem value="fraud_detected">Fraud Detected</SelectItem>
                          <SelectItem value="service_not_delivered">Service Not Delivered</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={handleRefund}
                    disabled={refundMutation.isPending || !refundReason}
                    data-testid="button-process-refund"
                  >
                    {refundMutation.isPending ? 'Processing...' : 'Process Refund'}
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