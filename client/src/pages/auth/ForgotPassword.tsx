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
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormValues) => {
      return await apiRequest<{ success: boolean; message: string }>(
        "/api/auth/forgot-password",
        "POST",
        data
      );
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "Check your email for password reset instructions.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    forgotPasswordMutation.mutate(data);
  };

  if (emailSent) {
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
              <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
              <p className="text-zinc-400 mb-6">
                We've sent password reset instructions to{" "}
                <span className="text-[#d4a959]">{form.getValues("email")}</span>
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                The link will expire in 1 hour. If you don't see the email, check your spam folder.
              </p>
              <Button
                onClick={() => setLocation("/auth/login")}
                data-testid="button-back-to-login"
                className="w-full bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold"
              >
                Back to Login
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
          <p className="text-zinc-400 text-sm">Reset your password</p>
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
              <div className="text-center mb-6">
                <p className="text-zinc-400 text-sm">
                  Enter your email address and we'll send you instructions to reset your password.
                </p>
              </div>

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

              <Button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                data-testid="button-send-reset-link"
                className="w-full h-12 bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold text-base shadow-lg shadow-red-500/20 transition-all"
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <button
                type="button"
                onClick={() => setLocation("/auth/login")}
                data-testid="link-back-to-login"
                className="w-full flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
