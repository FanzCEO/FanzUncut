import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Star, Zap, Camera, DollarSign, Users, ArrowRight, Check, Sparkles, Shield, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type OnboardingStep = 'welcome' | 'account' | 'profile' | 'verification' | 'monetization' | 'complete';

export default function StarzSignup() {
  const [, setLocation] = useLocation();
  const { registerMutation, user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    stageName: "",
    pronouns: "",
    bio: "",
    niches: [] as string[],
    agreeToTerms: false,
    over18: false,
    payoutMethod: "",
    payoutDetails: ""
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const steps: OnboardingStep[] = ['welcome', 'account', 'profile', 'verification', 'monetization', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const nicheOptions = [
    "Fitness & Wellness", "Gaming", "Music", "Art", "Fashion", 
    "Lifestyle", "Adult Content", "Education", "Tech", "Food & Cooking"
  ];

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.agreeToTerms || !formData.over18) {
      toast({
        title: "Agreement Required",
        description: "You must agree to the terms and confirm you are 18+",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      role: "creator",
      firstName: formData.displayName.split(" ")[0] || formData.displayName,
      lastName: formData.displayName.split(" ").slice(1).join(" ") || "",
    });
  };

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleNiche = (niche: string) => {
    setFormData(prev => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter(n => n !== niche)
        : [...prev.niches, niche]
    }));
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        
        {/* Progress Bar */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="mb-8">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-zinc-400">Step {currentStepIndex + 1} of {steps.length}</span>
              <span className="text-[#ff0000]">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2 bg-zinc-800" />
          </div>
        )}

        <Card className="bg-zinc-900/50 border-[#ff0000]/30 backdrop-blur-sm">
          
          {/* STEP 1: Welcome Screen */}
          {currentStep === 'welcome' && (
            <div className="p-8 md:p-12 text-center">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-[#ff0000]/20 to-[#d4a959]/20 rounded-full flex items-center justify-center border border-[#ff0000]/30">
                <Crown className="h-10 w-10 text-[#ff0000]" />
              </div>
              <h1 className="text-4xl md:text-5xl font-['Bebas_Neue'] text-white mb-4 tracking-wide">
                Claim Your Star Power
              </h1>
              <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                Join the creator economy that puts you first. Build your empire with 100% earnings, full content ownership, and powerful community tools.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <DollarSign className="w-8 h-8 text-[#d4a959] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">100% Earnings</h3>
                  <p className="text-sm text-zinc-400">Keep everything you make</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Shield className="w-8 h-8 text-[#ff0000] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Full Ownership</h3>
                  <p className="text-sm text-zinc-400">Your content, your rules</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Users className="w-8 h-8 text-[#d4a959] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Community Tools</h3>
                  <p className="text-sm text-zinc-400">Engage like never before</p>
                </div>
              </div>

              <Button
                onClick={handleNext}
                className="bg-[#ff0000] hover:bg-[#cc0000] text-white px-8 py-6 text-lg"
                data-testid="button-start-creator-signup"
              >
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="mt-6 text-sm text-zinc-500">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-[#ff0000] hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          )}

          {/* STEP 2: Account Creation */}
          {currentStep === 'account' && (
            <div className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-['Bebas_Neue'] text-white">Create Your Account</CardTitle>
                <CardDescription className="text-zinc-400">Choose your preferred sign-up method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SocialLoginButtons role="creator" data-testid="social-login-creator" />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with email</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="creator@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-creator-email"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="username" className="text-zinc-300">Creator Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="@yourcreatorname"
                      value={formData.username}
                      onChange={(e) => handleChange("username", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-creator-username"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-zinc-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-creator-password"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-creator-confirm-password"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={handleBack} variant="outline" className="border-zinc-700" data-testid="button-back-account">
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="bg-[#ff0000] hover:bg-[#cc0000]"
                    data-testid="button-next-account"
                    disabled={!formData.email || !formData.username || !formData.password || !formData.confirmPassword}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 3: Profile Setup */}
          {currentStep === 'profile' && (
            <div className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-['Bebas_Neue'] text-white">Build Your Creator Profile</CardTitle>
                <CardDescription className="text-zinc-400">Tell your fans who you are</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="displayName" className="text-zinc-300">Display Name</Label>
                    <Input
                      id="displayName"
                      placeholder="Your real or public name"
                      value={formData.displayName}
                      onChange={(e) => handleChange("displayName", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-display-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stageName" className="text-zinc-300">Stage Name</Label>
                    <Input
                      id="stageName"
                      placeholder="Your creative alias"
                      value={formData.stageName}
                      onChange={(e) => handleChange("stageName", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-stage-name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pronouns" className="text-zinc-300">Pronouns (Optional)</Label>
                  <Input
                    id="pronouns"
                    placeholder="e.g., they/them, she/her, he/him"
                    value={formData.pronouns}
                    onChange={(e) => handleChange("pronouns", e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    data-testid="input-pronouns"
                  />
                </div>

                <div>
                  <Label className="text-zinc-300 mb-3 block">Select Your Niches</Label>
                  <div className="flex flex-wrap gap-2">
                    {nicheOptions.map((niche) => (
                      <Badge
                        key={niche}
                        onClick={() => toggleNiche(niche)}
                        className={`cursor-pointer transition-all ${
                          formData.niches.includes(niche)
                            ? 'bg-[#ff0000] text-white border-[#ff0000]'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-[#ff0000]/50'
                        }`}
                        data-testid={`badge-niche-${niche.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {formData.niches.includes(niche) && <Check className="w-3 h-3 mr-1" />}
                        {niche}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={handleBack} variant="outline" className="border-zinc-700" data-testid="button-back-profile">
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="bg-[#ff0000] hover:bg-[#cc0000]"
                    data-testid="button-next-profile"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 4: Verification & Compliance */}
          {currentStep === 'verification' && (
            <div className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-['Bebas_Neue'] text-white">Verification & Compliance</CardTitle>
                <CardDescription className="text-zinc-400">Quick and secure identity verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 rounded-lg border border-[#d4a959]/30 bg-[#d4a959]/5">
                  <div className="flex items-start gap-4">
                    <Shield className="w-8 h-8 text-[#d4a959] flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-white font-semibold mb-2">Why We Verify</h3>
                      <p className="text-sm text-zinc-400">
                        We verify all creators to ensure platform safety, comply with regulations, and protect both you and your fans. Your data is encrypted and secure.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="over18"
                      checked={formData.over18}
                      onCheckedChange={(checked) => handleChange("over18", checked as boolean)}
                      data-testid="checkbox-over-18"
                    />
                    <label htmlFor="over18" className="text-sm text-zinc-300 cursor-pointer">
                      I confirm that I am 18 years of age or older
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleChange("agreeToTerms", checked as boolean)}
                      data-testid="checkbox-agree-terms"
                    />
                    <label htmlFor="agreeToTerms" className="text-sm text-zinc-300 cursor-pointer">
                      I agree to the{" "}
                      <Link href="/terms" className="text-[#ff0000] hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-[#ff0000] hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-center gap-3 mb-3">
                    <Camera className="w-5 h-5 text-[#ff0000]" />
                    <span className="text-white font-medium">ID Verification (Coming Soon)</span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    You'll be prompted to complete ID verification via a secure photo + selfie match after account creation. This ensures platform compliance and unlocks monetization features.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={handleBack} variant="outline" className="border-zinc-700" data-testid="button-back-verification">
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="bg-[#ff0000] hover:bg-[#cc0000]"
                    data-testid="button-next-verification"
                    disabled={!formData.over18 || !formData.agreeToTerms}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 5: Monetization Setup */}
          {currentStep === 'monetization' && (
            <div className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-['Bebas_Neue'] text-white">Set Up Payouts</CardTitle>
                <CardDescription className="text-zinc-400">Choose how you want to receive your 100% earnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 rounded-lg border border-[#d4a959]/30 bg-gradient-to-br from-[#d4a959]/10 to-transparent">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-400">Your Estimated Earnings</span>
                    <Sparkles className="w-5 h-5 text-[#d4a959]" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">100% Yours</div>
                  <p className="text-sm text-zinc-400">
                    Unlike other platforms, you keep every dollar you earn. No platform fees, no hidden charges.
                  </p>
                </div>

                <div>
                  <Label className="text-zinc-300 mb-3 block">Select Payout Method</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['PayPal', 'Bank Transfer', 'Crypto Wallet', 'Paxum'].map((method) => (
                      <div
                        key={method}
                        onClick={() => handleChange("payoutMethod", method)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.payoutMethod === method
                            ? 'border-[#ff0000] bg-[#ff0000]/10'
                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                        }`}
                        data-testid={`payout-method-${method.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-2">
                          {formData.payoutMethod === method && (
                            <div className="w-5 h-5 rounded-full bg-[#ff0000] flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <span className="text-white font-medium">{method}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {formData.payoutMethod && (
                  <div>
                    <Label htmlFor="payoutDetails" className="text-zinc-300">Payout Details</Label>
                    <Input
                      id="payoutDetails"
                      placeholder={`Enter your ${formData.payoutMethod} details`}
                      value={formData.payoutDetails}
                      onChange={(e) => handleChange("payoutDetails", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-payout-details"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      You can update this later in your account settings
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button onClick={handleBack} variant="outline" className="border-zinc-700" data-testid="button-back-monetization">
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="bg-[#ff0000] hover:bg-[#cc0000]"
                    data-testid="button-next-monetization"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 6: Complete - Dashboard Intro */}
          {currentStep === 'complete' && (
            <div className="p-8 md:p-12 text-center">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-[#ff0000]/20 to-[#d4a959]/20 rounded-full flex items-center justify-center border border-[#ff0000]/30 animate-pulse">
                <Star className="h-10 w-10 text-[#d4a959]" />
              </div>
              <h1 className="text-4xl md:text-5xl font-['Bebas_Neue'] text-white mb-4 tracking-wide">
                Welcome to Your Empire!
              </h1>
              <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                Your creator account is almost ready. Complete your registration to unlock your dashboard and start building your community.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Upload className="w-8 h-8 text-[#ff0000] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Upload Content</h3>
                  <p className="text-sm text-zinc-400">Share photos, videos & more</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Users className="w-8 h-8 text-[#d4a959] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Go Live</h3>
                  <p className="text-sm text-zinc-400">Stream to your fans in real-time</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Zap className="w-8 h-8 text-[#ff0000] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Earn Instantly</h3>
                  <p className="text-sm text-zinc-400">Get paid for every interaction</p>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={registerMutation.isPending}
                className="bg-[#ff0000] hover:bg-[#cc0000] text-white px-8 py-6 text-lg"
                data-testid="button-complete-signup"
              >
                {registerMutation.isPending ? "Creating Your Account..." : "Enter Your Dashboard"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}
