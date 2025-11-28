import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OnboardingFlowProps {
  user: any;
  onComplete: () => void;
}

export default function OnboardingFlow({ user, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    creatorType: "",
    goals: [] as string[],
    profileTheme: "neon-red"
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/profiles/complete-onboarding", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Welcome to BoyFanz!",
        description: "Your profile is now set up. Start exploring the playground!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    }
  });

  const steps = [
    {
      title: "Welcome to BoyFanz",
      description: "Every Man's Playground",
      component: WelcomeStep
    },
    {
      title: "Tell us about yourself", 
      description: "Create your creator identity",
      component: ProfileStep
    },
    {
      title: "Choose your style",
      description: "Pick your profile theme",
      component: ThemeStep
    },
    {
      title: "Ready to dominate?",
      description: "Your playground awaits",
      component: CompletionStep
    }
  ];

  const currentStepData = steps[currentStep - 1];
  const progress = (currentStep / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboardingMutation.mutate(formData);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="onboarding-flow">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center glow-effect mx-auto mb-4">
            <i className="fas fa-fire text-2xl text-primary-foreground"></i>
          </div>
          <h1 className="text-3xl font-display font-bold text-primary tracking-wider mb-2">BoyFanz</h1>
          <Badge variant="secondary" className="font-display font-bold text-sm tracking-wide uppercase">
            Every Man's Playground
          </Badge>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {currentStep}/{steps.length}
                </Badge>
              </div>
              <Progress value={progress} className="flex-1 mx-4" />
            </div>
            <CardTitle className="font-heading text-2xl">{currentStepData.title}</CardTitle>
            <CardDescription className="font-body text-lg">{currentStepData.description}</CardDescription>
          </CardHeader>
          
          <CardContent>
            <currentStepData.component 
              formData={formData}
              setFormData={setFormData}
              user={user}
            />
            
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                data-testid="prev-step-button"
              >
                <i className="fas fa-chevron-left mr-2"></i>
                Back
              </Button>
              
              <Button
                onClick={nextStep}
                className="glow-effect font-semibold"
                disabled={completeOnboardingMutation.isPending}
                data-testid="next-step-button"
              >
                {currentStep === steps.length ? (
                  completeOnboardingMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Setting up...
                    </>
                  ) : (
                    <>
                      Enter the Playground
                      <i className="fas fa-rocket ml-2"></i>
                    </>
                  )
                ) : (
                  <>
                    Continue
                    <i className="fas fa-chevron-right ml-2"></i>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WelcomeStep({ user }: { user: any; formData: any; setFormData: any }) {
  return (
    <div className="text-center space-y-6">
      <div className="relative">
        <img 
          src={user?.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face"} 
          alt="Profile" 
          className="h-20 w-20 rounded-full mx-auto ring-4 ring-primary/30 glow-effect"
        />
        <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-secondary text-secondary-foreground">
          Newcomer
        </Badge>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-2xl font-heading font-bold">
          Welcome to the ultimate playground, {user?.firstName || 'Creator'}!
        </h3>
        <p className="text-muted-foreground font-body text-lg max-w-lg mx-auto">
          BoyFanz isn't just another platform - it's <span className="text-primary font-semibold">Every Man's Playground</span> where 
          creators dominate, fans connect, and legends are born. Ready to claim your territory?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <i className="fas fa-crown text-primary text-2xl mb-2"></i>
            <h4 className="font-heading font-semibold">Monetize Like a King</h4>
            <p className="text-sm text-muted-foreground">Turn your content into cash</p>
          </div>
          
          <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
            <i className="fas fa-fire text-secondary text-2xl mb-2"></i>
            <h4 className="font-heading font-semibold">Build Your Empire</h4>
            <p className="text-sm text-muted-foreground">Grow your fanbase exponentially</p>
          </div>
          
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
            <i className="fas fa-trophy text-accent text-2xl mb-2"></i>
            <h4 className="font-heading font-semibold">Compete & Conquer</h4>
            <p className="text-sm text-muted-foreground">Rise to the top of leaderboards</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileStep({ formData, setFormData }: { formData: any; setFormData: any; user: any }) {
  const creatorTypes = [
    { id: "fitness", label: "Fitness Guru", icon: "fas fa-dumbbell" },
    { id: "gaming", label: "Gaming Legend", icon: "fas fa-gamepad" },
    { id: "lifestyle", label: "Lifestyle King", icon: "fas fa-star" },
    { id: "business", label: "Business Boss", icon: "fas fa-briefcase" },
    { id: "entertainment", label: "Entertainment Pro", icon: "fas fa-microphone" },
    { id: "other", label: "Other Champion", icon: "fas fa-bolt" }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Display Name</label>
          <Input
            placeholder="Your creator name..."
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            className="bg-card border-border"
            data-testid="display-name-input"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-2">Bio</label>
          <Textarea
            placeholder="Tell your story in a few powerful words..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="bg-card border-border min-h-20"
            data-testid="bio-input"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-3">What's your domain?</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {creatorTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setFormData({ ...formData, creatorType: type.id })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  formData.creatorType === type.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/50"
                }`}
                data-testid={`creator-type-${type.id}`}
              >
                <i className={`${type.icon} text-lg mb-2 block`}></i>
                <div className="font-semibold text-sm">{type.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeStep({ formData, setFormData }: { formData: any; setFormData: any; user: any }) {
  const themes = [
    { id: "neon-red", name: "Neon Fire", primary: "hsl(0, 100%, 50%)", secondary: "hsl(45, 80%, 60%)" },
    { id: "cyber-blue", name: "Cyber Storm", primary: "hsl(220, 100%, 50%)", secondary: "hsl(280, 80%, 60%)" },
    { id: "toxic-green", name: "Toxic Venom", primary: "hsl(120, 100%, 40%)", secondary: "hsl(60, 80%, 60%)" },
    { id: "royal-purple", name: "Royal Domination", primary: "hsl(280, 100%, 50%)", secondary: "hsl(45, 80%, 60%)" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-heading font-bold mb-2">Choose Your Battle Colors</h3>
        <p className="text-muted-foreground">Pick a theme that matches your energy</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setFormData({ ...formData, profileTheme: theme.id })}
            className={`relative p-6 rounded-lg border-2 transition-all ${
              formData.profileTheme === theme.id
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            }`}
            data-testid={`theme-${theme.id}`}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-full flex-shrink-0"
                style={{ backgroundColor: theme.primary }}
              />
              <div 
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: theme.secondary }}
              />
              <div className="text-left">
                <div className="font-heading font-bold">{theme.name}</div>
                <div className="text-sm text-muted-foreground">Signature style</div>
              </div>
            </div>
            
            {formData.profileTheme === theme.id && (
              <div className="absolute top-2 right-2">
                <i className="fas fa-check-circle text-primary text-xl"></i>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function CompletionStep({ formData }: { formData: any; setFormData: any; user: any }) {
  return (
    <div className="text-center space-y-6">
      <div className="relative">
        <div className="h-24 w-24 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center glow-effect mx-auto">
          <i className="fas fa-crown text-4xl text-primary-foreground"></i>
        </div>
        <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground animate-pulse">
          Ready to Rule
        </Badge>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-3xl font-display font-bold text-primary tracking-wider">
          Welcome to the Playground, {formData.displayName || 'Champion'}!
        </h3>
        
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Your kingdom awaits. Time to show the world what you're made of and build your empire on BoyFanz.
        </p>
        
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 border border-primary/20 mt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">0</div>
              <div className="text-sm text-muted-foreground">Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">1</div>
              <div className="text-sm text-muted-foreground">Level</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}