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
  Megaphone, Search, Filter, MoreHorizontal, Send, AlertTriangle,
  Download, Eye, EyeOff, Play, Pause, Calendar, Clock, Users, Target,
  BarChart3, PieChart, TrendingUp, Edit, Trash2, Copy, Settings,
  Plus, Bell, Mail, MessageSquare, Smartphone, CheckCircle, XCircle,
  Activity, Star, Zap, Flag, TestTube2, FileText, Globe, User
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { SelectAnnouncement, InsertAnnouncement } from "@shared/schema";

// Type aliases for compatibility
type Announcement = SelectAnnouncement;
type AnnouncementTemplate = SelectAnnouncement;

interface AnnouncementAnalytics {
  totalAnnouncements: number;
  publishedAnnouncements: number;
  scheduledAnnouncements: number;
  draftAnnouncements: number;
  totalRecipients: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  averageOpenRate: number;
  averageClickRate: number;
}

// Form schema for creating/editing announcements
const announcementFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["general", "emergency", "maintenance", "promotion", "update"]),
  priority: z.number().min(1).max(5).default(1),
  channels: z.array(z.enum(["in_app", "email", "push", "sms", "all"])).min(1, "At least one channel is required"),
  scheduledAt: z.string().optional(),
  expiresAt: z.string().optional(),
  targetUserRoles: z.array(z.string()).optional(),
  targetCountries: z.array(z.string()).optional(),
  targetSubscriptionTiers: z.array(z.string()).optional(),
  actionUrl: z.string().url().optional().or(z.literal("")),
  actionText: z.string().optional(),
  isAbTest: z.boolean().default(false),
  abTestPercentage: z.number().min(1).max(100).default(100),
  requiresApproval: z.boolean().default(false),
  mediaUrls: z.array(z.string()).optional(),
});

type AnnouncementFormData = z.infer<typeof announcementFormSchema>;

export default function AnnouncementsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Current tab
  const [activeTab, setActiveTab] = useState('announcements');
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  
  // Pagination and Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk Operations
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  
  // Dialogs and Forms
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AnnouncementTemplate | null>(null);
  
  // Emergency broadcast state
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  
  // Form
  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "general",
      priority: 1,
      channels: ["in_app"],
      targetUserRoles: [],
      targetCountries: [],
      targetSubscriptionTiers: [],
      actionUrl: "",
      actionText: "",
      isAbTest: false,
      abTestPercentage: 100,
      requiresApproval: false,
      mediaUrls: [],
    },
  });

  // Analytics date range
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [analyticsDateTo, setAnalyticsDateTo] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Fetch announcements with filtering
  const { data: announcements = [], isLoading, error, refetch } = useQuery({
    queryKey: [
      '/api/admin/announcements', 
      {
        searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        channel: channelFilter !== 'all' ? channelFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy,
        sortOrder
      }
    ],
    enabled: user?.role === 'admin'
  });

  // Fetch announcement templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/admin/announcement-templates'],
    enabled: user?.role === 'admin' && activeTab === 'templates'
  });

  // Fetch announcement analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnnouncementAnalytics>({
    queryKey: ['/api/admin/announcements/analytics', { dateFrom: analyticsDateFrom, dateTo: analyticsDateTo }],
    enabled: user?.role === 'admin' && showAnalyticsDialog
  });

  // Mutations
  const createAnnouncementMutation = useMutation({
    mutationFn: (data: AnnouncementFormData) => 
      apiRequest('/api/admin/announcements', {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      setShowAnnouncementDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create announcement"
      });
    }
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<AnnouncementFormData>) => 
      apiRequest(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      setShowAnnouncementDialog(false);
      setSelectedAnnouncement(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update announcement"
      });
    }
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/admin/announcements/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete announcement"
      });
    }
  });

  const publishAnnouncementMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/admin/announcements/${id}/publish`, {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement published successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to publish announcement"
      });
    }
  });

  const pauseAnnouncementMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/admin/announcements/${id}/pause`, {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement paused successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to pause announcement"
      });
    }
  });

  const emergencyBroadcastMutation = useMutation({
    mutationFn: (data: { title: string; content: string; channels: string[] }) => 
      apiRequest('/api/admin/announcements/emergency-broadcast', {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      toast({
        title: "Emergency Broadcast Sent",
        description: "Emergency announcement has been sent to all users"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      setShowEmergencyDialog(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send emergency broadcast"
      });
    }
  });

  const bulkOperationMutation = useMutation({
    mutationFn: ({ action, ids }: { action: string; ids: string[] }) => 
      apiRequest('/api/admin/announcements/bulk', {
        method: 'POST',
        body: { action, ids }
      }),
    onSuccess: (_, { action }) => {
      toast({
        title: "Success",
        description: `Bulk ${action} completed successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      setSelectedAnnouncements([]);
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
      published: { color: "bg-green-500", text: "Published" },
      paused: { color: "bg-yellow-500", text: "Paused" },
      archived: { color: "bg-red-500", text: "Archived" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={`${config.color} text-white`} data-testid={`status-${status}`}>{config.text}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      general: { color: "bg-blue-100 text-blue-800", icon: "📢" },
      emergency: { color: "bg-red-100 text-red-800", icon: "🚨" },
      maintenance: { color: "bg-orange-100 text-orange-800", icon: "🔧" },
      promotion: { color: "bg-green-100 text-green-800", icon: "🎉" },
      update: { color: "bg-purple-100 text-purple-800", icon: "📱" }
    };
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.general;
    return (
      <Badge className={config.color} data-testid={`type-${type}`}>
        <span className="mr-1">{config.icon}</span>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    const colors = {
      1: "bg-gray-100 text-gray-800",
      2: "bg-blue-100 text-blue-800", 
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-orange-100 text-orange-800",
      5: "bg-red-100 text-red-800"
    };
    return (
      <Badge className={colors[priority as keyof typeof colors] || colors[1]} data-testid={`priority-${priority}`}>
        Priority {priority}
      </Badge>
    );
  };

  const getChannelIcons = (channels: string[]) => {
    const iconMap = {
      in_app: <Bell className="h-4 w-4" />,
      email: <Mail className="h-4 w-4" />,
      push: <Smartphone className="h-4 w-4" />,
      sms: <MessageSquare className="h-4 w-4" />,
      all: <Globe className="h-4 w-4" />
    };
    
    return (
      <div className="flex gap-1">
        {channels.map((channel) => (
          <div key={channel} className="p-1 bg-gray-100 rounded" title={channel}>
            {iconMap[channel as keyof typeof iconMap]}
          </div>
        ))}
      </div>
    );
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    form.reset({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type as any,
      priority: announcement.priority,
      channels: announcement.channels as any[],
      scheduledAt: announcement.scheduledAt ? format(new Date(announcement.scheduledAt), 'yyyy-MM-dd\'T\'HH:mm') : undefined,
      expiresAt: announcement.expiresAt ? format(new Date(announcement.expiresAt), 'yyyy-MM-dd\'T\'HH:mm') : undefined,
      targetUserRoles: announcement.targetUserRoles || [],
      targetCountries: announcement.targetCountries || [],
      targetSubscriptionTiers: announcement.targetSubscriptionTiers || [],
      actionUrl: announcement.actionUrl || "",
      actionText: announcement.actionText || "",
      isAbTest: announcement.isAbTest,
      abTestPercentage: announcement.abTestPercentage,
      requiresApproval: announcement.requiresApproval,
      mediaUrls: announcement.mediaUrls || [],
    });
    setShowAnnouncementDialog(true);
  };

  const handleSubmit = (data: AnnouncementFormData) => {
    if (selectedAnnouncement) {
      updateAnnouncementMutation.mutate({ id: selectedAnnouncement.id, ...data });
    } else {
      createAnnouncementMutation.mutate(data);
    }
  };

  const isPending = createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending;

  return (
    <div className="space-y-6" data-testid="announcements-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Announcements Management
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Create, schedule, and manage system-wide announcements with advanced targeting and analytics
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmergencyDialog(true)}
            className="border-red-500 text-red-600 hover:bg-red-50"
            data-testid="button-emergency"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency Broadcast
          </Button>
          
          <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setSelectedAnnouncement(null);
                  form.reset();
                }}
                data-testid="button-create-announcement"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title">
                  {selectedAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
                </DialogTitle>
                <DialogDescription>
                  Create targeted announcements with advanced scheduling and delivery options.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter announcement title" {...field} data-testid="input-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter announcement content" 
                              className="min-h-[120px]"
                              {...field} 
                              data-testid="textarea-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Select announcement type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">📢 General</SelectItem>
                              <SelectItem value="emergency">🚨 Emergency</SelectItem>
                              <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                              <SelectItem value="promotion">🎉 Promotion</SelectItem>
                              <SelectItem value="update">📱 Update</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 - Low</SelectItem>
                              <SelectItem value="2">2 - Normal</SelectItem>
                              <SelectItem value="3">3 - Medium</SelectItem>
                              <SelectItem value="4">4 - High</SelectItem>
                              <SelectItem value="5">5 - Critical</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <FormDescription>Leave empty to publish immediately</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="expiresAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date/Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                              data-testid="input-expires-at"
                            />
                          </FormControl>
                          <FormDescription>Leave empty for no expiry</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="actionUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Action URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/action" 
                              {...field} 
                              data-testid="input-action-url"
                            />
                          </FormControl>
                          <FormDescription>Optional link for call-to-action</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="actionText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Action Button Text</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Learn More" 
                              {...field} 
                              data-testid="input-action-text"
                            />
                          </FormControl>
                          <FormDescription>Text for the action button</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Delivery Channels</h4>
                      <div className="space-y-2">
                        {[
                          { value: "in_app", label: "In-App Notification", icon: <Bell className="h-4 w-4" /> },
                          { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
                          { value: "push", label: "Push Notification", icon: <Smartphone className="h-4 w-4" /> },
                          { value: "sms", label: "SMS", icon: <MessageSquare className="h-4 w-4" /> },
                        ].map((channel) => (
                          <FormField
                            key={channel.value}
                            control={form.control}
                            name="channels"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(channel.value as any)}
                                    onCheckedChange={(checked) => {
                                      const currentChannels = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentChannels, channel.value]);
                                      } else {
                                        field.onChange(currentChannels.filter((c) => c !== channel.value));
                                      }
                                    }}
                                    data-testid={`checkbox-channel-${channel.value}`}
                                  />
                                </FormControl>
                                <div className="flex items-center gap-2">
                                  {channel.icon}
                                  <FormLabel className="font-normal">
                                    {channel.label}
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
                          name="requiresApproval"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>Requires Approval</FormLabel>
                                <FormDescription>
                                  Announcement needs approval before publishing
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-requires-approval"
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
                                  Enable A/B testing for this announcement
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
                        
                        {form.watch("isAbTest") && (
                          <FormField
                            control={form.control}
                            name="abTestPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>A/B Test Percentage</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    max="100" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    data-testid="input-ab-test-percentage"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Percentage of users to include in the test (1-100)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAnnouncementDialog(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      data-testid="button-save"
                    >
                      {isPending ? "Saving..." : selectedAnnouncement ? "Update" : "Create"}
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
        <Card data-testid="stat-total-announcements">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Megaphone className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Announcements</p>
                <p className="text-2xl font-bold">{announcements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-published">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">
                  {announcements.filter((a: any) => a.status === 'published').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-scheduled">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">
                  {announcements.filter((a: any) => a.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-drafts">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Edit className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold">
                  {announcements.filter((a: any) => a.status === 'draft').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3" data-testid="main-tabs">
          <TabsTrigger value="announcements" data-testid="tab-announcements">Announcements</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
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
                      placeholder="Search announcements..."
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
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger data-testid="filter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger data-testid="filter-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="1">Priority 1 (Low)</SelectItem>
                      <SelectItem value="2">Priority 2 (Normal)</SelectItem>
                      <SelectItem value="3">Priority 3 (Medium)</SelectItem>
                      <SelectItem value="4">Priority 4 (High)</SelectItem>
                      <SelectItem value="5">Priority 5 (Critical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Bulk Actions */}
              {selectedAnnouncements.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedAnnouncements.length} announcement(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bulkOperationMutation.mutate({ action: 'publish', ids: selectedAnnouncements })}
                        data-testid="button-bulk-publish"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bulkOperationMutation.mutate({ action: 'pause', ids: selectedAnnouncements })}
                        data-testid="button-bulk-pause"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bulkOperationMutation.mutate({ action: 'archive', ids: selectedAnnouncements })}
                        data-testid="button-bulk-archive"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements Table */}
          <Card data-testid="card-announcements-table">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedAnnouncements.length === announcements.length && announcements.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAnnouncements(announcements.map((a: any) => a.id));
                          } else {
                            setSelectedAnnouncements([]);
                          }
                        }}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Analytics</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="ml-2">Loading announcements...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : announcements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <Megaphone className="h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-muted-foreground">No announcements found</p>
                          <Button 
                            onClick={() => setShowAnnouncementDialog(true)}
                            className="mt-4"
                            data-testid="button-create-first"
                          >
                            Create Your First Announcement
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    announcements.map((announcement: any) => (
                      <TableRow key={announcement.id} data-testid={`announcement-row-${announcement.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAnnouncements.includes(announcement.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAnnouncements([...selectedAnnouncements, announcement.id]);
                              } else {
                                setSelectedAnnouncements(selectedAnnouncements.filter(id => id !== announcement.id));
                              }
                            }}
                            data-testid={`checkbox-select-${announcement.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{announcement.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {announcement.content.substring(0, 100)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(announcement.type)}</TableCell>
                        <TableCell>{getStatusBadge(announcement.status)}</TableCell>
                        <TableCell>{getPriorityBadge(announcement.priority)}</TableCell>
                        <TableCell>{getChannelIcons(announcement.channels || [])}</TableCell>
                        <TableCell>
                          {announcement.scheduledAt ? (
                            <div className="text-sm">
                              <p>{format(new Date(announcement.scheduledAt), 'MMM dd, yyyy')}</p>
                              <p className="text-muted-foreground">{format(new Date(announcement.scheduledAt), 'HH:mm')}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not scheduled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>📊 {announcement.totalRecipients || 0} recipients</p>
                            <p>📈 {announcement.totalOpened || 0} opens</p>
                            <p>🔗 {announcement.totalClicked || 0} clicks</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`actions-${announcement.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleEditAnnouncement(announcement)}
                                data-testid={`action-edit-${announcement.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setSelectedAnnouncement(announcement)}
                                data-testid={`action-preview-${announcement.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              {announcement.status === 'draft' && (
                                <DropdownMenuItem 
                                  onClick={() => publishAnnouncementMutation.mutate(announcement.id)}
                                  data-testid={`action-publish-${announcement.id}`}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {announcement.status === 'published' && (
                                <DropdownMenuItem 
                                  onClick={() => pauseAnnouncementMutation.mutate(announcement.id)}
                                  data-testid={`action-pause-${announcement.id}`}
                                >
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(announcement.id);
                                  toast({ title: "Copied", description: "Announcement ID copied to clipboard" });
                                }}
                                data-testid={`action-copy-${announcement.id}`}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy ID
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                                className="text-red-600"
                                data-testid={`action-delete-${announcement.id}`}
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
              <CardTitle>Announcement Templates</CardTitle>
              <CardDescription>
                Pre-built templates with personalization tokens for quick announcement creation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                          {getTypeBadge(template.type)}
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm"><strong>Title:</strong> {template.titleTemplate}</p>
                          <p className="text-sm"><strong>Content:</strong> {template.contentTemplate.substring(0, 100)}...</p>
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

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card data-testid="card-analytics">
            <CardHeader>
              <CardTitle>Announcement Analytics</CardTitle>
              <CardDescription>
                Comprehensive insights into announcement performance and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Analytics dashboard will be implemented here</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Delivery rates, open rates, click-through rates, A/B test results, and more
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Emergency Broadcast Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600" data-testid="emergency-dialog-title">
              🚨 Emergency Broadcast
            </DialogTitle>
            <DialogDescription>
              Send an immediate announcement to all users across all channels. Use only for critical emergencies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Emergency Title</label>
              <Input 
                placeholder="Enter emergency announcement title" 
                data-testid="input-emergency-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Emergency Message</label>
              <Textarea 
                placeholder="Enter emergency message" 
                className="min-h-[100px]"
                data-testid="textarea-emergency-content"
              />
            </div>
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will immediately send a notification to ALL users. This action cannot be undone.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEmergencyDialog(false)}
              data-testid="button-emergency-cancel"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              data-testid="button-emergency-send"
            >
              Send Emergency Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}