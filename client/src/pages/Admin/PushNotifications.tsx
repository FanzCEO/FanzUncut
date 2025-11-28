import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Bell, Search, Filter, MoreHorizontal, Send, Settings, Users, Target,
  BarChart3, PieChart, TrendingUp, Edit, Trash2, Copy, Play, Pause, 
  Plus, Smartphone, Monitor, User, Globe, Calendar, Clock, Activity,
  AlertTriangle, CheckCircle, XCircle, Eye, MessageSquare, Download,
  TestTube2, Star, Zap, Flag, Mail, List, Settings2, Sliders
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

interface PushNotificationCampaign {
  id: string;
  name: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
  targetPlatforms: string[];
  targetAudience: string;
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  createdAt: string;
  updatedAt: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  titleTemplate: string;
  bodyTemplate: string;
  platforms: string[];
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

interface CampaignAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  sentCampaigns: number;
  totalRecipients: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  averageOpenRate: number;
  averageClickRate: number;
}

// Form schema for creating/editing campaigns
const campaignFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  body: z.string().min(1, "Body is required").max(1000, "Body must be less than 1000 characters"),
  icon: z.string().optional(),
  image: z.string().optional(),
  badgeIcon: z.string().optional(),
  sound: z.string().default("default"),
  clickAction: z.string().url().optional().or(z.literal("")),
  deepLink: z.string().optional(),
  targetPlatforms: z.array(z.enum(["web", "ios", "android", "desktop"])).min(1, "At least one platform is required"),
  targetAudience: z.enum(["all", "creators", "fans", "subscribers", "verified", "custom"]),
  customAudienceFilter: z.object({}).optional(),
  scheduledAt: z.string().optional(),
  maxSendsPerUser: z.number().min(1).default(1),
  cooldownHours: z.number().min(0).default(24),
  isAbTest: z.boolean().default(false),
  abTestVariants: z.array(z.object({})).optional(),
  respectOptOuts: z.boolean().default(true),
  legalBasis: z.enum(["consent", "legitimate_interest", "contract", "legal_obligation"]).default("consent"),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

export default function PushNotificationsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Current tab
  const [activeTab, setActiveTab] = useState('campaigns');
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  
  // Pagination and Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk Operations
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  
  // Dialogs and Forms
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showTestSendDialog, setShowTestSendDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<PushNotificationCampaign | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  
  // Form
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      title: "",
      body: "",
      icon: "",
      image: "",
      badgeIcon: "",
      sound: "default",
      clickAction: "",
      deepLink: "",
      targetPlatforms: ["web"],
      targetAudience: "all",
      scheduledAt: "",
      maxSendsPerUser: 1,
      cooldownHours: 24,
      isAbTest: false,
      respectOptOuts: true,
      legalBasis: "consent",
    },
  });

  // Analytics date range
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [analyticsDateTo, setAnalyticsDateTo] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Fetch campaigns with filtering
  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: [
      '/api/admin/push-notification-campaigns', 
      {
        searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        platform: platformFilter !== 'all' ? platformFilter : undefined,
        audience: audienceFilter !== 'all' ? audienceFilter : undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy,
        sortOrder
      }
    ],
    enabled: user?.role === 'admin'
  });

  // Fetch notification templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/admin/notification-templates'],
    enabled: user?.role === 'admin' && activeTab === 'templates'
  });

  // Fetch campaign analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<CampaignAnalytics>({
    queryKey: ['/api/admin/push-campaigns/analytics', { dateFrom: analyticsDateFrom, dateTo: analyticsDateTo }],
    enabled: user?.role === 'admin' && showAnalyticsDialog
  });

  // Fetch user notification preferences
  const { data: userPreferences = [], isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/admin/user-notification-preferences'],
    enabled: user?.role === 'admin' && activeTab === 'preferences'
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: (data: CampaignFormData) => 
      apiRequest('/api/admin/push-notification-campaigns', {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Push notification campaign created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notification-campaigns'] });
      setShowCampaignDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create campaign"
      });
    }
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CampaignFormData>) => 
      apiRequest(`/api/admin/push-notification-campaigns/${id}`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notification-campaigns'] });
      setShowCampaignDialog(false);
      setSelectedCampaign(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update campaign"
      });
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/admin/push-notification-campaigns/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notification-campaigns'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete campaign"
      });
    }
  });

  const sendCampaignMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/admin/push-notification-campaigns/${id}/send`, {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign sent successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notification-campaigns'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send campaign"
      });
    }
  });

  const pauseCampaignMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/admin/push-notification-campaigns/${id}/pause`, {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign paused successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notification-campaigns'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to pause campaign"
      });
    }
  });

  const testSendMutation = useMutation({
    mutationFn: ({ id, testUsers }: { id: string; testUsers: string[] }) => 
      apiRequest(`/api/admin/push-notification-campaigns/${id}/test-send`, {
        method: 'POST',
        body: { testUsers }
      }),
    onSuccess: () => {
      toast({
        title: "Test Sent",
        description: "Test notification sent successfully"
      });
      setShowTestSendDialog(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send test notification"
      });
    }
  });

  const bulkOperationMutation = useMutation({
    mutationFn: ({ action, ids }: { action: string; ids: string[] }) => 
      apiRequest('/api/admin/push-notification-campaigns/bulk', {
        method: 'POST',
        body: { action, ids }
      }),
    onSuccess: (_, { action }) => {
      toast({
        title: "Success",
        description: `Bulk ${action} completed successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notification-campaigns'] });
      setSelectedCampaigns([]);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to perform bulk operation"
      });
    }
  });

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-500", text: "Draft" },
      scheduled: { color: "bg-blue-500", text: "Scheduled" },
      sending: { color: "bg-yellow-500", text: "Sending" },
      sent: { color: "bg-green-500", text: "Sent" },
      paused: { color: "bg-orange-500", text: "Paused" },
      cancelled: { color: "bg-red-500", text: "Cancelled" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={`${config.color} text-white`} data-testid={`status-${status}`}>{config.text}</Badge>;
  };

  const getAudienceBadge = (audience: string) => {
    const audienceConfig = {
      all: { color: "bg-blue-100 text-blue-800", icon: "🌐" },
      creators: { color: "bg-purple-100 text-purple-800", icon: "👤" },
      fans: { color: "bg-green-100 text-green-800", icon: "❤️" },
      subscribers: { color: "bg-yellow-100 text-yellow-800", icon: "⭐" },
      verified: { color: "bg-indigo-100 text-indigo-800", icon: "✅" },
      custom: { color: "bg-red-100 text-red-800", icon: "🎯" }
    };
    const config = audienceConfig[audience as keyof typeof audienceConfig] || audienceConfig.all;
    return (
      <Badge className={config.color} data-testid={`audience-${audience}`}>
        <span className="mr-1">{config.icon}</span>
        {audience.charAt(0).toUpperCase() + audience.slice(1)}
      </Badge>
    );
  };

  const getPlatformIcons = (platforms: string[]) => {
    const iconMap = {
      web: <Globe className="h-4 w-4" />,
      ios: <Smartphone className="h-4 w-4" />,
      android: <Smartphone className="h-4 w-4" />,
      desktop: <Monitor className="h-4 w-4" />
    };
    
    return (
      <div className="flex gap-1">
        {platforms.map((platform) => (
          <div key={platform} className="p-1 bg-gray-100 rounded" title={platform}>
            {iconMap[platform as keyof typeof iconMap]}
          </div>
        ))}
      </div>
    );
  };

  const calculateEngagementRate = (opened: number, sent: number) => {
    if (sent === 0) return 0;
    return Math.round((opened / sent) * 100);
  };

  const calculateClickRate = (clicked: number, opened: number) => {
    if (opened === 0) return 0;
    return Math.round((clicked / opened) * 100);
  };

  const handleEditCampaign = (campaign: PushNotificationCampaign) => {
    setSelectedCampaign(campaign);
    form.reset({
      name: campaign.name,
      title: campaign.title,
      body: campaign.body,
      icon: campaign.icon || "",
      image: campaign.image || "",
      targetPlatforms: campaign.targetPlatforms as any[],
      targetAudience: campaign.targetAudience as any,
      scheduledAt: campaign.scheduledAt ? format(new Date(campaign.scheduledAt), 'yyyy-MM-dd\'T\'HH:mm') : undefined,
    });
    setShowCampaignDialog(true);
  };

  const handleSubmit = (data: CampaignFormData) => {
    if (selectedCampaign) {
      updateCampaignMutation.mutate({ id: selectedCampaign.id, ...data });
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const isPending = createCampaignMutation.isPending || updateCampaignMutation.isPending;

  return (
    <div className="space-y-6" data-testid="push-notifications-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Push Notifications Management
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Create, schedule, and manage push notification campaigns with advanced targeting and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalyticsDialog(true)}
            data-testid="button-analytics"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          
          <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setSelectedCampaign(null);
                  form.reset();
                }}
                data-testid="button-create-campaign"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title">
                  {selectedCampaign ? 'Edit Campaign' : 'Create New Push Notification Campaign'}
                </DialogTitle>
                <DialogDescription>
                  Create targeted push notification campaigns with advanced scheduling and delivery options.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter campaign name" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Audience</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-audience">
                                <SelectValue placeholder="Select target audience" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">🌐 All Users</SelectItem>
                              <SelectItem value="creators">👤 Creators</SelectItem>
                              <SelectItem value="fans">❤️ Fans</SelectItem>
                              <SelectItem value="subscribers">⭐ Subscribers</SelectItem>
                              <SelectItem value="verified">✅ Verified Users</SelectItem>
                              <SelectItem value="custom">🎯 Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Notification Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter notification title" {...field} data-testid="input-title" />
                          </FormControl>
                          <FormDescription>This will be the bold headline of your notification</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="body"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Notification Body</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter notification message" 
                              className="min-h-[100px]"
                              {...field} 
                              data-testid="textarea-body"
                            />
                          </FormControl>
                          <FormDescription>The main message content users will see</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="clickAction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Click Action URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/action" 
                              {...field} 
                              data-testid="input-click-action"
                            />
                          </FormControl>
                          <FormDescription>Where users go when they tap the notification</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="scheduledAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule Date/Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                              data-testid="input-scheduled-at"
                            />
                          </FormControl>
                          <FormDescription>Leave empty to send immediately</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Icon URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/icon.png" 
                              {...field} 
                              data-testid="input-icon"
                            />
                          </FormControl>
                          <FormDescription>Small icon displayed with notification</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/image.jpg" 
                              {...field} 
                              data-testid="input-image"
                            />
                          </FormControl>
                          <FormDescription>Large image displayed in rich notifications</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Target Platforms</h4>
                      <div className="space-y-2">
                        {[
                          { value: "web", label: "Web Push", icon: <Globe className="h-4 w-4" /> },
                          { value: "ios", label: "iOS (APNs)", icon: <Smartphone className="h-4 w-4" /> },
                          { value: "android", label: "Android (FCM)", icon: <Smartphone className="h-4 w-4" /> },
                          { value: "desktop", label: "Desktop Apps", icon: <Monitor className="h-4 w-4" /> },
                        ].map((platform) => (
                          <FormField
                            key={platform.value}
                            control={form.control}
                            name="targetPlatforms"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(platform.value as any)}
                                    onCheckedChange={(checked) => {
                                      const currentPlatforms = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentPlatforms, platform.value]);
                                      } else {
                                        field.onChange(currentPlatforms.filter((p) => p !== platform.value));
                                      }
                                    }}
                                    data-testid={`checkbox-platform-${platform.value}`}
                                  />
                                </FormControl>
                                <div className="flex items-center gap-2">
                                  {platform.icon}
                                  <FormLabel className="font-normal">
                                    {platform.label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Advanced Options</h4>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="respectOptOuts"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>Respect Opt-outs</FormLabel>
                                <FormDescription>
                                  Don't send to users who opted out
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-respect-optouts"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isAbTest"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>A/B Test</FormLabel>
                                <FormDescription>
                                  Enable A/B testing for this campaign
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-ab-test"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="maxSendsPerUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Sends Per User</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-max-sends"
                                />
                              </FormControl>
                              <FormDescription>
                                Prevent spamming individual users
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="cooldownHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cooldown (Hours)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-cooldown"
                                />
                              </FormControl>
                              <FormDescription>
                                Wait time between notifications to same user
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCampaignDialog(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      data-testid="button-save"
                    >
                      {isPending ? "Saving..." : selectedCampaign ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-total-campaigns">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-sent">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">
                  {campaigns.filter((c: any) => c.status === 'sent').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-scheduled">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">
                  {campaigns.filter((c: any) => c.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-engagement">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg. Engagement</p>
                <p className="text-2xl font-bold">
                  {campaigns.length > 0 
                    ? Math.round(campaigns.reduce((acc: number, c: any) => 
                        acc + calculateEngagementRate(c.totalOpened || 0, c.totalSent || 1), 0) / campaigns.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4" data-testid="main-tabs">
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="preferences" data-testid="tab-preferences">User Preferences</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Filters */}
          <Card data-testid="card-filters">
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="filter-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="sending">Sending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform</label>
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger data-testid="filter-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audience</label>
                  <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                    <SelectTrigger data-testid="filter-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Audiences</SelectItem>
                      <SelectItem value="creators">Creators</SelectItem>
                      <SelectItem value="fans">Fans</SelectItem>
                      <SelectItem value="subscribers">Subscribers</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Bulk Actions */}
              {selectedCampaigns.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedCampaigns.length} campaign(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bulkOperationMutation.mutate({ action: 'send', ids: selectedCampaigns })}
                        data-testid="button-bulk-send"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bulkOperationMutation.mutate({ action: 'pause', ids: selectedCampaigns })}
                        data-testid="button-bulk-pause"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bulkOperationMutation.mutate({ action: 'cancel', ids: selectedCampaigns })}
                        data-testid="button-bulk-cancel"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaigns Table */}
          <Card data-testid="card-campaigns-table">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCampaigns(campaigns.map((c: any) => c.id));
                          } else {
                            setSelectedCampaigns([]);
                          }
                        }}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="ml-2">Loading campaigns...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <Bell className="h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-muted-foreground">No campaigns found</p>
                          <Button 
                            onClick={() => setShowCampaignDialog(true)}
                            className="mt-4"
                            data-testid="button-create-first"
                          >
                            Create Your First Campaign
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign: any) => (
                      <TableRow key={campaign.id} data-testid={`campaign-row-${campaign.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCampaigns.includes(campaign.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                              } else {
                                setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id));
                              }
                            }}
                            data-testid={`checkbox-select-${campaign.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">{campaign.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {campaign.body.substring(0, 50)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>{getAudienceBadge(campaign.targetAudience)}</TableCell>
                        <TableCell>{getPlatformIcons(campaign.targetPlatforms || [])}</TableCell>
                        <TableCell>
                          {campaign.scheduledAt ? (
                            <div className="text-sm">
                              <p>{format(new Date(campaign.scheduledAt), 'MMM dd, yyyy')}</p>
                              <p className="text-muted-foreground">{format(new Date(campaign.scheduledAt), 'HH:mm')}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not scheduled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Sent:</span>
                              <span>{campaign.totalSent || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Opened:</span>
                              <span>{campaign.totalOpened || 0} ({calculateEngagementRate(campaign.totalOpened || 0, campaign.totalSent || 1)}%)</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Clicked:</span>
                              <span>{campaign.totalClicked || 0} ({calculateClickRate(campaign.totalClicked || 0, campaign.totalOpened || 1)}%)</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`actions-${campaign.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleEditCampaign(campaign)}
                                data-testid={`action-edit-${campaign.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setSelectedCampaign(campaign)}
                                data-testid={`action-preview-${campaign.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              {campaign.status === 'draft' && (
                                <DropdownMenuItem 
                                  onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                  data-testid={`action-send-${campaign.id}`}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Now
                                </DropdownMenuItem>
                              )}
                              {(campaign.status === 'sending' || campaign.status === 'scheduled') && (
                                <DropdownMenuItem 
                                  onClick={() => pauseCampaignMutation.mutate(campaign.id)}
                                  data-testid={`action-pause-${campaign.id}`}
                                >
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCampaign(campaign);
                                  setShowTestSendDialog(true);
                                }}
                                data-testid={`action-test-${campaign.id}`}
                              >
                                <TestTube2 className="h-4 w-4 mr-2" />
                                Test Send
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(campaign.id);
                                  toast({ title: "Copied", description: "Campaign ID copied to clipboard" });
                                }}
                                data-testid={`action-copy-${campaign.id}`}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy ID
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                className="text-red-600"
                                data-testid={`action-delete-${campaign.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card data-testid="card-templates">
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>
                Pre-built templates with dynamic content for quick campaign creation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No templates found</p>
                  <Button className="mt-4" data-testid="button-create-template">
                    Create Your First Template
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template: any) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                          data-testid={`template-card-${template.id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge>{template.category}</Badge>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm"><strong>Title:</strong> {template.titleTemplate}</p>
                          <p className="text-sm"><strong>Body:</strong> {template.bodyTemplate.substring(0, 100)}...</p>
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-muted-foreground">
                              Used {template.usageCount} times
                            </span>
                            <Button size="sm" data-testid={`use-template-${template.id}`}>
                              Use Template
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card data-testid="card-preferences">
            <CardHeader>
              <CardTitle>User Notification Preferences</CardTitle>
              <CardDescription>
                GDPR-compliant notification preference management and opt-out handling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">User preferences dashboard will be implemented here</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Opt-out management, preference statistics, GDPR compliance tracking
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card data-testid="card-analytics">
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
              <CardDescription>
                Comprehensive insights into notification performance and user engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Analytics dashboard will be implemented here</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Delivery rates, engagement metrics, conversion tracking, A/B test results
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Send Dialog */}
      <Dialog open={showTestSendDialog} onOpenChange={setShowTestSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="test-send-dialog-title">
              🧪 Test Send Notification
            </DialogTitle>
            <DialogDescription>
              Send a test notification to specific users to preview how it will look.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Test Users (Email or User ID)</label>
              <Textarea 
                placeholder="Enter emails or user IDs, one per line" 
                className="min-h-[100px]"
                data-testid="textarea-test-users"
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Test notifications will be sent immediately to the specified users.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTestSendDialog(false)}
              data-testid="button-test-cancel"
            >
              Cancel
            </Button>
            <Button 
              data-testid="button-test-send"
            >
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}