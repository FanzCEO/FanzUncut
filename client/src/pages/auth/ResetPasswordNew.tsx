import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Lock, CheckCircle2 } from "lucide-react";

const resetPasswordSchema = z.object({
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

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordNew() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        title: "Invalid Link",
        description: "Password reset token is missing.",
        variant: "destructive",
      });
      setLocation("/auth/forgot-password");
    }
  }, [search]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues) => {
      if (!token) throw new Error("Token missing");
      return await apiRequest<{ success: boolean; message: string }>(
        "/api/auth/reset-password",
        "POST",
        { token, password: data.password }
      );
    },
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(data);
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div
            className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-8 shadow-2xl text-center"
            style={{
              boxShadow: "0 8px 32px 0 rgba(255, 0, 0, 0.1), inset 0 0 20px rgba(212, 169, 89, 0.05)",
            }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ff0000]/5 via-transparent to-[#d4a959]/5 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Password Reset Complete</h2>
              <p className="text-zinc-400 mb-6">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <Button
                onClick={() => setLocation("/auth/login")}
                data-testid="button-login"
                className="w-full bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold"
              >
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl font-bold mb-2">
            <span className="text-[#ff0000]">Boy</span>
            <span className="text-[#d4a959]">Fanz</span>
          </h1>
          <p className="text-zinc-400 text-sm">Create a new password</p>
        </div>

        <div
          className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-8 shadow-2xl"
          style={{
            boxShadow: "0 8px 32px 0 rgba(255, 0, 0, 0.1), inset 0 0 20px rgba(212, 169, 89, 0.05)",
          }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ff0000]/5 via-transparent to-[#d4a959]/5 pointer-events-none" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 font-medium">New Password</FormLabel>
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
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 font-medium">Confirm New Password</FormLabel>
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
                disabled={resetPasswordMutation.isPending}
                data-testid="button-reset-password"
                className="w-full h-12 bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold text-base shadow-lg shadow-red-500/20 transition-all"
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
