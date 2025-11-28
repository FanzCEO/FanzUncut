import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
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
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Users, 
  FileImage, 
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  PieChart as PieChartIcon,
  Table as TableIcon,
  FileSpreadsheet
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// TypeScript interfaces for type safety
interface ReportSummary {
  totalRevenue?: number;
  totalPayouts?: number;
  netRevenue?: number;
  transactionFees?: number;
  refunds?: number;
  chargebacks?: number;
  totalUsers?: number;
  newRegistrations?: number;
  activeUsers?: number;
  retentionRate?: number;
  avgSessionDuration?: number;
  bounceRate?: number;
  totalContent?: number;
  newUploads?: number;
  totalViews?: number;
  avgEngagement?: number;
  flaggedContent?: number;
  removedContent?: number;
  kycVerified?: number;
  kycPending?: number;
  kycRejected?: number;
  ageVerified?: number;
  agePending?: number;
  compliance2257?: number;
  complianceGDPR?: number;
}

interface ChartDataPoint {
  date: string;
  revenue?: number;
  payouts?: number;
  transactions?: number;
  registrations?: number;
  active?: number;
  sessions?: number;
  uploads?: number;
  views?: number;
  engagement?: number;
  kycSubmitted?: number;
  kycApproved?: number;
  kycRejected?: number;
}

interface TopCreator {
  name: string;
  revenue: number;
  commission: number;
}

interface Demographic {
  ageGroup: string;
  count: number;
  percentage: number;
}

interface ContentType {
  type: string;
  count: number;
  percentage: number;
}

interface VerificationStatus {
  status: string;
  count: number;
  color: string;
}

interface FinancialReport {
  summary?: ReportSummary;
  chartData?: ChartDataPoint[];
  topCreators?: TopCreator[];
}

interface UserReport {
  summary?: ReportSummary;
  chartData?: ChartDataPoint[];
  demographics?: Demographic[];
}

interface ContentReport {
  summary?: ReportSummary;
  chartData?: ChartDataPoint[];
  contentTypes?: ContentType[];
}

interface ComplianceReport {
  summary?: ReportSummary;
  chartData?: ChartDataPoint[];
  verificationStatus?: VerificationStatus[];
}

type ReportData = FinancialReport | UserReport | ContentReport | ComplianceReport | null;

export default function AdminReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    endDate: new Date()
  });
  const [activeReport, setActiveReport] = useState('financial');

  // Financial Reports
  const { data: financialReport, isLoading: financialLoading, refetch: refetchFinancial } = useQuery({
    queryKey: ['/api/admin/reports/financial', dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    enabled: activeReport === 'financial',
  });

  // User Analytics Reports
  const { data: userReport, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['/api/admin/reports/users', dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    enabled: activeReport === 'users',
  });

  // Content Reports
  const { data: contentReport, isLoading: contentLoading, refetch: refetchContent } = useQuery({
    queryKey: ['/api/admin/reports/content', dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    enabled: activeReport === 'content',
  });

  // Compliance Reports
  const { data: complianceReport, isLoading: complianceLoading, refetch: refetchCompliance } = useQuery({
    queryKey: ['/api/admin/reports/compliance', dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    enabled: activeReport === 'compliance',
  });

  // Export Mutation
  const exportMutation = useMutation({
    mutationFn: async ({ reportType, format }: { reportType: string, format: string }) => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format
      });
      
      // Use fetch for file downloads instead of apiRequest
      const response = await fetch(`/api/admin/reports/${reportType}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (format === 'csv') {
        // Handle CSV download
        const responseText = await response.text();
        const blob = new Blob([responseText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Report has been exported successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mock data for demonstration
  const mockFinancialReport = {
    summary: {
      totalRevenue: 285630.50,
      totalPayouts: 142815.25,
      netRevenue: 142815.25,
      transactionFees: 8569.15,
      refunds: 1250.00,
      chargebacks: 350.00
    },
    chartData: [
      { date: '2024-01-01', revenue: 12500, payouts: 6250, transactions: 85 },
      { date: '2024-01-02', revenue: 15200, payouts: 7600, transactions: 102 },
      { date: '2024-01-03', revenue: 13800, payouts: 6900, transactions: 94 },
      { date: '2024-01-04', revenue: 18500, payouts: 9250, transactions: 127 },
      { date: '2024-01-05', revenue: 16900, payouts: 8450, transactions: 115 },
      { date: '2024-01-06', revenue: 21200, payouts: 10600, transactions: 145 },
      { date: '2024-01-07', revenue: 19800, payouts: 9900, transactions: 136 }
    ],
    topCreators: [
      { name: 'Sarah Johnson', revenue: 15420.50, commission: 3084.10 },
      { name: 'Mike Chen', revenue: 12850.75, commission: 2570.15 },
      { name: 'Emma Davis', revenue: 11240.25, commission: 2248.05 }
    ]
  };

  const mockUserReport = {
    summary: {
      totalUsers: 15742,
      newRegistrations: 542,
      activeUsers: 8945,
      retentionRate: 68.5,
      avgSessionDuration: 24.5,
      bounceRate: 12.3
    },
    chartData: [
      { date: '2024-01-01', registrations: 45, active: 1250, sessions: 2890 },
      { date: '2024-01-02', registrations: 62, active: 1380, sessions: 3120 },
      { date: '2024-01-03', registrations: 58, active: 1295, sessions: 2980 },
      { date: '2024-01-04', registrations: 73, active: 1420, sessions: 3250 },
      { date: '2024-01-05', registrations: 69, active: 1365, sessions: 3180 },
      { date: '2024-01-06', registrations: 81, active: 1485, sessions: 3420 },
      { date: '2024-01-07', registrations: 75, active: 1445, sessions: 3350 }
    ],
    demographics: [
      { ageGroup: '18-24', count: 4520, percentage: 28.7 },
      { ageGroup: '25-34', count: 6890, percentage: 43.8 },
      { ageGroup: '35-44', count: 3124, percentage: 19.9 },
      { ageGroup: '45+', count: 1208, percentage: 7.7 }
    ]
  };

  const mockContentReport = {
    summary: {
      totalContent: 8945,
      newUploads: 245,
      totalViews: 425680,
      avgEngagement: 78.5,
      flaggedContent: 12,
      removedContent: 3
    },
    chartData: [
      { date: '2024-01-01', uploads: 32, views: 15420, engagement: 76.2 },
      { date: '2024-01-02', uploads: 41, views: 18650, engagement: 79.5 },
      { date: '2024-01-03', uploads: 38, views: 17230, engagement: 77.8 },
      { date: '2024-01-04', uploads: 45, views: 21450, engagement: 82.1 },
      { date: '2024-01-05', uploads: 43, views: 20180, engagement: 80.3 },
      { date: '2024-01-06', uploads: 52, views: 24520, engagement: 84.7 },
      { date: '2024-01-07', uploads: 48, views: 22890, engagement: 83.2 }
    ],
    contentTypes: [
      { type: 'Photos', count: 4520, percentage: 50.5 },
      { type: 'Videos', count: 2890, percentage: 32.3 },
      { type: 'Audio', count: 1245, percentage: 13.9 },
      { type: 'Other', count: 290, percentage: 3.2 }
    ]
  };

  const mockComplianceReport = {
    summary: {
      kycVerified: 12458,
      kycPending: 245,
      kycRejected: 89,
      ageVerified: 11890,
      agePending: 156,
      compliance2257: 98.5,
      complianceGDPR: 99.8
    },
    chartData: [
      { date: '2024-01-01', kycSubmitted: 25, kycApproved: 22, kycRejected: 2 },
      { date: '2024-01-02', kycSubmitted: 32, kycApproved: 28, kycRejected: 3 },
      { date: '2024-01-03', kycSubmitted: 28, kycApproved: 25, kycRejected: 2 },
      { date: '2024-01-04', kycSubmitted: 35, kycApproved: 31, kycRejected: 3 },
      { date: '2024-01-05', kycSubmitted: 31, kycApproved: 27, kycRejected: 3 },
      { date: '2024-01-06', kycSubmitted: 38, kycApproved: 34, kycRejected: 3 },
      { date: '2024-01-07', kycSubmitted: 36, kycApproved: 32, kycRejected: 3 }
    ],
    verificationStatus: [
      { status: 'Verified', count: 12458, color: '#10b981' },
      { status: 'Pending', count: 245, color: '#f59e0b' },
      { status: 'Rejected', count: 89, color: '#ef4444' }
    ]
  };

  const getCurrentReport = (): ReportData => {
    switch (activeReport) {
      case 'financial': return (financialReport || mockFinancialReport) as FinancialReport;
      case 'users': return (userReport || mockUserReport) as UserReport;
      case 'content': return (contentReport || mockContentReport) as ContentReport;
      case 'compliance': return (complianceReport || mockComplianceReport) as ComplianceReport;
      default: return null;
    }
  };

  const getUserReport = (): UserReport => {
    return (userReport || mockUserReport) as UserReport;
  };

  const getContentReport = (): ContentReport => {
    return (contentReport || mockContentReport) as ContentReport;
  };

  const getComplianceReport = (): ComplianceReport => {
    return (complianceReport || mockComplianceReport) as ComplianceReport;
  };

  const getCurrentLoading = () => {
    switch (activeReport) {
      case 'financial': return financialLoading;
      case 'users': return userLoading;
      case 'content': return contentLoading;
      case 'compliance': return complianceLoading;
      default: return false;
    }
  };

  const refreshCurrentReport = () => {
    switch (activeReport) {
      case 'financial': refetchFinancial(); break;
      case 'users': refetchUser(); break;
      case 'content': refetchContent(); break;
      case 'compliance': refetchCompliance(); break;
    }
  };

  const handleExport = (format: string) => {
    exportMutation.mutate({ reportType: activeReport, format });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };

  if (getCurrentLoading()) {
    return (
      <div className="space-y-6" data-testid="reports-loading">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mt-2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-reports">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="reports-title">Reports & Analytics</h1>
          <p className="text-muted-foreground" data-testid="reports-subtitle">
            Comprehensive reporting and analytics dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshCurrentReport}
            data-testid="button-refresh-report"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card data-testid="card-date-range">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Date Range
          </CardTitle>
          <CardDescription>Select the date range for your reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !dateRange.startDate && "text-muted-foreground"
                    )}
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.startDate ? formatDate(dateRange.startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.startDate}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, startDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !dateRange.endDate && "text-muted-foreground"
                    )}
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.endDate ? formatDate(dateRange.endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.endDate}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, endDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2 mt-6">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport('json')}
                disabled={exportMutation.isPending}
                data-testid="button-export-json"
              >
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={exportMutation.isPending}
                data-testid="button-export-csv"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport} className="space-y-6" data-testid="reports-tabs">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial" data-testid="tab-financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">
            <FileImage className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <Shield className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* Financial Reports */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card data-testid="card-total-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-revenue">
                  {formatCurrency(getCurrentReport()?.summary?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12.5% from last period
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-payouts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-payouts">
                  {formatCurrency(getCurrentReport()?.summary?.totalPayouts || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  50% of total revenue
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-net-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-net-revenue">
                  {formatCurrency(getCurrentReport()?.summary?.netRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  After payouts and fees
                </p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-revenue-chart">
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Daily revenue and payout trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={getCurrentReport()?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="payouts" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Analytics */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-users">
                  {getCurrentReport()?.summary?.totalUsers?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Platform registered users
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-new-registrations">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Registrations</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-new-registrations">
                  {getCurrentReport()?.summary?.newRegistrations?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  In selected period
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-retention-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-retention-rate">
                  {getCurrentReport()?.summary?.retentionRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Monthly retention rate
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-user-activity-chart">
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>Daily registrations and active users</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getCurrentReport()?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="registrations" stroke="#8884d8" />
                    <Line type="monotone" dataKey="active" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-demographics-chart">
              <CardHeader>
                <CardTitle>User Demographics</CardTitle>
                <CardDescription>Age group distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getUserReport()?.demographics || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ ageGroup, percentage }) => `${ageGroup}: ${percentage}%`}
                    >
                      {(getUserReport()?.demographics || []).map((entry: Demographic, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Reports */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card data-testid="card-total-content">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                <FileImage className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-content">
                  {getCurrentReport()?.summary?.totalContent?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  All content items
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-views">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-views">
                  {getCurrentReport()?.summary?.totalViews?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Content views
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-engagement">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-avg-engagement">
                  {getCurrentReport()?.summary?.avgEngagement || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Engagement rate
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-content-trends-chart">
              <CardHeader>
                <CardTitle>Content Trends</CardTitle>
                <CardDescription>Daily content uploads and engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getCurrentReport()?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="uploads" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-content-types-chart">
              <CardHeader>
                <CardTitle>Content Types</CardTitle>
                <CardDescription>Distribution by content type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getContentReport()?.contentTypes || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                    >
                      {(getContentReport()?.contentTypes || []).map((entry: ContentType, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Reports */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-kyc-verified">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">KYC Verified</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-kyc-verified">
                  {getCurrentReport()?.summary?.kycVerified?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Verified users
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-kyc-pending">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">KYC Pending</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-kyc-pending">
                  {getCurrentReport()?.summary?.kycPending?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending verification
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-2257-compliance">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">2257 Compliance</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-2257-compliance">
                  {getCurrentReport()?.summary?.compliance2257 || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Compliance rate
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-gdpr-compliance">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GDPR Compliance</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-gdpr-compliance">
                  {getCurrentReport()?.summary?.complianceGDPR || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  GDPR compliance
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-verification-trends-chart">
              <CardHeader>
                <CardTitle>Verification Trends</CardTitle>
                <CardDescription>Daily KYC submissions and approvals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getCurrentReport()?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="kycSubmitted" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="kycApproved" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-verification-status-chart">
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>Current verification status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getComplianceReport()?.verificationStatus || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label
                    >
                      {(getComplianceReport()?.verificationStatus || []).map((entry: VerificationStatus, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}