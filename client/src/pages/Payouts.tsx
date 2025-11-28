import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Download, Plus, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Payouts() {
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    amountCents: '',
    currency: 'USD'
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['/api/payouts'],
  });

  const createPayoutMutation = useMutation({
    mutationFn: async (data: { amountCents: number; currency: string }) => {
      return apiRequest('POST', '/api/payouts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payouts'] });
      setIsRequestOpen(false);
      setRequestForm({ amountCents: '', currency: 'USD' });
      toast({
        title: "Success",
        description: "Payout request submitted successfully",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(requestForm.amountCents);
    if (!amount || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    createPayoutMutation.mutate({
      amountCents: Math.round(amount * 100),
      currency: requestForm.currency
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-accent text-accent-foreground';
      case 'pending': return 'bg-yellow-500 text-yellow-50';
      case 'processing': return 'bg-blue-500 text-blue-50';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const totalEarnings = payouts?.reduce((sum: number, payout: any) => {
    if (payout.status === 'completed') {
      return sum + payout.amountCents;
    }
    return sum;
  }, 0) || 0;

  const pendingAmount = payouts?.reduce((sum: number, payout: any) => {
    if (payout.status === 'pending' || payout.status === 'processing') {
      return sum + payout.amountCents;
    }
    return sum;
  }, 0) || 0;

  return (
    <div className="space-y-6" data-testid="payouts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">Payouts</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage your earnings and payout requests
          </p>
        </div>
        
        <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
          <DialogTrigger asChild>
            <Button className="glow-effect" data-testid="request-payout-button">
              <Plus className="mr-2 h-4 w-4" />
              Request Payout
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="payout-dialog">
            <DialogHeader>
              <DialogTitle>Request Payout</DialogTitle>
              <DialogDescription>
                Request a payout from your available earnings
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    value={requestForm.amountCents}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, amountCents: e.target.value }))}
                    placeholder="0.00"
                    className="pl-10"
                    required
                    data-testid="payout-amount-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={requestForm.currency} 
                  onValueChange={(value) => setRequestForm(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger data-testid="payout-currency-select">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  Payout requests are processed within 1-3 business days. 
                  A small processing fee may apply.
                </p>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsRequestOpen(false)}
                  data-testid="payout-cancel-button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPayoutMutation.isPending}
                  className="glow-effect"
                  data-testid="payout-submit-button"
                >
                  {createPayoutMutation.isPending ? 'Processing...' : 'Request Payout'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold" data-testid="total-earnings">
                  ${(totalEarnings / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
                <p className="text-2xl font-bold text-yellow-500" data-testid="pending-payouts">
                  ${(pendingAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-accent" data-testid="available-balance">
                  $2,847.50
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                Track your payout requests and their status
              </CardDescription>
            </div>
            <Button variant="outline" data-testid="export-payouts-button">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-muted rounded-lg"></div>
                    <div>
                      <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : payouts && payouts.length > 0 ? (
            <div className="space-y-4">
              {payouts.map((payout: any) => (
                <div 
                  key={payout.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`payout-item-${payout.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`payout-amount-${payout.id}`}>
                        ${(payout.amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} {payout.currency}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`payout-date-${payout.id}`}>
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </p>
                      {payout.providerRef && (
                        <p className="text-xs text-muted-foreground" data-testid={`payout-ref-${payout.id}`}>
                          Ref: {payout.providerRef}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(payout.status)} data-testid={`payout-status-${payout.id}`}>
                    {payout.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2" data-testid="empty-state-title">
                No payouts yet
              </h3>
              <p className="text-muted-foreground mb-6" data-testid="empty-state-description">
                Request your first payout when you have earnings available.
              </p>
              <Button onClick={() => setIsRequestOpen(true)} className="glow-effect" data-testid="empty-state-request-button">
                <Plus className="mr-2 h-4 w-4" />
                Request First Payout
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
