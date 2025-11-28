import { useState, useEffect, useRef } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Heart,
  MessageCircle,
  Share2,
  DollarSign,
  Gift,
  Users,
  Eye,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  MoreVertical,
  Send,
  Crown,
  Star,
  Lock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type liveStreams } from '@shared/schema';

type Stream = typeof liveStreams.$inferSelect;

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'tip' | 'subscription' | 'system';
  tipAmount?: number;
  isVip?: boolean;
  isModerator?: boolean;
}

interface LiveViewerProps {
  streamId?: string;
}

const LiveViewer = ({ streamId }: LiveViewerProps) => {
  const { id } = useParams<{ id: string }>();
  const actualStreamId = streamId || id;
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch stream details
  const { data: stream, isLoading: streamLoading, error: streamError } = useQuery<Stream>({
    queryKey: ['/api/streams', actualStreamId],
    enabled: !!actualStreamId,
  });

  // Fetch creator profile
  const { data: creator } = useQuery<any>({
    queryKey: ['/api/creators', stream?.creatorId],
    enabled: !!stream?.creatorId,
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/creators/${stream?.creatorId}/subscribe`, {});
    },
    onSuccess: () => {
      setIsSubscribed(true);
      queryClient.invalidateQueries({ queryKey: ['/api/creators', stream?.creatorId] });
      toast({
        title: "Subscribed!",
        description: "You're now subscribed to this creator.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Tip mutation
  const tipMutation = useMutation({
    mutationFn: async (amount: number) => {
      return apiRequest('POST', '/api/tips', {
        recipientId: stream?.creatorId,
        amountCents: amount * 100,
        streamId: actualStreamId,
      });
    },
    onSuccess: () => {
      setShowTipDialog(false);
      setTipAmount('');
      toast({
        title: "Tip Sent!",
        description: "Your tip has been sent to the creator.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Tip Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send chat message
  const sendMessage = () => {
    if (!chatMessage.trim() || !isAuthenticated) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: user?.id || '',
      username: user?.username || 'Anonymous',
      message: chatMessage,
      timestamp: new Date(),
      type: 'message',
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage('');

    // Auto-scroll to bottom
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Simulate live features
  useEffect(() => {
    if (stream?.status !== 'live') return;

    // Simulate viewer count updates
    const viewerInterval = setInterval(() => {
      setViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 10) - 4));
    }, 5000);

    // Simulate chat messages
    const chatInterval = setInterval(() => {
      const sampleMessages = [
        'Amazing stream! 🔥',
        'Love this content!',
        'Hello everyone! 👋',
        'This is so cool!',
        'Great work!',
      ];
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        userId: 'sample-user',
        username: `Viewer${Math.floor(Math.random() * 1000)}`,
        message: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
        timestamp: new Date(),
        type: 'message',
      };

      setChatMessages(prev => [...prev.slice(-49), newMessage]); // Keep last 50 messages
    }, 8000);

    return () => {
      clearInterval(viewerInterval);
      clearInterval(chatInterval);
    };
  }, [stream?.status]);

  // Initialize viewer count
  useEffect(() => {
    if (stream?.status === 'live') {
      setViewerCount(Math.floor(Math.random() * 500) + 50);
    }
  }, [stream?.status]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  if (streamLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading stream...</p>
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
            Stream not found or no longer available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check access permissions
  const hasAccess = stream.type === 'public' || 
                   (stream.type === 'subscribers_only' && isSubscribed) || 
                   (stream.type === 'private' && isAuthenticated);

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Premium Content</CardTitle>
            <CardDescription>
              {stream.type === 'subscribers_only' 
                ? 'This stream is exclusive to subscribers only.'
                : 'This is a private stream with restricted access.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {stream.type === 'subscribers_only' && (
              <Button 
                onClick={() => subscribeMutation.mutate()}
                disabled={subscribeMutation.isPending || !isAuthenticated}
                data-testid="button-subscribe"
              >
                <Star className="h-4 w-4 mr-2" />
                {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe to Watch'}
              </Button>
            )}
            {!isAuthenticated && (
              <p className="text-sm text-muted-foreground">
                Please log in to access this content.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="live-viewer">
      <div className="grid lg:grid-cols-4 gap-6 p-4">
        {/* Video Player Section */}
        <div className="lg:col-span-3 space-y-4">
          {/* Video Player */}
          <Card className="relative overflow-hidden bg-black">
            <div className="aspect-video relative">
              {stream.status === 'live' ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    poster="/api/placeholder/800/450"
                    autoPlay
                    muted={isMuted}
                    data-testid="video-player"
                  >
                    <source src={stream.streamUrl || ''} type="application/x-mpegURL" />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePlayPause}
                        className="text-white hover:bg-white/20"
                        data-testid="button-play-pause"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20"
                        data-testid="button-mute"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                      
                      <div className="flex-1" />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white/20"
                        data-testid="button-fullscreen"
                      >
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Stream Offline</h3>
                    <p className="text-muted-foreground">
                      {stream.status === 'scheduled' ? 'Stream is scheduled to begin soon' : 'This stream has ended'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Live Badge */}
            {stream.status === 'live' && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-red-600 text-white animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  LIVE
                </Badge>
              </div>
            )}
            
            {/* Viewer Count */}
            {stream.status === 'live' && (
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-black/50 text-white" data-testid="badge-viewer-count">
                  <Eye className="h-3 w-3 mr-1" />
                  {viewerCount.toLocaleString()}
                </Badge>
              </div>
            )}
          </Card>

          {/* Stream Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2" data-testid="text-stream-title">
                    {stream.title}
                  </CardTitle>
                  {stream.description && (
                    <CardDescription data-testid="text-stream-description">
                      {stream.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" data-testid="button-share">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Creator Info */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={creator?.avatarUrl || ''} />
                    <AvatarFallback>
                      {creator?.displayName?.charAt(0) || creator?.username?.charAt(0) || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold" data-testid="text-creator-name">
                      {creator?.displayName || creator?.username || 'Creator'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {creator?.subscriberCount || 0} subscribers
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isSubscribed && (
                    <Button 
                      onClick={() => subscribeMutation.mutate()}
                      disabled={subscribeMutation.isPending || !isAuthenticated}
                      data-testid="button-subscribe-header"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Subscribe
                    </Button>
                  )}
                  
                  <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={!isAuthenticated} data-testid="button-tip">
                        <Gift className="h-4 w-4 mr-2" />
                        Tip
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send a Tip</DialogTitle>
                        <DialogDescription>
                          Show your appreciation with a tip!
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                          {['5', '10', '25', '50'].map((amount) => (
                            <Button
                              key={amount}
                              variant="outline"
                              onClick={() => setTipAmount(amount)}
                              className={tipAmount === amount ? 'border-primary bg-primary/10' : ''}
                            >
                              ${amount}
                            </Button>
                          ))}
                        </div>
                        <Input
                          placeholder="Custom amount"
                          value={tipAmount}
                          onChange={(e) => setTipAmount(e.target.value)}
                          type="number"
                          min="1"
                          data-testid="input-tip-amount"
                        />
                        <Button
                          onClick={() => tipMutation.mutate(parseFloat(tipAmount))}
                          disabled={!tipAmount || tipMutation.isPending}
                          className="w-full"
                          data-testid="button-send-tip"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          {tipMutation.isPending ? 'Sending...' : `Send $${tipAmount} Tip`}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Chat Section */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Live Chat
                <Badge variant="outline" className="ml-auto">
                  {chatMessages.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Chat Messages */}
              <ScrollArea 
                className="flex-1 px-4"
                ref={chatContainerRef}
                data-testid="chat-messages"
              >
                <div className="space-y-3 pb-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex gap-2 text-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="font-medium text-primary">
                            {message.username}
                          </span>
                          {message.isModerator && (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          )}
                          {message.isVip && (
                            <Star className="h-3 w-3 text-purple-500" />
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        {message.type === 'tip' && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 mb-1">
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Gift className="h-3 w-3" />
                              <span className="font-medium">
                                Tipped ${message.tipAmount}
                              </span>
                            </div>
                          </div>
                        )}
                        <p className="break-words">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Chat Input */}
              <div className="border-t p-4">
                {isAuthenticated ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      data-testid="input-chat-message"
                    />
                    <Button 
                      size="sm" 
                      onClick={sendMessage}
                      disabled={!chatMessage.trim()}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Log in to participate in chat
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveViewer;