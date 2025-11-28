import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Ticket, 
  Send, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  Upload,
  X,
  FileText,
  Camera,
  Paperclip,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Form validation schema
const ticketFormSchema = z.object({
  subject: z.string().min(10, 'Subject must be at least 10 characters').max(200, 'Subject too long'),
  description: z.string().min(50, 'Please provide more details (minimum 50 characters)').max(5000, 'Description too long'),
  category: z.string().min(1, 'Please select a category'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    required_error: 'Please select a priority level'
  }),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    size: z.number(),
    type: z.string()
  })).optional(),
  metadata: z.object({
    browser: z.string().optional(),
    platform: z.string().optional(),
    currentUrl: z.string().optional(),
    userAgent: z.string().optional()
  }).optional(),
  agreedToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms')
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

interface AttachmentFile {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  error?: string;
}

const TICKET_CATEGORIES = [
  { value: 'account_billing', label: 'Account & Billing' },
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'verification', label: 'Account Verification' },
  { value: 'privacy_safety', label: 'Privacy & Safety' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'other', label: 'Other' }
];

const COMMON_TAGS = [
  'payment', 'upload', 'streaming', 'profile', 'security', 
  'mobile', 'desktop', 'performance', 'ui', 'accessibility'
];

export function TicketCreationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Initialize form with browser/system metadata
  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: '',
      priority: 'medium',
      tags: [],
      attachments: [],
      agreedToTerms: false,
      metadata: {
        browser: navigator.userAgent.split(' ')[0] || 'Unknown',
        platform: navigator.platform || 'Unknown',
        currentUrl: window.location.href,
        userAgent: navigator.userAgent
      }
    }
  });

  // Create ticket mutation
  const createTicketMutation = useMutation<
    { ticketNumber: string; id: string },
    Error,
    TicketFormData
  >({
    mutationFn: async (data) => {
      return apiRequest<{ ticketNumber: string; id: string }>('/api/help/tickets', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (result) => {
      toast({
        title: "Support Ticket Created",
        description: `Your ticket #${result.ticketNumber} has been submitted successfully.`,
      });
      
      // Redirect to the new ticket
      setLocation(`/help/tickets/${result.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error Creating Ticket",
        description: error.message || "Failed to create support ticket. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (data: TicketFormData) => {
    // Add selected tags and uploaded attachments
    const formData = {
      ...data,
      tags: selectedTags,
      attachments: attachments
        .filter(att => att.uploaded && att.url)
        .map(att => ({
          filename: att.file.name,
          url: att.url!,
          size: att.file.size,
          type: att.file.type
        }))
    };

    createTicketMutation.mutate(formData);
  };

  const handleFileUpload = (files: FileList) => {
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];

    Array.from(files).forEach(file => {
      if (attachments.length >= maxFiles) {
        toast({
          title: "Too many files",
          description: `Maximum ${maxFiles} files allowed`,
          variant: "destructive"
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Maximum size is 10MB`,
          variant: "destructive"
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "File type not supported",
          description: `${file.name} type is not supported`,
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: AttachmentFile = {
          file,
          preview: e.target?.result as string,
          uploading: false,
          uploaded: true, // For demo purposes, we'll consider it uploaded
          url: `https://example.com/uploads/${file.name}` // Mock URL
        };

        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-blue-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900/20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-500/20 backdrop-blur-3xl"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Back Navigation */}
            <div className="flex justify-start mb-6">
              <Link href="/help/tickets">
                <Button variant="outline" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tickets
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-orange-600 to-red-500 p-3 rounded-full">
                <Ticket className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Create Support Ticket
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Describe your issue in detail and our support team will help you as soon as possible.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            
            {/* Main Information */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ticket Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Category & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            {TICKET_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value} className="text-white">
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-gray-400">
                          Choose the category that best describes your issue
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Priority *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="low" className="text-white">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full bg-blue-400 mr-2`}></div>
                                Low - General questions
                              </div>
                            </SelectItem>
                            <SelectItem value="medium" className="text-white">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full bg-yellow-400 mr-2`}></div>
                                Medium - Standard support
                              </div>
                            </SelectItem>
                            <SelectItem value="high" className="text-white">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full bg-orange-400 mr-2`}></div>
                                High - Urgent issue
                              </div>
                            </SelectItem>
                            <SelectItem value="urgent" className="text-white">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full bg-red-400 mr-2`}></div>
                                Urgent - Critical problem
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-gray-400">
                          How urgently do you need this resolved?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Subject */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Subject *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Brief summary of your issue..."
                          className="bg-gray-900 border-gray-600 text-white"
                          data-testid="input-ticket-subject"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400">
                        A clear, descriptive title for your support request
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce the problem, and what you expected to happen..."
                          className="bg-gray-900 border-gray-600 text-white min-h-[150px]"
                          data-testid="textarea-ticket-description"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400">
                        The more details you provide, the faster we can help you
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Tags (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm mb-4">
                  Select relevant tags to help us categorize and route your ticket
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-orange-500'
                      }`}
                      data-testid={`tag-${tag}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">Selected tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-orange-600/20 text-orange-400">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Attachments */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">
                      Drop files here or click to upload
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                      id="file-upload"
                      data-testid="input-file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-md cursor-pointer hover:bg-gray-600"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Select Files
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Max 5 files, 10MB each. Supports: JPG, PNG, GIF, PDF, TXT
                    </p>
                  </div>

                  {/* Attachment Preview */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {attachments.map((attachment, index) => (
                        <div key={index} className="relative bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-sm truncate flex-1">
                              {attachment.file.name}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeAttachment(index)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                              data-testid={`button-remove-attachment-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center text-xs text-gray-400">
                            <span>{(attachment.file.size / 1024 / 1024).toFixed(2)} MB</span>
                            {attachment.uploaded && (
                              <CheckCircle className="h-3 w-3 text-green-400 ml-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Terms Agreement */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="agreedToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                          data-testid="checkbox-terms-agreement"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-white">
                          I agree to the terms and conditions *
                        </FormLabel>
                        <FormDescription className="text-gray-400">
                          By submitting this ticket, you agree to our{' '}
                          <Link href="/terms" className="text-orange-400 hover:underline">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link href="/privacy" className="text-orange-400 hover:underline">
                            Privacy Policy
                          </Link>
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Link href="/help/tickets">
                <Button variant="outline" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                  Cancel
                </Button>
              </Link>
              
              <Button 
                type="submit" 
                disabled={createTicketMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-submit-ticket"
              >
                {createTicketMutation.isPending ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Support Ticket
                  </>
                )}
              </Button>
            </div>

            {/* Info Alert */}
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-blue-400">
                <strong>Response Times:</strong> Low priority (48 hours), Medium (24 hours), High (4 hours), Urgent (1 hour). 
                We'll send updates to your email and you can track progress in your ticket dashboard.
              </AlertDescription>
            </Alert>

          </form>
        </Form>
      </div>
    </div>
  );
}