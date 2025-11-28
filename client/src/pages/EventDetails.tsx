import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Calendar, Clock, Users, Ticket, Sparkles, MapPin, Video, Lock, ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

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
  nftSouvenirName: string | null;
  nftSouvenirDescription: string | null;
  virtualRoomUrl: string | null;
  avatarEnabled: boolean;
  spatialAudioEnabled: boolean;
  creator?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export default function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: event, isLoading } = useQuery<LiveEvent>({
    queryKey: ["/api/events", eventId],
  });

  const { data: myTicket } = useQuery<any>({
    queryKey: ["/api/events", eventId, "my-ticket"],
    enabled: !!user && !!eventId,
  });

  const purchaseTicketMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/events/${eventId}/purchase-ticket`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "my-ticket"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/my-tickets"] });
      toast({
        title: "Ticket purchased!",
        description: "You can now join the event when it goes live.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase failed",
        description: error.message || "Unable to purchase ticket",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-fanz-red" />
      </div>
    );
  }

  const canJoinEvent = event.status === "live" && (
    event.accessType === "free" ||
    (event.accessType === "ticketed" && myTicket)
  );

  const canPurchaseTicket =
    event.accessType === "ticketed" &&
    !myTicket &&
    event.status !== "cancelled" &&
    event.status !== "ended" &&
    (!event.maxAttendees || event.totalAttendees < event.maxAttendees);

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
      {/* Back button */}
      <Link href="/events">
        <Button
          variant="ghost"
          className="mb-3 md:mb-4 text-gray-400 hover:text-white text-sm md:text-base"
          data-testid="button-back-events"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2">
                  {event.status === "live" && (
                    <Badge className="bg-fanz-red text-white animate-pulse" data-testid="badge-status">
                      🔴 LIVE
                    </Badge>
                  )}
                  {event.status === "scheduled" && (
                    <Badge className="bg-fanz-gold text-black" data-testid="badge-status">
                      Upcoming
                    </Badge>
                  )}
                  {event.status === "ended" && (
                    <Badge className="bg-gray-600 text-white" data-testid="badge-status">
                      Ended
                    </Badge>
                  )}
                  {event.status === "cancelled" && (
                    <Badge className="bg-red-900 text-white" data-testid="badge-status">
                      Cancelled
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-gray-300">
                    {event.eventType.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                {event.nftSouvenirEnabled && (
                  <Badge className="bg-gradient-to-r from-fanz-gold to-yellow-600 text-black">
                    <Sparkles className="h-3 w-3 mr-1" />
                    NFT Souvenir
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl md:text-3xl text-white mb-2" data-testid="text-event-title">
                {event.title}
              </CardTitle>
              <CardDescription className="text-gray-300 text-base">
                {event.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Creator info */}
              {event.creator && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-fanz-gold">
                    <AvatarImage src={event.creator.avatarUrl || undefined} />
                    <AvatarFallback className="bg-fanz-gold text-black font-bold">
                      {event.creator.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-gray-400">Hosted by</p>
                    <Link href={`/creator/${event.creator.username}`}>
                      <p className="text-white font-semibold hover:text-fanz-gold transition-colors" data-testid="text-creator-name">
                        {event.creator.displayName || event.creator.username}
                      </p>
                    </Link>
                  </div>
                </div>
              )}

              <Separator className="bg-white/10" />

              {/* Event details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-fanz-gold" />
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="text-white" data-testid="text-event-date">
                      {format(new Date(event.scheduledStartAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-fanz-gold" />
                  <div>
                    <p className="text-sm text-gray-400">Time</p>
                    <p className="text-white" data-testid="text-event-time">
                      {format(new Date(event.scheduledStartAt), "h:mm a")} - {format(new Date(event.scheduledEndAt), "h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-fanz-gold" />
                  <div>
                    <p className="text-sm text-gray-400">Attendees</p>
                    <p className="text-white" data-testid="text-event-attendees">
                      {event.totalAttendees} {event.maxAttendees ? `/ ${event.maxAttendees}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-fanz-gold" />
                  <div>
                    <p className="text-sm text-gray-400">Location</p>
                    <p className="text-white">Virtual Event</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              {(event.avatarEnabled || event.spatialAudioEnabled || event.nftSouvenirEnabled) && (
                <>
                  <Separator className="bg-white/10" />
                  <div>
                    <h3 className="text-white font-semibold mb-3">Event Features</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {event.avatarEnabled && (
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Check className="h-4 w-4 text-green-500" />
                          3D Avatars
                        </div>
                      )}
                      {event.spatialAudioEnabled && (
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Check className="h-4 w-4 text-green-500" />
                          Spatial Audio
                        </div>
                      )}
                      {event.nftSouvenirEnabled && (
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Check className="h-4 w-4 text-green-500" />
                          NFT Souvenir
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* NFT Souvenir details */}
              {event.nftSouvenirEnabled && event.nftSouvenirName && (
                <>
                  <Separator className="bg-white/10" />
                  <div className="bg-gradient-to-br from-fanz-gold/10 to-yellow-600/10 border border-fanz-gold/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-fanz-gold" />
                      <h3 className="text-white font-semibold">Exclusive NFT Souvenir</h3>
                    </div>
                    <p className="text-fanz-gold font-semibold mb-1">{event.nftSouvenirName}</p>
                    <p className="text-gray-300 text-sm">{event.nftSouvenirDescription}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      ✨ Automatically minted for all attendees after the event
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Ticket purchase / Join */}
        <div className="lg:col-span-1">
          <Card className="bg-white/5 backdrop-blur-md border-white/10 sticky top-4">
            <CardHeader>
              <CardTitle className="text-white">
                {event.accessType === "free" ? "Free Event" : "Get Your Ticket"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price */}
              {event.accessType === "ticketed" && (
                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Ticket Price</p>
                  <p className="text-3xl font-bold text-fanz-gold" data-testid="text-ticket-price">
                    ${(event.ticketPriceCents / 100).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Access info */}
              {event.accessType === "free" && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-500 text-sm font-semibold">✓ Free to join</p>
                </div>
              )}

              {event.accessType === "subscription_only" && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Lock className="h-4 w-4" />
                    <p className="text-sm font-semibold">Subscribers Only</p>
                  </div>
                </div>
              )}

              {event.accessType === "tier_gated" && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Lock className="h-4 w-4" />
                    <p className="text-sm font-semibold">Trust Tier Required</p>
                  </div>
                </div>
              )}

              {/* Ticket owned */}
              {myTicket && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-500">
                    <Ticket className="h-4 w-4" />
                    <p className="text-sm font-semibold">✓ Ticket Owned</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Purchased on {format(new Date(myTicket.purchasedAt), "MMM d, yyyy")}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {canJoinEvent && (
                  <Button
                    data-testid="button-join-event"
                    className="w-full bg-fanz-red hover:bg-fanz-red/90 text-white font-bold text-lg py-6"
                    onClick={() => navigate(`/events/${eventId}/live`)}
                  >
                    <Video className="h-5 w-5 mr-2" />
                    Join Live Event
                  </Button>
                )}

                {canPurchaseTicket && (
                  <Button
                    data-testid="button-purchase-ticket"
                    className="w-full bg-fanz-gold hover:bg-fanz-gold/90 text-black font-bold text-lg py-6"
                    onClick={() => purchaseTicketMutation.mutate()}
                    disabled={purchaseTicketMutation.isPending}
                  >
                    {purchaseTicketMutation.isPending ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><Ticket className="h-5 w-5 mr-2" /> Purchase Ticket</>
                    )}
                  </Button>
                )}

                {event.status === "scheduled" && !canPurchaseTicket && !canJoinEvent && (
                  <Button
                    disabled
                    className="w-full bg-gray-600 text-white font-bold text-lg py-6"
                    data-testid="button-event-not-started"
                  >
                    Event Not Started
                  </Button>
                )}

                {event.maxAttendees && event.totalAttendees >= event.maxAttendees && !myTicket && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                    <p className="text-red-500 text-sm font-semibold">⚠️ Event Sold Out</p>
                  </div>
                )}
              </div>

              {/* Capacity warning */}
              {event.maxAttendees && event.totalAttendees >= event.maxAttendees * 0.9 && event.totalAttendees < event.maxAttendees && (
                <p className="text-yellow-500 text-xs text-center">
                  ⚠️ Almost full! {event.maxAttendees - event.totalAttendees} tickets left
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
