import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Palette, Eye, Trash2, Plus, Wand2, Download, Upload } from "lucide-react";
import type { ThemeSettings } from "@shared/schema";

export default function ThemeManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTheme, setEditingTheme] = useState<ThemeSettings | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [newTheme, setNewTheme] = useState({
    name: '',
    colors: {
      primary: "hsl(0, 100%, 50%)",
      primaryForeground: "hsl(0, 0%, 100%)",
      secondary: "hsl(45, 80%, 60%)",
      secondaryForeground: "hsl(0, 0%, 0%)",
      background: "hsl(0, 0%, 1%)",
      foreground: "hsl(0, 0%, 100%)",
      card: "hsl(15, 15%, 4%)",
      cardForeground: "hsl(0, 0%, 100%)",
      accent: "hsl(50, 100%, 65%)",
      accentForeground: "hsl(0, 0%, 0%)",
      border: "hsl(15, 15%, 15%)",
      input: "hsl(15, 15%, 18%)",
      muted: "hsl(0, 0%, 10%)",
      mutedForeground: "hsl(0, 0%, 60%)",
      destructive: "hsl(0, 84%, 60%)",
      destructiveForeground: "hsl(0, 0%, 100%)"
    },
    typography: {
      fontDisplay: "Orbitron",
      fontHeading: "Rajdhani", 
      fontBody: "Inter"
    },
    effects: {
      neonIntensity: 1,
      glowEnabled: true,
      smokyBackground: true,
      flickerEnabled: true
    }
  });

  const { data: themes, isLoading } = useQuery({
    queryKey: ['/api/themes'],
    enabled: (user as any)?.role === 'admin' || (user as any)?.role === 'moderator',
  });

  const { data: activeTheme } = useQuery({
    queryKey: ['/api/themes/active'],
  });

  const createMutation = useMutation({
    mutationFn: async (theme: any) => {
      return apiRequest('POST', '/api/themes', theme);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      setCreateDialog(false);
      setNewTheme({
        name: '',
        colors: newTheme.colors,
        typography: newTheme.typography,
        effects: newTheme.effects
      });
      toast({
        title: "Success",
        description: "Theme created successfully",
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, theme }: { id: string; theme: any }) => {
      return apiRequest('PUT', `/api/themes/${id}`, theme);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      setEditingTheme(null);
      toast({
        title: "Success",
        description: "Theme updated successfully",
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

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('PUT', `/api/themes/${id}/activate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/active'] });
      toast({
        title: "Success",
        description: "Theme activated successfully",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/themes/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      toast({
        title: "Success",
        description: "Theme deleted successfully",
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

  if ((user as any)?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        <div 
          className="w-8 h-8 rounded border-2 border-border" 
          style={{ backgroundColor: value.startsWith('hsl') ? value : `hsl(${value})` }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="hsl(0, 100%, 50%)"
          className="flex-1"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6" data-testid="theme-manager">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold neon-sign">Theme Manager</h1>
          <p className="text-muted-foreground mt-1">Customize the platform's visual appearance and branding</p>
        </div>
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 neon-sign">
              <Plus className="mr-2 h-4 w-4" />
              Create Theme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="neon-sign">Create New Theme</DialogTitle>
              <DialogDescription>
                Design a custom theme with your own colors, typography, and effects
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={newTheme.name}
                  onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
                  placeholder="e.g., Dark Neon, Midnight Club, Electric Dreams"
                />
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-4 neon-sign-golden">Color Scheme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <ColorInput
                    label="Primary (Red Neon)"
                    value={newTheme.colors.primary}
                    onChange={(value) => setNewTheme({
                      ...newTheme,
                      colors: { ...newTheme.colors, primary: value }
                    })}
                  />
                  <ColorInput
                    label="Secondary (Golden Accent)"
                    value={newTheme.colors.secondary}
                    onChange={(value) => setNewTheme({
                      ...newTheme,
                      colors: { ...newTheme.colors, secondary: value }
                    })}
                  />
                  <ColorInput
                    label="Background (Smoky Dark)"
                    value={newTheme.colors.background}
                    onChange={(value) => setNewTheme({
                      ...newTheme,
                      colors: { ...newTheme.colors, background: value }
                    })}
                  />
                  <ColorInput
                    label="Accent (Bright Highlight)"
                    value={newTheme.colors.accent}
                    onChange={(value) => setNewTheme({
                      ...newTheme,
                      colors: { ...newTheme.colors, accent: value }
                    })}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4 neon-sign-golden">Typography</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Display Font</Label>
                    <Input
                      value={newTheme.typography.fontDisplay}
                      onChange={(e) => setNewTheme({
                        ...newTheme,
                        typography: { ...newTheme.typography, fontDisplay: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Heading Font</Label>
                    <Input
                      value={newTheme.typography.fontHeading}
                      onChange={(e) => setNewTheme({
                        ...newTheme,
                        typography: { ...newTheme.typography, fontHeading: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Body Font</Label>
                    <Input
                      value={newTheme.typography.fontBody}
                      onChange={(e) => setNewTheme({
                        ...newTheme,
                        typography: { ...newTheme.typography, fontBody: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4 neon-sign-golden">Visual Effects</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Neon Glow Effects</Label>
                    <Switch
                      checked={newTheme.effects.glowEnabled}
                      onCheckedChange={(checked) => setNewTheme({
                        ...newTheme,
                        effects: { ...newTheme.effects, glowEnabled: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Smoky Background</Label>
                    <Switch
                      checked={newTheme.effects.smokyBackground}
                      onCheckedChange={(checked) => setNewTheme({
                        ...newTheme,
                        effects: { ...newTheme.effects, smokyBackground: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Neon Flicker Animation</Label>
                    <Switch
                      checked={newTheme.effects.flickerEnabled}
                      onCheckedChange={(checked) => setNewTheme({
                        ...newTheme,
                        effects: { ...newTheme.effects, flickerEnabled: checked }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Neon Intensity (0-2)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={newTheme.effects.neonIntensity}
                      onChange={(e) => setNewTheme({
                        ...newTheme,
                        effects: { ...newTheme.effects, neonIntensity: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newTheme)}
                disabled={!newTheme.name || createMutation.isPending}
                className="bg-primary hover:bg-primary/90 neon-sign"
              >
                {createMutation.isPending ? "Creating..." : "Create Theme"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading themes...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(themes as ThemeSettings[])?.map((theme: ThemeSettings) => (
            <Card key={theme.id} className={`retro-border club-glow ${theme.isActive ? 'border-primary' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="neon-sign-golden">{theme.name}</CardTitle>
                  {theme.isActive && (
                    <Badge className="bg-primary text-primary-foreground">Active</Badge>
                  )}
                </div>
                <CardDescription>
                  Created {theme.createdAt ? new Date(theme.createdAt).toLocaleDateString() : 'Unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: (theme.colors as any)?.primary || '#ff0000' }}
                    title="Primary Color"
                  />
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: (theme.colors as any)?.secondary || '#ffcc00' }}
                    title="Secondary Color"
                  />
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: (theme.colors as any)?.accent || '#ffff00' }}
                    title="Accent Color"
                  />
                  <div 
                    className="w-8 h-8 rounded border" 
                    style={{ backgroundColor: (theme.colors as any)?.background || '#000000' }}
                    title="Background Color"
                  />
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Display: {(theme.typography as any)?.fontDisplay || 'Orbitron'}</p>
                  <p>Heading: {(theme.typography as any)?.fontHeading || 'Rajdhani'}</p>
                  <p>Body: {(theme.typography as any)?.fontBody || 'Inter'}</p>
                </div>

                <div className="flex gap-2">
                  {!theme.isActive && (
                    <Button 
                      size="sm" 
                      onClick={() => activateMutation.mutate(theme.id)}
                      disabled={activateMutation.isPending}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Activate
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEditingTheme(theme)}
                    className="flex-1"
                  >
                    <Palette className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(theme.id)}
                    disabled={theme.isActive || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}