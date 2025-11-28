import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Receipt,
  FileText,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Filter,
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  Building,
  Calendar,
  Clock,
  Users,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  Send,
  Flag
} from "lucide-react";

// TypeScript interfaces
interface BillingProfile {
  id: string;
  userId: string;
  companyName?: string;
  taxId?: string;
  vatNumber?: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentTerms: number;
  preferredCurrency: string;
  billingCycle: string;
  creditLimit: number;
  currentBalance: number;
  autoPayEnabled: boolean;
  invoiceDeliveryMethod: string;
  customFields: any;
  createdAt: string;
  updatedAt: string;
  user?: {
    username: string;
    email: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  billingProfileId: string;
  customerId: string;
  status: string;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  dueDate: string;
  paidAt?: string;
  paymentReference?: string;
  notes?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  taxBreakdown: any;
  createdAt: string;
  updatedAt: string;
  customer?: {
    username: string;
    email: string;
  };
}

interface BillingAnalytics {
  totalProfiles: number;
  totalInvoices: number;
  totalRevenue: number;
  averageInvoiceAmount: number;
  paymentRate: number;
  overdueInvoices: number;
  revenueChart: Array<{ date: string; revenue: number; invoices: number }>;
  paymentCycleDistribution: Array<{ cycle: string; count: number; revenue: number }>;
  statusDistribution: Array<{ status: string; count: number; percentage: number }>;
  churnAnalysis: Array<{ month: string; churnRate: number; retention: number }>;
}

const billingProfileSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  vatNumber: z.string().optional(),
  billingAddress: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
    country: z.string().min(1, "Country is required")
  }),
  paymentTerms: z.number().min(1).max(365),
  preferredCurrency: z.string().default("USD"),
  billingCycle: z.enum(["weekly", "monthly", "quarterly", "annually"]),
  creditLimit: z.number().min(0),
  autoPayEnabled: z.boolean().default(false),
  invoiceDeliveryMethod: z.string().default("email")
});

const invoiceSchema = z.object({
  billingProfileId: z.string().min(1, "Billing profile is required"),
  customerId: z.string().min(1, "Customer is required"),
  subtotalCents: z.number().min(0),
  taxCents: z.number().min(0).default(0),
  discountCents: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0)
  })).min(1, "At least one line item is required")
});

const STATUS_COLORS = {
  draft: "bg-gray-500",
  sent: "bg-blue-500",
  paid: "bg-green-500",
  overdue: "bg-red-500",
  cancelled: "bg-gray-600",
  refunded: "bg-purple-500"
};

const CYCLE_COLORS = {
  weekly: "#8884d8",
  monthly: "#82ca9d",
  quarterly: "#ffc658",
  annually: "#ff7300"
};

export default function BillingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState("profiles");
  const [selectedProfile, setSelectedProfile] = useState<BillingProfile | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [profileFilters, setProfileFilters] = useState({
    page: 1,
    limit: 50,
    search: ""
  });
  const [invoiceFilters, setInvoiceFilters] = useState({
    page: 1,
    limit: 50,
    status: "",
    startDate: "",
    endDate: ""
  });

  // Forms
  const profileForm = useForm<z.infer<typeof billingProfileSchema>>({
    resolver: zodResolver(billingProfileSchema),
    defaultValues: {
      paymentTerms: 30,
      preferredCurrency: "USD",
      billingCycle: "monthly",
      creditLimit: 0,
      autoPayEnabled: false,
      invoiceDeliveryMethod: "email",
      billingAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "US"
      }
    }
  });

  const invoiceForm = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      subtotalCents: 0,
      taxCents: 0,
      discountCents: 0,
      currency: "USD",
      lineItems: [{ description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]
    }
  });

  // Data fetching
  const { data: profiles, isLoading: profilesLoading, refetch: refetchProfiles } = useQuery({
    queryKey: ['/api/admin/financial/billing/profiles', profileFilters],
    queryFn: () => apiRequest(`/api/admin/financial/billing/profiles?${new URLSearchParams(
      Object.entries(profileFilters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString()}`)
  });

  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['/api/admin/financial/billing/invoices', invoiceFilters],
    queryFn: () => apiRequest(`/api/admin/financial/billing/invoices?${new URLSearchParams(
      Object.entries(invoiceFilters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString()}`)
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/financial/billing/analytics'],
    queryFn: () => apiRequest('/api/admin/financial/billing/analytics')
  });

  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users?limit=1000')
  });

  // Mutations
  const createProfileMutation = useMutation({
    mutationFn: (data: z.infer<typeof billingProfileSchema>) =>
      apiRequest('/api/admin/financial/billing/profiles', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Billing profile created successfully" });
      refetchProfiles();
      setShowCreateProfile(false);
      profileForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create profile", variant: "destructive" });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BillingProfile> }) =>
      apiRequest(`/api/admin/financial/billing/profiles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Billing profile updated successfully" });
      refetchProfiles();
      setSelectedProfile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update profile", variant: "destructive" });
    }
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: z.infer<typeof invoiceSchema>) =>
      apiRequest('/api/admin/financial/billing/invoices', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          totalCents: data.subtotalCents + data.taxCents - data.discountCents
        })
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice created successfully" });
      refetchInvoices();
      setShowCreateInvoice(false);
      invoiceForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create invoice", variant: "destructive" });
    }
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; notes?: string } }) =>
      apiRequest(`/api/admin/financial/billing/invoices/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice status updated" });
      refetchInvoices();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update invoice", variant: "destructive" });
    }
  });

  // Event handlers
  const onSubmitProfile = (data: z.infer<typeof billingProfileSchema>) => {
    createProfileMutation.mutate(data);
  };

  const onSubmitInvoice = (data: z.infer<typeof invoiceSchema>) => {
    createInvoiceMutation.mutate(data);
  };

  const addLineItem = () => {
    const currentItems = invoiceForm.getValues("lineItems");
    invoiceForm.setValue("lineItems", [...currentItems, { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    const currentItems = invoiceForm.getValues("lineItems");
    if (currentItems.length > 1) {
      invoiceForm.setValue("lineItems", currentItems.filter((_, i) => i !== index));
    }
  };

  const calculateLineTotal = (index: number) => {
    const items = invoiceForm.getValues("lineItems");
    const item = items[index];
    const total = item.quantity * item.unitPrice;
    invoiceForm.setValue(`lineItems.${index}.totalPrice`, total);
    
    // Recalculate subtotal
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    invoiceForm.setValue("subtotalCents", Math.round(subtotal * 100));
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await updateInvoiceStatusMutation.mutateAsync({
        id: invoiceId,
        data: { status: 'sent' }
      });
    } catch (error) {
      console.error('Failed to send invoice:', error);
    }
  };

  if (profilesLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading billing data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="billing-management">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Billing Management</h1>
          <p className="text-muted-foreground">Manage customer billing profiles, invoices, and payment cycles</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowCreateProfile(true)}
            data-testid="button-create-profile"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Profile
          </Button>
          <Button
            onClick={() => setShowCreateInvoice(true)}
            data-testid="button-create-invoice"
          >
            <FileText className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              refetchProfiles();
              refetchInvoices();
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-profiles">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billing Profiles</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-profiles">
                {analytics.totalProfiles?.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Active customers
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-invoices">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-invoices">
                {analytics.totalInvoices?.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(analytics.averageInvoiceAmount)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-revenue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-revenue">
                {formatCurrency(analytics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.paymentRate}% payment rate
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-overdue-invoices">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-invoices">
                {analytics.overdueInvoices}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles" data-testid="tab-profiles">Billing Profiles</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          {/* Profile Filters */}
          <Card data-testid="profile-filters">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search profiles..."
                    value={profileFilters.search}
                    onChange={(e) => setProfileFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                    data-testid="input-search-profiles"
                  />
                </div>
                <Button variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profiles Table */}
          <Card data-testid="profiles-table">
            <CardHeader>
              <CardTitle>Billing Profiles</CardTitle>
              <CardDescription>
                Showing {profiles?.data?.length || 0} of {profiles?.total || 0} profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Auto Pay</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles?.data?.map((profile: BillingProfile) => (
                    <TableRow key={profile.id} data-testid={`row-profile-${profile.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{profile.user?.username}</div>
                          <div className="text-sm text-muted-foreground">{profile.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{profile.companyName || '-'}</TableCell>
                      <TableCell>{profile.preferredCurrency}</TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-cycle-${profile.id}`}>
                          {profile.billingCycle}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(profile.creditLimit)}</TableCell>
                      <TableCell>
                        <span className={profile.currentBalance > 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(Math.abs(profile.currentBalance))}
                        </span>
                      </TableCell>
                      <TableCell>
                        {profile.autoPayEnabled ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${profile.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedProfile(profile)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedProfile(profile)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              Create Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {/* Invoice Filters */}
          <Card data-testid="invoice-filters">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="invoice-status">Status</Label>
                  <Select
                    value={invoiceFilters.status}
                    onValueChange={(value) => setInvoiceFilters(prev => ({ ...prev, status: value, page: 1 }))}
                  >
                    <SelectTrigger data-testid="select-invoice-status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={invoiceFilters.startDate}
                    onChange={(e) => setInvoiceFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                    data-testid="input-start-date"
                  />
                </div>

                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={invoiceFilters.endDate}
                    onChange={(e) => setInvoiceFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                    data-testid="input-end-date"
                  />
                </div>

                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card data-testid="invoices-table">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                Showing {invoices?.data?.length || 0} of {invoices?.total || 0} invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.data?.map((invoice: Invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-mono">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customer?.username}</div>
                          <div className="text-sm text-muted-foreground">{invoice.customer?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.totalCents, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${STATUS_COLORS[invoice.status as keyof typeof STATUS_COLORS]} text-white`}
                          data-testid={`badge-status-${invoice.id}`}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' ? 'text-red-600' : ''}>
                          {formatDate(invoice.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${invoice.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleSendInvoice(invoice.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Revenue Chart */}
              <Card data-testid="chart-revenue">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analytics.revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Payment Cycle Distribution */}
              <Card data-testid="chart-payment-cycles">
                <CardHeader>
                  <CardTitle>Payment Cycle Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.paymentCycleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cycle, count }) => `${cycle} (${count})`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.paymentCycleDistribution?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CYCLE_COLORS[entry.cycle as keyof typeof CYCLE_COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Invoice Status Distribution */}
              <Card data-testid="chart-invoice-status">
                <CardHeader>
                  <CardTitle>Invoice Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.statusDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Churn Analysis */}
              <Card data-testid="chart-churn-analysis">
                <CardHeader>
                  <CardTitle>Customer Retention & Churn</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.churnAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                      <Line type="monotone" dataKey="churnRate" stroke="#ff7300" name="Churn Rate" />
                      <Line type="monotone" dataKey="retention" stroke="#82ca9d" name="Retention Rate" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Billing Profile Dialog */}
      <Dialog open={showCreateProfile} onOpenChange={setShowCreateProfile}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-profile">
          <DialogHeader>
            <DialogTitle>Create Billing Profile</DialogTitle>
            <DialogDescription>
              Set up a new billing profile for a customer
            </DialogDescription>
          </DialogHeader>
          
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Select customer..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.data?.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.username} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} data-testid="input-company-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="billingCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Cycle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-billing-cycle">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms (Days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))}
                          data-testid="input-payment-terms" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Billing Address */}
              <div className="space-y-4">
                <h4 className="font-medium">Billing Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="billingAddress.street"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-street" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="billingAddress.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="billingAddress.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="billingAddress.zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-zip" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="billingAddress.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateProfile(false)}
                  data-testid="button-cancel-profile"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProfileMutation.isPending}
                  data-testid="button-create-profile-submit"
                >
                  {createProfileMutation.isPending ? 'Creating...' : 'Create Profile'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
        <DialogContent className="max-w-4xl" data-testid="dialog-create-invoice">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Generate a new invoice for a customer
            </DialogDescription>
          </DialogHeader>
          
          <Form {...invoiceForm}>
            <form onSubmit={invoiceForm.handleSubmit(onSubmitInvoice)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={invoiceForm.control}
                  name="billingProfileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Profile</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-billing-profile">
                            <SelectValue placeholder="Select profile..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {profiles?.data?.map((profile: BillingProfile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.user?.username || profile.companyName || profile.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={invoiceForm.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invoice-customer">
                            <SelectValue placeholder="Select customer..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.data?.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.username} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={invoiceForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Line Items</h4>
                  <Button type="button" onClick={addLineItem} size="sm" data-testid="button-add-line-item">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {invoiceForm.watch("lineItems").map((_, index) => (
                  <div key={index} className="grid grid-cols-5 gap-4 items-end">
                    <FormField
                      control={invoiceForm.control}
                      name={`lineItems.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid={`input-description-${index}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceForm.control}
                      name={`lineItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={e => {
                                field.onChange(parseInt(e.target.value));
                                calculateLineTotal(index);
                              }}
                              data-testid={`input-quantity-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceForm.control}
                      name={`lineItems.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field} 
                              onChange={e => {
                                field.onChange(parseFloat(e.target.value));
                                calculateLineTotal(index);
                              }}
                              data-testid={`input-unit-price-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceForm.control}
                      name={`lineItems.${index}.totalPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field} 
                              readOnly
                              data-testid={`input-total-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={invoiceForm.watch("lineItems").length === 1}
                      data-testid={`button-remove-item-${index}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateInvoice(false)}
                  data-testid="button-cancel-invoice"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInvoiceMutation.isPending}
                  data-testid="button-create-invoice-submit"
                >
                  {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-invoice-details">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Invoice #{selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <div className="font-medium">{selectedInvoice.customer?.username}</div>
                  <div className="text-sm text-muted-foreground">{selectedInvoice.customer?.email}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={`${STATUS_COLORS[selectedInvoice.status as keyof typeof STATUS_COLORS]} text-white`}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <div className="text-lg font-medium">
                    {formatCurrency(selectedInvoice.totalCents, selectedInvoice.currency)}
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <div className={new Date(selectedInvoice.dueDate) < new Date() && selectedInvoice.status !== 'paid' ? 'text-red-600' : ''}>
                    {formatDate(selectedInvoice.dueDate)}
                  </div>
                </div>
              </div>

              <div>
                <Label>Line Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedInvoice.lineItems?.map((item, index) => (
                    <div key={index} className="flex justify-between p-2 bg-muted rounded">
                      <div>
                        <div className="font-medium">{item.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unitPrice * 100)}
                        </div>
                      </div>
                      <div className="font-medium">
                        {formatCurrency(item.totalPrice * 100)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.subtotalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedInvoice.taxCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{formatCurrency(selectedInvoice.discountCents)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedInvoice.totalCents)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}