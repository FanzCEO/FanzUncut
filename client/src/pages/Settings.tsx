import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { User, Shield, Bell, Key, Webhook, Save, Copy, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { user } = useAuth();
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    avatarUrl: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    marketing: false
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['/api/profile'],
    enabled: false, // Disable for now since we don't have profile endpoint
  });

  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery({
    queryKey: ['/api/api-keys'],
  });

  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: ['/api/webhooks'],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PUT', '/api/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
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

  const createApiKeyMutation = useMutation({
    mutationFn: async (data: { scopes: string[] }) => {
      return apiRequest('POST', '/api/api-keys', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: "Success",
        description: "API key created successfully",
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

  const createWebhookMutation = useMutation({
    mutationFn: async (data: { url: string; eventsJson: string[] }) => {
      return apiRequest('POST', '/api/webhooks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
      toast({
        title: "Success",
        description: "Webhook created successfully",
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

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-bold font-display" data-testid="page-title">Settings</h1>
        <p className="text-muted-foreground" data-testid="page-description">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" data-testid="profile-tab">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="security-tab">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="notifications-tab">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="api-keys" data-testid="api-keys-tab">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="webhooks-tab">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <img 
                  src={user?.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"} 
                  alt="Profile Avatar" 
                  className="h-20 w-20 rounded-full ring-2 ring-primary/20"
                  data-testid="profile-avatar"
                />
                <div>
                  <h3 className="font-medium" data-testid="profile-name">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid="profile-email">
                    {user?.email}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="profile-role">
                    Role: {user?.role}
                  </p>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Your display name"
                      data-testid="display-name-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input
                      id="avatarUrl"
                      value={profileForm.avatarUrl}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                      placeholder="https://example.com/avatar.jpg"
                      data-testid="avatar-url-input"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    data-testid="bio-input"
                  />
                </div>
                
                <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="save-profile-button">
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline" data-testid="setup-2fa-button">
                    Setup 2FA
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Change Password</h4>
                    <p className="text-sm text-muted-foreground">
                      Update your account password
                    </p>
                  </div>
                  <Button variant="outline" data-testid="change-password-button">
                    Change Password
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Active Sessions</h4>
                    <p className="text-sm text-muted-foreground">
                      Manage your active login sessions
                    </p>
                  </div>
                  <Button variant="outline" data-testid="manage-sessions-button">
                    Manage Sessions
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-destructive">Danger Zone</h4>
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">Sign Out</h5>
                      <p className="text-sm text-muted-foreground">
                        Sign out of your account
                      </p>
                    </div>
                    <Button variant="destructive" onClick={handleLogout} data-testid="logout-button">
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email: checked }))}
                    data-testid="email-notifications-switch"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.push}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, push: checked }))}
                    data-testid="push-notifications-switch"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Marketing Communications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and promotions
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.marketing}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, marketing: checked }))}
                    data-testid="marketing-notifications-switch"
                  />
                </div>
              </div>
              
              <Button data-testid="save-notifications-button">
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for programmatic access
                  </CardDescription>
                </div>
                <Button onClick={() => createApiKeyMutation.mutate({ scopes: ['read'] })} data-testid="create-api-key-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Create API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeysLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                      <div className="h-8 w-16 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : apiKeys && Array.isArray(apiKeys) && apiKeys.length > 0 ? (
                <div className="space-y-4">
                  {apiKeys.map((apiKey: any) => (
                    <div key={apiKey.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`api-key-${apiKey.id}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono" data-testid={`api-key-hash-${apiKey.id}`}>
                            {apiKey.keyHash.substring(0, 8)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey.keyHash)}
                            data-testid={`copy-api-key-${apiKey.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`api-key-created-${apiKey.id}`}>
                          Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" data-testid={`delete-api-key-${apiKey.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="no-api-keys-title">
                    No API keys
                  </h3>
                  <p className="text-muted-foreground mb-4" data-testid="no-api-keys-description">
                    Create your first API key to access the BoyFanz API
                  </p>
                  <Button onClick={() => createApiKeyMutation.mutate({ scopes: ['read'] })} data-testid="create-first-api-key-button">
                    <Plus className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>
                    Configure webhooks to receive real-time notifications
                  </CardDescription>
                </div>
                <Button data-testid="create-webhook-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooksLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                      </div>
                      <div className="h-8 w-16 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : webhooks && Array.isArray(webhooks) && webhooks.length > 0 ? (
                <div className="space-y-4">
                  {webhooks.map((webhook: any) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`webhook-${webhook.id}`}>
                      <div>
                        <p className="font-medium" data-testid={`webhook-url-${webhook.id}`}>
                          {webhook.url}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`webhook-status-${webhook.id}`}>
                          Status: {webhook.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" data-testid={`edit-webhook-${webhook.id}`}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" data-testid={`delete-webhook-${webhook.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="no-webhooks-title">
                    No webhooks configured
                  </h3>
                  <p className="text-muted-foreground mb-4" data-testid="no-webhooks-description">
                    Set up webhooks to receive real-time event notifications
                  </p>
                  <Button data-testid="create-first-webhook-button">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Webhook
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
