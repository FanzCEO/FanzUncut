import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Users, DollarSign, Sparkles, Heart, ArrowLeft, X, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type EventTip = {
  id: string;
  eventId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  message: string | null;
  isAnonymous: boolean;
  highlightColor: string | null;
  createdAt: string;
  fromUser?: {
    username: string;
    displayName: string | null;
  };
};

export default function EventLive() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tipAmount, setTipAmount] = useState("5.00");
  const [tipMessage, setTipMessage] = useState("");
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [liveAttendees, setLiveAttendees] = useState<number>(0);
  const [liveTips, setLiveTips] = useState<EventTip[]>([]);
  const tipsEndRef = useRef<HTMLDivElement>(null);

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId],
  });

  const { data: attendance } = useQuery<any>({
    queryKey: ["/api/events", eventId, "my-attendance"],
    enabled: !!user && !!eventId,
  });

  const { data: tips } = useQuery<EventTip[]>({
    queryKey: ["/api/events", eventId, "tips"],
    refetchInterval: 5000, // Poll every 5s for new tips
  });

  const { data: attendees } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "attendees"],
    refetchInterval: 3000, // Poll every 3s for attendee updates
  });

  const { data: nftSouvenir } = useQuery<any>({
    queryKey: ["/api/events", eventId, "my-nft"],
    enabled: !!user && event?.status === "ended" && event?.nftSouvenirEnabled,
  });

  const joinEventMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/events/${eventId}/join`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "my-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "attendees"] });
      toast({
        title: "Joined event!",
        description: "Welcome to the live event",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join",
        description: error.message || "Unable to join event",
        variant: "destructive",
      });
      navigate(`/events/${eventId}`);
    },
  });

  const leaveEventMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/events/${eventId}/leave`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      navigate(`/events/${eventId}`);
    },
  });

  const sendTipMutation = useMutation({
    mutationFn: async (data: { amountCents: number; message?: string }) => {
      return await apiRequest(`/api/events/${eventId}/tip`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tips"] });
      setShowTipDialog(false);
      setTipAmount("5.00");
      setTipMessage("");
      toast({
        title: "Tip sent!",
        description: "Your tip has been delivered",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Tip failed",
        description: error.message || "Unable to send tip",
        variant: "destructive",
      });
    },
  });

  // Auto-join on mount
  useEffect(() => {
    if (event?.status === "live" && !attendance && user) {
      joinEventMutation.mutate();
    }
  }, [event, attendance, user]);

  // Update attendee count
  useEffect(() => {
    if (attendees) {
      setLiveAttendees(attendees.length);
    }
  }, [attendees]);

  // Update tips feed
  useEffect(() => {
    if (tips) {
      setLiveTips(tips);
    }
  }, [tips]);

  // Auto-scroll tips
  useEffect(() => {
    tipsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveTips]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      if (attendance) {
        leaveEventMutation.mutate();
      }
    };
  }, [attendance]);

  const handleSendTip = () => {
    const amountCents = Math.round(parseFloat(tipAmount) * 100);
    if (amountCents < 100) {
      toast({
        title: "Invalid amount",
        description: "Minimum tip is $1.00",
        variant: "destructive",
      });
      return;
    }
    sendTipMutation.mutate({
      amountCents,
      message: tipMessage || undefined,
    });
  };

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-fanz-red" />
      </div>
    );
  }

  if (event.status !== "live") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505]">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Event Not Live</h1>
          <p className="text-gray-400 mb-6">This event is not currently streaming</p>
          <Link href={`/events/${eventId}`}>
            <Button className="bg-fanz-red hover:bg-fanz-red/90">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event Details
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-md border-b border-white/10 px-3 md:px-4 py-2 md:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/events/${eventId}`)}
              className="text-gray-400 hover:text-white shrink-0"
              data-testid="button-leave-event"
            >
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-fanz-red text-white animate-pulse text-xs shrink-0">
                  🔴 LIVE
                </Badge>
                <h1 className="text-white font-bold text-sm md:text-lg truncate" data-testid="text-event-title">
                  {event.title}
                </h1>
              </div>
              <p className="text-xs md:text-sm text-gray-400 truncate">
                Hosted by {event.creator?.displayName || event.creator?.username}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 text-white shrink-0">
            <Users className="h-4 w-4 md:h-5 md:w-5 text-fanz-gold" />
            <span className="font-semibold text-sm md:text-base" data-testid="text-viewer-count">
              {liveAttendees}
            </span>
            <span className="text-gray-400 text-xs md:text-sm hidden sm:inline">viewers</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video/Stream area */}
        <div className="flex-1 flex items-center justify-center bg-black/50 p-4 md:p-8">
          <div className="text-center max-w-2xl w-full">
            <div className="bg-gradient-to-br from-fanz-red/20 to-fanz-gold/20 rounded-xl md:rounded-2xl p-6 md:p-12 border border-white/10 backdrop-blur-md">
              <Sparkles className="h-24 w-24 mx-auto mb-6 text-fanz-gold animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-4 font-bebas tracking-wide">
                IMMERSIVE VIRTUAL EXPERIENCE
              </h2>
              <p className="text-gray-300 mb-6">
                You're now connected to {event.title}. Enjoy the live experience!
              </p>
              {event.avatarEnabled && (
                <Badge variant="outline" className="border-green-500 text-green-500 mr-2">
                  ✓ 3D Avatars
                </Badge>
              )}
              {event.spatialAudioEnabled && (
                <Badge variant="outline" className="border-blue-500 text-blue-500">
                  ✓ Spatial Audio
                </Badge>
              )}
            </div>

            {/* NFT Souvenir claim */}
            {event.status === "ended" && event.nftSouvenirEnabled && nftSouvenir && (
              <Card className="bg-gradient-to-br from-fanz-gold/10 to-yellow-600/10 border-fanz-gold/30 mt-8">
                <CardContent className="p-6 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-fanz-gold" />
                  <h3 className="text-white font-bold text-xl mb-2">
                    NFT Souvenir Claimed! 🎉
                  </h3>
                  <p className="text-gray-300 mb-4">{event.nftSouvenirName}</p>
                  <Badge className="bg-fanz-gold text-black">
                    Serial #{nftSouvenir.serialNumber} / {nftSouvenir.totalMinted}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Live tips sidebar */}
        <div className="w-full lg:w-80 bg-black/80 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col max-h-[40vh] lg:max-h-none">
          {/* Tips header */}
          <div className="p-3 md:p-4 border-b border-white/10">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm md:text-base">
              <Heart className="h-4 w-4 md:h-5 md:w-5 text-fanz-red" />
              Live Tips
            </h3>
          </div>

          {/* Tips feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="tips-feed">
            {liveTips.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 text-sm">No tips yet</p>
                <p className="text-gray-500 text-xs mt-1">Be the first to tip!</p>
              </div>
            ) : (
              liveTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} />
              ))
            )}
            <div ref={tipsEndRef} />
          </div>

          {/* Tip input */}
          <div className="p-4 border-t border-white/10 bg-black/50">
            <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
              <DialogTrigger asChild>
                <Button
                  data-testid="button-open-tip"
                  className="w-full bg-fanz-red hover:bg-fanz-red/90 text-white font-bold"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Send Tip
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#050505] border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Send a Tip</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Show your appreciation with a tip
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-white text-sm font-semibold mb-2 block">
                      Amount ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-lg"
                      data-testid="input-tip-amount"
                    />
                    {/* Quick amounts */}
                    <div className="flex gap-2 mt-2">
                      {["5.00", "10.00", "25.00", "50.00"].map((amount) => (
                        <Button
                          key={amount}
                          size="sm"
                          variant="outline"
                          onClick={() => setTipAmount(amount)}
                          className="flex-1 border-white/10 hover:bg-fanz-gold/20"
                          data-testid={`button-quick-${amount}`}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-2 block">
                      Message (Optional)
                    </label>
                    <Input
                      value={tipMessage}
                      onChange={(e) => setTipMessage(e.target.value)}
                      placeholder="Great show!"
                      maxLength={200}
                      className="bg-white/5 border-white/10 text-white"
                      data-testid="input-tip-message"
                    />
                  </div>

                  <Button
                    onClick={handleSendTip}
                    disabled={sendTipMutation.isPending}
                    className="w-full bg-fanz-red hover:bg-fanz-red/90 text-white font-bold"
                    data-testid="button-send-tip"
                  >
                    {sendTipMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Send ${tipAmount}</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

function TipCard({ tip }: { tip: EventTip }) {
  const highlightColor = tip.highlightColor || "#ff0000";
  const amountUSD = (tip.amountCents / 100).toFixed(2);

  return (
    <div
      className={cn(
        "rounded-lg p-3 border transition-all animate-in slide-in-from-bottom",
        tip.amountCents >= 10000 ? "bg-fanz-gold/20 border-fanz-gold/50" :
        tip.amountCents >= 5000 ? "bg-purple-500/20 border-purple-500/50" :
        "bg-white/5 border-white/10"
      )}
      data-testid={`tip-card-${tip.id}`}
      style={tip.highlightColor ? { borderColor: highlightColor + "80", backgroundColor: highlightColor + "20" } : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {!tip.isAnonymous && tip.fromUser && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-fanz-red text-white text-xs">
                {tip.fromUser.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-white font-semibold text-sm">
            {tip.isAnonymous ? "Anonymous" : tip.fromUser?.displayName || tip.fromUser?.username || "Fan"}
          </span>
        </div>
        <Badge
          className={cn(
            "font-bold",
            tip.amountCents >= 10000 ? "bg-fanz-gold text-black" :
            tip.amountCents >= 5000 ? "bg-purple-600 text-white" :
            "bg-fanz-red text-white"
          )}
          data-testid={`tip-amount-${tip.id}`}
        >
          ${amountUSD}
        </Badge>
      </div>
      {tip.message && (
        <p className="text-gray-300 text-sm" data-testid={`tip-message-${tip.id}`}>
          {tip.message}
        </p>
      )}
      <p className="text-gray-500 text-xs mt-1">
        {format(new Date(tip.createdAt), "h:mm a")}
      </p>
    </div>
  );
}
