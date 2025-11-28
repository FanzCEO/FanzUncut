import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
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
  Users, 
  DollarSign, 
  FileText, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Eye,
  Download,
  Upload,
  MessageSquare,
  UserCheck,
  CreditCard,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";

// TypeScript interfaces for type safety
interface DashboardOverview {
  totalUsers?: number;
  totalRevenue?: number;
  totalContent?: number;
  totalTransactions?: number;
  monthlyGrowth?: {
    users?: number;
    revenue?: number;
    content?: number;
    transactions?: number;
  };
}

interface ActivityItem {
  id: number;
  type: string;
  user: string;
  time: string;
  status: string;
}

interface AlertItem {
  id: number;
  type: string;
  message: string;
  time: string;
}

interface RevenueChartData {
  name: string;
  revenue: number;
  users: number;
}

interface ContentStats {
  name: string;
  value: number;
  color: string;
}

interface DashboardStats {
  recentActivity?: ActivityItem[];
  alerts?: AlertItem[];
  revenueChart?: RevenueChartData[];
  contentStats?: ContentStats[];
}

interface SystemMetrics {
  cpu?: { usage: number; status: string };
  memory?: { usage: number; status: string };
  disk?: { usage: number; status: string };
  network?: { latency: number; status: string };
}

interface ServiceStatus {
  name: string;
  status: string;
  uptime: string;
}

interface SystemHealth {
  overall?: string;
  metrics?: SystemMetrics;
  services?: ServiceStatus[];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [refreshTime, setRefreshTime] = useState(new Date());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Dashboard Overview Data
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/overview', refreshTime],
    refetchInterval: 30000,
  });

  // Dashboard Stats Data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/stats', refreshTime],
    refetchInterval: 30000,
  });

  // System Health Data
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/system-health', refreshTime],
    refetchInterval: 15000,
  });

  // Mock data for demonstration (will be replaced by real API data)
  const mockOverview = {
    totalUsers: 15742,
    totalRevenue: 285630.50,
    totalContent: 8945,
    totalTransactions: 12867,
    monthlyGrowth: {
      users: 12.5,
      revenue: 24.8,
      content: 8.9,
      transactions: 18.4
    }
  };

  const mockStats = {
    recentActivity: [
      { id: 1, type: 'user_registration', user: 'Sarah Johnson', time: '2 minutes ago', status: 'completed' },
      { id: 2, type: 'content_upload', user: 'Mike Chen', time: '5 minutes ago', status: 'processing' },
      { id: 3, type: 'payout_request', user: 'Emma Davis', time: '8 minutes ago', status: 'pending' },
      { id: 4, type: 'verification_submitted', user: 'Alex Rodriguez', time: '12 minutes ago', status: 'review' },
      { id: 5, type: 'complaint_filed', user: 'Jamie Wilson', time: '15 minutes ago', status: 'assigned' }
    ],
    alerts: [
      { id: 1, type: 'warning', message: 'High server load detected on CDN-02', time: '3 minutes ago' },
      { id: 2, type: 'info', message: '24 new verification requests pending review', time: '10 minutes ago' },
      { id: 3, type: 'error', message: 'Payment processor experiencing delays', time: '25 minutes ago' }
    ],
    revenueChart: [
      { name: 'Jan', revenue: 45000, users: 1200 },
      { name: 'Feb', revenue: 52000, users: 1580 },
      { name: 'Mar', revenue: 48000, users: 1745 },
      { name: 'Apr', revenue: 61000, users: 1923 },
      { name: 'May', revenue: 68000, users: 2156 },
      { name: 'Jun', revenue: 72000, users: 2398 }
    ],
    contentStats: [
      { name: 'Photos', value: 4520, color: '#8884d8' },
      { name: 'Videos', value: 2890, color: '#82ca9d' },
      { name: 'Audio', value: 1245, color: '#ffc658' },
      { name: 'Other', value: 290, color: '#ff7300' }
    ]
  };

  const mockSystemHealth = {
    overall: 'healthy',
    metrics: {
      cpu: { usage: 45, status: 'normal' },
      memory: { usage: 67, status: 'normal' },
      disk: { usage: 34, status: 'normal' },
      network: { latency: 12, status: 'normal' }
    },
    services: [
      { name: 'API Gateway', status: 'healthy', uptime: '99.9%' },
      { name: 'Database', status: 'healthy', uptime: '99.8%' },
      { name: 'CDN', status: 'warning', uptime: '98.2%' },
      { name: 'Payment Service', status: 'healthy', uptime: '99.5%' },
      { name: 'Media Processing', status: 'healthy', uptime: '99.7%' },
      { name: 'Notifications', status: 'healthy', uptime: '99.9%' }
    ]
  };

  const currentData: DashboardOverview = overview || mockOverview;
  const currentStats: DashboardStats = stats || mockStats;
  const currentHealth: SystemHealth = systemHealth || mockSystemHealth;

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': case 'unhealthy': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-500 bg-red-50 text-red-700';
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      case 'info': return 'border-blue-500 bg-blue-50 text-blue-700';
      default: return 'border-gray-500 bg-gray-50 text-gray-700';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <UserCheck className="h-4 w-4" />;
      case 'content_upload': return <Upload className="h-4 w-4" />;
      case 'payout_request': return <CreditCard className="h-4 w-4" />;
      case 'verification_submitted': return <Shield className="h-4 w-4" />;
      case 'complaint_filed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-700" data-testid={`status-${status}`}>Completed</Badge>;
      case 'processing': return <Badge className="bg-blue-100 text-blue-700" data-testid={`status-${status}`}>Processing</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700" data-testid={`status-${status}`}>Pending</Badge>;
      case 'review': return <Badge className="bg-purple-100 text-purple-700" data-testid={`status-${status}`}>Review</Badge>;
      case 'assigned': return <Badge className="bg-orange-100 text-orange-700" data-testid={`status-${status}`}>Assigned</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700" data-testid={`status-${status}`}>{status}</Badge>;
    }
  };

  if (overviewLoading || statsLoading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
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
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="dashboard-title">Admin Dashboard</h1>
          <p className="text-muted-foreground" data-testid="dashboard-subtitle">
            Welcome back, {user?.firstName}. Here's what's happening on your platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setRefreshTime(new Date())}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground" data-testid="text-last-updated">
            Last updated: {refreshTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-users">
              {currentData.totalUsers?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +{currentData.monthlyGrowth?.users || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-revenue">
              ${currentData.totalRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +{currentData.monthlyGrowth?.revenue || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-content">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-content">
              {currentData.totalContent?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +{currentData.monthlyGrowth?.content || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-transactions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-transactions">
              {currentData.totalTransactions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +{currentData.monthlyGrowth?.transactions || 0}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" data-testid="dashboard-tabs">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest platform activities and events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentStats.recentActivity?.map((activity: ActivityItem) => (
                  <div key={activity.id} className="flex items-center justify-between" data-testid={`activity-item-${activity.id}`}>
                    <div className="flex items-center gap-3">
                      {getActivityIcon(activity.type)}
                      <div>
                        <p className="text-sm font-medium" data-testid={`activity-user-${activity.id}`}>
                          {activity.user}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`activity-time-${activity.id}`}>
                          {activity.time}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card data-testid="card-system-alerts">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  System Alerts
                </CardTitle>
                <CardDescription>Important notifications and warnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentStats.alerts?.map((alert: AlertItem) => (
                  <Alert key={alert.id} className={getAlertColor(alert.type)} data-testid={`alert-item-${alert.id}`}>
                    <AlertDescription>
                      <div className="flex justify-between items-start">
                        <span data-testid={`alert-message-${alert.id}`}>{alert.message}</span>
                        <span className="text-xs opacity-70" data-testid={`alert-time-${alert.id}`}>
                          {alert.time}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card data-testid="card-quick-actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2" 
                  data-testid="button-user-management"
                >
                  <Users className="h-6 w-6" />
                  User Management
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2" 
                  data-testid="button-complaints"
                >
                  <MessageSquare className="h-6 w-6" />
                  Complaints
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2" 
                  data-testid="button-withdrawals"
                >
                  <CreditCard className="h-6 w-6" />
                  Withdrawals
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2" 
                  data-testid="button-verification"
                >
                  <Shield className="h-6 w-6" />
                  Verification
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card data-testid="card-revenue-chart">
              <CardHeader>
                <CardTitle>Revenue & User Growth</CardTitle>
                <CardDescription>Monthly revenue and user acquisition trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={currentStats.revenueChart || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Content Distribution */}
            <Card data-testid="card-content-distribution">
              <CardHeader>
                <CardTitle>Content Distribution</CardTitle>
                <CardDescription>Breakdown of content types on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={currentStats.contentStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {currentStats.contentStats?.map((entry: ContentStats, index: number) => (
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

        <TabsContent value="system" className="space-y-6">
          {/* System Health Overview */}
          <Card data-testid="card-system-health">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Health Overview
                <Badge 
                  className={`ml-auto ${currentHealth.overall === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  data-testid="badge-system-overall"
                >
                  {currentHealth.overall}
                </Badge>
              </CardTitle>
              <CardDescription>Real-time system performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2" data-testid="metric-cpu">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    <span className="text-sm font-medium">CPU Usage</span>
                  </div>
                  <Progress value={currentHealth.metrics?.cpu?.usage || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {currentHealth.metrics?.cpu?.usage || 0}% - {currentHealth.metrics?.cpu?.status || 'unknown'}
                  </p>
                </div>

                <div className="space-y-2" data-testid="metric-memory">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm font-medium">Memory</span>
                  </div>
                  <Progress value={currentHealth.metrics?.memory?.usage || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {currentHealth.metrics?.memory?.usage || 0}% - {currentHealth.metrics?.memory?.status || 'unknown'}
                  </p>
                </div>

                <div className="space-y-2" data-testid="metric-disk">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <span className="text-sm font-medium">Disk Usage</span>
                  </div>
                  <Progress value={currentHealth.metrics?.disk?.usage || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {currentHealth.metrics?.disk?.usage || 0}% - {currentHealth.metrics?.disk?.status || 'unknown'}
                  </p>
                </div>

                <div className="space-y-2" data-testid="metric-network">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm font-medium">Network</span>
                  </div>
                  <p className="text-sm font-medium">{currentHealth.metrics?.network?.latency || 0}ms</p>
                  <p className="text-xs text-muted-foreground">
                    {currentHealth.metrics?.network?.status || 'unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Status */}
          <Card data-testid="card-service-status">
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Status and uptime of critical platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentHealth.services?.map((service: ServiceStatus, index: number) => (
                  <div key={index} className="flex items-center justify-between" data-testid={`service-${index}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'healthy' ? 'bg-green-500' : 
                        service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium" data-testid={`service-name-${index}`}>
                        {service.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground" data-testid={`service-uptime-${index}`}>
                        {service.uptime} uptime
                      </span>
                      <Badge 
                        className={getHealthColor(service.status)}
                        data-testid={`service-status-${index}`}
                      >
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}