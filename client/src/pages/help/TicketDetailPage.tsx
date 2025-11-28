import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Ticket, 
  ArrowLeft, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Send,
  Paperclip,
  User,
  Calendar,
  Tag,
  Download,
  RefreshCw,
  Edit3,
  Archive,
  MoreHorizontal,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow, format } from 'date-fns';

// Comment form schema
const commentFormSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long')
});

type CommentFormData = z.infer<typeof commentFormSchema>;

interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  author: {
    name: string;
    email: string;
    avatar?: string;
    role: 'user' | 'agent' | 'admin';
  };
  message: string;
  isInternal: boolean;
  attachments: Array<{
    filename: string;
    url: string;
    size: number;
    type: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_for_response' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastResponseAt?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    department: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  attachments: Array<{
    filename: string;
    url: string;
    size: number;
    type: string;
  }>;
  comments: TicketComment[];
  metadata: {
    browser?: string;
    platform?: string;
    currentUrl?: string;
    userAgent?: string;
  };
}

interface TicketDetailPageProps {
  ticketId: string;
}

export function TicketDetailPage({ ticketId }: TicketDetailPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Comment form
  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      message: ''
    }
  });

  // Fetch ticket details
  const { data: ticket, isLoading, error } = useQuery<TicketDetail>({
    queryKey: ['/api/help/tickets', ticketId],
    staleTime: 30 * 1000 // 30 seconds
  });

  // Add comment mutation
  const addCommentMutation = useMutation<
    TicketComment,
    Error,
    CommentFormData
  >({
    mutationFn: async (data) => {
      return apiRequest<TicketComment>(`/api/help/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/help/tickets', ticketId] });
      commentForm.reset();
      toast({
        title: "Comment Added",
        description: "Your comment has been added to the ticket.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Adding Comment",
        description: error.message || "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation<
    TicketDetail,
    Error,
    { status: string }
  >({
    mutationFn: async (data) => {
      return apiRequest<TicketDetail>(`/api/help/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/help/tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['/api/help/tickets'] });
      toast({
        title: "Status Updated",
        description: "Ticket status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Status",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCommentSubmit = async (data: CommentFormData) => {
    setIsSubmittingComment(true);
    try {
      await addCommentMutation.mutateAsync(data);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'waiting_for_response': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'urgent': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'waiting_for_response': return <MessageCircle className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
            <div className="h-32 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900/20 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Ticket Not Found</h1>
          <p className="text-gray-400 mb-6">
            The support ticket you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link href="/help/tickets">
            <Button className="bg-orange-600 hover:bg-orange-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/help/tickets">
              <Button variant="outline" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tickets
              </Button>
            </Link>
            
            <div>
              <h1 className="text-3xl font-bold text-white">
                Ticket #{ticket.ticketNumber}
              </h1>
              <p className="text-gray-400">
                Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-gray-800 border-gray-700 text-white">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700" align="end">
              <DropdownMenuItem 
                className="text-white"
                onClick={() => updateStatusMutation.mutate({ status: 'resolved' })}
                disabled={ticket.status === 'resolved' || ticket.status === 'closed'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Resolved
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-white"
                onClick={() => updateStatusMutation.mutate({ status: 'open' })}
                disabled={ticket.status === 'open'}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reopen Ticket
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    className="text-red-400"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Close Ticket
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-800 border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Close Ticket</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Are you sure you want to close this ticket? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => updateStatusMutation.mutate({ status: 'closed' })}
                    >
                      Close Ticket
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Ticket Details */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getStatusColor(ticket.status)}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                      </Badge>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline" className="text-gray-400 border-gray-600">
                        {ticket.category}
                      </Badge>
                    </div>
                    
                    <CardTitle className="text-2xl text-white mb-3">
                      {ticket.subject}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-gray-300 whitespace-pre-wrap">
                  {ticket.description}
                </div>

                {/* Tags */}
                {ticket.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs text-gray-400 border-gray-600">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Original Attachments */}
                {ticket.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white">Attachments</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ticket.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
                          <div className="flex items-center space-x-3">
                            <Paperclip className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm text-white font-medium">{attachment.filename}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                            onClick={() => window.open(attachment.url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversation ({ticket.comments.length})
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Comments List */}
                {ticket.comments.length > 0 ? (
                  <div className="space-y-6">
                    {ticket.comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={comment.author.avatar} />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {comment.author.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-white">
                                {comment.author.name}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${comment.author.role === 'agent' || comment.author.role === 'admin' ? 'text-orange-400 border-orange-600' : 'text-gray-400 border-gray-600'}`}
                              >
                                {comment.author.role}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(new Date(comment.createdAt), 'MMM dd, yyyy at h:mm a')}
                            </span>
                          </div>
                          
                          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                            <p className="text-gray-300 whitespace-pre-wrap">
                              {comment.message}
                            </p>
                            
                            {/* Comment Attachments */}
                            {comment.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {comment.attachments.map((attachment, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-600">
                                    <div className="flex items-center space-x-2">
                                      <Paperclip className="h-3 w-3 text-gray-400" />
                                      <span className="text-xs text-gray-300">{attachment.filename}</span>
                                      <span className="text-xs text-gray-500">({formatFileSize(attachment.size)})</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-orange-400 hover:text-orange-300 h-6 w-6 p-0"
                                      onClick={() => window.open(attachment.url, '_blank')}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                    <p>No comments yet. Start the conversation below.</p>
                  </div>
                )}

                <Separator className="bg-gray-700" />

                {/* Add Comment Form */}
                {ticket.status !== 'closed' && (
                  <Form {...commentForm}>
                    <form onSubmit={commentForm.handleSubmit(handleCommentSubmit)} className="space-y-4">
                      <FormField
                        control={commentForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Add a comment</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Describe your issue in more detail or provide additional information..."
                                className="min-h-[120px] bg-gray-900 border-gray-600 text-white placeholder:text-gray-500 resize-none"
                                data-testid="input-comment-message"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={isSubmittingComment || addCommentMutation.isPending}
                          className="bg-orange-600 hover:bg-orange-700"
                          data-testid="button-submit-comment"
                        >
                          {isSubmittingComment ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Post Comment
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}

                {ticket.status === 'closed' && (
                  <Alert className="bg-gray-800 border-gray-600">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-gray-300">
                      This ticket is closed. To add more comments, please reopen the ticket or create a new one.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Ticket Info */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <Badge className={getStatusColor(ticket.status)}>
                      {getStatusIcon(ticket.status)}
                      <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Priority:</span>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category:</span>
                    <span className="text-white text-sm">{ticket.category}</span>
                  </div>
                  
                  <Separator className="bg-gray-700" />
                  
                  <div className="space-y-2">
                    <span className="text-gray-400 text-sm">Created:</span>
                    <div className="text-white text-sm">
                      {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                      <br />
                      <span className="text-gray-500">{format(new Date(ticket.createdAt), 'h:mm a')}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-gray-400 text-sm">Last Updated:</span>
                    <div className="text-white text-sm">
                      {format(new Date(ticket.updatedAt), 'MMM dd, yyyy')}
                      <br />
                      <span className="text-gray-500">{format(new Date(ticket.updatedAt), 'h:mm a')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assigned Agent */}
            {ticket.assignedTo && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Assigned Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={ticket.assignedTo.avatar} />
                      <AvatarFallback className="bg-orange-600 text-white">
                        {ticket.assignedTo.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white font-medium">{ticket.assignedTo.name}</p>
                      <p className="text-gray-400 text-sm">{ticket.assignedTo.department}</p>
                      <p className="text-gray-500 text-xs">{ticket.assignedTo.email}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Info */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={ticket.creator.avatar} />
                    <AvatarFallback className="bg-gray-700 text-white">
                      {ticket.creator.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-medium">{ticket.creator.name}</p>
                    <p className="text-gray-500 text-xs">{ticket.creator.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            {ticket.metadata && Object.keys(ticket.metadata).length > 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Technical Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ticket.metadata.browser && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Browser:</span>
                      <span className="text-white">{ticket.metadata.browser}</span>
                    </div>
                  )}
                  
                  {ticket.metadata.platform && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Platform:</span>
                      <span className="text-white">{ticket.metadata.platform}</span>
                    </div>
                  )}
                  
                  {ticket.metadata.currentUrl && (
                    <div className="space-y-1">
                      <span className="text-gray-400 text-sm">URL:</span>
                      <div className="break-all text-xs text-gray-300 p-2 bg-gray-900 rounded border border-gray-700">
                        {ticket.metadata.currentUrl}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export for the component
export default TicketDetailPage;