import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Loader2, Calendar, Users, Ticket, Lock, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

type LiveEvent = {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  eventType: string;
  status: string;
  accessType: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  ticketPriceCents: number;
  maxAttendees: number | null;
  totalAttendees: number;
  nftSouvenirEnabled: boolean;
  creator?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export default function EventsHome() {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery<LiveEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: myTickets } = useQuery<any[]>({
    queryKey: ["/api/events/my-tickets"],
    enabled: !!user,
  });

  const upcomingEvents = events?.filter(e => e.status === "scheduled") || [];
  const liveEvents = events?.filter(e => e.status === "live") || [];
  const endedEvents = events?.filter(e => e.status === "ended") || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-fanz-red" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-bebas tracking-wide">
              LIVE EVENTS
            </h1>
            <p className="text-sm md:text-base text-gray-400">
              Immersive virtual meetups with your favorite creators
            </p>
          </div>
          {user?.role === "creator" && (
            <Link href="/events/host">
              <Button
                data-testid="button-create-event"
                className="bg-fanz-red hover:bg-fanz-red/90 text-white font-bold"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Host Event
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Live Now</p>
                  <p className="text-2xl font-bold text-fanz-red">{liveEvents.length}</p>
                </div>
                <Video className="h-8 w-8 text-fanz-red" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Upcoming</p>
                  <p className="text-2xl font-bold text-fanz-gold">{upcomingEvents.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-fanz-gold" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">My Tickets</p>
                  <p className="text-2xl font-bold text-white">{myTickets?.length || 0}</p>
                </div>
                <Ticket className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="bg-white/5 backdrop-blur-md border-white/10 mb-4 md:mb-6 w-full grid grid-cols-3">
          <TabsTrigger value="live" data-testid="tab-live-events" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Live Now </span>({liveEvents.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming-events" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Upcoming </span>({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="ended" data-testid="tab-ended-events" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Past </span>({endedEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <EventGrid events={liveEvents} type="live" />
        </TabsContent>

        <TabsContent value="upcoming">
          <EventGrid events={upcomingEvents} type="upcoming" />
        </TabsContent>

        <TabsContent value="ended">
          <EventGrid events={endedEvents} type="ended" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventGrid({ events, type }: { events: LiveEvent[]; type: string }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="h-16 w-16 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">No {type} events at the moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: LiveEvent }) {
  const getStatusBadge = () => {
    switch (event.status) {
      case "live":
        return (
          <Badge className="bg-fanz-red text-white animate-pulse" data-testid={`badge-status-${event.id}`}>
            🔴 LIVE
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-fanz-gold text-black" data-testid={`badge-status-${event.id}`}>
            Upcoming
          </Badge>
        );
      case "ended":
        return (
          <Badge className="bg-gray-600 text-white" data-testid={`badge-status-${event.id}`}>
            Ended
          </Badge>
        );
      default:
        return null;
    }
  };

  const getAccessBadge = () => {
    switch (event.accessType) {
      case "free":
        return <Badge variant="outline" className="border-green-500 text-green-500">Free</Badge>;
      case "ticketed":
        return (
          <Badge variant="outline" className="border-fanz-gold text-fanz-gold">
            <Ticket className="h-3 w-3 mr-1" />
            ${(event.ticketPriceCents / 100).toFixed(2)}
          </Badge>
        );
      case "subscription_only":
        return (
          <Badge variant="outline" className="border-purple-500 text-purple-500">
            <Lock className="h-3 w-3 mr-1" />
            Subscribers
          </Badge>
        );
      case "tier_gated":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            <Lock className="h-3 w-3 mr-1" />
            Tier Gated
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Link href={`/events/${event.id}`}>
      <Card
        data-testid={`card-event-${event.id}`}
        className="bg-white/5 backdrop-blur-md border-white/10 hover:border-fanz-red/50 transition-all cursor-pointer group overflow-hidden"
      >
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            {getStatusBadge()}
            <div className="flex gap-2">
              {getAccessBadge()}
              {event.nftSouvenirEnabled && (
                <Badge variant="outline" className="border-fanz-gold text-fanz-gold">
                  <Sparkles className="h-3 w-3 mr-1" />
                  NFT
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-white group-hover:text-fanz-red transition-colors" data-testid={`text-event-title-${event.id}`}>
            {event.title}
          </CardTitle>
          <CardDescription className="text-gray-400 line-clamp-2">
            {event.description || "Join this exclusive virtual event"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-400">
              <Calendar className="h-4 w-4 mr-2" />
              <span data-testid={`text-event-date-${event.id}`}>
                {format(new Date(event.scheduledStartAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <div className="flex items-center text-gray-400">
              <Users className="h-4 w-4 mr-2" />
              <span data-testid={`text-event-attendees-${event.id}`}>
                {event.totalAttendees} {event.maxAttendees ? `/ ${event.maxAttendees}` : ""} attendees
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            data-testid={`button-view-event-${event.id}`}
            className="w-full bg-fanz-red hover:bg-fanz-red/90 text-white font-bold"
          >
            {event.status === "live" ? "Join Now" : "View Details"}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
