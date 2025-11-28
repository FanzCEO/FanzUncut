import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Play, Square, Trash2, Calendar, Users, DollarSign, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { format } from "date-fns";

const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  eventType: z.enum(["public_meetup", "private_show", "vip_experience", "fan_meetup", "exclusive_stream"]),
  accessType: z.enum(["free", "ticketed", "subscription_only", "tier_gated"]),
  scheduledStartAt: z.string(),
  scheduledEndAt: z.string(),
  ticketPriceCents: z.number().min(0).default(0),
  maxAttendees: z.number().min(1).optional(),
  avatarEnabled: z.boolean().default(true),
  spatialAudioEnabled: z.boolean().default(true),
  nftSouvenirEnabled: z.boolean().default(false),
  nftSouvenirName: z.string().optional(),
  nftSouvenirDescription: z.string().optional(),
});

type CreateEventInput = z.infer<typeof createEventSchema>;

export default function EventHost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: myEvents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/events/my-events"],
  });

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      eventType: "public_meetup",
      accessType: "free",
      ticketPriceCents: 0,
      avatarEnabled: true,
      spatialAudioEnabled: true,
      nftSouvenirEnabled: false,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventInput) => {
      return await apiRequest("/api/events", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/my-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Event created!",
        description: "Your event has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create event",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const startEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest(`/api/events/${eventId}/start`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/my-events"] });
      toast({ title: "Event started!", description: "Your event is now live." });
    },
  });

  const endEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest(`/api/events/${eventId}/end`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/my-events"] });
      toast({ title: "Event ended", description: "Your event has ended successfully." });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest(`/api/events/${eventId}/cancel`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/my-events"] });
      toast({
        title: "Event cancelled",
        description: "All ticket holders have been refunded automatically.",
      });
    },
  });

  const onSubmit = (data: CreateEventInput) => {
    createEventMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-fanz-red" />
      </div>
    );
  }

  const scheduledEvents = myEvents?.filter((e) => e.status === "scheduled") || [];
  const liveEvents = myEvents?.filter((e) => e.status === "live") || [];
  const pastEvents = myEvents?.filter((e) => e.status === "ended") || [];

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-bebas tracking-wide">
            EVENT HOSTING DASHBOARD
          </h1>
          <p className="text-sm md:text-base text-gray-400">Create and manage your virtual events</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="button-create-event"
              className="bg-fanz-red hover:bg-fanz-red/90 text-white font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#050505] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Event</DialogTitle>
              <DialogDescription className="text-gray-400">
                Set up an immersive virtual event for your fans
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Event Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Amazing Virtual Meetup"
                          className="bg-white/5 border-white/10 text-white"
                          data-testid="input-event-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe your event..."
                          className="bg-white/5 border-white/10 text-white"
                          data-testid="input-event-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Event Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-event-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#050505] border-white/10">
                            <SelectItem value="public_meetup">Public Meetup</SelectItem>
                            <SelectItem value="private_show">Private Show</SelectItem>
                            <SelectItem value="vip_experience">VIP Experience</SelectItem>
                            <SelectItem value="fan_meetup">Fan Meetup</SelectItem>
                            <SelectItem value="exclusive_stream">Exclusive Stream</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Access Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-access-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#050505] border-white/10">
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="ticketed">Ticketed</SelectItem>
                            <SelectItem value="subscription_only">Subscribers Only</SelectItem>
                            <SelectItem value="tier_gated">Trust Tier Gated</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("accessType") === "ticketed" && (
                  <FormField
                    control={form.control}
                    name="ticketPriceCents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Ticket Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                            value={(field.value / 100).toFixed(2)}
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="input-ticket-price"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-400">Price in USD</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduledStartAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Start Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="input-start-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduledEndAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">End Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="input-end-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="maxAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Max Attendees (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ""}
                          placeholder="Unlimited"
                          className="bg-white/5 border-white/10 text-white"
                          data-testid="input-max-attendees"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400">Leave empty for unlimited capacity</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Event Features</h3>

                  <FormField
                    control={form.control}
                    name="avatarEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-white/10 p-3 bg-white/5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-white">3D Avatars</FormLabel>
                          <FormDescription className="text-gray-400 text-xs">
                            Enable avatar customization for attendees
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-avatars"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="spatialAudioEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-white/10 p-3 bg-white/5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-white">Spatial Audio</FormLabel>
                          <FormDescription className="text-gray-400 text-xs">
                            3D positional audio for immersive experience
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-spatial-audio"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nftSouvenirEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-fanz-gold/30 p-3 bg-fanz-gold/10">
                        <div className="space-y-0.5">
                          <FormLabel className="text-fanz-gold flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            NFT Souvenir
                          </FormLabel>
                          <FormDescription className="text-gray-400 text-xs">
                            Mint commemorative NFTs for attendees
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-nft-souvenir"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("nftSouvenirEnabled") && (
                    <>
                      <FormField
                        control={form.control}
                        name="nftSouvenirName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">NFT Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Exclusive Event Pass #1"
                                className="bg-white/5 border-white/10 text-white"
                                data-testid="input-nft-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nftSouvenirDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">NFT Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Commemorative NFT for attending..."
                                className="bg-white/5 border-white/10 text-white"
                                data-testid="input-nft-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-fanz-red hover:bg-fanz-red/90 text-white font-bold"
                  disabled={createEventMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createEventMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" /> Create Event</>
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Live Events</p>
                <p className="text-3xl font-bold text-fanz-red">{liveEvents.length}</p>
              </div>
              <Video className="h-10 w-10 text-fanz-red" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Scheduled</p>
                <p className="text-3xl font-bold text-fanz-gold">{scheduledEvents.length}</p>
              </div>
              <Calendar className="h-10 w-10 text-fanz-gold" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Past Events</p>
                <p className="text-3xl font-bold text-white">{pastEvents.length}</p>
              </div>
              <Users className="h-10 w-10 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Events */}
      {liveEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 font-bebas">LIVE NOW</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onStart={startEventMutation.mutate}
                onEnd={endEventMutation.mutate}
                onCancel={cancelEventMutation.mutate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Events */}
      {scheduledEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 font-bebas">SCHEDULED</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onStart={startEventMutation.mutate}
                onEnd={endEventMutation.mutate}
                onCancel={cancelEventMutation.mutate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 font-bebas">PAST EVENTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onStart={startEventMutation.mutate}
                onEnd={endEventMutation.mutate}
                onCancel={cancelEventMutation.mutate}
              />
            ))}
          </div>
        </div>
      )}

      {myEvents?.length === 0 && (
        <div className="text-center py-12">
          <Video className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 mb-4">You haven't created any events yet</p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-fanz-red hover:bg-fanz-red/90 text-white font-bold"
            data-testid="button-create-first-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Event
          </Button>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onStart,
  onEnd,
  onCancel,
}: {
  event: any;
  onStart: (id: string) => void;
  onEnd: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid={`card-event-${event.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          {event.status === "live" && (
            <Badge className="bg-fanz-red text-white animate-pulse">
              🔴 LIVE
            </Badge>
          )}
          {event.status === "scheduled" && (
            <Badge className="bg-fanz-gold text-black">Upcoming</Badge>
          )}
          {event.status === "ended" && (
            <Badge className="bg-gray-600 text-white">Ended</Badge>
          )}
        </div>
        <CardTitle className="text-white">{event.title}</CardTitle>
        <CardDescription className="text-gray-400 line-clamp-2">
          {event.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span>Start:</span>
            <span className="text-white">
              {format(new Date(event.scheduledStartAt), "MMM d, h:mm a")}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <span>Attendees:</span>
            <span className="text-white">{event.totalAttendees}</span>
          </div>
          {event.totalRevenueCents > 0 && (
            <div className="flex items-center justify-between text-gray-400">
              <span>Revenue:</span>
              <span className="text-fanz-gold font-semibold">
                ${(event.totalRevenueCents / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {event.status === "scheduled" && (
            <>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onStart(event.id)}
                data-testid={`button-start-${event.id}`}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onCancel(event.id)}
                data-testid={`button-cancel-${event.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {event.status === "live" && (
            <Button
              size="sm"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => onEnd(event.id)}
              data-testid={`button-end-${event.id}`}
            >
              <Square className="h-4 w-4 mr-1" />
              End Event
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
