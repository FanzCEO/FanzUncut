import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useCSRF } from "@/hooks/useCSRF";
import { LogIn, Crown, Heart, Zap, Shield, Star, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";

export default function Login() {
  const [, setLocation] = useLocation();
  const { loginMutation, user } = useAuth();
  const { csrfToken, isLoading: csrfLoading } = useCSRF();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter your username and password",
        variant: "destructive",
      });
      return;
    }

    if (!csrfToken) {
      toast({
        title: "Security Error",
        description: "Security token not available. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({
      username: formData.username,
      password: formData.password,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left side - Login Form */}
        <Card className="w-full max-w-md mx-auto bg-card/50 border-accent/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
              <LogIn className="h-8 w-8 text-accent neon-heartbeat" />
            </div>
            <CardTitle className="text-3xl font-bold font-heading neon-crimson-heading neon-breathe">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-lg neon-white-body neon-pulse">
              Sign in to your playground account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="neon-white-body">Username or Email</Label>
                <Input
                  id="login-username"
                  type="text"
                  placeholder="@username or email@example.com"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  className="bg-background/80 border-accent/30 text-foreground"
                  data-testid="input-login-username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="neon-white-body">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="bg-background/80 border-accent/30 text-foreground"
                  data-testid="input-login-password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/80 text-white font-semibold py-3 glow-effect"
                disabled={loginMutation.isPending || csrfLoading || !csrfToken}
                data-testid="button-login"
              >
                {loginMutation.isPending 
                  ? "Signing In..." 
                  : csrfLoading 
                  ? "Loading..."
                  : "Enter the Playground"
                }
              </Button>
            </form>

            {/* Social Login Options */}
            <div className="mt-6">
              <SocialLoginButtons mode="login" variant="outline" className="w-full" />
            </div>

            <div className="mt-8 text-center space-y-4">
              <p className="text-sm neon-white-body">
                Forgot your password?{" "}
                <Link href="/auth/reset-password" className="text-accent hover:underline font-semibold" data-testid="link-reset-password">
                  Reset it here
                </Link>
              </p>
              
              <div className="border-t border-muted/20 pt-4">
                <p className="text-sm neon-white-body mb-4">Don't have an account yet?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/auth/starz-signup" className="block">
                    <Button 
                      variant="outline" 
                      className="w-full border-primary/30 hover:bg-primary/10 text-primary hover:text-primary"
                      data-testid="button-join-starz"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Join as Starz
                    </Button>
                  </Link>
                  <Link href="/auth/fanz-signup" className="block">
                    <Button 
                      variant="outline" 
                      className="w-full border-secondary/30 hover:bg-secondary/10 text-secondary hover:text-secondary"
                      data-testid="button-join-fanz"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Join as Fanz
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right side - Hero Section */}
        <div className="flex flex-col justify-center space-y-8 p-8">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-bold font-heading mb-4 neon-sign-golden neon-flicker">
              Every Man's Playground
            </h1>
            <p className="text-xl neon-white-body neon-breathe mb-8">
              Where creators become stars and fans discover their desires in the ultimate underground experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <Crown className="h-8 w-8 text-primary neon-heartbeat flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold neon-crimson-heading neon-buzz">For Starz</h3>
                <p className="text-sm neon-white-body">Build your empire, monetize content, connect with fans</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Heart className="h-8 w-8 text-secondary neon-dying flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold neon-crimson-heading neon-flicker">For Fanz</h3>
                <p className="text-sm neon-white-body">Discover exclusive content, support creators, join the community</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Shield className="h-8 w-8 text-accent neon-strobe flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold neon-crimson-heading neon-heartbeat">Secure Platform</h3>
                <p className="text-sm neon-white-body">Advanced security and privacy protection</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Zap className="h-8 w-8 text-primary neon-buzz flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold neon-crimson-heading neon-breathe">Real-time Experience</h3>
                <p className="text-sm neon-white-body">Live streaming, instant messaging, immediate payouts</p>
              </div>
            </div>
          </div>

          <div className="bg-card/30 rounded-lg p-6 border border-accent/20">
            <div className="flex items-center space-x-3 mb-3">
              <Star className="h-6 w-6 text-accent neon-heartbeat" />
              <h3 className="font-semibold neon-crimson-heading neon-dying">Why Choose BoyFanz?</h3>
            </div>
            <ul className="space-y-2 text-sm neon-white-body">
              <li>• Underground club aesthetic with seductive neon vibes</li>
              <li>• 100% creator earnings - no platform fees</li>
              <li>• Advanced KYC compliance and content moderation</li>
              <li>• Direct messaging, tips, and custom content</li>
              <li>• Real-time notifications and live streaming</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}