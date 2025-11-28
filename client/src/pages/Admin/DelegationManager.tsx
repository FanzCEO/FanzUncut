import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Shield, Users, Crown, Key } from "lucide-react";

type Permission = 
  | "moderation_queue"
  | "content_approval"
  | "theme_management"
  | "analytics_access"
  | "user_management";

const PERMISSIONS = [
  { id: "moderation_queue" as Permission, label: "Moderation Queue", description: "View and manage content moderation queue" },
  { id: "content_approval" as Permission, label: "Content Approval", description: "Approve or reject user content" },
  { id: "theme_management" as Permission, label: "Theme Management", description: "Create, edit and manage site themes" },
  { id: "analytics_access" as Permission, label: "Analytics Access", description: "View system analytics and reports" },
  { id: "user_management" as Permission, label: "User Management", description: "Manage user accounts and profiles" },
];

export default function DelegationManager() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [roleUpdateDialog, setRoleUpdateDialog] = useState(false);

  // Show loading while auth is loading
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground ml-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Only admins can access delegation management
  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can access delegation management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: user?.role === 'admin',
  });

  const { data: delegations, isLoading: delegationsLoading } = useQuery({
    queryKey: ['/api/admin/delegations'],
    enabled: user?.role === 'admin',
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest('PUT', `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setRoleUpdateDialog(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User role updated successfully",
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

  const grantPermissionMutation = useMutation({
    mutationFn: async ({ userId, permission }: { userId: string; permission: Permission }) => {
      return apiRequest('POST', '/api/admin/delegations/grant', {
        userId,
        permission,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delegations'] });
      toast({
        title: "Success",
        description: "Permission granted successfully",
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

  const revokePermissionMutation = useMutation({
    mutationFn: async ({ userId, permission }: { userId: string; permission: Permission }) => {
      return apiRequest('POST', '/api/admin/delegations/revoke', {
        userId,
        permission,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delegations'] });
      toast({
        title: "Success",
        description: "Permission revoked successfully",
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

  const filteredUsers = Array.isArray(users) ? users.filter((u: any) => 
    (u.username?.toLowerCase() ?? "").includes(userSearch.toLowerCase()) ||
    (u.email?.toLowerCase() ?? "").includes(userSearch.toLowerCase())
  ) : [];

  const getUserPermissions = (userId: string) => {
    return Array.isArray(delegations) ? delegations.filter((d: any) => d.userId === userId && d.granted) : [];
  };

  const hasPermission = (userId: string, permission: Permission) => {
    return getUserPermissions(userId).some((p: any) => p.permission === permission);
  };

  const handleTogglePermission = (userId: string, permission: Permission) => {
    if (hasPermission(userId, permission)) {
      revokePermissionMutation.mutate({ userId, permission });
    } else {
      grantPermissionMutation.mutate({ userId, permission });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Key className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display" data-testid="page-title">Delegation Manager</h1>
          <p className="text-muted-foreground">Manage user roles and delegate admin permissions</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* User Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Role Management
            </CardTitle>
            <CardDescription>
              Manage user roles and delegate admin permissions to other users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="user-search">Search Users</Label>
              <Input
                id="user-search"
                placeholder="Search by username or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mt-1"
                data-testid="user-search-input"
              />
            </div>

            <div className="space-y-4">
              {usersLoading && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Loading users...</p>
                </div>
              )}
              
              {filteredUsers?.map((userData: any) => (
                <div key={userData.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-medium text-primary">
                          {userData.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`user-name-${userData.username}`}>
                          {userData.username}
                        </p>
                        <p className="text-sm text-muted-foreground">{userData.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        userData.role === 'admin' ? 'destructive' :
                        userData.role === 'moderator' ? 'default' :
                        userData.role === 'creator' ? 'secondary' : 'outline'
                      }>
                        {userData.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                        {userData.role === 'moderator' && <Shield className="h-3 w-3 mr-1" />}
                        {userData.role}
                      </Badge>
                      {userData.role !== 'admin' && (
                        <Dialog open={selectedUser?.id === userData.id && roleUpdateDialog} onOpenChange={(open) => {
                          setRoleUpdateDialog(open);
                          if (!open) setSelectedUser(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(userData)}
                              data-testid={`change-role-${userData.username}`}
                            >
                              Change Role
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change User Role</DialogTitle>
                              <DialogDescription>
                                Change the role for {userData.username}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant={userData.role === 'moderator' ? 'default' : 'outline'}
                                  onClick={() => updateRoleMutation.mutate({ userId: userData.id, role: 'moderator' })}
                                  disabled={updateRoleMutation.isPending}
                                  data-testid="role-moderator"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Moderator
                                </Button>
                                <Button
                                  variant={userData.role === 'fan' ? 'default' : 'outline'}
                                  onClick={() => updateRoleMutation.mutate({ userId: userData.id, role: 'fan' })}
                                  disabled={updateRoleMutation.isPending}
                                  data-testid="role-fan"
                                >
                                  Fan
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>

                  {/* Permissions for non-admin users */}
                  {userData.role !== 'admin' && (
                    <div>
                      <Separator className="mb-3" />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Delegated Permissions</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {PERMISSIONS.map((permission) => (
                            <div key={permission.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="text-sm font-medium">{permission.label}</p>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                              <Switch
                                checked={hasPermission(userData.id, permission.id)}
                                onCheckedChange={() => handleTogglePermission(userData.id, permission.id)}
                                disabled={grantPermissionMutation.isPending || revokePermissionMutation.isPending}
                                data-testid={`permission-${permission.id}-${userData.username}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Delegations Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Active Delegations Summary</CardTitle>
            <CardDescription>
              Overview of all active permission delegations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {delegationsLoading && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading delegations...</p>
              </div>
            )}
            
            {Array.isArray(delegations) && delegations.length === 0 && (
              <div className="text-center py-8">
                <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No active delegations</p>
              </div>
            )}

            {Array.isArray(delegations) && delegations.length > 0 && (
              <div className="space-y-2">
                {delegations.map((delegation: any) => (
                  <div key={`${delegation.userId}-${delegation.permission}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{delegation.permission.replace('_', ' ')}</Badge>
                      <span className="text-sm">
                        {Array.isArray(users) ? users.find((u: any) => u.id === delegation.userId)?.username || 'Unknown User' : 'Unknown User'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Granted: {new Date(delegation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}