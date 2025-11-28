import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Send, 
  Users, 
  DollarSign, 
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  MessageSquare,
  Eye,
  Reply
} from 'lucide-react';

interface MassMessageJob {
  id: string;
  senderId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  messageContent: string;
  priceCents: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface Analytics {
  totalSent: number;
  totalRevenue: number;
  openRate: number;
  responseRate: number;
  averageRecipientsPerMessage: number;
}

const FanSegments = [
  { value: 'all_fans', label: 'All Fans', description: 'Send to all your subscribers', icon: Users },
  { value: 'paying_fans', label: 'Paying Fans', description: 'Fans who have made purchases', icon: DollarSign },
  { value: 'high_spenders', label: 'High Spenders', description: 'Top 20% spenders', icon: TrendingUp },
  { value: 'recent_activity', label: 'Recently Active', description: 'Active in last 7 days', icon: Target }
];

const JobStatusCard = ({ job }: { job: MassMessageJob }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    }
  };

  const progress = job.totalRecipients > 0 ? ((job.sentCount + job.failedCount) / job.totalRecipients) * 100 : 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            <Badge className={getStatusColor(job.status)}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {job.startedAt ? new Date(job.startedAt).toLocaleString() : 'Not started'}
          </span>
        </div>
        
        <p className="text-sm mb-3 line-clamp-2">{job.messageContent}</p>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium">
            {job.sentCount + job.failedCount}/{job.totalRecipients}
          </span>
        </div>
        
        <Progress value={progress} className="h-2 mb-3" />
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600">{job.sentCount}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-600">{job.failedCount}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              ${(job.priceCents * job.sentCount / 100).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
        </div>
        
        {job.error && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600">
            Error: {job.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function MassMessaging() {
  const [messageContent, setMessageContent] = useState('');
  const [targetSegment, setTargetSegment] = useState<string>('');
  const [isPaidMessage, setIsPaidMessage] = useState(false);
  const [messagePrice, setMessagePrice] = useState('');
  const [activeTab, setActiveTab] = useState('compose');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch jobs
  const { data: jobs = [] } = useQuery<MassMessageJob[]>({
    queryKey: ['/api/messages/mass/jobs'],
    refetchInterval: 5000 // Refresh every 5 seconds for real-time updates
  });

  // Fetch analytics
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['/api/messages/mass/analytics'],
  });

  // Send mass message mutation
  const sendMassMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/messages/mass', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to send mass message');
      return response.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/mass/jobs'] });
      setMessageContent('');
      setTargetSegment('');
      setIsPaidMessage(false);
      setMessagePrice('');
      toast({
        title: "Mass message sent!",
        description: `Message queued for ${result.estimatedRecipients || 0} recipients`,
      });
      setActiveTab('jobs');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send mass message",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!messageContent.trim() || !targetSegment) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const priceCents = isPaidMessage && messagePrice ? parseFloat(messagePrice) * 100 : 0;

    sendMassMessageMutation.mutate({
      content: messageContent,
      type: 'text',
      targetSegment,
      priceCents
    });
  };

  const selectedSegment = FanSegments.find(s => s.value === targetSegment);

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="mass-messaging-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Mass Messaging</h1>
        <p className="text-muted-foreground">
          Send messages to your fans in bulk with targeting and pricing options
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose" data-testid="compose-tab">
            <MessageSquare className="h-4 w-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="jobs" data-testid="jobs-tab">
            <Clock className="h-4 w-4 mr-2" />
            Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="analytics-tab">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle>Compose Mass Message</CardTitle>
              <CardDescription>
                Send a message to multiple fans at once with targeting options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Target Segment Selection */}
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={targetSegment} onValueChange={setTargetSegment}>
                  <SelectTrigger data-testid="segment-selector">
                    <SelectValue placeholder="Select fan segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {FanSegments.map((segment) => (
                      <SelectItem key={segment.value} value={segment.value}>
                        <div className="flex items-center gap-2">
                          <segment.icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{segment.label}</div>
                            <div className="text-xs text-muted-foreground">{segment.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSegment && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <selectedSegment.icon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedSegment.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedSegment.description}</p>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="space-y-2">
                <Label htmlFor="message-content">Message Content</Label>
                <Textarea
                  id="message-content"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Write your message..."
                  className="min-h-[120px]"
                  data-testid="message-content"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {messageContent.length}/1000 characters
                </div>
              </div>

              {/* Pricing Options */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label htmlFor="paid-message" className="text-sm font-medium">
                    Charge for this message
                  </Label>
                  <Switch
                    id="paid-message"
                    checked={isPaidMessage}
                    onCheckedChange={setIsPaidMessage}
                    data-testid="paid-message-toggle"
                  />
                </div>
                {isPaidMessage && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="999.99"
                      value={messagePrice}
                      onChange={(e) => setMessagePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-24"
                      data-testid="message-price-input"
                    />
                    <span className="text-sm text-muted-foreground">USD per message</span>
                  </div>
                )}
                {isPaidMessage && messagePrice && targetSegment && (
                  <div className="text-sm text-muted-foreground">
                    💡 Estimated revenue will be calculated based on your audience size
                  </div>
                )}
              </div>

              {/* Send Button */}
              <Button 
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || !targetSegment || sendMassMessageMutation.isPending}
                className="w-full"
                data-testid="send-mass-message"
              >
                {sendMassMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Mass Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Message Jobs</h3>
              <Badge variant="outline">{jobs.length} total</Badge>
            </div>
            
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No mass messages sent yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first mass message to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobStatusCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          {analytics && (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Total Sent</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics.totalSent.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Last 30 days</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Revenue</span>
                    </div>
                    <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">From paid messages</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Open Rate</span>
                    </div>
                    <div className="text-2xl font-bold">{(analytics.openRate * 100).toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Messages viewed</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Reply className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Response Rate</span>
                    </div>
                    <div className="text-2xl font-bold">{(analytics.responseRate * 100).toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Fans who replied</div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Average Recipients per Message</span>
                      <Badge variant="outline">{analytics.averageRecipientsPerMessage}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Average Revenue per Message</span>
                      <Badge variant="outline">
                        ${analytics.totalSent > 0 ? (analytics.totalRevenue / analytics.totalSent).toFixed(2) : '0.00'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}