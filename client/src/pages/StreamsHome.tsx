import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  Eye,
  Users,
  Clock,
  Star,
  Search,
  Filter,
  Grid,
  List,
  Play,
  Calendar,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type liveStreams } from '@shared/schema';

type Stream = typeof liveStreams.$inferSelect;

interface StreamWithCreator extends Stream {
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  viewerCount?: number;
  isLive?: boolean;
}

const StreamsHome = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('viewers');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock data - in production this would come from API
  const mockStreams: StreamWithCreator[] = [
    {
      id: '1',
      creatorId: 'creator1',
      title: 'Gaming Session - Live Q&A',
      description: 'Join me for some gaming and chat!',
      type: 'public',
      status: 'live',
      priceCents: 0,
      streamKey: null,
      streamUrl: 'https://example.com/stream1',
      thumbnailUrl: null,
      scheduledFor: null,
      getstreamCallId: null,
      recordingUrl: null,
      playbackUrl: null,
      hlsPlaylistUrl: null,
      dashPlaylistUrl: null,
      streamingConfig: null,
      maxViewers: null,
      totalViewTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: {
        id: 'creator1',
        username: 'gamerguy123',
        displayName: 'Gamer Guy',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        isVerified: true,
      },
      viewerCount: 1247,
      isLive: true,
    },
    {
      id: '2',
      creatorId: 'creator2',
      title: 'Fitness Workout Live',
      description: 'Get fit with me - morning workout session',
      type: 'subscribers_only',
      status: 'live',
      priceCents: 999,
      streamKey: null,
      streamUrl: 'https://example.com/stream2',
      thumbnailUrl: null,
      scheduledFor: null,
      getstreamCallId: null,
      recordingUrl: null,
      playbackUrl: null,
      hlsPlaylistUrl: null,
      dashPlaylistUrl: null,
      streamingConfig: null,
      maxViewers: null,
      totalViewTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: {
        id: 'creator2',
        username: 'fitnesscoach',
        displayName: 'Coach Mike',
        avatarUrl: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=100&h=100&fit=crop&crop=face',
        isVerified: true,
      },
      viewerCount: 456,
      isLive: true,
    },
    {
      id: '3',
      creatorId: 'creator3',
      title: 'Music Production Session',
      description: 'Creating beats live - come hang out!',
      type: 'public',
      status: 'scheduled',
      priceCents: 0,
      streamKey: null,
      streamUrl: null,
      thumbnailUrl: null,
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      getstreamCallId: null,
      recordingUrl: null,
      playbackUrl: null,
      hlsPlaylistUrl: null,
      dashPlaylistUrl: null,
      streamingConfig: null,
      maxViewers: null,
      totalViewTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: {
        id: 'creator3',
        username: 'musicproducer',
        displayName: 'Beat Maker',
        avatarUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop&crop=face',
        isVerified: false,
      },
      viewerCount: 0,
      isLive: false,
    },
  ];

  // Filter and sort streams
  const filteredStreams = mockStreams
    .filter(stream => {
      if (searchQuery && !stream.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !stream.creator.displayName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedCategory === 'live' && stream.status !== 'live') return false;
      if (selectedCategory === 'scheduled' && stream.status !== 'scheduled') return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'viewers':
          return (b.viewerCount || 0) - (a.viewerCount || 0);
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const liveStreamsCount = mockStreams.filter(s => s.status === 'live').length;
  const scheduledStreamsCount = mockStreams.filter(s => s.status === 'scheduled').length;

  const StreamCard = ({ stream }: { stream: StreamWithCreator }) => (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="relative">
        {/* Thumbnail/Preview */}
        <div className="aspect-video bg-muted relative overflow-hidden">
          {stream.thumbnailUrl ? (
            <img
              src={stream.thumbnailUrl}
              alt={stream.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Video className="h-8 w-8 text-primary/60" />
            </div>
          )}
          
          {/* Live Badge */}
          {stream.isLive && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-red-600 text-white animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                LIVE
              </Badge>
            </div>
          )}
          
          {/* Viewer Count */}
          {stream.isLive && stream.viewerCount && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-black/50 text-white">
                <Eye className="h-3 w-3 mr-1" />
                {stream.viewerCount.toLocaleString()}
              </Badge>
            </div>
          )}
          
          {/* Price Badge */}
          {stream.priceCents && stream.priceCents > 0 && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-yellow-600 text-white">
                ${(stream.priceCents / 100).toFixed(2)}
              </Badge>
            </div>
          )}
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="h-6 w-6 text-black ml-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={stream.creator.avatarUrl} />
            <AvatarFallback>
              {stream.creator.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate mb-1" data-testid={`stream-title-${stream.id}`}>
              {stream.title}
            </h3>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-muted-foreground">{stream.creator.displayName}</span>
              {stream.creator.isVerified && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            {stream.status === 'scheduled' && stream.scheduledFor && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(stream.scheduledFor), { addSuffix: true })}
              </div>
            )}
            
            {stream.status === 'live' && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <Clock className="h-3 w-3" />
                Started {formatDistanceToNow(new Date(stream.createdAt), { addSuffix: true })}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {stream.type === 'subscribers_only' && (
              <Badge variant="outline" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Subscribers Only
              </Badge>
            )}
            {stream.type === 'private' && (
              <Badge variant="outline" className="text-xs">
                Private
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Link href={stream.isLive ? `/streams/${stream.id}/watch` : `/streams/${stream.id}`}>
          <Button className="w-full mt-3" variant={stream.isLive ? "default" : "outline"}>
            {stream.isLive ? 'Watch Now' : 'View Stream'}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="streams-home">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Live Streams</h1>
          <p className="text-muted-foreground">
            {liveStreamsCount} live • {scheduledStreamsCount} scheduled
          </p>
        </div>
        
        {(user?.role === 'creator' || user?.role === 'admin' || user?.role === 'moderator') && (
          <Link href="/streams/create">
            <Button className="bg-red-600 hover:bg-red-700" data-testid="create-stream-button">
              <Plus className="h-4 w-4 mr-2" />
              Create Stream
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live Now</span>
            </div>
            <div className="text-2xl font-bold mt-1">{liveStreamsCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Scheduled</span>
            </div>
            <div className="text-2xl font-bold mt-1">{scheduledStreamsCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Viewers</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {mockStreams.reduce((sum, stream) => sum + (stream.viewerCount || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Trending</span>
            </div>
            <div className="text-2xl font-bold mt-1">+23%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search streams or creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-streams"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Streams</SelectItem>
              <SelectItem value="live">Live Now</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewers">Most Viewers</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border border-border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stream Grid */}
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'grid-cols-1'
      }`}>
        {filteredStreams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} />
        ))}
      </div>

      {filteredStreams.length === 0 && (
        <div className="text-center py-12">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No streams found</h3>
          <p className="text-muted-foreground">
            {searchQuery 
              ? 'Try adjusting your search or filters'
              : 'No streams are currently available'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default StreamsHome;