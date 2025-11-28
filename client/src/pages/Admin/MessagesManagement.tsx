import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Mail, Search, Filter, MoreHorizontal, Shield, AlertTriangle, 
  Download, Eye, EyeOff, Flag, Send, Users, Clock, 
  BarChart3, PieChart, MessageSquare, Edit, Trash2,
  Plus, Calendar, Activity, Star, TrendingUp, Settings,
  FileText, Copy, Zap, Target, Bell, CheckCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  isRead: boolean;
  mediaUrls?: string[];
  sender: {
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
    role: string;
  };
  receiver: {
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
    role: string;
  };
  moderation?: {
    id: string;
    status: string;
    flagReason?: string;
    notes?: string;
    moderatorId?: string;
    reporterId?: string;
    autoFlagged: boolean;
    reviewRequired: boolean;
  };
}

interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string;
  creatorId: string;
  isActive: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

interface MessageAnalytics {
  totalMessages: number;
  flaggedMessages: number;
  normalMessages: number;
  hiddenMessages: number;
  deletedMessages: number;
}

export default function MessagesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Current tab
  const [activeTab, setActiveTab] = useState('messages');
  
  // Filters and Search for Messages
  const [searchQuery, setSearchQuery] = useState('');
  const [senderIdFilter, setSenderIdFilter] = useState('');
  const [receiverIdFilter, setReceiverIdFilter] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  
  // Pagination and Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk Operations
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // Dialogs and Forms
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showMassMessageDialog, setShowMassMessageDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  
  // Message moderation form
  const [flagReason, setFlagReason] = useState('');
  const [flagNotes, setFlagNotes] = useState('');
  
  // Template form
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateType, setTemplateType] = useState('announcement');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [templateIsActive, setTemplateIsActive] = useState(true);
  
  // Mass messaging form
  const [massMessageTemplate, setMassMessageTemplate] = useState('');
  const [massMessageAudience, setMassMessageAudience] = useState('all_users');
  const [massMessageCustomFilter, setMassMessageCustomFilter] = useState('');
  const [massMessagePreview, setMassMessagePreview] = useState(false);

  // Analytics date range
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [analyticsDateTo, setAnalyticsDateTo] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Fetch messages with filtering
  const { data: messages = [], isLoading, error, refetch } = useQuery<Message[]>({
    queryKey: [
      '/api/admin/messages', 
      {
        searchQuery,
        senderId: senderIdFilter || undefined,
        receiverId: receiverIdFilter || undefined,
        flagged: flaggedFilter !== 'all' ? flaggedFilter === 'flagged' : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy,
        sortOrder
      }
    ],
    enabled: user?.role === 'admin' && activeTab === 'messages'
  });

  // Fetch message templates
  const { data: templates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useQuery<MessageTemplate[]>({
    queryKey: [
      '/api/admin/message-templates',
      {
        type: templateType !== 'all' ? templateType : undefined,
        isActive: true,
        limit: 100,
        offset: 0
      }
    ],
    enabled: user?.role === 'admin' && (activeTab === 'templates' || activeTab === 'mass-messaging')
  });

  // Fetch message analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<MessageAnalytics>({
    queryKey: ['/api/admin/messages/analytics', { dateFrom: analyticsDateFrom, dateTo: analyticsDateTo }],
    enabled: user?.role === 'admin' && showAnalyticsDialog
  });

  const totalMessages = messages.length;
  const totalPages = Math.ceil(totalMessages / pageSize);
  
  // Mutations
  const flagMessageMutation = useMutation({
    mutationFn: (data: { 
      messageId: string; 
      flagReason: string; 
      notes?: string;
      reporterId?: string;
    }) => 
      apiRequest('POST', `/api/admin/messages/${data.messageId}/flag`, data),
    onSuccess: () => {
      toast({ title: "Message flagged successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      setShowFlagDialog(false);
      setSelectedMessage(null);
    },
    onError: () => {
      toast({ title: "Failed to flag message", variant: "destructive" });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', '/api/admin/message-templates', data),
    onSuccess: () => {
      toast({ title: "Template created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/message-templates'] });
      resetTemplateForm();
      setShowTemplateDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: { templateId: string; updates: any }) => 
      apiRequest('PUT', `/api/admin/message-templates/${data.templateId}`, data.updates),
    onSuccess: () => {
      toast({ title: "Template updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/message-templates'] });
      resetTemplateForm();
      setShowTemplateDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    }
  });

  const sendMassMessageMutation = useMutation({
    mutationFn: (data: { templateId: string; targetAudience: string; customFilter?: any }) => 
      apiRequest('POST', `/api/admin/message-templates/${data.templateId}/send`, {
        targetAudience: data.targetAudience,
        customFilter: data.customFilter
      }),
    onSuccess: (result: any) => {
      toast({ 
        title: "Mass message sent successfully", 
        description: `Sent to ${result.messagesSent} out of ${result.targetCount} users`
      });
      setShowMassMessageDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to send mass message", variant: "destructive" });
    }
  });

  // Helper functions
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'normal':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Normal</Badge>;
      case 'flagged':
        return <Badge className="bg-orange-500"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>;
      case 'hidden':
        return <Badge className="bg-gray-500"><EyeOff className="w-3 h-3 mr-1" />Hidden</Badge>;
      case 'deleted':
        return <Badge className="bg-red-500"><Trash2 className="w-3 h-3 mr-1" />Deleted</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const resetTemplateForm = () => {
    setTemplateName('');
    setTemplateSubject('');
    setTemplateContent('');
    setTemplateType('announcement');
    setTemplateVariables([]);
    setTemplateIsActive(true);
    setSelectedTemplate(null);
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject);
    setTemplateContent(template.content);
    setTemplateType(template.type);
    setTemplateVariables(template.variables || []);
    setTemplateIsActive(template.isActive);
    setShowTemplateDialog(true);
  };

  const handleTemplateSubmit = () => {
    const templateData = {
      name: templateName,
      subject: templateSubject,
      content: templateContent,
      type: templateType,
      variables: templateVariables,
      isActive: templateIsActive
    };

    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        templateId: selectedTemplate.id,
        updates: templateData
      });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  const handleFlagSubmit = () => {
    if (!selectedMessage) return;
    
    flagMessageMutation.mutate({
      messageId: selectedMessage.id,
      flagReason,
      notes: flagNotes,
      reporterId: user?.id
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(messages.map((message: Message) => message.id));
    } else {
      setSelectedMessages([]);
    }
  };

  const handleSelectMessage = (messageId: string, checked: boolean) => {
    if (checked) {
      setSelectedMessages(prev => [...prev, messageId]);
    } else {
      setSelectedMessages(prev => prev.filter(id => id !== messageId));
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSenderIdFilter('');
    setReceiverIdFilter('');
    setFlaggedFilter('all');
    setStatusFilter('all');
    setDateRangeFilter('all');
    setCurrentPage(1);
  };

  const getAnalyticsSummary = () => {
    if (!analytics) return null;
    
    const data = analytics as MessageAnalytics;
    return {
      totalMessages: data.totalMessages || 0,
      flaggedRate: data.totalMessages > 0 ? ((data.flaggedMessages || 0) / data.totalMessages * 100).toFixed(1) : '0',
      normalRate: data.totalMessages > 0 ? ((data.normalMessages || 0) / data.totalMessages * 100).toFixed(1) : '0',
      hiddenMessages: data.hiddenMessages || 0,
      deletedMessages: data.deletedMessages || 0
    };
  };

  if (!user || user.role !== 'admin') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this page.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load messages. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" data-testid="messages-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Messages Management</h1>
          <p className="text-muted-foreground">
            Privacy-compliant message monitoring, moderation, and mass messaging system
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAnalyticsDialog(true)}
            data-testid="button-analytics"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          {activeTab === 'templates' && (
            <Button 
              onClick={() => {
                resetTemplateForm();
                setShowTemplateDialog(true);
              }}
              data-testid="button-create-template"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          )}
          {activeTab === 'mass-messaging' && (
            <Button 
              onClick={() => setShowMassMessageDialog(true)}
              disabled={templates.length === 0}
              data-testid="button-send-mass-message"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Mass Message
            </Button>
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy Notice:</strong> Message content is only reviewed when flagged for violations. 
          All moderation actions are logged for compliance and transparency.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="messages" data-testid="tab-messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Flagged Messages
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <FileText className="w-4 h-4 mr-2" />
            Message Templates
          </TabsTrigger>
          <TabsTrigger value="mass-messaging" data-testid="tab-mass-messaging">
            <Send className="w-4 h-4 mr-2" />
            Mass Messaging
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
              <CardDescription>
                Only flagged messages are shown for privacy compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Content</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search flagged content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                      data-testid="input-search"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sender ID</label>
                  <Input
                    placeholder="Filter by sender..."
                    value={senderIdFilter}
                    onChange={(e) => setSenderIdFilter(e.target.value)}
                    data-testid="input-sender-filter"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                    <SelectTrigger data-testid="select-date-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFilters} data-testid="button-reset-filters">
                  Reset Filters
                </Button>
                <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Messages Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  Flagged Messages ({totalMessages})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-32" data-testid="select-page-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedMessages.length === messages.length && messages.length > 0}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Content Preview</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Receiver</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Flag Reason</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((message: Message) => (
                        <TableRow key={message.id} data-testid={`row-message-${message.id}`}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedMessages.includes(message.id)}
                              onCheckedChange={(checked) => handleSelectMessage(message.id, !!checked)}
                              data-testid={`checkbox-message-${message.id}`}
                            />
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={message.content}>
                              {message.content.substring(0, 100)}...
                            </div>
                            {message.mediaUrls && message.mediaUrls.length > 0 && (
                              <Badge variant="secondary" className="mt-1">
                                +{message.mediaUrls.length} media
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                                {message.sender.displayName?.[0] || message.sender.username[0]}
                              </div>
                              <div>
                                <div className="font-medium">{message.sender.displayName || message.sender.username}</div>
                                <div className="text-xs text-muted-foreground">{message.sender.role}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                                {message.receiver.displayName?.[0] || message.receiver.username[0]}
                              </div>
                              <div>
                                <div className="font-medium">{message.receiver.displayName || message.receiver.username}</div>
                                <div className="text-xs text-muted-foreground">{message.receiver.role}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(message.moderation?.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {message.moderation?.flagReason || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{format(new Date(message.createdAt), 'MMM dd, yyyy')}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(message.createdAt), 'HH:mm')}</div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`button-actions-${message.id}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedMessage(message);
                                    setShowMessageDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedMessage(message);
                                    setFlagReason(message.moderation?.flagReason || '');
                                    setFlagNotes(message.moderation?.notes || '');
                                    setShowFlagDialog(true);
                                  }}
                                >
                                  <Flag className="w-4 h-4 mr-2" />
                                  Update Flag
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Hide Message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalMessages)} of {totalMessages} messages
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          data-testid="button-prev-page"
                        >
                          Previous
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          data-testid="button-next-page"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Message Templates
              </CardTitle>
              <CardDescription>
                Create and manage reusable message templates for mass communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template: MessageTemplate) => (
                    <Card key={template.id} className="relative">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>{template.subject}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">{template.type}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {template.content}
                            </p>
                          </div>
                          {template.variables && template.variables.length > 0 && (
                            <div>
                              <label className="text-xs font-medium">Variables:</label>
                              <div className="flex gap-1 mt-1">
                                {template.variables.map((variable, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {variable}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Created: {format(new Date(template.createdAt), 'MMM dd, yyyy')}</span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                                data-testid={`button-edit-template-${template.id}`}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(template.content)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
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

        {/* Mass Messaging Tab */}
        <TabsContent value="mass-messaging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Mass Messaging Center
              </CardTitle>
              <CardDescription>
                Send targeted messages to user groups using templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => setShowMassMessageDialog(true)}
                        disabled={templates.length === 0}
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Send Announcement
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => setShowMassMessageDialog(true)}
                        disabled={templates.length === 0}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Message User Segment
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => setShowMassMessageDialog(true)}
                        disabled={templates.length === 0}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Emergency Broadcast
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Active Templates</span>
                        <Badge>{templates.filter(t => t.isActive).length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Templates</span>
                        <Badge variant="outline">{templates.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Last Campaign</span>
                        <span className="text-xs text-muted-foreground">-</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {templates.slice(0, 3).map((template: MessageTemplate) => (
                        <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-muted-foreground">{template.type}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMassMessageTemplate(template.id);
                              setShowMassMessageDialog(true);
                            }}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Use
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Details Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              View detailed information about this flagged message
            </DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Content</h4>
                <div className="p-3 bg-muted rounded-md">
                  {selectedMessage.content}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Sender</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Username:</strong> {selectedMessage.sender.username}</p>
                    <p><strong>Display Name:</strong> {selectedMessage.sender.displayName}</p>
                    <p><strong>Role:</strong> {selectedMessage.sender.role}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Receiver</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Username:</strong> {selectedMessage.receiver.username}</p>
                    <p><strong>Display Name:</strong> {selectedMessage.receiver.displayName}</p>
                    <p><strong>Role:</strong> {selectedMessage.receiver.role}</p>
                  </div>
                </div>
              </div>

              {selectedMessage.moderation && (
                <div>
                  <h4 className="font-semibold mb-2">Moderation Info</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Status:</strong> {selectedMessage.moderation.status}</p>
                    <p><strong>Flag Reason:</strong> {selectedMessage.moderation.flagReason || 'N/A'}</p>
                    {selectedMessage.moderation.notes && (
                      <p><strong>Notes:</strong> {selectedMessage.moderation.notes}</p>
                    )}
                    <p><strong>Auto Flagged:</strong> {selectedMessage.moderation.autoFlagged ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}
              
              <div className="text-sm">
                <p><strong>Sent:</strong> {format(new Date(selectedMessage.createdAt), 'PPpp')}</p>
                <p><strong>Read:</strong> {selectedMessage.isRead ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Message Flag</DialogTitle>
            <DialogDescription>
              Update the flag reason and add moderation notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Flag Reason</label>
              <Select value={flagReason} onValueChange={setFlagReason}>
                <SelectTrigger data-testid="select-flag-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                  <SelectItem value="threats">Threats or Violence</SelectItem>
                  <SelectItem value="fraud">Fraud or Scam</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Moderation Notes</label>
              <Textarea
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value)}
                placeholder="Add notes about this moderation action..."
                data-testid="textarea-flag-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFlagSubmit}
              disabled={flagMessageMutation.isPending}
              data-testid="button-submit-flag"
            >
              {flagMessageMutation.isPending ? "Updating..." : "Update Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {selectedTemplate ? 'Update the message template' : 'Create a new reusable message template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name</label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger data-testid="select-template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="system">System Notice</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <Input
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                placeholder="Message subject"
                data-testid="input-template-subject"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <Textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Message content..."
                className="min-h-32"
                data-testid="textarea-template-content"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={templateIsActive}
                onCheckedChange={setTemplateIsActive}
                data-testid="switch-template-active"
              />
              <label className="text-sm font-medium">Active Template</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTemplateSubmit}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending || !templateName || !templateContent}
              data-testid="button-submit-template"
            >
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? "Saving..." : (selectedTemplate ? "Update Template" : "Create Template")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mass Message Dialog */}
      <Dialog open={showMassMessageDialog} onOpenChange={setShowMassMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Mass Message</DialogTitle>
            <DialogDescription>
              Send a message to a targeted group of users using a template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Template</label>
              <Select value={massMessageTemplate} onValueChange={setMassMessageTemplate}>
                <SelectTrigger data-testid="select-mass-template">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.isActive).map((template: MessageTemplate) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Target Audience</label>
              <Select value={massMessageAudience} onValueChange={setMassMessageAudience}>
                <SelectTrigger data-testid="select-mass-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users">All Users</SelectItem>
                  <SelectItem value="creators">Creators Only</SelectItem>
                  <SelectItem value="fans">Fans Only</SelectItem>
                  <SelectItem value="premium_users">Premium Users</SelectItem>
                  <SelectItem value="active_users">Active Users (30 days)</SelectItem>
                  <SelectItem value="custom">Custom Filter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {massMessageAudience === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Custom Filter (JSON)</label>
                <Textarea
                  value={massMessageCustomFilter}
                  onChange={(e) => setMassMessageCustomFilter(e.target.value)}
                  placeholder='{"role": "creator", "subscriptionTier": "premium"}'
                  data-testid="textarea-custom-filter"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={massMessagePreview}
                onCheckedChange={setMassMessagePreview}
                data-testid="switch-preview-mode"
              />
              <label className="text-sm font-medium">Preview Mode (Test with 1 user)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMassMessageDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const customFilter = massMessageAudience === 'custom' && massMessageCustomFilter 
                  ? JSON.parse(massMessageCustomFilter) 
                  : undefined;
                
                sendMassMessageMutation.mutate({
                  templateId: massMessageTemplate,
                  targetAudience: massMessageAudience,
                  customFilter
                });
              }}
              disabled={sendMassMessageMutation.isPending || !massMessageTemplate}
              data-testid="button-send-mass-message"
            >
              {sendMassMessageMutation.isPending ? "Sending..." : (massMessagePreview ? "Send Preview" : "Send Mass Message")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Messages Analytics</DialogTitle>
            <DialogDescription>
              View detailed analytics about message moderation and activity
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <Input
                  type="date"
                  value={analyticsDateFrom}
                  onChange={(e) => setAnalyticsDateFrom(e.target.value)}
                  data-testid="input-analytics-from"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <Input
                  type="date"
                  value={analyticsDateTo}
                  onChange={(e) => setAnalyticsDateTo(e.target.value)}
                  data-testid="input-analytics-to"
                />
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : analytics && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(() => {
                  const summary = getAnalyticsSummary();
                  if (!summary) return null;
                  
                  return (
                    <>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.totalMessages}</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Flagged Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.flaggedRate}%</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Normal Messages</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.normalRate}%</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Hidden Messages</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.hiddenMessages}</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Deleted Messages</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{summary.deletedMessages}</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Templates</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{templates.length}</div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}