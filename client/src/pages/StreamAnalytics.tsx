import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Eye,
  DollarSign,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Download,
  Share2,
  Target,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle,
  Crown,
  Gift,
  Heart,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
} from 'lucide-react';
import { formatDistanceToNow, format, subDays, startOfDay } from 'date-fns';
import { type liveStreams } from '@shared/schema';

type Stream = typeof liveStreams.$inferSelect;

interface AnalyticsData {
  overview: {
    totalViews: number;
    peakViewers: number;
    totalDuration: number;
    totalEarnings: number;
    averageViewTime: number;
    engagementRate: number;
    newSubscribers: number;
    retentionRate: number;
  };
  viewerData: Array<{
    timestamp: string;
    viewers: number;
    messages: number;
  }>;
  demographics: {
    devices: Array<{ name: string; value: number; color: string }>;
    locations: Array<{ country: string; viewers: number; percentage: number }>;
    ages: Array<{ range: string; count: number; percentage: number }>;
  };
  revenue: {
    tips: number;
    subscriptions: number;
    totalRevenue: number;
    revenueHistory: Array<{
      date: string;
      tips: number;
      subscriptions: number;
      total: number;
    }>;
  };
  engagement: {
    totalMessages: number;
    uniqueChatters: number;
    averageMessagesPerUser: number;
    topChatters: Array<{
      username: string;
      messageCount: number;
      tipAmount: number;
    }>;
  };
}

interface StreamAnalyticsProps {
  streamId?: string;
}

const StreamAnalytics = ({ streamId }: StreamAnalyticsProps) => {
  const { id } = useParams<{ id: string }>();
  const actualStreamId = streamId || id;
  const { user, isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('viewers');

  // Fetch stream details
  const { data: stream, isLoading: streamLoading, error: streamError } = useQuery<Stream>({
    queryKey: ['/api/streams', actualStreamId],
    enabled: !!actualStreamId,
  });

  // Mock analytics data - in production this would come from GetStream webhooks
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    overview: {
      totalViews: 1247,
      peakViewers: 89,
      totalDuration: 7200, // 2 hours in seconds
      totalEarnings: 284.50,
      averageViewTime: 18.5, // minutes
      engagementRate: 23.4, // percentage
      newSubscribers: 12,
      retentionRate: 68.2, // percentage
    },
    viewerData: [],
    demographics: {
      devices: [
        { name: 'Desktop', value: 45, color: '#8B5CF6' },
        { name: 'Mobile', value: 35, color: '#F59E0B' },
        { name: 'Tablet', value: 20, color: '#10B981' },
      ],
      locations: [
        { country: 'United States', viewers: 421, percentage: 33.8 },
        { country: 'United Kingdom', viewers: 186, percentage: 14.9 },
        { country: 'Canada', viewers: 124, percentage: 9.9 },
        { country: 'Germany', viewers: 98, percentage: 7.9 },
        { country: 'Australia', viewers: 87, percentage: 7.0 },
      ],
      ages: [
        { range: '18-24', count: 298, percentage: 23.9 },
        { range: '25-34', count: 423, percentage: 33.9 },
        { range: '35-44', count: 287, percentage: 23.0 },
        { range: '45-54', count: 156, percentage: 12.5 },
        { range: '55+', count: 83, percentage: 6.7 },
      ],
    },
    revenue: {
      tips: 189.25,
      subscriptions: 95.25,
      totalRevenue: 284.50,
      revenueHistory: [],
    },
    engagement: {
      totalMessages: 1892,
      uniqueChatters: 234,
      averageMessagesPerUser: 8.1,
      topChatters: [
        { username: 'StreamFan2023', messageCount: 47, tipAmount: 25.00 },
        { username: 'CoolViewer', messageCount: 32, tipAmount: 15.50 },
        { username: 'LiveStreamLover', messageCount: 28, tipAmount: 30.00 },
        { username: 'ChatMaster', messageCount: 25, tipAmount: 5.00 },
        { username: 'RegularWatcher', messageCount: 22, tipAmount: 10.75 },
      ],
    },
  });

  // Generate mock data
  useEffect(() => {
    const generateViewerData = () => {
      const data = [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const timestamp = format(subDays(now, i), 'MMM dd');
        data.push({
          timestamp,
          viewers: Math.floor(Math.random() * 100) + 20,
          messages: Math.floor(Math.random() * 200) + 50,
        });
      }
      return data;
    };

    const generateRevenueHistory = () => {
      const data = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(now, i), 'MMM dd');
        const tips = Math.floor(Math.random() * 50) + 10;
        const subscriptions = Math.floor(Math.random() * 30) + 5;
        data.push({
          date,
          tips,
          subscriptions,
          total: tips + subscriptions,
        });
      }
      return data;
    };

    setAnalyticsData(prev => ({
      ...prev,
      viewerData: generateViewerData(),
      revenue: {
        ...prev.revenue,
        revenueHistory: generateRevenueHistory(),
      },
    }));
  }, [dateRange]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const exportData = () => {
    // In production, this would export analytics data
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stream-analytics-${actualStreamId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || streamLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (streamError || !stream) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load stream analytics. Please check the stream ID and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="stream-analytics">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-analytics-title">
            Stream Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            {stream.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" data-testid="button-share">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-views">
              {analyticsData.overview.totalViews.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Viewers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-peak-viewers">
              {analyticsData.overview.peakViewers}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-earnings">
              ${analyticsData.overview.totalEarnings.toFixed(2)}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +23.1% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-engagement-rate">
              {analyticsData.overview.engagementRate}%
            </div>
            <div className="flex items-center text-xs text-red-600 mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              -2.3% from last period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="audience" data-testid="tab-audience">Audience</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
          <TabsTrigger value="engagement" data-testid="tab-engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Viewer Trends
                </CardTitle>
                <CardDescription>
                  Concurrent viewers over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.viewerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="viewers" 
                      stroke="#8B5CF6" 
                      fill="#8B5CF6" 
                      fillOpacity={0.3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average View Time</span>
                    <span className="font-medium">{analyticsData.overview.averageViewTime} min</span>
                  </div>
                  <Progress value={analyticsData.overview.averageViewTime * 2} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Retention Rate</span>
                    <span className="font-medium">{analyticsData.overview.retentionRate}%</span>
                  </div>
                  <Progress value={analyticsData.overview.retentionRate} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stream Duration</span>
                    <span className="font-medium">{formatDuration(analyticsData.overview.totalDuration)}</span>
                  </div>
                  <Progress value={75} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>New Subscribers</span>
                    <span className="font-medium text-green-600">+{analyticsData.overview.newSubscribers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Device Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.demographics.devices}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name} ${value}%`}
                    >
                      {analyticsData.demographics.devices.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.demographics.locations.map((location, index) => (
                    <div key={location.country} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm">{location.country}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{location.viewers}</div>
                        <div className="text-xs text-muted-foreground">{location.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Age Demographics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.demographics.ages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tips</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-tips-revenue">
                  ${analyticsData.revenue.tips.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  66.5% of total revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-subscription-revenue">
                  ${analyticsData.revenue.subscriptions.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  33.5% of total revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-revenue">
                  ${analyticsData.revenue.totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-green-600">
                  +23.1% from last period
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>
                Daily revenue breakdown over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.revenue.revenueHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tips" stackId="revenue" fill="#F59E0B" name="Tips" />
                  <Bar dataKey="subscriptions" stackId="revenue" fill="#8B5CF6" name="Subscriptions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Chat Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.viewerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="messages" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600" data-testid="text-total-messages">
                      {analyticsData.engagement.totalMessages.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Messages</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-unique-chatters">
                      {analyticsData.engagement.uniqueChatters}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique Chatters</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">
                    {analyticsData.engagement.averageMessagesPerUser.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Messages per User</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Chatters</CardTitle>
              <CardDescription>
                Most active viewers in chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.engagement.topChatters.map((chatter, index) => (
                  <div key={chatter.username} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{chatter.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {chatter.messageCount} messages
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        ${chatter.tipAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">tips given</div>
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
};

export default StreamAnalytics;