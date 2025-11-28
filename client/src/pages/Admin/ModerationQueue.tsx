import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, XCircle, Eye, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function ModerationQueue() {
  const { user } = useAuth();
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; item: any; action: 'approve' | 'reject' | null }>({
    open: false,
    item: null,
    action: null
  });
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: moderationQueue, isLoading } = useQuery({
    queryKey: ['/api/moderation/queue'],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest('PUT', `/api/moderation/${id}/approve`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/queue'] });
      setReviewDialog({ open: false, item: null, action: null });
      setNotes('');
      toast({
        title: "Success",
        description: "Content approved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest('PUT', `/api/moderation/${id}/reject`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/queue'] });
      setReviewDialog({ open: false, item: null, action: null });
      setNotes('');
      toast({
        title: "Success",
        description: "Content rejected successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReview = (item: any, action: 'approve' | 'reject') => {
    setReviewDialog({ open: true, item, action });
    setNotes('');
  };

  const handleSubmitReview = () => {
    if (!reviewDialog.item || !reviewDialog.action) return;

    if (reviewDialog.action === 'approve') {
      approveMutation.mutate({ id: reviewDialog.item.id, notes });
    } else {
      rejectMutation.mutate({ id: reviewDialog.item.id, notes });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6" data-testid="access-denied">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Access denied. Admin privileges required to view moderation queue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="moderation-queue-page">
      <div>
        <h1 className="text-3xl font-bold font-display" data-testid="page-title">Moderation Queue</h1>
        <p className="text-muted-foreground" data-testid="page-description">
          Review and moderate user-submitted content
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-500" data-testid="pending-count">
                  {Array.isArray(moderationQueue) ? moderationQueue.length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Today</p>
                <p className="text-2xl font-bold text-accent" data-testid="approved-today">
                  12
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected Today</p>
                <p className="text-2xl font-bold text-destructive" data-testid="rejected-today">
                  3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Queue */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
          <CardDescription>
            Content awaiting moderation approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                  <div className="h-16 w-16 bg-muted rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-muted rounded"></div>
                    <div className="h-8 w-16 bg-muted rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : Array.isArray(moderationQueue) && moderationQueue.length > 0 ? (
            <div className="space-y-4">
              {moderationQueue?.map((item: any) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`moderation-item-${item.id}`}
                >
                  <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-image text-2xl text-muted-foreground"></i>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate" data-testid={`item-title-${item.id}`}>
                        {item.media?.title || 'Untitled'}
                      </h3>
                      <Badge variant="secondary" data-testid={`item-type-${item.id}`}>
                        {item.media?.mimeType?.split('/')[0] || 'unknown'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span data-testid={`item-creator-${item.id}`}>
                        Creator: {item.owner?.firstName} {item.owner?.lastName}
                      </span>
                      <span data-testid={`item-size-${item.id}`}>
                        {formatFileSize(item.media?.size || 0)}
                      </span>
                      <span data-testid={`item-date-${item.id}`}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {item.reason && (
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`item-reason-${item.id}`}>
                        Reason: {item.reason}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`view-item-${item.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => handleReview(item, 'approve')}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      data-testid={`approve-item-${item.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReview(item, 'reject')}
                      data-testid={`reject-item-${item.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2" data-testid="empty-queue-title">
                Queue is empty
              </h3>
              <p className="text-muted-foreground" data-testid="empty-queue-description">
                All content has been reviewed. Great job!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md" data-testid="review-dialog">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve Content' : 'Reject Content'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve' 
                ? 'Add any notes about the approval (optional)'
                : 'Please provide a reason for rejection'
              }
            </DialogDescription>
          </DialogHeader>
          
          {reviewDialog.item && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium" data-testid="review-item-title">
                  {reviewDialog.item.media?.title}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="review-item-creator">
                  By: {reviewDialog.item.owner?.firstName} {reviewDialog.item.owner?.lastName}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {reviewDialog.action === 'approve' ? 'Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={reviewDialog.action === 'approve' 
                    ? 'Add any notes about this approval...'
                    : 'Please explain why this content is being rejected...'
                  }
                  rows={3}
                  data-testid="review-notes-input"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setReviewDialog({ open: false, item: null, action: null })}
              data-testid="review-cancel-button"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={approveMutation.isPending || rejectMutation.isPending || (reviewDialog.action === 'reject' && !notes.trim())}
              className={reviewDialog.action === 'approve' ? 'bg-accent hover:bg-accent/90' : ''}
              variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
              data-testid="review-submit-button"
            >
              {(approveMutation.isPending || rejectMutation.isPending) ? 'Processing...' : 
               reviewDialog.action === 'approve' ? 'Approve Content' : 'Reject Content'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
