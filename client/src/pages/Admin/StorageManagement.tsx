import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Shield,
  Eye,
  EyeOff,
  Cloud,
  HardDrive,
  Zap,
  Target,
  TrendingUp,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  TestTube2,
  Power
} from "lucide-react";

// Storage provider configuration schemas
const baseProviderSchema = z.object({
  provider: z.enum(["aws_s3", "digitalocean_spaces", "wasabi", "backblaze_b2", "vultr_object_storage", "pushr"]),
  name: z.string().min(1, "Name is required"),
  region: z.string().min(1, "Region is required"),
  bucket: z.string().min(1, "Bucket is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
  cdnEnabled: z.boolean().default(false),
  encryption: z.boolean().default(true),
  versioning: z.boolean().default(false),
  publicRead: z.boolean().default(false),
  healthCheckEnabled: z.boolean().default(true),
  healthCheckIntervalMinutes: z.number().min(1).max(60).default(5),
  costPerGb: z.number().min(0).optional(),
  bandwidthCostPerGb: z.number().min(0).optional(),
  maxStorageGb: z.number().min(1).optional(),
  maxBandwidthGb: z.number().min(1).optional()
});

const s3ConfigSchema = baseProviderSchema.extend({
  configData: z.object({
    accessKeyId: z.string().min(1, "Access Key ID is required"),
    secretAccessKey: z.string().min(1, "Secret Access Key is required"),
    cloudFrontDistributionId: z.string().optional(),
    iamRoleArn: z.string().optional(),
    lifecyclePolicies: z.string().optional()
  })
});

const digitalOceanConfigSchema = baseProviderSchema.extend({
  configData: z.object({
    accessKeyId: z.string().min(1, "Access Key ID is required"),
    secretAccessKey: z.string().min(1, "Secret Access Key is required"),
    endpoint: z.string().url("Valid endpoint URL is required"),
    cdnDomain: z.string().optional()
  })
});

const wasabiConfigSchema = baseProviderSchema.extend({
  configData: z.object({
    accessKeyId: z.string().min(1, "Access Key ID is required"),
    secretAccessKey: z.string().min(1, "Secret Access Key is required"),
    endpoint: z.string().url("Valid endpoint URL is required"),
    trialMode: z.boolean().default(false),
    supportContact: z.string().email().optional()
  })
});

const backblazeConfigSchema = baseProviderSchema.extend({
  configData: z.object({
    accountId: z.string().min(1, "Account ID is required"),
    applicationKey: z.string().min(1, "Application Key is required"),
    endpoint: z.string().url("Valid endpoint URL is required"),
    downloadUrl: z.string().url().optional(),
    lifecycleRules: z.string().optional()
  })
});

const vultrConfigSchema = baseProviderSchema.extend({
  configData: z.object({
    accessKeyId: z.string().min(1, "Access Key ID is required"),
    secretAccessKey: z.string().min(1, "Secret Access Key is required"),
    endpoint: z.string().url("Valid endpoint URL is required"),
    region: z.string().min(1, "Region is required")
  })
});

const pushrConfigSchema = baseProviderSchema.extend({
  configData: z.object({
    accessKey: z.string().min(1, "Access Key is required"),
    secretKey: z.string().min(1, "Secret Key is required"),
    endpoint: z.string().url("Valid S3 endpoint is required"),
    cdnHostname: z.string().refine(val => val.startsWith('https://'), {
      message: "CDN Hostname must start with https://"
    })
  })
});

type StorageProvider = {
  id: string;
  provider: string;
  name: string;
  status: 'active' | 'inactive' | 'testing' | 'error' | 'maintenance';
  isActive: boolean;
  isPrimary: boolean;
  region: string;
  bucket: string;
  healthCheckEnabled: boolean;
  cdnEnabled: boolean;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type HealthMetrics = {
  providerId: string;
  providerName: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTimeMs: number;
  availability: number;
  lastChecked: string;
};

type CostSummary = {
  providerId: string;
  providerName: string;
  totalCost: number;
  storageCost: number;
  bandwidthCost: number;
  requestCost: number;
  period: { start: string; end: string };
};

type ProviderAlert = {
  id: string;
  providerId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  isAcknowledged: boolean;
  isResolved: boolean;
  createdAt: string;
};

export default function StorageManagement() {
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<StorageProvider | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch storage providers
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ["/api/admin/storage-providers"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch health summary
  const { data: healthSummary = [], isLoading: healthLoading } = useQuery({
    queryKey: ["/api/admin/storage-providers/health/summary"],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch cost summary
  const { data: costSummary = [], isLoading: costLoading } = useQuery({
    queryKey: ["/api/admin/storage-providers/costs/summary"]
  });

  // Fetch unresolved alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/admin/storage-providers/alerts"],
    queryFn: () => apiRequest("/api/admin/storage-providers/alerts?unresolved=true"),
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Fetch cost recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/admin/storage-providers/costs/recommendations"]
  });

  // Create provider mutation
  const createProviderMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/admin/storage-providers", {
      method: "POST",
      body: data
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Storage provider configured successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers"] });
      setShowConfigDialog(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to configure storage provider"
      });
    }
  });

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) => 
      apiRequest(`/api/admin/storage-providers/${id}`, {
        method: "PUT",
        body: data
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Storage provider updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers"] });
      setShowConfigDialog(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update storage provider"
      });
    }
  });

  // Delete provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/storage-providers/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Storage provider deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete storage provider"
      });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/storage-providers/${id}/test`, {
      method: "POST"
    }),
    onSuccess: (data) => {
      toast({
        title: data.success ? "Success" : "Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to test connection"
      });
    }
  });

  // Set primary provider mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/storage-providers/${id}/set-primary`, {
      method: "PUT"
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Primary storage provider updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to set primary provider"
      });
    }
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/storage-providers/alerts/${id}/acknowledge`, {
      method: "PUT"
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Alert acknowledged successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers/alerts"] });
    }
  });

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, resolutionNotes }: { id: string; resolutionNotes: string }) => 
      apiRequest(`/api/admin/storage-providers/alerts/${id}/resolve`, {
        method: "PUT",
        body: { resolutionNotes }
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Alert resolved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers/alerts"] });
    }
  });

  const getProviderIcon = (provider: string) => {
    const icons = {
      aws_s3: "🪣",
      digitalocean_spaces: "🌊",
      wasabi: "🥗",
      backblaze_b2: "⚡",
      vultr_object_storage: "🔥",
      pushr: "🚀"
    };
    return icons[provider as keyof typeof icons] || "☁️";
  };

  const getProviderName = (provider: string) => {
    const names = {
      aws_s3: "Amazon S3",
      digitalocean_spaces: "DigitalOcean Spaces",
      wasabi: "Wasabi",
      backblaze_b2: "Backblaze B2",
      vultr_object_storage: "Vultr Object Storage",
      pushr: "Pushr"
    };
    return names[provider as keyof typeof names] || provider;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-500", text: "Active" },
      inactive: { color: "bg-gray-500", text: "Inactive" },
      testing: { color: "bg-yellow-500", text: "Testing" },
      error: { color: "bg-red-500", text: "Error" },
      maintenance: { color: "bg-orange-500", text: "Maintenance" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge className={`${config.color} text-white`} data-testid={`status-${status}`}>{config.text}</Badge>;
  };

  const getHealthStatusIcon = (status: string) => {
    const icons = {
      healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
      degraded: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      unhealthy: <XCircle className="h-5 w-5 text-red-500" />,
      unknown: <Clock className="h-5 w-5 text-gray-500" />
    };
    return icons[status as keyof typeof icons] || icons.unknown;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: "text-blue-600 bg-blue-50 border-blue-200",
      medium: "text-yellow-600 bg-yellow-50 border-yellow-200", 
      high: "text-orange-600 bg-orange-50 border-orange-200",
      critical: "text-red-600 bg-red-50 border-red-200"
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const totalCost = costSummary.reduce((sum: number, provider: CostSummary) => sum + provider.totalCost, 0);
  const totalSavingsPotential = recommendations.reduce((sum: number, rec: any) => sum + rec.potentialSavings, 0);

  return (
    <div className="space-y-6" data-testid="storage-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Storage Management
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Comprehensive multi-cloud storage provider management and monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline" 
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/storage-providers/health/summary"] });
            }}
            disabled={providersLoading || healthLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${providersLoading || healthLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-provider">
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title">
                  {selectedProvider ? 'Edit Storage Provider' : 'Add Storage Provider'}
                </DialogTitle>
                <DialogDescription>
                  Configure a new cloud storage provider for your content delivery and backup needs.
                </DialogDescription>
              </DialogHeader>
              <ProviderConfigForm
                provider={selectedProvider}
                onSubmit={selectedProvider ? updateProviderMutation.mutate : createProviderMutation.mutate}
                onCancel={() => {
                  setShowConfigDialog(false);
                  setSelectedProvider(null);
                }}
                isLoading={createProviderMutation.isPending || updateProviderMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-total-providers">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Providers</p>
                <p className="text-2xl font-bold">{providers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-active-providers">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Providers</p>
                <p className="text-2xl font-bold">{providers.filter((p: StorageProvider) => p.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-monthly-cost">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Monthly Cost</p>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-alerts">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Open Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5" data-testid="main-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="providers" data-testid="tab-providers">Providers</TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Alerts {alerts.length > 0 && <Badge className="ml-2 px-2 py-1 text-xs">{alerts.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Status Overview */}
            <Card data-testid="card-provider-overview">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Provider Status Overview
                </CardTitle>
                <CardDescription>Current status of all configured storage providers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {providersLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-4">
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : providers.length === 0 ? (
                    <div className="text-center py-8">
                      <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">No storage providers configured</p>
                      <Button 
                        onClick={() => setShowConfigDialog(true)}
                        className="mt-4"
                        data-testid="button-add-first-provider"
                      >
                        Add Your First Provider
                      </Button>
                    </div>
                  ) : (
                    providers.map((provider: StorageProvider) => {
                      const health = healthSummary.find((h: HealthMetrics) => h.providerId === provider.id);
                      return (
                        <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`provider-overview-${provider.id}`}>
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{getProviderIcon(provider.provider)}</div>
                            <div>
                              <p className="font-medium">{provider.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {getProviderName(provider.provider)} • {provider.region}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {health && getHealthStatusIcon(health.healthStatus)}
                            {getStatusBadge(provider.status)}
                            {provider.isPrimary && (
                              <Badge variant="secondary" data-testid={`primary-badge-${provider.id}`}>Primary</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card data-testid="card-recent-alerts">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Recent Alerts
                </CardTitle>
                <CardDescription>Latest alerts from your storage providers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">No active alerts</p>
                      <p className="text-sm text-muted-foreground mt-1">All systems are running smoothly</p>
                    </div>
                  ) : (
                    alerts.slice(0, 5).map((alert: ProviderAlert) => (
                      <Alert key={alert.id} className={getSeverityColor(alert.severity)} data-testid={`alert-${alert.id}`}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-sm font-medium">{alert.title}</AlertTitle>
                        <AlertDescription className="text-sm">
                          {alert.message}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-2">
                              {!alert.isAcknowledged && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                                  data-testid={`button-acknowledge-${alert.id}`}
                                >
                                  Acknowledge
                                </Button>
                              )}
                              {!alert.isResolved && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => resolveAlertMutation.mutate({ id: alert.id, resolutionNotes: "Resolved from overview" })}
                                  data-testid={`button-resolve-${alert.id}`}
                                >
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Optimization Section */}
          {recommendations.length > 0 && (
            <Card data-testid="card-cost-optimization">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Cost Optimization Recommendations
                </CardTitle>
                <CardDescription>
                  Potential monthly savings: <span className="font-semibold text-green-600">${totalSavingsPotential.toFixed(2)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg" data-testid={`recommendation-${index}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{rec.type?.replace('_', ' ')}</h4>
                        <Badge variant="secondary">Save ${rec.potentialSavings?.toFixed(2)}/mo</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider: StorageProvider) => (
              <Card key={provider.id} className="relative" data-testid={`provider-card-${provider.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getProviderIcon(provider.provider)}</span>
                      <div>
                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {getProviderName(provider.provider)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {provider.isPrimary && (
                        <Badge variant="secondary" data-testid={`primary-indicator-${provider.id}`}>Primary</Badge>
                      )}
                      {getStatusBadge(provider.status)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Region:</span>
                        <p className="font-medium">{provider.region}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bucket:</span>
                        <p className="font-medium">{provider.bucket}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {provider.cdnEnabled && <Badge variant="outline" data-testid={`cdn-badge-${provider.id}`}>CDN</Badge>}
                      {provider.healthCheckEnabled && <Badge variant="outline" data-testid={`health-badge-${provider.id}`}>Health Check</Badge>}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => testConnectionMutation.mutate(provider.id)}
                          disabled={testConnectionMutation.isPending}
                          data-testid={`button-test-${provider.id}`}
                        >
                          <TestTube2 className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedProvider(provider);
                            setShowConfigDialog(true);
                          }}
                          data-testid={`button-edit-${provider.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {!provider.isPrimary && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPrimaryMutation.mutate(provider.id)}
                            disabled={setPrimaryMutation.isPending}
                            data-testid={`button-set-primary-${provider.id}`}
                          >
                            <Target className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProviderMutation.mutate(provider.id)}
                          disabled={deleteProviderMutation.isPending || provider.isPrimary}
                          data-testid={`button-delete-${provider.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Switch
                        checked={provider.isActive}
                        onCheckedChange={(checked) => 
                          updateProviderMutation.mutate({ id: provider.id, isActive: checked })
                        }
                        data-testid={`switch-active-${provider.id}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add new provider card */}
            <Card 
              className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowConfigDialog(true)}
              data-testid="card-add-provider"
            >
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
                <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Add Storage Provider</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Configure a new cloud storage provider for enhanced redundancy and performance
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {healthSummary.map((health: HealthMetrics) => {
              const provider = providers.find((p: StorageProvider) => p.id === health.providerId);
              if (!provider) return null;
              
              return (
                <Card key={health.providerId} data-testid={`health-card-${health.providerId}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{getProviderIcon(provider.provider)}</span>
                        <CardTitle className="text-lg">{health.providerName}</CardTitle>
                      </div>
                      {getHealthStatusIcon(health.healthStatus)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Response Time</p>
                          <p className="text-xl font-semibold" data-testid={`response-time-${health.providerId}`}>
                            {health.responseTimeMs}ms
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Availability</p>
                          <p className="text-xl font-semibold" data-testid={`availability-${health.providerId}`}>
                            {health.availability.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Availability</span>
                          <span>{health.availability.toFixed(1)}%</span>
                        </div>
                        <Progress value={health.availability} className="h-2" data-testid={`progress-${health.providerId}`} />
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Last checked: {new Date(health.lastChecked).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card data-testid="card-cost-breakdown">
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Monthly costs by provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {costSummary.map((cost: CostSummary) => (
                    <div key={cost.providerId} className="flex items-center justify-between" data-testid={`cost-item-${cost.providerId}`}>
                      <span className="text-sm font-medium">{cost.providerName}</span>
                      <span className="font-semibold">${cost.totalCost.toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2" data-testid="card-cost-recommendations">
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>
                  Potential savings: ${totalSavingsPotential.toFixed(2)}/month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((rec: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg" data-testid={`cost-recommendation-${index}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{rec.type?.replace('_', ' ')}</h4>
                        <Badge variant="secondary">
                          Save ${rec.potentialSavings?.toFixed(2)}/mo
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <Button size="sm" variant="outline" className="mt-2" data-testid={`implement-${index}`}>
                        Implement
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card data-testid="card-alerts-management">
            <CardHeader>
              <CardTitle>Alert Management</CardTitle>
              <CardDescription>Monitor and manage storage provider alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">No active alerts</p>
                    <p className="text-muted-foreground">All your storage providers are running smoothly</p>
                  </div>
                ) : (
                  alerts.map((alert: ProviderAlert) => (
                    <Alert key={alert.id} className={getSeverityColor(alert.severity)} data-testid={`alert-detail-${alert.id}`}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{alert.title}</span>
                        <Badge variant="secondary" className="capitalize">
                          {alert.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        <div className="mt-2">
                          <p>{alert.message}</p>
                          <div className="flex items-center justify-between mt-4">
                            <div className="text-xs text-muted-foreground">
                              {alert.alertType} • {new Date(alert.createdAt).toLocaleString()}
                            </div>
                            <div className="flex gap-2">
                              {!alert.isAcknowledged && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                                  disabled={acknowledgeAlertMutation.isPending}
                                  data-testid={`acknowledge-${alert.id}`}
                                >
                                  Acknowledge
                                </Button>
                              )}
                              {!alert.isResolved && (
                                <Button
                                  size="sm"
                                  onClick={() => resolveAlertMutation.mutate({ 
                                    id: alert.id, 
                                    resolutionNotes: "Resolved manually" 
                                  })}
                                  disabled={resolveAlertMutation.isPending}
                                  data-testid={`resolve-${alert.id}`}
                                >
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Provider Configuration Form Component
function ProviderConfigForm({ 
  provider, 
  onSubmit, 
  onCancel, 
  isLoading 
}: { 
  provider?: StorageProvider | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [selectedProvider, setSelectedProvider] = useState(provider?.provider || "");
  const [showCredentials, setShowCredentials] = useState(false);

  const getSchema = (providerType: string) => {
    switch (providerType) {
      case 'aws_s3': return s3ConfigSchema;
      case 'digitalocean_spaces': return digitalOceanConfigSchema;
      case 'wasabi': return wasabiConfigSchema;
      case 'backblaze_b2': return backblazeConfigSchema;
      case 'vultr_object_storage': return vultrConfigSchema;
      case 'pushr': return pushrConfigSchema;
      default: return baseProviderSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema(selectedProvider)),
    defaultValues: provider ? {
      ...provider,
      configData: provider.configData || {}
    } : {
      provider: "",
      name: "",
      region: "",
      bucket: "",
      description: "",
      isActive: false,
      isPrimary: false,
      cdnEnabled: false,
      encryption: true,
      versioning: false,
      publicRead: false,
      healthCheckEnabled: true,
      healthCheckIntervalMinutes: 5,
      configData: {}
    }
  });

  const handleSubmit = (data: any) => {
    if (provider) {
      onSubmit({ id: provider.id, ...data });
    } else {
      onSubmit(data);
    }
  };

  const renderProviderFields = (providerType: string) => {
    switch (providerType) {
      case 'aws_s3':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="configData.accessKeyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key ID</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          {...field} 
                          type={showCredentials ? "text" : "password"}
                          placeholder="AKIA..."
                          data-testid="input-access-key"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowCredentials(!showCredentials)}
                        >
                          {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="configData.secretAccessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Access Key</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type={showCredentials ? "text" : "password"}
                        placeholder="Secret key..."
                        data-testid="input-secret-key"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="configData.cloudFrontDistributionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CloudFront Distribution ID (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="E1234567890123" data-testid="input-cloudfront-id" />
                  </FormControl>
                  <FormDescription>For CDN integration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      
      case 'digitalocean_spaces':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="configData.accessKeyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type={showCredentials ? "text" : "password"}
                        data-testid="input-do-access-key"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="configData.secretAccessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Key</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type={showCredentials ? "text" : "password"}
                        data-testid="input-do-secret-key"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="configData.endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://nyc3.digitaloceanspaces.com" data-testid="input-do-endpoint" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case 'pushr':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="configData.accessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type={showCredentials ? "text" : "password"}
                        data-testid="input-pushr-access-key"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="configData.secretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Key</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type={showCredentials ? "text" : "password"}
                        data-testid="input-pushr-secret-key"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="configData.endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>S3 Endpoint</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://s3.amazonaws.com" data-testid="input-pushr-endpoint" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="configData.cdnHostname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CDN Hostname</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://cdn.example.com" data-testid="input-pushr-cdn" />
                  </FormControl>
                  <FormDescription>Must start with https://</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Select a provider type to configure</p>
          </div>
        );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="provider-config-form">
        {/* Basic Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Configuration</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedProvider(value);
                    }} 
                    value={field.value}
                    disabled={!!provider}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-provider">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="aws_s3">Amazon S3</SelectItem>
                      <SelectItem value="digitalocean_spaces">DigitalOcean Spaces</SelectItem>
                      <SelectItem value="wasabi">Wasabi</SelectItem>
                      <SelectItem value="backblaze_b2">Backblaze B2</SelectItem>
                      <SelectItem value="vultr_object_storage">Vultr Object Storage</SelectItem>
                      <SelectItem value="pushr">Pushr</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Configuration Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="My S3 Storage" data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="us-east-1" data-testid="input-region" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bucket Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="my-storage-bucket" data-testid="input-bucket" />
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
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Primary storage for media content..." data-testid="input-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Provider-Specific Configuration */}
        {selectedProvider && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Provider Configuration</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCredentials(!showCredentials)}
                data-testid="toggle-credentials"
              >
                {showCredentials ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showCredentials ? 'Hide' : 'Show'} Credentials
              </Button>
            </div>
            
            {renderProviderFields(selectedProvider)}
          </div>
        )}

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Settings</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Enable this provider for storage operations</FormDescription>
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

            <FormField
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Primary Provider</FormLabel>
                    <FormDescription>Use as the default storage provider</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cdnEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>CDN</FormLabel>
                    <FormDescription>Enable Content Delivery Network</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-cdn"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="encryption"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Encryption</FormLabel>
                    <FormDescription>Enable server-side encryption</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-encryption"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="versioning"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Versioning</FormLabel>
                    <FormDescription>Enable object versioning</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-versioning"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="healthCheckEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Health Monitoring</FormLabel>
                    <FormDescription>Enable automated health checks</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-health-check"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="healthCheckIntervalMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Health Check Interval (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min={1} 
                      max={60}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                      data-testid="input-health-interval"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-save">
            {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {provider ? 'Update Provider' : 'Add Provider'}
          </Button>
        </div>
      </form>
    </Form>
  );
}