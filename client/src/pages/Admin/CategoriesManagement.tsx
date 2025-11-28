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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Folder, FolderTree, FolderPlus, Search, Filter, MoreHorizontal, 
  AlertTriangle, Download, Upload, CheckCircle, XCircle, Eye, EyeOff, 
  Calendar, Activity, Star, Trash2, Edit, Flag, Settings, Archive,
  TrendingUp, BarChart3, PieChart, Clock, MessageSquare, RefreshCw, 
  Zap, Tag, Users, FileText, Image, Video, Package, ShoppingCart,
  ChevronRight, ChevronDown, Plus, Minus, Move, Copy, Link, Unlink,
  Globe, Lock, Shield, Target, Hash, Layers, TreePine, Grid,
  SortAsc, SortDesc, LayoutGrid, LayoutList, Merge, Split
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  parentId: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  restrictionRules: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export default function CategoriesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Active Tab
  const [activeTab, setActiveTab] = useState('content');
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [parentFilter, setParentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  
  // Bulk Operations
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Dialogs and Modals
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showBulkOperationDialog, setShowBulkOperationDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showReorganizeDialog, setShowReorganizeDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [bulkOperation, setBulkOperation] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Expanded categories in tree view
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Real-time updates
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Form for category creation/editing
  const form = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  // Fetch content categories
  const { data: contentCategories, isLoading: contentLoading, error: contentError, refetch: refetchContent } = useQuery({
    queryKey: [
      '/api/admin/categories/content', 
      {
        searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        parent: parentFilter !== 'all' ? parentFilter : undefined,
        sortBy,
        sortOrder
      }
    ],
    enabled: (user?.role === 'admin' || user?.role === 'moderator') && activeTab === 'content',
    refetchInterval: autoRefresh ? 60000 : false
  });

  // Fetch product categories
  const { data: productCategories, isLoading: productLoading, error: productError, refetch: refetchProducts } = useQuery({
    queryKey: [
      '/api/admin/categories/products', 
      {
        searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        parent: parentFilter !== 'all' ? parentFilter : undefined,
        sortBy,
        sortOrder
      }
    ],
    enabled: (user?.role === 'admin' || user?.role === 'moderator') && activeTab === 'products',
    refetchInterval: autoRefresh ? 60000 : false
  });

  // Fetch category analytics
  const { data: categoryStats } = useQuery({
    queryKey: [`/api/admin/categories/${activeTab}/stats`],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
    refetchInterval: autoRefresh ? 300000 : false // 5 minutes
  });

  // Fetch category performance data
  const { data: performanceData } = useQuery({
    queryKey: [`/api/admin/categories/${activeTab}/performance`],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
    refetchInterval: autoRefresh ? 300000 : false
  });

  const categories = activeTab === 'content' ? (contentCategories || []) : (productCategories || []);
  const isLoading = activeTab === 'content' ? contentLoading : productLoading;
  const error = activeTab === 'content' ? contentError : productError;
  
  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: z.infer<typeof categoryFormSchema>) => 
      apiRequest(`/api/admin/categories/${activeTab}`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Category created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/categories/${activeTab}`] });
      setShowCategoryDialog(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (data: { categoryId: string; updates: Partial<z.infer<typeof categoryFormSchema>> }) => 
      apiRequest(`/api/admin/categories/${activeTab}/${data.categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(data.updates)
      }),
    onSuccess: () => {
      toast({ title: "Category updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/categories/${activeTab}`] });
      setShowCategoryDialog(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => 
      apiRequest(`/api/admin/categories/${activeTab}/${categoryId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({ title: "Category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/categories/${activeTab}`] });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  });

  const bulkOperationMutation = useMutation({
    mutationFn: (data: { categoryIds: string[]; operation: string; data?: any }) => 
      apiRequest(`/api/admin/categories/${activeTab}/bulk`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Bulk operation completed successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/categories/${activeTab}`] });
      setSelectedCategories([]);
      setShowBulkOperationDialog(false);
    },
    onError: () => {
      toast({ title: "Bulk operation failed", variant: "destructive" });
    }
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: (data: { categoryIds: string[]; newOrders: number[] }) => 
      apiRequest(`/api/admin/categories/${activeTab}/reorder`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Categories reordered successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/categories/${activeTab}`] });
    },
    onError: () => {
      toast({ title: "Failed to reorder categories", variant: "destructive" });
    }
  });

  // Helper functions
  const getStatusBadge = (category: any) => {
    if (category.isActive) {
      return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    } else {
      return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
    }
  };

  const getTypeBadge = (category: any) => {
    if (category.parentId) {
      return <Badge variant="outline"><Folder className="w-3 h-3 mr-1" />Subcategory</Badge>;
    } else {
      return <Badge className="bg-purple-500 text-white"><FolderTree className="w-3 h-3 mr-1" />Parent</Badge>;
    }
  };

  const getCategoryDepth = (category: any, allCategories: any[]): number => {
    if (!category.parentId) return 0;
    const parent = allCategories.find(c => c.id === category.parentId);
    return parent ? 1 + getCategoryDepth(parent, allCategories) : 1;
  };

  const buildCategoryTree = (categories: any[]): any[] => {
    const categoryMap = new Map();
    const roots: any[] = [];

    // Create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Build tree structure
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryNode);
        } else {
          roots.push(categoryNode);
        }
      } else {
        roots.push(categoryNode);
      }
    });

    return roots;
  };

  const renderCategoryTree = (categories: any[], depth = 0): JSX.Element[] => {
    return categories.map((category) => (
      <div key={category.id}>
        <TableRow data-testid={`category-row-${category.id}`}>
          <TableCell>
            <Checkbox 
              checked={selectedCategories.includes(category.id)}
              onCheckedChange={(checked) => handleCategorySelect(category.id, checked as boolean)}
            />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
              {category.children?.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleCategoryExpansion(category.id)}
                >
                  {expandedCategories.has(category.id) ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              )}
              <div className="flex items-center gap-2">
                {category.imageUrl ? (
                  <img 
                    src={category.imageUrl} 
                    alt={category.name}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium" data-testid={`category-name-${category.id}`}>
                    {category.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    /{category.slug}
                  </p>
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="space-y-1">
              {getStatusBadge(category)}
              {getTypeBadge(category)}
            </div>
          </TableCell>
          <TableCell>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {category.contentCount || 0} items
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {category.viewsCount?.toLocaleString() || 0} views
              </div>
              {category.revenueGenerated && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  ${(category.revenueGenerated / 100).toFixed(2)}
                </div>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm text-muted-foreground">
              {category.sortOrder}
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm">
              {format(new Date(category.createdAt), "MMM d, yyyy")}
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
                  setSelectedCategory(category);
                  setIsEditing(true);
                  form.reset(category);
                  setShowCategoryDialog(true);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Category
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setSelectedCategory(category);
                  setIsEditing(false);
                  form.reset({ parentId: category.id });
                  setShowCategoryDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subcategory
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Category
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Move className="h-4 w-4 mr-2" />
                  Move Category
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Category Rules
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => deleteCategoryMutation.mutate(category.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {expandedCategories.has(category.id) && category.children?.length > 0 && (
          renderCategoryTree(category.children, depth + 1)
        )}
      </div>
    ));
  };

  const renderCategoryList = (categories: any[]): JSX.Element[] => {
    return categories.map((category) => (
      <TableRow key={category.id} data-testid={`category-row-${category.id}`}>
        <TableCell>
          <Checkbox 
            checked={selectedCategories.includes(category.id)}
            onCheckedChange={(checked) => handleCategorySelect(category.id, checked as boolean)}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {category.imageUrl ? (
              <img 
                src={category.imageUrl} 
                alt={category.name}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                <Folder className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium" data-testid={`category-name-${category.id}`}>
                {category.name}
              </p>
              <p className="text-sm text-muted-foreground">
                /{category.slug}
              </p>
              {category.description && (
                <p className="text-xs text-muted-foreground truncate max-w-xs">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          {category.parentId ? (
            <div className="text-sm text-muted-foreground">
              {categories.find(c => c.id === category.parentId)?.name || 'Unknown Parent'}
            </div>
          ) : (
            <Badge variant="outline">Root Category</Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            {getStatusBadge(category)}
            {getTypeBadge(category)}
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {category.contentCount || 0} items
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {category.viewsCount?.toLocaleString() || 0} views
            </div>
            {category.revenueGenerated && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                ${(category.revenueGenerated / 100).toFixed(2)}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-muted-foreground">
            {category.sortOrder}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            {format(new Date(category.createdAt), "MMM d, yyyy")}
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
                setSelectedCategory(category);
                setIsEditing(true);
                form.reset(category);
                setShowCategoryDialog(true);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Category
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSelectedCategory(category);
                setIsEditing(false);
                form.reset({ parentId: category.id });
                setShowCategoryDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Category
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Move className="h-4 w-4 mr-2" />
                Move Category
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Category Rules
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => deleteCategoryMutation.mutate(category.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ));
  };

  const handleCategorySelect = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(categories.map((c: any) => c.id));
    } else {
      setSelectedCategories([]);
    }
  };

  const handleBulkOperation = (operation: string) => {
    setBulkOperation(operation);
    setShowBulkOperationDialog(true);
  };

  const executeBulkOperation = () => {
    bulkOperationMutation.mutate({
      categoryIds: selectedCategories,
      operation: bulkOperation
    });
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    
    return categories.filter((category: any) => 
      category.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const onSubmit = (values: z.infer<typeof categoryFormSchema>) => {
    if (isEditing && selectedCategory) {
      updateCategoryMutation.mutate({
        categoryId: selectedCategory.id,
        updates: values
      });
    } else {
      createCategoryMutation.mutate(values);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (activeTab === 'content') {
          refetchContent();
        } else {
          refetchProducts();
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, activeTab, refetchContent, refetchProducts]);

  if (user?.role !== 'admin' && user?.role !== 'moderator') {
    return (
      <div className="space-y-6" data-testid="access-denied">
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Access denied. Admin or moderator privileges required to manage categories.
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
            Failed to load categories. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="categories-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">Categories Management</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Hierarchical category organization and content filtering system
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
          <Button variant="outline" className="gap-2" onClick={() => setShowReorganizeDialog(true)}>
            <FolderTree className="h-4 w-4" />
            Reorganize
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={() => {
            setIsEditing(false);
            setSelectedCategory(null);
            form.reset();
            setShowCategoryDialog(true);
          }}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => activeTab === 'content' ? refetchContent() : refetchProducts()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <FolderTree className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Categories</p>
                <p className="text-xl font-bold text-purple-500" data-testid="total-categories">
                  {categoryStats?.totalCategories || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Categories</p>
                <p className="text-xl font-bold text-green-500" data-testid="active-categories">
                  {categoryStats?.activeCategories || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Content</p>
                <p className="text-xl font-bold text-blue-500" data-testid="total-content">
                  {categoryStats?.totalContent?.toLocaleString() || 0}
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
                <p className="text-xs text-muted-foreground">Top Performing</p>
                <p className="text-xl font-bold text-orange-500" data-testid="top-performing">
                  {categoryStats?.topPerforming || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Empty Categories</p>
                <p className="text-xl font-bold text-red-500" data-testid="empty-categories">
                  {categoryStats?.emptyCategories || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Layers className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Depth</p>
                <p className="text-xl font-bold text-cyan-500" data-testid="max-depth">
                  {categoryStats?.maxDepth || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Management Interface */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Category Structure & Organization</CardTitle>
              <CardDescription>
                Manage hierarchical categories with advanced organization tools
              </CardDescription>
            </div>
            {selectedCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedCategories.length} selected</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkOperation('activate')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate Categories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('deactivate')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate Categories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('merge')}>
                      <Merge className="h-4 w-4 mr-2" />
                      Merge Categories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('move')}>
                      <Move className="h-4 w-4 mr-2" />
                      Move Categories
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkOperation('delete')}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Categories
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content" className="gap-2">
                <FileText className="h-4 w-4" />
                Content Categories
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-2">
                <Package className="h-4 w-4" />
                Product Categories
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Advanced Filters and Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="category-search-input"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={parentFilter} onValueChange={setParentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Parent Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="root">Root Categories</SelectItem>
                <SelectItem value="subcategories">Subcategories</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="sortOrder">Sort Order</SelectItem>
                <SelectItem value="contentCount">Content Count</SelectItem>
                <SelectItem value="viewsCount">Views</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'tree' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tree')}
                className="flex-1"
              >
                <TreePine className="h-4 w-4 mr-1" />
                Tree
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex-1"
              >
                <LayoutList className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
          </div>

          {/* Categories Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedCategories.length === categories.length && categories.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Category</TableHead>
                  {viewMode === 'list' && <TableHead>Parent</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={viewMode === 'list' ? 8 : 7}>
                        <div className="flex items-center space-x-4">
                          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={viewMode === 'list' ? 8 : 7} className="text-center py-12">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Folder className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No categories found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria or create a new category.</p>
                    </TableCell>
                  </TableRow>
                ) : viewMode === 'tree' ? (
                  renderCategoryTree(buildCategoryTree(filteredCategories))
                ) : (
                  renderCategoryList(filteredCategories)
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Category Form Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Category' : 'Create New Category'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update category information and settings.' : 'Create a new category for organizing content.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter category name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="category-slug" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Category description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Parent (Root Category)</SelectItem>
                          {categories
                            .filter((c: any) => c.id !== selectedCategory?.id)
                            .map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Category</FormLabel>
                      <FormDescription>
                        Whether this category is active and visible to users.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                  {isEditing ? 'Update Category' : 'Create Category'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Operation Dialog */}
      <Dialog open={showBulkOperationDialog} onOpenChange={setShowBulkOperationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Category Operation</DialogTitle>
            <DialogDescription>
              Apply {bulkOperation} to {selectedCategories.length} selected categories.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bulkOperation === 'delete' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This will permanently delete all selected categories and their content. This action cannot be undone.
                </AlertDescription>
              </Alert>
            )}
            {bulkOperation === 'merge' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will merge all selected categories into a single category. Content will be redistributed accordingly.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkOperationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeBulkOperation}
              variant={bulkOperation === 'delete' ? 'destructive' : 'default'}
            >
              Execute {bulkOperation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}