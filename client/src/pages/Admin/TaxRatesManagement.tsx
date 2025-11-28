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
import { Switch } from "@/components/ui/switch";
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
  Cell
} from 'recharts';
import { 
  Globe,
  Calculator,
  FileText,
  DollarSign,
  TrendingUp,
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
  Settings,
  Shield,
  Flag,
  Percent,
  MapPin,
  Scale,
  Receipt,
  BookOpen,
  AlertCircle
} from "lucide-react";

// TypeScript interfaces
interface TaxRate {
  id: string;
  jurisdiction: string;
  country: string;
  state?: string;
  taxType: string;
  taxName: string;
  rate: number;
  isActive: boolean;
  effectiveDate: string;
  expiryDate?: string;
  minAmount?: number;
  maxAmount?: number;
  applicableCategories: string[];
  exemptions: string[];
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface TaxCalculation {
  subtotal: number;
  totalTax: number;
  breakdown: Array<{
    taxType: string;
    taxName: string;
    rate: number;
    amount: number;
    jurisdiction: string;
  }>;
  netAmount: number;
}

interface TaxCompliance {
  jurisdiction: string;
  lastFilingDate?: string;
  nextFilingDate: string;
  status: string;
  filingPeriod: string;
  requiredForms: string[];
  totalTaxCollected: number;
  taxOwed: number;
}

interface TaxAnalytics {
  totalCollected: number;
  totalOwed: number;
  complianceRate: number;
  jurisdictionCount: number;
  collectionsByJurisdiction: Array<{ jurisdiction: string; amount: number; transactions: number }>;
  complianceStatus: Array<{ status: string; count: number; percentage: number }>;
  taxTypesDistribution: Array<{ type: string; amount: number; rate: number }>;
  monthlyTrends: Array<{ month: string; collected: number; owed: number }>;
}

const taxRateSchema = z.object({
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  country: z.string().min(1, "Country is required"),
  state: z.string().optional(),
  taxType: z.enum(["vat", "sales_tax", "income_tax", "withholding_tax", "service_tax"]),
  taxName: z.string().min(1, "Tax name is required"),
  rate: z.number().min(0).max(100, "Rate must be between 0 and 100"),
  isActive: z.boolean().default(true),
  effectiveDate: z.string().min(1, "Effective date is required"),
  expiryDate: z.string().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  applicableCategories: z.array(z.string()).default([]),
  exemptions: z.array(z.string()).default([])
});

const calculationSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  taxType: z.string().optional(),
  category: z.string().optional()
});

const TAX_TYPE_COLORS = {
  vat: "bg-blue-500",
  sales_tax: "bg-green-500",
  income_tax: "bg-purple-500",
  withholding_tax: "bg-orange-500",
  service_tax: "bg-pink-500"
};

const COMPLIANCE_COLORS = {
  compliant: "bg-green-500",
  pending: "bg-yellow-500",
  overdue: "bg-red-500",
  submitted: "bg-blue-500"
};

const COUNTRIES = [
  { code: "US", name: "United States", states: ["CA", "NY", "TX", "FL", "WA", "IL"] },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "CA", name: "Canada", states: ["ON", "BC", "AB", "QC"] },
  { code: "AU", name: "Australia", states: ["NSW", "VIC", "QLD", "WA"] },
  { code: "IN", name: "India", states: ["MH", "DL", "KA", "TN"] },
  { code: "SG", name: "Singapore" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" }
];

export default function TaxRatesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState("rates");
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
  const [showCreateRate, setShowCreateRate] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [taxFilters, setTaxFilters] = useState({
    page: 1,
    limit: 50,
    jurisdiction: "",
    taxType: "",
    isActive: ""
  });
  const [calculationResult, setCalculationResult] = useState<TaxCalculation | null>(null);

  // Forms
  const taxRateForm = useForm<z.infer<typeof taxRateSchema>>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: {
      taxType: "vat",
      rate: 0,
      isActive: true,
      applicableCategories: [],
      exemptions: []
    }
  });

  const calculationForm = useForm<z.infer<typeof calculationSchema>>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
      amount: 0
    }
  });

  // Data fetching
  const { data: taxRates, isLoading: taxRatesLoading, refetch: refetchTaxRates } = useQuery({
    queryKey: ['/api/admin/financial/tax-rates', taxFilters],
    queryFn: () => apiRequest(`/api/admin/financial/tax-rates?${new URLSearchParams(
      Object.entries(taxFilters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString()}`)
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/financial/tax-rates/analytics'],
    queryFn: () => apiRequest('/api/admin/financial/tax-rates/analytics')
  });

  const { data: compliance, isLoading: complianceLoading } = useQuery({
    queryKey: ['/api/admin/financial/tax-compliance'],
    queryFn: () => apiRequest('/api/admin/financial/tax-compliance')
  });

  // Mutations
  const createTaxRateMutation = useMutation({
    mutationFn: (data: z.infer<typeof taxRateSchema>) =>
      apiRequest('/api/admin/financial/tax-rates', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Tax rate created successfully" });
      refetchTaxRates();
      setShowCreateRate(false);
      taxRateForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create tax rate", variant: "destructive" });
    }
  });

  const updateTaxRateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaxRate> }) =>
      apiRequest(`/api/admin/financial/tax-rates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Tax rate updated successfully" });
      refetchTaxRates();
      setSelectedTaxRate(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update tax rate", variant: "destructive" });
    }
  });

  const calculateTaxMutation = useMutation({
    mutationFn: (data: z.infer<typeof calculationSchema>) =>
      apiRequest('/api/admin/financial/tax-rates/calculate', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (data) => {
      setCalculationResult(data);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Tax calculation failed", variant: "destructive" });
    }
  });

  // Event handlers
  const onSubmitTaxRate = (data: z.infer<typeof taxRateSchema>) => {
    createTaxRateMutation.mutate(data);
  };

  const onSubmitCalculation = (data: z.infer<typeof calculationSchema>) => {
    calculateTaxMutation.mutate(data);
  };

  const handleToggleActive = (taxRate: TaxRate) => {
    updateTaxRateMutation.mutate({
      id: taxRate.id,
      data: { isActive: !taxRate.isActive }
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const getCountryName = (code: string) => {
    return COUNTRIES.find(country => country.code === code)?.name || code;
  };

  const getStatesForCountry = (countryCode: string) => {
    return COUNTRIES.find(country => country.code === countryCode)?.states || [];
  };

  if (taxRatesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading tax rates...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="tax-rates-management">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Tax Rates Management</h1>
          <p className="text-muted-foreground">Configure tax rates by jurisdiction and manage compliance</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowCreateRate(true)}
            data-testid="button-create-rate"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Tax Rate
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCalculator(true)}
            data-testid="button-calculator"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Tax Calculator
          </Button>
          <Button
            variant="outline"
            onClick={() => refetchTaxRates()}
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
          <Card data-testid="card-total-collected">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tax Collected</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-collected">
                {formatCurrency(analytics.totalCollected)}
              </div>
              <p className="text-xs text-muted-foreground">
                This fiscal year
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-owed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tax Owed</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-total-owed">
                {formatCurrency(analytics.totalOwed)}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending remittance
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-compliance-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-compliance-rate">
                {analytics.complianceRate}%
              </div>
              <Progress value={analytics.complianceRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card data-testid="card-jurisdictions">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jurisdictions</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-jurisdictions">
                {analytics.jurisdictionCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Countries & states
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rates" data-testid="tab-rates">Tax Rates</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          {/* Tax Rate Filters */}
          <Card data-testid="tax-filters">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Select
                    value={taxFilters.jurisdiction}
                    onValueChange={(value) => setTaxFilters(prev => ({ ...prev, jurisdiction: value, page: 1 }))}
                  >
                    <SelectTrigger data-testid="select-jurisdiction">
                      <SelectValue placeholder="All Jurisdictions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Jurisdictions</SelectItem>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="tax-type">Tax Type</Label>
                  <Select
                    value={taxFilters.taxType}
                    onValueChange={(value) => setTaxFilters(prev => ({ ...prev, taxType: value, page: 1 }))}
                  >
                    <SelectTrigger data-testid="select-tax-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="vat">VAT</SelectItem>
                      <SelectItem value="sales_tax">Sales Tax</SelectItem>
                      <SelectItem value="income_tax">Income Tax</SelectItem>
                      <SelectItem value="withholding_tax">Withholding Tax</SelectItem>
                      <SelectItem value="service_tax">Service Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={taxFilters.isActive}
                    onValueChange={(value) => setTaxFilters(prev => ({ ...prev, isActive: value, page: 1 }))}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
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

          {/* Tax Rates Table */}
          <Card data-testid="tax-rates-table">
            <CardHeader>
              <CardTitle>Tax Rates</CardTitle>
              <CardDescription>
                Showing {taxRates?.data?.length || 0} of {taxRates?.total || 0} tax rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Tax Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRates?.data?.map((taxRate: TaxRate) => (
                    <TableRow key={taxRate.id} data-testid={`row-tax-rate-${taxRate.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getCountryName(taxRate.country)}</div>
                          {taxRate.state && (
                            <div className="text-sm text-muted-foreground">{taxRate.state}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{taxRate.taxName}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`${TAX_TYPE_COLORS[taxRate.taxType as keyof typeof TAX_TYPE_COLORS]} text-white`}
                          data-testid={`badge-type-${taxRate.id}`}
                        >
                          {taxRate.taxType.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPercentage(taxRate.rate)}
                      </TableCell>
                      <TableCell>{formatDate(taxRate.effectiveDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={taxRate.isActive}
                            onCheckedChange={() => handleToggleActive(taxRate)}
                            data-testid={`switch-active-${taxRate.id}`}
                          />
                          <span className={taxRate.isActive ? "text-green-600" : "text-gray-500"}>
                            {taxRate.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${taxRate.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedTaxRate(taxRate)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedTaxRate(taxRate)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Rate
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

        <TabsContent value="compliance" className="space-y-4">
          <Card data-testid="compliance-overview">
            <CardHeader>
              <CardTitle>Tax Compliance Overview</CardTitle>
              <CardDescription>Filing status and requirements by jurisdiction</CardDescription>
            </CardHeader>
            <CardContent>
              {compliance?.data?.length > 0 ? (
                <div className="space-y-4">
                  {compliance.data.map((item: TaxCompliance, index: number) => (
                    <div key={index} className="border rounded-lg p-4" data-testid={`compliance-${index}`}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{item.jurisdiction}</h4>
                            <Badge 
                              className={`${COMPLIANCE_COLORS[item.status as keyof typeof COMPLIANCE_COLORS]} text-white`}
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Next Filing: </span>
                              <span className="font-medium">{formatDate(item.nextFilingDate)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Period: </span>
                              <span>{item.filingPeriod}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tax Collected: </span>
                              <span className="font-medium">{formatCurrency(item.totalTaxCollected)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tax Owed: </span>
                              <span className="font-medium text-orange-600">{formatCurrency(item.taxOwed)}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Required Forms: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.requiredForms.map((form, formIndex) => (
                                <Badge key={formIndex} variant="outline" className="text-xs">
                                  {form}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Report
                          </Button>
                          <Button size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            File Return
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No compliance data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Collections by Jurisdiction */}
              <Card data-testid="chart-collections-jurisdiction">
                <CardHeader>
                  <CardTitle>Tax Collections by Jurisdiction</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.collectionsByJurisdiction}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="jurisdiction" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tax Types Distribution */}
              <Card data-testid="chart-tax-types">
                <CardHeader>
                  <CardTitle>Tax Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.taxTypesDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, amount }) => `${type} (${formatCurrency(amount)})`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {analytics.taxTypesDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={TAX_TYPE_COLORS[entry.type as keyof typeof TAX_TYPE_COLORS] || '#8884d8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card data-testid="chart-monthly-trends" className="col-span-2">
                <CardHeader>
                  <CardTitle>Monthly Tax Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Line type="monotone" dataKey="collected" stroke="#82ca9d" name="Collected" />
                      <Line type="monotone" dataKey="owed" stroke="#ff7300" name="Owed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Tax Rate Dialog */}
      <Dialog open={showCreateRate} onOpenChange={setShowCreateRate}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-rate">
          <DialogHeader>
            <DialogTitle>Create Tax Rate</DialogTitle>
            <DialogDescription>
              Configure a new tax rate for a specific jurisdiction
            </DialogDescription>
          </DialogHeader>
          
          <Form {...taxRateForm}>
            <form onSubmit={taxRateForm.handleSubmit(onSubmitTaxRate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taxRateForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder="Select country..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map(country => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taxRateForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-state">
                            <SelectValue placeholder="Select state..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {getStatesForCountry(taxRateForm.watch("country")).map(state => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taxRateForm.control}
                  name="taxType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tax-type-create">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vat">VAT</SelectItem>
                          <SelectItem value="sales_tax">Sales Tax</SelectItem>
                          <SelectItem value="income_tax">Income Tax</SelectItem>
                          <SelectItem value="withholding_tax">Withholding Tax</SelectItem>
                          <SelectItem value="service_tax">Service Tax</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taxRateForm.control}
                  name="taxName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Standard VAT" {...field} data-testid="input-tax-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taxRateForm.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-tax-rate" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taxRateForm.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-effective-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taxRateForm.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-expiry-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taxRateForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable this tax rate for calculations
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateRate(false)}
                  data-testid="button-cancel-rate"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaxRateMutation.isPending}
                  data-testid="button-create-rate-submit"
                >
                  {createTaxRateMutation.isPending ? 'Creating...' : 'Create Tax Rate'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tax Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="max-w-lg" data-testid="dialog-calculator">
          <DialogHeader>
            <DialogTitle>Tax Calculator</DialogTitle>
            <DialogDescription>
              Calculate taxes for a specific amount and jurisdiction
            </DialogDescription>
          </DialogHeader>
          
          <Form {...calculationForm}>
            <form onSubmit={calculationForm.handleSubmit(onSubmitCalculation)} className="space-y-4">
              <FormField
                control={calculationForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field} 
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-calc-amount" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={calculationForm.control}
                name="jurisdiction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jurisdiction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-calc-jurisdiction">
                          <SelectValue placeholder="Select jurisdiction..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={calculateTaxMutation.isPending}
                data-testid="button-calculate"
              >
                {calculateTaxMutation.isPending ? 'Calculating...' : 'Calculate Tax'}
              </Button>
            </form>
          </Form>

          {calculationResult && (
            <div className="mt-4 space-y-4 border-t pt-4" data-testid="calculation-result">
              <h4 className="font-medium">Tax Calculation Result</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculationResult.subtotal)}</span>
                </div>
                
                {calculationResult.breakdown.map((tax, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{tax.taxName} ({formatPercentage(tax.rate)}):</span>
                    <span>{formatCurrency(tax.amount)}</span>
                  </div>
                ))}
                
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total Tax:</span>
                  <span>{formatCurrency(calculationResult.totalTax)}</span>
                </div>
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(calculationResult.netAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tax Rate Details Modal */}
      <Dialog open={!!selectedTaxRate} onOpenChange={() => setSelectedTaxRate(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-tax-rate-details">
          <DialogHeader>
            <DialogTitle>Tax Rate Details</DialogTitle>
            <DialogDescription>
              {selectedTaxRate?.taxName} - {getCountryName(selectedTaxRate?.country || "")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTaxRate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jurisdiction</Label>
                  <div className="font-medium">
                    {getCountryName(selectedTaxRate.country)}
                    {selectedTaxRate.state && ` - ${selectedTaxRate.state}`}
                  </div>
                </div>
                <div>
                  <Label>Tax Type</Label>
                  <Badge className={`${TAX_TYPE_COLORS[selectedTaxRate.taxType as keyof typeof TAX_TYPE_COLORS]} text-white`}>
                    {selectedTaxRate.taxType.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label>Tax Rate</Label>
                  <div className="text-lg font-medium">{formatPercentage(selectedTaxRate.rate)}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className={selectedTaxRate.isActive ? "text-green-600" : "text-gray-500"}>
                    {selectedTaxRate.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
                <div>
                  <Label>Effective Date</Label>
                  <div>{formatDate(selectedTaxRate.effectiveDate)}</div>
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <div>{selectedTaxRate.expiryDate ? formatDate(selectedTaxRate.expiryDate) : "No expiry"}</div>
                </div>
              </div>

              {selectedTaxRate.applicableCategories.length > 0 && (
                <div>
                  <Label>Applicable Categories</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTaxRate.applicableCategories.map((category, index) => (
                      <Badge key={index} variant="outline">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedTaxRate.exemptions.length > 0 && (
                <div>
                  <Label>Tax Exemptions</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTaxRate.exemptions.map((exemption, index) => (
                      <Badge key={index} variant="secondary">
                        {exemption}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}