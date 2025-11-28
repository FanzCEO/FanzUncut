import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Video,
  Calendar,
  DollarSign,
  Users,
  Lock,
  Globe,
  Star,
  AlertCircle,
  Clock,
  Settings,
} from 'lucide-react';
import { z } from 'zod';
import { insertLiveStreamSchema } from '@shared/schema';

// Extend the schema with frontend-specific validation
const streamCreationSchema = insertLiveStreamSchema.extend({
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  isScheduled: z.boolean().default(false),
}).refine((data) => {
  if (data.isScheduled) {
    return data.scheduledDate && data.scheduledTime;
  }
  return true;
}, {
  message: "Date and time are required when scheduling",
  path: ["scheduledDate"],
});

type StreamCreationForm = z.infer<typeof streamCreationSchema>;

const StreamCreation = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<StreamCreationForm>({
    resolver: zodResolver(streamCreationSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'public',
      priceCents: 0,
      isScheduled: false,
      scheduledDate: '',
      scheduledTime: '',
    },
  });

  const createStreamMutation = useMutation({
    mutationFn: async (data: StreamCreationForm) => {
      // Combine date and time for scheduledFor
      let scheduledFor = null;
      if (data.isScheduled && data.scheduledDate && data.scheduledTime) {
        scheduledFor = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
      }

      const streamData = {
        title: data.title,
        description: data.description,
        type: data.type,
        priceCents: data.priceCents,
        scheduledFor: scheduledFor?.toISOString(),
      };

      return apiRequest('POST', '/api/streams', streamData);
    },
    onSuccess: (stream: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: "Stream Created!",
        description: "Your live stream has been created successfully.",
      });
      navigate(`/streams/${stream.id}/dashboard`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StreamCreationForm) => {
    createStreamMutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid="page-title">Create Live Stream</h1>
              <p className="text-muted-foreground">Set up your live streaming session</p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Stream Details
                    </CardTitle>
                    <CardDescription>
                      Basic information about your live stream
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stream Title*</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Give your stream an engaging title..."
                              {...field}
                              data-testid="input-stream-title"
                            />
                          </FormControl>
                          <FormDescription>
                            Choose a catchy title that describes your stream content
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe what you'll be streaming about..."
                              className="min-h-[100px]"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-stream-description"
                            />
                          </FormControl>
                          <FormDescription>
                            Let your fans know what to expect from this stream
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Stream Type & Access */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Access & Pricing
                    </CardTitle>
                    <CardDescription>
                      Control who can access your stream and set pricing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stream Type*</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-stream-type">
                                <SelectValue placeholder="Select stream type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="public">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-green-500" />
                                  <div>
                                    <div className="font-medium">Public Stream</div>
                                    <div className="text-xs text-muted-foreground">Open to everyone</div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="subscribers_only">
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <div>
                                    <div className="font-medium">Subscribers Only</div>
                                    <div className="text-xs text-muted-foreground">Exclusive to subscribers</div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="private">
                                <div className="flex items-center gap-2">
                                  <Lock className="h-4 w-4 text-primary" />
                                  <div>
                                    <div className="font-medium">Private Stream</div>
                                    <div className="text-xs text-muted-foreground">Private access only</div>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('type') === 'private' && (
                      <FormField
                        control={form.control}
                        name="priceCents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (USD)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="pl-10"
                                  value={field.value ? (field.value / 100).toFixed(2) : ''}
                                  onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || '0') * 100))}
                                  data-testid="input-stream-price"
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Set the price fans need to pay to access this stream
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Scheduling */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Scheduling
                    </CardTitle>
                    <CardDescription>
                      Schedule your stream for later or go live immediately
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isScheduled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Schedule Stream</FormLabel>
                            <FormDescription>
                              Schedule this stream for a specific date and time
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-schedule-stream"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('isScheduled') && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="scheduledDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date"
                                  min={new Date().toISOString().split('T')[0]}
                                  {...field}
                                  data-testid="input-schedule-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="scheduledTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time</FormLabel>
                              <FormControl>
                                <Input 
                                  type="time"
                                  {...field}
                                  data-testid="input-schedule-time"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Advanced Settings */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      <Settings className="h-5 w-5" />
                      Advanced Settings
                      <Button variant="ghost" size="sm" type="button">
                        {showAdvanced ? 'Hide' : 'Show'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {showAdvanced && (
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">GetStream Integration Active</p>
                          <p className="text-xs text-muted-foreground">
                            Your stream will use professional GetStream.io infrastructure for high-quality broadcasting, 
                            recording, and real-time viewer management.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Preview */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Stream Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Video className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">Stream preview</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium truncate" data-testid="preview-title">
                        {form.watch('title') || 'Stream title...'}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {form.watch('description') || 'Stream description...'}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {form.watch('type') === 'public' && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-400">
                            <Globe className="h-3 w-3 mr-1" />
                            Free
                          </Badge>
                        )}
                        {form.watch('type') === 'subscribers_only' && (
                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400">
                            <Star className="h-3 w-3 mr-1" />
                            Subscribers Only
                          </Badge>
                        )}
                        {form.watch('type') === 'private' && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${(form.watch('priceCents') ? form.watch('priceCents')! / 100 : 0).toFixed(2)}
                          </Badge>
                        )}
                        
                        {form.watch('isScheduled') && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createStreamMutation.isPending}
                        data-testid="button-create-stream"
                      >
                        {createStreamMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating Stream...
                          </>
                        ) : form.watch('isScheduled') ? (
                          <>
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Stream
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4 mr-2" />
                            Create Stream
                          </>
                        )}
                      </Button>

                      <Separator />

                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => navigate('/dashboard')}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StreamCreation;