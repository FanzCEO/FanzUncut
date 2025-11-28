import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  CreditCard,
  Coins,
  DollarSign,
  History,
  PieChart,
  Award,
  Zap,
  Shield
} from 'lucide-react';

/**
 * FanzMoneyCenter - Unified Financial Control Dashboard
 * Part of FanzTrust™ Financial Ecosystem
 */

export default function FanzMoneyCenter() {
  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/fanz-trust/dashboard'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff0000] mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading FanzMoneyCenter...</p>
        </div>
      </div>
    );
  }

  const { wallet, balance, stats, recentTransactions, tokens, creditLines, cards } = dashboardData || {};

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#ff0000]/20 to-[#d4a959]/20 border border-[#ff0000]/30">
            <Wallet className="w-8 h-8 text-[#ff0000]" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-['Bebas_Neue'] text-white tracking-wide">
              FanzMoneyCenter
            </h1>
            <p className="text-zinc-400 text-sm">Powered by FanzTrust™</p>
          </div>
        </div>
        <Separator className="bg-zinc-800 mt-4" />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Balance */}
          <Card className="bg-gradient-to-br from-[#ff0000]/10 to-transparent border-[#ff0000]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-zinc-400">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(balance?.total || 0)}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Available Balance */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-zinc-400">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(balance?.available || 0)}
              </div>
              <div className="text-xs text-zinc-500 mt-2">Ready to spend</div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-zinc-400">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#d4a959]">
                {formatCurrency(stats?.totalRevenue || 0)}
              </div>
              <div className="flex items-center gap-1 text-xs text-green-400 mt-2">
                <ArrowUpRight className="w-3 h-3" />
                All time
              </div>
            </CardContent>
          </Card>

          {/* Total Spent */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-zinc-400">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(stats?.totalSpent || 0)}
              </div>
              <div className="flex items-center gap-1 text-xs text-red-400 mt-2">
                <ArrowDownRight className="w-3 h-3" />
                All time
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
            <TabsTrigger value="tokens" data-testid="tab-tokens">Tokens</TabsTrigger>
            <TabsTrigger value="credit" data-testid="tab-credit">Credit</TabsTrigger>
            <TabsTrigger value="cards" data-testid="tab-cards">Cards</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Wallet Details */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#ff0000]" />
                    Wallet Details
                  </CardTitle>
                  <CardDescription>Your FanzWallet balance breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                    <span className="text-sm text-zinc-400">Available Balance</span>
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(balance?.available || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                    <span className="text-sm text-zinc-400">Pending Balance</span>
                    <span className="text-lg font-bold text-yellow-500">
                      {formatCurrency(balance?.pending || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                    <span className="text-sm text-zinc-400">Held Balance</span>
                    <span className="text-lg font-bold text-orange-500">
                      {formatCurrency(balance?.held || 0)}
                    </span>
                  </div>
                  <Separator className="bg-zinc-800" />
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-[#ff0000]/20 to-[#d4a959]/20">
                    <span className="text-sm font-semibold text-white">Total Balance</span>
                    <span className="text-xl font-bold text-[#ff0000]">
                      {formatCurrency(balance?.total || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Token Balances */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[#d4a959]" />
                    Token Balances
                  </CardTitle>
                  <CardDescription>Your FanzToken & FanzCoin holdings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tokens?.map((token: any) => (
                    <div 
                      key={token.type} 
                      className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-2">
                        {token.type === 'fanzcoin' && <Coins className="w-4 h-4 text-[#d4a959]" />}
                        {token.type === 'fanztoken' && <Zap className="w-4 h-4 text-[#ff0000]" />}
                        {token.type === 'loyalty' && <Award className="w-4 h-4 text-purple-500" />}
                        {token.type === 'reward' && <Award className="w-4 h-4 text-blue-500" />}
                        {token.type === 'utility' && <Shield className="w-4 h-4 text-green-500" />}
                        <span className="text-sm text-zinc-400 capitalize">{token.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{token.balance}</div>
                        <div className="text-xs text-zinc-500">
                          ${(token.balance * token.valueCentsPerToken / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button 
                    className="w-full bg-[#ff0000] hover:bg-[#cc0000] text-white"
                    data-testid="button-buy-tokens"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Buy Tokens
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" className="border-[#ff0000]/30 hover:bg-[#ff0000]/10" data-testid="button-transfer">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Transfer
                  </Button>
                  <Button variant="outline" className="border-[#d4a959]/30 hover:bg-[#d4a959]/10" data-testid="button-deposit">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                  <Button variant="outline" className="border-zinc-600 hover:bg-zinc-800" data-testid="button-withdraw">
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                  <Button variant="outline" className="border-zinc-600 hover:bg-zinc-800" data-testid="button-analytics">
                    <PieChart className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#ff0000]" />
                  Transaction History
                </CardTitle>
                <CardDescription>Your recent financial activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions?.map((tx: any, index: number) => (
                    <div 
                      key={tx.id} 
                      className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                      data-testid={`transaction-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tx.entryType === 'credit' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.entryType === 'credit' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {tx.description || tx.transactionType}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {new Date(tx.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          tx.entryType === 'credit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {tx.entryType === 'credit' ? '+' : '-'}
                          {formatCurrency(Math.abs(Number(tx.amountCents)))}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Balance: {formatCurrency(Number(tx.balanceAfterCents))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!recentTransactions || recentTransactions.length === 0) && (
                    <div className="text-center py-8 text-zinc-500">
                      No transactions yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tokens Tab */}
          <TabsContent value="tokens">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#d4a959]" />
                  Token Economy
                </CardTitle>
                <CardDescription>Manage your FanzToken & FanzCoin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-zinc-500">
                  Token management coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Tab */}
          <TabsContent value="credit">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#ff0000]" />
                  FanzCredit
                </CardTitle>
                <CardDescription>Your credit lines and lending</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {creditLines && creditLines.length > 0 ? (
                  <>
                    {creditLines.map((credit: any) => (
                      <div key={credit.id} className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-sm text-zinc-400">Credit Line</div>
                            <div className="text-xl font-bold text-white mt-1">
                              {formatCurrency(Number(credit.creditLimitCents))}
                            </div>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`${
                              credit.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              credit.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                            data-testid={`credit-status-${credit.id}`}
                          >
                            {credit.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-zinc-500">Available</div>
                            <div className="font-semibold text-green-400">
                              {formatCurrency(Number(credit.availableCreditCents))}
                            </div>
                          </div>
                          <div>
                            <div className="text-zinc-500">Used</div>
                            <div className="font-semibold text-red-400">
                              {formatCurrency(Number(credit.balanceCents))}
                            </div>
                          </div>
                          <div>
                            <div className="text-zinc-500">APR</div>
                            <div className="font-semibold text-zinc-300">{credit.interestRateApr}%</div>
                          </div>
                        </div>
                        {credit.collateralType && (
                          <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                            Collateral: {credit.collateralType} ({formatCurrency(Number(credit.collateralValueCents) || 0)})
                          </div>
                        )}
                      </div>
                    ))}
                    <Button 
                      className="w-full bg-[#ff0000] hover:bg-[#cc0000] text-white"
                      data-testid="button-apply-credit"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Apply for Credit
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                    <p className="text-zinc-500 mb-4">No credit lines yet</p>
                    <Button 
                      className="bg-[#ff0000] hover:bg-[#cc0000] text-white"
                      data-testid="button-apply-credit-empty"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Apply for Credit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#d4a959]" />
                  FanzCard
                </CardTitle>
                <CardDescription>Your virtual debit cards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cards && cards.length > 0 ? (
                  <>
                    {cards.map((card: any) => (
                      <div key={card.id} className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-[#ff0000]/20 via-zinc-900 to-[#d4a959]/20 border border-[#ff0000]/30">
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">FanzCard</div>
                              <div className="text-sm text-zinc-500">{card.nickname || 'Virtual Debit Card'}</div>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`${
                                card.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                card.status === 'frozen' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}
                              data-testid={`card-status-${card.id}`}
                            >
                              {card.status}
                            </Badge>
                          </div>
                          <div className="text-2xl font-['Courier_New'] tracking-widest text-white mb-6">
                            •••• •••• •••• {card.lastFour}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <div className="text-zinc-500 mb-1">Per Transaction</div>
                              <div className="text-white font-semibold">{formatCurrency(Number(card.perTransactionLimitCents))}</div>
                            </div>
                            <div>
                              <div className="text-zinc-500 mb-1">Daily Limit</div>
                              <div className="text-white font-semibold">{formatCurrency(Number(card.dailyLimitCents))}</div>
                            </div>
                            <div>
                              <div className="text-zinc-500 mb-1">Monthly Limit</div>
                              <div className="text-white font-semibold">{formatCurrency(Number(card.monthlyLimitCents))}</div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#ff0000]/10 to-transparent rounded-full blur-3xl"></div>
                      </div>
                    ))}
                    <Button 
                      className="w-full bg-[#d4a959] hover:bg-[#b8925e] text-white"
                      data-testid="button-create-card"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Create New Card
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                    <p className="text-zinc-500 mb-4">No virtual cards yet</p>
                    <Button 
                      className="bg-[#d4a959] hover:bg-[#b8925e] text-white"
                      data-testid="button-create-card-empty"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Create Your First Card
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
