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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ShoppingCart, Package, Truck, DollarSign, Search, Filter, MoreHorizontal, 
  AlertTriangle, Download, Upload, CheckCircle, XCircle, Eye, EyeOff, 
  Calendar, Activity, Star, Trash2, Edit, Flag, Play, Pause, Settings,
  TrendingUp, BarChart3, PieChart, Clock, MessageSquare, RefreshCw, 
  Zap, Archive, CreditCard, Receipt, FileText, Percent, Tag, Users,
  ShoppingBag, Warehouse, MapPin, Globe, Phone, Mail, ChevronRight,
  Image, Video, FileImage, Copy, ExternalLink, RotateCcw, AlertCircle,
  Package2, PackageCheck, PackageX, PackagePlus, Boxes, Store, Plus
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ShopManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Active Tab
  const [activeTab, setActiveTab] = useState('products');
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  
  // Pagination and Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk Operations
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Dialogs and Modals
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showBulkOperationDialog, setShowBulkOperationDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showFulfillmentDialog, setShowFulfillmentDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [bulkOperation, setBulkOperation] = useState('');
  const [operationReason, setOperationReason] = useState('');
  const [operationNotes, setOperationNotes] = useState('');

  // Real-time updates
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch products with comprehensive filtering
  const { data: productsData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery({
    queryKey: [
      '/api/admin/products', 
      {
        searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        creatorId: creatorFilter !== 'all' ? creatorFilter : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        priceRange: priceFilter !== 'all' ? priceFilter : undefined,
        inventory: inventoryFilter !== 'all' ? inventoryFilter : undefined,
        dateRange: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder
      }
    ],
    enabled: (user?.role === 'admin' || user?.role === 'moderator') && activeTab === 'products',
    refetchInterval: autoRefresh ? 60000 : false
  });

  // Fetch orders with comprehensive filtering
  const { data: ordersData, isLoading: ordersLoading, error: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: [
      '/api/admin/orders', 
      {
        searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        fulfillmentStatus: fulfillmentFilter !== 'all' ? fulfillmentFilter : undefined,
        creatorId: creatorFilter !== 'all' ? creatorFilter : undefined,
        dateRange: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder
      }
    ],
    enabled: (user?.role === 'admin' || user?.role === 'moderator') && activeTab === 'orders',
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Fetch shop analytics
  const { data: shopStats } = useQuery({
    queryKey: ['/api/admin/shop/stats'],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
    refetchInterval: autoRefresh ? 60000 : false
  });

  // Fetch revenue analytics
  const { data: revenueStats } = useQuery({
    queryKey: ['/api/admin/shop/revenue'],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
    refetchInterval: autoRefresh ? 300000 : false // 5 minutes
  });

  // Fetch creators for filter
  const { data: creators } = useQuery({
    queryKey: ['/api/admin/creators'],
    enabled: user?.role === 'admin' || user?.role === 'moderator'
  });

  // Fetch product categories
  const { data: categories } = useQuery({
    queryKey: ['/api/admin/product-categories'],
    enabled: user?.role === 'admin' || user?.role === 'moderator'
  });

  const products = productsData?.products || [];
  const orders = ordersData?.orders || [];
  const totalItems = activeTab === 'products' ? (productsData?.total || 0) : (ordersData?.total || 0);
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentData = activeTab === 'products' ? products : orders;
  const isLoading = activeTab === 'products' ? productsLoading : ordersLoading;
  const error = activeTab === 'products' ? productsError : ordersError;
  
  // Mutations
  const updateProductMutation = useMutation({
    mutationFn: (data: { productId: string; updates: any }) => 
      apiRequest(`/api/admin/products/${data.productId}`, {
        method: 'PATCH',
        body: JSON.stringify(data.updates)
      }),
    onSuccess: () => {
      toast({ title: "Product updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setShowProductDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: (data: { orderId: string; updates: any }) => 
      apiRequest(`/api/admin/orders/${data.orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(data.updates)
      }),
    onSuccess: () => {
      toast({ title: "Order updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setShowOrderDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to update order", variant: "destructive" });
    }
  });

  const bulkOperationMutation = useMutation({
    mutationFn: (data: { itemIds: string[]; operation: string; type: string; data?: any }) => 
      apiRequest(`/api/admin/shop/bulk-${data.type}`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Bulk operation completed successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${activeTab}`] });
      setSelectedItems([]);
      setShowBulkOperationDialog(false);
    },
    onError: () => {
      toast({ title: "Bulk operation failed", variant: "destructive" });
    }
  });

  const fulfillOrderMutation = useMutation({
    mutationFn: (data: { orderId: string; trackingNumber?: string; carrier?: string; notes?: string }) => 
      apiRequest(`/api/admin/orders/${data.orderId}/fulfill`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Order fulfilled successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
    },
    onError: () => {
      toast({ title: "Failed to fulfill order", variant: "destructive" });
    }
  });

  const refundOrderMutation = useMutation({
    mutationFn: (data: { orderId: string; amount?: number; reason: string }) => 
      apiRequest(`/api/admin/orders/${data.orderId}/refund`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Order refunded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
    },
    onError: () => {
      toast({ title: "Failed to refund order", variant: "destructive" });
    }
  });

  // Helper functions
  const getProductStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'draft': return <Badge className="bg-gray-500 text-white"><Edit className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'inactive': return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
      case 'out_of_stock': return <Badge className="bg-orange-500 text-white"><PackageX className="w-3 h-3 mr-1" />Out of Stock</Badge>;
      case 'discontinued': return <Badge className="bg-purple-500 text-white"><Archive className="w-3 h-3 mr-1" />Discontinued</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'confirmed': return <Badge className="bg-blue-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'processing': return <Badge className="bg-purple-500 text-white"><Package className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'shipped': return <Badge className="bg-green-500 text-white"><Truck className="w-3 h-3 mr-1" />Shipped</Badge>;
      case 'delivered': return <Badge className="bg-green-600 text-white"><PackageCheck className="w-3 h-3 mr-1" />Delivered</Badge>;
      case 'cancelled': return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'refunded': return <Badge className="bg-orange-500 text-white"><RotateCcw className="w-3 h-3 mr-1" />Refunded</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getFulfillmentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing': return <Badge className="bg-blue-500 text-white"><Package className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'shipped': return <Badge className="bg-green-500 text-white"><Truck className="w-3 h-3 mr-1" />Shipped</Badge>;
      case 'delivered': return <Badge className="bg-green-600 text-white"><PackageCheck className="w-3 h-3 mr-1" />Delivered</Badge>;
      case 'cancelled': return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case 'digital': return <Badge className="bg-blue-500 text-white"><FileText className="w-3 h-3 mr-1" />Digital</Badge>;
      case 'physical': return <Badge className="bg-green-500 text-white"><Package className="w-3 h-3 mr-1" />Physical</Badge>;
      case 'subscription': return <Badge className="bg-purple-500 text-white"><RefreshCw className="w-3 h-3 mr-1" />Subscription</Badge>;
      case 'bundle': return <Badge className="bg-orange-500 text-white"><Boxes className="w-3 h-3 mr-1" />Bundle</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getInventoryStatus = (product: any) => {
    const inventory = product.inventory || {};
    if (!inventory.track) {
      return <Badge variant="outline">Not Tracked</Badge>;
    }
    
    const quantity = inventory.quantity || 0;
    if (quantity === 0) {
      return <Badge className="bg-red-500 text-white">Out of Stock</Badge>;
    } else if (quantity < 10) {
      return <Badge className="bg-orange-500 text-white">Low Stock ({quantity})</Badge>;
    } else {
      return <Badge className="bg-green-500 text-white">In Stock ({quantity})</Badge>;
    }
  };

  const handleItemSelect = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(currentData.map((item: any) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkOperation = (operation: string) => {
    setBulkOperation(operation);
    setShowBulkOperationDialog(true);
  };

  const executeBulkOperation = () => {
    let data: any = {};
    
    if (bulkOperation === 'update_status') {
      data.status = operationReason;
      data.notes = operationNotes;
    }
    
    bulkOperationMutation.mutate({
      itemIds: selectedItems,
      operation: bulkOperation,
      type: activeTab,
      data
    });
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return currentData;
    
    return currentData.filter((item: any) => {
      if (activeTab === 'products') {
        return item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.creator?.username?.toLowerCase().includes(searchQuery.toLowerCase());
      } else {
        return item.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.creator?.username?.toLowerCase().includes(searchQuery.toLowerCase());
      }
    });
  }, [currentData, searchQuery, activeTab]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (activeTab === 'products') {
          refetchProducts();
        } else {
          refetchOrders();
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, activeTab, refetchProducts, refetchOrders]);

  if (user?.role !== 'admin' && user?.role !== 'moderator') {
    return (
      <div className="space-y-6" data-testid="access-denied">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Access denied. Admin or moderator privileges required to manage shop.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Failed to load shop data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="shop-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">Shop Management</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Comprehensive e-commerce management, orders, and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              data-testid="auto-refresh-toggle"
            />
            <span className="text-sm text-muted-foreground">Auto-refresh</span>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setShowAnalyticsDialog(true)}>
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => activeTab === 'products' ? refetchProducts() : refetchOrders()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Products</p>
                <p className="text-xl font-bold text-green-500" data-testid="active-products">
                  {shopStats?.activeProducts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
                <p className="text-xl font-bold text-blue-500" data-testid="pending-orders">
                  {shopStats?.pendingOrders || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-purple-500" data-testid="total-revenue">
                  ${(shopStats?.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Sales</p>
                <p className="text-xl font-bold text-orange-500" data-testid="monthly-sales">
                  ${(shopStats?.monthlySales || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <PackageX className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-red-500" data-testid="low-stock">
                  {shopStats?.lowStockProducts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Truck className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">To Fulfill</p>
                <p className="text-xl font-bold text-yellow-500" data-testid="to-fulfill">
                  {shopStats?.ordersToFulfill || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Customers</p>
                <p className="text-xl font-bold text-cyan-500" data-testid="total-customers">
                  {shopStats?.totalCustomers || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today's Orders</p>
                <p className="text-xl font-bold text-pink-500" data-testid="todays-orders">
                  {shopStats?.todaysOrders || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shop Management Tabs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>E-commerce Management & Analytics</CardTitle>
              <CardDescription>
                Manage products, process orders, and analyze sales performance
              </CardDescription>
            </div>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedItems.length} selected</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {activeTab === 'products' ? (
                      <>
                        <DropdownMenuItem onClick={() => handleBulkOperation('activate')}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Activate Products
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkOperation('deactivate')}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Deactivate Products
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkOperation('feature')}>
                          <Star className="h-4 w-4 mr-2" />
                          Feature Products
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkOperation('update_inventory')}>
                          <Package className="h-4 w-4 mr-2" />
                          Update Inventory
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkOperation('export')}>
                          <Download className="h-4 w-4 mr-2" />
                          Export Selected
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => handleBulkOperation('confirm')}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm Orders
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkOperation('fulfill')}>
                          <Truck className="h-4 w-4 mr-2" />
                          Mark as Fulfilled
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkOperation('cancel')}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Orders
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkOperation('export')}>
                          <Download className="h-4 w-4 mr-2" />
                          Export Selected
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products" className="gap-2">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Orders
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Advanced Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {activeTab === 'products' ? (
                  <>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            
            {activeTab === 'products' && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                </SelectContent>
              </Select>
            )}

            {activeTab === 'orders' && (
              <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Fulfillment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fulfillment</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Select value={creatorFilter} onValueChange={setCreatorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Creator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {creators?.map((creator: any) => (
                  <SelectItem key={creator.id} value={creator.id}>
                    {creator.username || creator.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === 'products' && (
              <>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Price Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="low">$1 - $25</SelectItem>
                    <SelectItem value="medium">$26 - $100</SelectItem>
                    <SelectItem value="high">$100+</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={inventoryFilter} onValueChange={setInventoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Inventory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Inventory</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="not_tracked">Not Tracked</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedItems.length === currentData.length && currentData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {activeTab === 'products' ? (
                    <>
                      <TableHead>Product Details</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Status & Type</TableHead>
                      <TableHead>Price & Revenue</TableHead>
                      <TableHead>Inventory</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Date</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Order Details</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total & Payment</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>Date</TableHead>
                    </>
                  )}
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-muted rounded animate-pulse" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        {activeTab === 'products' ? 
                          <Package className="h-8 w-8 text-muted-foreground" /> :
                          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                        }
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No {activeTab} found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item: any) => (
                    <TableRow key={item.id} data-testid={`${activeTab}-row-${item.id}`}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                        />
                      </TableCell>
                      
                      {activeTab === 'products' ? (
                        <>
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                {item.images?.[0] ? (
                                  <img 
                                    src={item.images[0]} 
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate" data-testid={`product-name-${item.id}`}>
                                  {item.name}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {item.shortDescription || item.description?.substring(0, 50)}...
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.sku && (
                                    <Badge variant="outline" className="text-xs">
                                      SKU: {item.sku}
                                    </Badge>
                                  )}
                                  {item.tags?.slice(0, 2).map((tag: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img 
                                src={item.creator?.profileImageUrl || '/default-avatar.png'} 
                                alt={item.creator?.username}
                                className="h-8 w-8 rounded-full ring-2 ring-primary/20"
                              />
                              <div>
                                <p className="font-medium text-sm">{item.creator?.username}</p>
                                <p className="text-xs text-muted-foreground">{item.creator?.role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getProductStatusBadge(item.status)}
                              {getProductTypeBadge(item.type)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                ${((item.priceCents || 0) / 100).toFixed(2)}
                              </div>
                              {item.comparePriceCents && (
                                <div className="text-xs text-muted-foreground line-through">
                                  ${(item.comparePriceCents / 100).toFixed(2)}
                                </div>
                              )}
                              {item.totalSales && (
                                <div className="text-xs text-green-600">
                                  ${(item.totalSales / 100).toFixed(2)} sold
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getInventoryStatus(item)}
                            {item.variants?.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {item.variants.length} variants
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {item.viewsCount?.toLocaleString() || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" />
                                {item.salesCount || 0}
                              </div>
                              {item.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {item.rating.toFixed(1)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium" data-testid={`order-number-${item.id}`}>
                                #{item.orderNumber}
                              </p>
                              <div className="text-sm text-muted-foreground">
                                {item.lineItems?.length || 0} items
                              </div>
                              {item.notes && (
                                <div className="text-xs text-muted-foreground truncate">
                                  Note: {item.notes.substring(0, 30)}...
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{item.customerEmail}</p>
                              {item.shippingAddress && (
                                <div className="text-xs text-muted-foreground">
                                  {item.shippingAddress.city}, {item.shippingAddress.country}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img 
                                src={item.creator?.profileImageUrl || '/default-avatar.png'} 
                                alt={item.creator?.username}
                                className="h-6 w-6 rounded-full"
                              />
                              <span className="text-sm">{item.creator?.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getOrderStatusBadge(item.status)}
                              <div className="text-xs text-muted-foreground">
                                {item.paymentStatus}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                ${((item.totalCents || 0) / 100).toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.paymentMethod}
                              </div>
                              {item.discountCents > 0 && (
                                <div className="text-xs text-green-600">
                                  -${(item.discountCents / 100).toFixed(2)} discount
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getFulfillmentStatusBadge(item.fulfillmentStatus)}
                              {item.trackingNumber && (
                                <div className="text-xs text-muted-foreground">
                                  Tracking: {item.trackingNumber}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </>
                      )}
                      
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(item.createdAt), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "h:mm a")}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedItem(item);
                              activeTab === 'products' ? setShowProductDialog(true) : setShowOrderDialog(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            {activeTab === 'products' ? (
                              <>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate Product
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Package className="h-4 w-4 mr-2" />
                                  Manage Inventory
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive Product
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => {
                                  fulfillOrderMutation.mutate({
                                    orderId: item.id,
                                    notes: "Fulfilled via admin panel"
                                  });
                                }}>
                                  <Truck className="h-4 w-4 mr-2" />
                                  Fulfill Order
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  refundOrderMutation.mutate({
                                    orderId: item.id,
                                    reason: "Administrative refund"
                                  });
                                }}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Process Refund
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Receipt className="h-4 w-4 mr-2" />
                                  Download Invoice
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Contact Customer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} {activeTab}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operation Dialog */}
      <Dialog open={showBulkOperationDialog} onOpenChange={setShowBulkOperationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Operation</DialogTitle>
            <DialogDescription>
              Apply {bulkOperation} to {selectedItems.length} selected {activeTab}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bulkOperation === 'update_status' && (
              <>
                <div>
                  <label className="text-sm font-medium">New Status</label>
                  <Select value={operationReason} onValueChange={setOperationReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTab === 'products' ? (
                        <>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="discontinued">Discontinued</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={operationNotes}
                    onChange={(e) => setOperationNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkOperationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={executeBulkOperation}>
              Execute {bulkOperation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}