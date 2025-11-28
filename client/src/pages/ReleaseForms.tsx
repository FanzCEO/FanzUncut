import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { 
  FileText,
  Download,
  Eye,
  Upload,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ReleaseForm {
  id: string;
  type: 'model_release' | 'location_release' | 'property_release' | 'minor_release';
  status: 'pending' | 'signed' | 'expired' | 'rejected';
  createdAt: string;
  signedAt?: string;
  expiresAt?: string;
  modelName?: string;
  locationName?: string;
  propertyAddress?: string;
  guardianName?: string;
  documentUrl?: string;
}

export default function ReleaseForms() {
  const { user } = useAuth();

  const { data: forms = [], isLoading } = useQuery<ReleaseForm[]>({
    queryKey: ['/api/release-forms'],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed': return CheckCircle;
      case 'pending': return AlertTriangle;
      case 'expired': return AlertTriangle;
      case 'rejected': return AlertTriangle;
      default: return FileText;
    }
  };

  const getFormTypeLabel = (type: string) => {
    switch (type) {
      case 'model_release': return 'Model Release';
      case 'location_release': return 'Location Release';
      case 'property_release': return 'Property Release';
      case 'minor_release': return 'Minor Release';
      default: return 'Release Form';
    }
  };

  const getFormDescription = (form: ReleaseForm) => {
    switch (form.type) {
      case 'model_release': return form.modelName || 'Model consent form';
      case 'location_release': return form.locationName || 'Location usage rights';
      case 'property_release': return form.propertyAddress || 'Property usage rights';
      case 'minor_release': return form.guardianName ? `Guardian: ${form.guardianName}` : 'Minor consent form';
      default: return 'Release documentation';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-96" />
          </div>
          
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const signedForms = forms.filter(form => form.status === 'signed');
  const pendingForms = forms.filter(form => form.status === 'pending');
  const expiredOrRejectedForms = forms.filter(form => ['expired', 'rejected'].includes(form.status));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" data-testid="release-forms-page">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display" data-testid="page-title">
              Release Forms
            </h1>
            <p className="text-muted-foreground">
              Manage model releases, location permits, and consent forms
            </p>
          </div>
        </div>

        <Button className="glow-effect" data-testid="create-form-button">
          <Upload className="h-4 w-4 mr-2" />
          Upload New Form
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Forms</p>
                <p className="text-2xl font-bold" data-testid="total-forms">
                  {forms.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Signed</p>
                <p className="text-2xl font-bold text-green-500" data-testid="signed-forms">
                  {signedForms.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-500" data-testid="pending-forms">
                  {pendingForms.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold text-red-500" data-testid="issue-forms">
                  {expiredOrRejectedForms.length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {forms.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="space-y-4">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No release forms yet</h3>
                <p className="text-muted-foreground mb-6">
                  Upload release forms to ensure legal compliance for your content creation.
                </p>
                <Button data-testid="upload-first-form-button">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Pending Forms - High Priority */}
          {pendingForms.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Pending Signatures
              </h2>
              <div className="space-y-4">
                {pendingForms.map((form) => {
                  const StatusIcon = getStatusIcon(form.status);
                  return (
                    <Card key={form.id} className="border-yellow-200 dark:border-yellow-800 hover:shadow-lg transition-all duration-200" data-testid={`form-${form.id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <StatusIcon className="h-5 w-5 text-yellow-500" />
                            <div>
                              <CardTitle className="text-base" data-testid={`form-title-${form.id}`}>
                                {getFormTypeLabel(form.type)}
                              </CardTitle>
                              <CardDescription data-testid={`form-description-${form.id}`}>
                                {getFormDescription(form)}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={getStatusColor(form.status)}>
                              {form.status}
                            </Badge>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>Created {formatDate(form.createdAt)}</p>
                              {form.expiresAt && (
                                <p className="text-red-500">Expires {formatDate(form.expiresAt)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="flex gap-2">
                          <Button size="sm" data-testid={`view-form-${form.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Review & Sign
                          </Button>
                          {form.documentUrl && (
                            <Button variant="outline" size="sm" data-testid={`download-form-${form.id}`}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Signed Forms */}
          {signedForms.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Signed Forms
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {signedForms.map((form) => {
                  const StatusIcon = getStatusIcon(form.status);
                  return (
                    <Card key={form.id} className="hover:shadow-lg transition-all duration-200" data-testid={`signed-form-${form.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4 text-green-500" />
                            <CardTitle className="text-sm">
                              {getFormTypeLabel(form.type)}
                            </CardTitle>
                          </div>
                          <Badge variant="outline" className={getStatusColor(form.status)}>
                            ✓ Signed
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {getFormDescription(form)}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span>Signed {form.signedAt ? formatDate(form.signedAt) : 'N/A'}</span>
                          {form.expiresAt && (
                            <span>Expires {formatDate(form.expiresAt)}</span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" data-testid={`view-signed-${form.id}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {form.documentUrl && (
                            <Button variant="outline" size="sm" data-testid={`download-signed-${form.id}`}>
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expired/Rejected Forms */}
          {expiredOrRejectedForms.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
                Issues & Expired
              </h2>
              <div className="space-y-3">
                {expiredOrRejectedForms.map((form) => {
                  const StatusIcon = getStatusIcon(form.status);
                  return (
                    <Card key={form.id} className="opacity-75" data-testid={`issue-form-${form.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4 text-red-500" />
                            <CardTitle className="text-sm">
                              {getFormTypeLabel(form.type)}
                            </CardTitle>
                          </div>
                          <Badge variant="outline" className={getStatusColor(form.status)}>
                            {form.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {getFormDescription(form)} • Created {formatDate(form.createdAt)}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}