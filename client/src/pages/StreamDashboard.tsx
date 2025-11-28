import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
  Play,
  Square,
  Users,
  Eye,
  DollarSign,
  Settings,
  Copy,
  ExternalLink,
  Camera,
  Mic,
  MicOff,
  CameraOff,
  Volume2,
  VolumeX,
  Maximize,
  Monitor,
  Smartphone,
  Tv,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type liveStreams } from '@shared/schema';

interface StreamStats {
  viewerCount: number;
  totalViewers: number;
  duration: number;
  messagesCount: number;
  earnings: number;
  peakViewers: number;
}

type Stream = typeof liveStreams.$inferSelect;

interface StreamDashboardProps {
  streamId?: string;
}

const StreamDashboard = ({ streamId }: StreamDashboardProps) => {
  const { id } = useParams<{ id: string }>();
  const actualStreamId = streamId || id;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isLive, setIsLive] = useState(false);
  const [streamStats, setStreamStats] = useState<StreamStats>({
    viewerCount: 0,
    totalViewers: 0,
    duration: 0,
    messagesCount: 0,
    earnings: 0,
    peakViewers: 0,
  });
  const [deviceSettings, setDeviceSettings] = useState({
    camera: true,
    microphone: true,
    volume: true,
  });

  // Fetch stream details
  const { data: stream, isLoading: streamLoading, error: streamError } = useQuery<Stream>({
    queryKey: ['/api/streams', actualStreamId],
    enabled: !!actualStreamId,
  });

  // Start stream mutation
  const startStreamMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/streams/${actualStreamId}/start`, {});
    },
    onSuccess: () => {
      setIsLive(true);
      queryClient.invalidateQueries({ queryKey: ['/api/streams', actualStreamId] });
      toast({
        title: "Stream Started!",
        description: "Your live stream is now broadcasting.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Stream",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // End stream mutation
  const endStreamMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/streams/${actualStreamId}/end`, {});
    },
    onSuccess: () => {
      setIsLive(false);
      queryClient.invalidateQueries({ queryKey: ['/api/streams', actualStreamId] });
      toast({
        title: "Stream Ended",
        description: "Your live stream has been stopped.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to End Stream",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Simulate real-time stats updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setStreamStats(prev => ({
        ...prev,
        viewerCount: Math.max(0, prev.viewerCount + Math.floor(Math.random() * 5) - 2),
        totalViewers: prev.totalViewers + Math.floor(Math.random() * 3),
        duration: prev.duration + 1,
        messagesCount: prev.messagesCount + Math.floor(Math.random() * 2),
        earnings: prev.earnings + (Math.random() * 0.5),
        peakViewers: Math.max(prev.peakViewers, prev.viewerCount),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyStreamUrl = () => {
    if (stream?.streamUrl) {
      navigator.clipboard.writeText(stream.streamUrl);
      toast({
        title: "Copied!",
        description: "Stream URL copied to clipboard.",
      });
    }
  };

  const copyStreamKey = () => {
    if (stream?.streamKey) {
      navigator.clipboard.writeText(stream.streamKey);
      toast({
        title: "Copied!",
        description: "Stream key copied to clipboard.",
      });
    }
  };

  if (authLoading || streamLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading stream dashboard...</p>
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
            Failed to load stream details. Please check the stream ID and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="stream-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-stream-title">
            {stream.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Stream Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={isLive ? "default" : "secondary"}
            className={isLive ? "bg-red-600 text-white animate-pulse" : ""}
            data-testid="badge-stream-status"
          >
            {isLive ? (
              <>
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                LIVE
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 mr-1" />
                {stream.status.toUpperCase()}
              </>
            )}
          </Badge>
          <Badge variant="outline" data-testid="badge-stream-type">
            {stream.type}
          </Badge>
        </div>
      </div>

      {/* Live Controls */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Stream Controls
          </CardTitle>
          <CardDescription>
            Manage your live stream broadcast
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {!isLive ? (
              <Button 
                onClick={() => startStreamMutation.mutate()}
                disabled={startStreamMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-start-stream"
              >
                <Play className="h-4 w-4 mr-2" />
                {startStreamMutation.isPending ? 'Starting...' : 'Go Live'}
              </Button>
            ) : (
              <Button 
                variant="destructive"
                onClick={() => endStreamMutation.mutate()}
                disabled={endStreamMutation.isPending}
                data-testid="button-end-stream"
              >
                <Square className="h-4 w-4 mr-2" />
                {endStreamMutation.isPending ? 'Ending...' : 'End Stream'}
              </Button>
            )}
            
            <div className="flex items-center gap-2">
              <Button
                variant={deviceSettings.camera ? "default" : "outline"}
                size="sm"
                onClick={() => setDeviceSettings(prev => ({ ...prev, camera: !prev.camera }))}
                data-testid="button-toggle-camera"
              >
                {deviceSettings.camera ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={deviceSettings.microphone ? "default" : "outline"}
                size="sm"
                onClick={() => setDeviceSettings(prev => ({ ...prev, microphone: !prev.microphone }))}
                data-testid="button-toggle-microphone"
              >
                {deviceSettings.microphone ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={deviceSettings.volume ? "default" : "outline"}
                size="sm"
                onClick={() => setDeviceSettings(prev => ({ ...prev, volume: !prev.volume }))}
                data-testid="button-toggle-volume"
              >
                {deviceSettings.volume ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {isLive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-viewer-count">
                  {streamStats.viewerCount}
                </div>
                <div className="text-sm text-muted-foreground">Current Viewers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="text-duration">
                  {formatDuration(streamStats.duration)}
                </div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-earnings">
                  ${streamStats.earnings.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Earnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" data-testid="text-messages">
                  {streamStats.messagesCount}
                </div>
                <div className="text-sm text-muted-foreground">Messages</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stream Details & Analytics */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details" data-testid="tab-details">Stream Details</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stream Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1" data-testid="text-stream-description">
                    {stream.description || 'No description provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="mt-1 capitalize" data-testid="text-stream-type">
                    {stream.type.replace('_', ' ')}
                  </p>
                </div>
                {stream.priceCents && stream.priceCents > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Price</label>
                    <p className="mt-1" data-testid="text-stream-price">
                      ${(stream.priceCents / 100).toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1" data-testid="text-stream-created">
                    {stream.createdAt ? formatDistanceToNow(new Date(stream.createdAt), { addSuffix: true }) : 'Unknown'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Streaming Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stream URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                      {stream.streamUrl || 'Not generated yet'}
                    </code>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={copyStreamUrl}
                      disabled={!stream.streamUrl}
                      data-testid="button-copy-url"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stream Key</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                      {stream.streamKey ? '••••••••••••••••' : 'Not generated yet'}
                    </code>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={copyStreamKey}
                      disabled={!stream.streamKey}
                      data-testid="button-copy-key"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-viewers">
                  {streamStats.totalViewers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Peak: {streamStats.peakViewers}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-earnings">
                  ${streamStats.earnings.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From tips and subscriptions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-engagement">
                  {streamStats.messagesCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total messages
                </p>
              </CardContent>
            </Card>
          </div>

          {isLive && (
            <Card>
              <CardHeader>
                <CardTitle>Live Stream Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Connection Quality</span>
                    <span className="text-green-600">Excellent</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Bitrate</span>
                    <span>2.5 Mbps</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Frame Rate</span>
                    <span>30 FPS</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stream Settings</CardTitle>
              <CardDescription>
                Configure your streaming preferences and quality settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Video Quality</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Monitor className="h-4 w-4 mr-2" />
                      1080p (Recommended)
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <Tv className="h-4 w-4 mr-2" />
                      720p
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <Smartphone className="h-4 w-4 mr-2" />
                      480p
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Audio Quality</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      High Quality (256kbps)
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      Standard (128kbps)
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      Low (64kbps)
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Advanced Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure advanced streaming options
                  </p>
                </div>
                <Button variant="outline" data-testid="button-advanced-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StreamDashboard;