import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Sparkles, MessageCircle, Gift, Eye, Star, ArrowRight, Check, CreditCard, Zap, Users, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type OnboardingStep = 'welcome' | 'account' | 'personalization' | 'payment' | 'complete';

export default function FanzSignup() {
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
    birthday: "",
    interests: [] as string[],
    paymentAdded: false,
    agreeToTerms: false,
    over18: false
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const steps: OnboardingStep[] = ['welcome', 'account', 'personalization', 'payment', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const interestOptions = [
    "Fitness", "Gaming", "Music", "Art", "Fashion",
    "Lifestyle", "Adult", "Education", "Tech", "Food",
    "Travel", "Sports", "Comedy", "Beauty", "Dance"
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

  const handleSkipPayment = () => {
    setCurrentStep('complete');
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
      role: "fan",
      firstName: formData.displayName.split(" ")[0] || formData.displayName,
      lastName: formData.displayName.split(" ").slice(1).join(" ") || "",
    });
  };

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
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
              <span className="text-[#d4a959]">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2 bg-zinc-800" />
          </div>
        )}

        <Card className="bg-zinc-900/50 border-[#d4a959]/30 backdrop-blur-sm">
          
          {/* STEP 1: Welcome Screen */}
          {currentStep === 'welcome' && (
            <div className="p-8 md:p-12 text-center">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-[#d4a959]/20 to-[#ff0000]/20 rounded-full flex items-center justify-center border border-[#d4a959]/30">
                <Heart className="h-10 w-10 text-[#d4a959]" />
              </div>
              <h1 className="text-4xl md:text-5xl font-['Bebas_Neue'] text-white mb-4 tracking-wide">
                Discover. Connect. Support.
              </h1>
              <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                Your new world of creators awaits. Join millions discovering exclusive content and connecting with their favorite stars.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Eye className="w-8 h-8 text-[#d4a959] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Exclusive Content</h3>
                  <p className="text-sm text-zinc-400">Access unique creator posts</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <MessageCircle className="w-8 h-8 text-[#ff0000] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Direct Connection</h3>
                  <p className="text-sm text-zinc-400">Chat with your favorites</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Gift className="w-8 h-8 text-[#d4a959] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Support Creators</h3>
                  <p className="text-sm text-zinc-400">Tips, subs, and rewards</p>
                </div>
              </div>

              <Button
                onClick={handleNext}
                className="bg-[#d4a959] hover:bg-[#b8925e] text-white px-8 py-6 text-lg"
                data-testid="button-start-fan-signup"
              >
                Start Exploring
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="mt-6 text-sm text-zinc-500">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-[#d4a959] hover:underline">
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
                <CardDescription className="text-zinc-400">Simple and secure sign-up</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SocialLoginButtons role="fan" data-testid="social-login-fan" />
                
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
                      placeholder="fan@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-fan-email"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="username" className="text-zinc-300">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="@yourusername"
                      value={formData.username}
                      onChange={(e) => handleChange("username", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-fan-username"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="displayName" className="text-zinc-300">Display Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      value={formData.displayName}
                      onChange={(e) => handleChange("displayName", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-fan-display-name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="birthday" className="text-zinc-300">Birthday (Age Verification)</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => handleChange("birthday", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      data-testid="input-fan-birthday"
                      required
                    />
                    <p className="text-xs text-zinc-500 mt-1">You must be 18+ to use this platform</p>
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
                      data-testid="input-fan-password"
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
                      data-testid="input-fan-confirm-password"
                      required
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="over18"
                        checked={formData.over18}
                        onCheckedChange={(checked) => handleChange("over18", checked as boolean)}
                        data-testid="checkbox-fan-over-18"
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
                        data-testid="checkbox-fan-agree-terms"
                      />
                      <label htmlFor="agreeToTerms" className="text-sm text-zinc-300 cursor-pointer">
                        I agree to the{" "}
                        <Link href="/terms" className="text-[#d4a959] hover:underline">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-[#d4a959] hover:underline">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={handleBack} variant="outline" className="border-zinc-700" data-testid="button-back-account">
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="bg-[#d4a959] hover:bg-[#b8925e]"
                    data-testid="button-next-account"
                    disabled={!formData.email || !formData.username || !formData.password || !formData.confirmPassword || !formData.over18 || !formData.agreeToTerms}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 3: Personalization Onboarding */}
          {currentStep === 'personalization' && (
            <div className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-['Bebas_Neue'] text-white">Personalize Your Experience</CardTitle>
                <CardDescription className="text-zinc-400">Select interests to discover creators you'll love</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 rounded-lg border border-[#d4a959]/30 bg-[#d4a959]/5">
                  <div className="flex items-start gap-4">
                    <Sparkles className="w-8 h-8 text-[#d4a959] flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-white font-semibold mb-2">We'll Create Your Perfect Feed</h3>
                      <p className="text-sm text-zinc-400">
                        Based on your interests, we'll curate a personalized feed of creators and content just for you. You can always adjust this later.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-300 mb-3 block">What are you interested in?</Label>
                  <div className="flex flex-wrap gap-2">
                    {interestOptions.map((interest) => (
                      <Badge
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`cursor-pointer transition-all px-4 py-2 ${
                          formData.interests.includes(interest)
                            ? 'bg-[#d4a959] text-white border-[#d4a959]'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-[#d4a959]/50'
                        }`}
                        data-testid={`badge-interest-${interest.toLowerCase()}`}
                      >
                        {formData.interests.includes(interest) && <Check className="w-3 h-3 mr-1" />}
                        {interest}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-500 mt-3">
                    Select at least 3 interests to continue
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={handleBack} variant="outline" className="border-zinc-700" data-testid="button-back-personalization">
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="bg-[#d4a959] hover:bg-[#b8925e]"
                    data-testid="button-next-personalization"
                    disabled={formData.interests.length < 3}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 4: Payment Setup (Optional) */}
          {currentStep === 'payment' && (
            <div className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-['Bebas_Neue'] text-white">Add Payment Method</CardTitle>
                <CardDescription className="text-zinc-400">Tip and subscribe to creators instantly (Optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 rounded-lg border border-[#d4a959]/30 bg-gradient-to-br from-[#d4a959]/10 to-transparent">
                  <div className="flex items-start gap-4">
                    <CreditCard className="w-8 h-8 text-[#d4a959] flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-white font-semibold mb-2">Why Add Payment Now?</h3>
                      <ul className="text-sm text-zinc-400 space-y-1">
                        <li>• Send tips to creators instantly</li>
                        <li>• Subscribe to exclusive content with one click</li>
                        <li>• Unlock premium features and perks</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex gap-2">
                      <div className="w-10 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                      <div className="w-10 h-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded"></div>
                      <div className="w-10 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
                    </div>
                    <span className="text-white font-medium">Secure Payment Processing</span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    Your payment information is encrypted and secure. We never see or store your card details.
                  </p>
                </div>

                <div className="p-4 rounded-lg border-2 border-dashed border-zinc-700 text-center">
                  <CreditCard className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 mb-4">Payment integration coming soon</p>
                  <p className="text-sm text-zinc-500">
                    You'll be able to add payment methods in your account settings after sign-up
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={handleBack} variant="outline" className="border-zinc-700" data-testid="button-back-payment">
                    Back
                  </Button>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleSkipPayment} 
                      variant="outline"
                      className="border-zinc-700"
                      data-testid="button-skip-payment"
                    >
                      Skip for Now
                    </Button>
                    <Button 
                      onClick={handleNext} 
                      className="bg-[#d4a959] hover:bg-[#b8925e]"
                      data-testid="button-next-payment"
                    >
                      Add Payment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          )}

          {/* STEP 5: Complete - Dashboard Intro */}
          {currentStep === 'complete' && (
            <div className="p-8 md:p-12 text-center">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-[#d4a959]/20 to-[#ff0000]/20 rounded-full flex items-center justify-center border border-[#d4a959]/30 animate-pulse">
                <Sparkles className="h-10 w-10 text-[#d4a959]" />
              </div>
              <h1 className="text-4xl md:text-5xl font-['Bebas_Neue'] text-white mb-4 tracking-wide">
                Your Journey Begins!
              </h1>
              <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                Your personalized feed is ready. Discover exclusive content, connect with creators, and support the community.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Eye className="w-8 h-8 text-[#d4a959] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Explore Feed</h3>
                  <p className="text-sm text-zinc-400">Discover amazing creators</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Heart className="w-8 h-8 text-[#ff0000] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Follow & Like</h3>
                  <p className="text-sm text-zinc-400">Support your favorites</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <MessageCircle className="w-8 h-8 text-[#d4a959] mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-1">Interact</h3>
                  <p className="text-sm text-zinc-400">Chat, tip, and engage</p>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={registerMutation.isPending}
                className="bg-[#d4a959] hover:bg-[#b8925e] text-white px-8 py-6 text-lg"
                data-testid="button-complete-signup"
              >
                {registerMutation.isPending ? "Creating Your Account..." : "Explore Now"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="mt-6 text-sm text-zinc-500">
                Want to become a creator?{" "}
                <Link href="/auth/starz-signup" className="text-[#ff0000] hover:underline">
                  Upgrade to Starz
                </Link>
              </p>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}
