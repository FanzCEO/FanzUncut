import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, TrendingUp, Calendar, Percent, Users, Zap } from 'lucide-react';

interface EarningsBreakdown {
  grossEarnings: number;
  platformFees: number;
  processorFees: number;
  netEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  feeBreakdown: {
    boyfanzFee: number;
    processorFee: number;
    taxWithholding?: number;
  };
}

interface EarningsStats {
  totalEarnings: number;
  platformFees: number;
  netEarnings: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  dailyEarnings: number;
  transactionCount: number;
  topEarningContent: Array<{
    mediaId: string;
    title: string;
    earnings: number;
  }>;
}

export default function EarningsPage() {
  const { data: breakdown, isLoading: breakdownLoading } = useQuery<EarningsBreakdown>({
    queryKey: ['/api/earnings/breakdown'],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<EarningsStats>({
    queryKey: ['/api/earnings/stats'],
  });

  if (breakdownLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="earnings-page">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          💰 Earnings Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          100% creator earnings program - no platform fees, full transparency
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20" data-testid="card-available-balance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400" data-testid="text-available-balance">
              {formatCurrency(breakdown?.availableBalance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20" data-testid="card-total-earnings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-400">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400" data-testid="text-total-earnings">
              {formatCurrency(breakdown?.grossEarnings || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All-time gross</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20" data-testid="card-monthly-earnings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-400">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400" data-testid="text-monthly-earnings">
              {formatCurrency(stats?.monthlyEarnings || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Monthly revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20" data-testid="card-transactions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-400">Transactions</CardTitle>
            <Zap className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400" data-testid="text-transaction-count">
              {stats?.transactionCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30" data-testid="card-earnings-program">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-400">
            <Percent className="h-5 w-5" />
            100% Creator Earnings Program
          </CardTitle>
          <CardDescription className="text-emerald-300">
            BoyFanz takes 0% platform fees - creators keep 100% of their earnings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-400">0%</div>
              <p className="text-sm text-muted-foreground">BoyFanz Platform Fee</p>
            </div>
            <div className="text-center p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400">2.9%</div>
              <p className="text-sm text-muted-foreground">Payment Processor Fee</p>
            </div>
            <div className="text-center p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
              <div className="text-2xl font-bold text-amber-400">97.1%</div>
              <p className="text-sm text-muted-foreground">Your Take-Home</p>
            </div>
          </div>
          
          <Separator className="bg-emerald-500/20" />
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Transparency Promise:</span>
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
              Full Disclosure
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}