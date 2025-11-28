import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function PasswordStrengthMeter({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Lowercase letter", valid: /[a-z]/.test(password) },
    { label: "Number", valid: /[0-9]/.test(password) },
  ];

  const strength = checks.filter(c => c.valid).length;
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2" data-testid="password-strength-meter">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < strength ? strengthColors[strength - 1] : "bg-zinc-800"
            )}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className="text-xs text-zinc-400" data-testid="password-strength-label">
          Password strength: {strengthLabels[strength - 1]}
        </p>
      )}
      <ul className="space-y-1">
        {checks.map((check, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {check.valid ? (
              <CheckCircle2 className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-zinc-600" />
            )}
            <span className={check.valid ? "text-green-400" : "text-zinc-500"}>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      return await apiRequest<{ success: boolean; message: string; accountId: string }>(
        "/api/auth/register",
        "POST",
        data
      );
    },
    onSuccess: (data) => {
      toast({
        title: "Registration Successful!",
        description: "Check your email to verify your account before logging in.",
      });
      setLocation("/auth/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl font-bold mb-2">
            <span className="text-[#ff0000]">Boy</span>
            <span className="text-[#d4a959]">Fanz</span>
          </h1>
          <p className="text-zinc-400 text-sm">Create your account</p>
        </div>

        {/* Glass Card */}
        <div
          className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-8 shadow-2xl"
          style={{
            boxShadow: "0 8px 32px 0 rgba(255, 0, 0, 0.1), inset 0 0 20px rgba(212, 169, 89, 0.05)",
          }}
        >
          {/* Neon glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ff0000]/5 via-transparent to-[#d4a959]/5 pointer-events-none" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 font-medium">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@example.com"
                          data-testid="input-email"
                          className="pl-10 bg-black/60 border-white/10 text-white placeholder:text-zinc-600 focus:border-[#ff0000]/50 focus:ring-[#ff0000]/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          data-testid="input-password"
                          className="pl-10 pr-10 bg-black/60 border-white/10 text-white placeholder:text-zinc-600 focus:border-[#ff0000]/50 focus:ring-[#ff0000]/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                    <PasswordStrengthMeter password={field.value} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 font-medium">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          data-testid="input-confirm-password"
                          className="pl-10 pr-10 bg-black/60 border-white/10 text-white placeholder:text-zinc-600 focus:border-[#ff0000]/50 focus:ring-[#ff0000]/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                data-testid="button-register"
                className="w-full h-12 bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold text-base shadow-lg shadow-red-500/20 transition-all"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-zinc-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setLocation("/auth/login")}
                  data-testid="link-login"
                  className="text-[#d4a959] hover:text-[#e5ba6a] font-medium transition-colors"
                >
                  Log in
                </button>
              </div>
            </form>
          </Form>
        </div>

        {/* Terms & Privacy */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          By creating an account, you agree to our{" "}
          <a href="/terms" className="text-zinc-500 hover:text-zinc-400 underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-zinc-500 hover:text-zinc-400 underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
