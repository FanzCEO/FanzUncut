import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { 
  Ticket, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  MessageCircle,
  Filter,
  ChevronDown,
  Search,
  Calendar,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_for_response' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  updatedAt: string;
  lastResponseAt?: string;
  assignedTo?: {
    name: string;
    avatar: string;
  };
  messageCount: number;
  tags: string[];
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: string;
}

export function TicketsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'priority' | 'status'>('recent');

  // Fetch user's support tickets
  const { data: ticketsData, isLoading } = useQuery<{
    tickets: SupportTicket[];
    stats: TicketStats;
    totalCount: number;
    hasMore: boolean;
  }>({
    queryKey: ['/api/help/tickets', { 
      search: searchQuery, 
      status: selectedStatus,
      priority: selectedPriority,
      sort: sortBy,
      page: 1,
      limit: 20
    }],
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900/20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-500/20 backdrop-blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-orange-600 to-red-500 p-3 rounded-full">
                <Ticket className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Support Tickets
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Track your support requests, view responses, and manage your help tickets in one place.
            </p>

            {/* Create New Ticket CTA */}
            <div className="flex justify-center">
              <Link href="/help/tickets/new">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700" data-testid="button-create-ticket">
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Ticket
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Stats Cards */}
        {ticketsData?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Ticket className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-400">Total Tickets</p>
                    <p className="text-2xl font-bold text-white">{ticketsData.stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-400">Open/In Progress</p>
                    <p className="text-2xl font-bold text-white">{ticketsData.stats.open + ticketsData.stats.inProgress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-400">Resolved</p>
                    <p className="text-2xl font-bold text-white">{ticketsData.stats.resolved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Clock className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-400">Avg Response</p>
                    <p className="text-2xl font-bold text-white">{ticketsData.stats.avgResponseTime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar - Filters */}
          <div className="lg:w-1/4">
            <div className="space-y-6 sticky top-6">
              {/* Search */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-gray-900 border-gray-600 text-white"
                      data-testid="input-search-tickets"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Status Filter */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: '', label: 'All Statuses', count: ticketsData?.stats?.total || 0 },
                    { key: 'open', label: 'Open', count: ticketsData?.stats?.open || 0 },
                    { key: 'in_progress', label: 'In Progress', count: ticketsData?.stats?.inProgress || 0 },
                    { key: 'resolved', label: 'Resolved', count: ticketsData?.stats?.resolved || 0 }
                  ].map((status) => (
                    <Button
                      key={status.key}
                      variant={selectedStatus === status.key ? "default" : "outline"}
                      className="w-full justify-start text-sm"
                      onClick={() => setSelectedStatus(status.key)}
                      data-testid={`filter-status-${status.key || 'all'}`}
                    >
                      {status.key && getStatusIcon(status.key)}
                      <span className={status.key ? 'ml-2' : ''}>{status.label}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {status.count}
                      </Badge>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Priority Filter */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Priority</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: '', label: 'All Priorities' },
                    { key: 'urgent', label: 'Urgent' },
                    { key: 'high', label: 'High' },
                    { key: 'medium', label: 'Medium' },
                    { key: 'low', label: 'Low' }
                  ].map((priority) => (
                    <Button
                      key={priority.key}
                      variant={selectedPriority === priority.key ? "default" : "outline"}
                      className="w-full justify-start text-sm capitalize"
                      onClick={() => setSelectedPriority(priority.key)}
                      data-testid={`filter-priority-${priority.key || 'all'}`}
                    >
                      {priority.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:w-3/4">
            
            {/* Sort Options */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Your Support Tickets
              </h2>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-gray-800 border-gray-700 text-white">
                    Sort by {sortBy} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem onClick={() => setSortBy('recent')} className="text-white">
                    Most Recent
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('oldest')} className="text-white">
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('priority')} className="text-white">
                    Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('status')} className="text-white">
                    Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tickets List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-700 rounded"></div>
                        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {ticketsData?.tickets?.map((ticket) => (
                  <Link key={ticket.id} href={`/help/tickets/${ticket.id}`}>
                    <Card className="group bg-gray-800/50 border-gray-700 hover:border-orange-500/50 transition-all duration-300 cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-gray-400">#{ticket.ticketNumber}</span>
                              <Badge className={getStatusColor(ticket.status)}>
                                {getStatusIcon(ticket.status)}
                                <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                              </Badge>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                            </div>
                            
                            <CardTitle className="text-lg text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                              {ticket.subject}
                            </CardTitle>
                            
                            <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                              {ticket.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                            </div>
                            
                            <div className="flex items-center">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {ticket.messageCount} messages
                            </div>
                            
                            {ticket.assignedTo && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                Assigned to {ticket.assignedTo.name}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {ticket.lastResponseAt && (
                              <span>Last updated {formatDistanceToNow(new Date(ticket.lastResponseAt), { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>
                        
                        {ticket.tags.length > 0 && (
                          <>
                            <Separator className="bg-gray-700 my-3" />
                            <div className="flex flex-wrap gap-1">
                              {ticket.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* No Results */}
            {ticketsData?.tickets?.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Ticket className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No tickets found
                </h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery || selectedStatus || selectedPriority ? 
                    'Try adjusting your search or filters.' :
                    'You haven\'t created any support tickets yet.'
                  }
                </p>
                <Link href="/help/tickets/new">
                  <Button className="bg-orange-600 hover:bg-orange-700" data-testid="button-create-first-ticket">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Ticket
                  </Button>
                </Link>
              </div>
            )}

            {/* Load More */}
            {ticketsData?.hasMore && (
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  data-testid="button-load-more"
                >
                  Load More Tickets
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}