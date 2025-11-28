import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest<{ success: boolean; message: string }>(
        "/api/auth/verify-email",
        "POST",
        { token }
      );
    },
    onSuccess: () => {
      setStatus("success");
      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified. You can now log in.",
      });
    },
    onError: (error: Error) => {
      setStatus("error");
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    
    if (token) {
      verifyMutation.mutate(token);
    } else {
      setStatus("error");
      toast({
        title: "Invalid Link",
        description: "Email verification token is missing.",
        variant: "destructive",
      });
    }
  }, [search]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl font-bold mb-2">
            <span className="text-[#ff0000]">Boy</span>
            <span className="text-[#d4a959]">Fanz</span>
          </h1>
        </div>

        <div
          className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-8 shadow-2xl text-center"
          style={{
            boxShadow: "0 8px 32px 0 rgba(255, 0, 0, 0.1), inset 0 0 20px rgba(212, 169, 89, 0.05)",
          }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ff0000]/5 via-transparent to-[#d4a959]/5 pointer-events-none" />

          <div className="relative z-10">
            {status === "verifying" && (
              <>
                <div className="w-16 h-16 bg-[#ff0000]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-[#ff0000] animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-verifying">
                  Verifying Your Email
                </h2>
                <p className="text-zinc-400">Please wait while we verify your email address...</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-success">
                  Email Verified!
                </h2>
                <p className="text-zinc-400 mb-6">
                  Your email has been successfully verified. You can now log in to your account.
                </p>
                <Button
                  onClick={() => setLocation("/auth/login")}
                  data-testid="button-login"
                  className="w-full bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold"
                >
                  Go to Login
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-error">
                  Verification Failed
                </h2>
                <p className="text-zinc-400 mb-6">
                  The verification link is invalid or has expired.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setLocation("/auth/resend-verification")}
                    data-testid="button-resend"
                    className="w-full bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </Button>
                  <Button
                    onClick={() => setLocation("/auth/login")}
                    data-testid="button-back-to-login"
                    variant="outline"
                    className="w-full border-white/10 text-zinc-300 hover:bg-white/5"
                  >
                    Back to Login
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
