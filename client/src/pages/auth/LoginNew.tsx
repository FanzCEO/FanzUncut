import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      return await apiRequest<{ success: boolean; message: string; accountId: string }>(
        "/api/auth/login",
        "POST",
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
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
          <p className="text-zinc-400 text-sm">Welcome back</p>
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
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel className="text-zinc-300 font-medium">Password</FormLabel>
                      <button
                        type="button"
                        onClick={() => setLocation("/auth/forgot-password")}
                        data-testid="link-forgot-password"
                        className="text-xs text-[#d4a959] hover:text-[#e5ba6a] transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
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
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                data-testid="button-login"
                className="w-full h-12 bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold text-base shadow-lg shadow-red-500/20 transition-all"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-zinc-500">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => setLocation("/auth/register")}
                  data-testid="link-register"
                  className="text-[#d4a959] hover:text-[#e5ba6a] font-medium transition-colors"
                >
                  Create one
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setLocation("/auth/resend-verification")}
                  data-testid="link-resend-verification"
                  className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                >
                  Didn't receive verification email?
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
