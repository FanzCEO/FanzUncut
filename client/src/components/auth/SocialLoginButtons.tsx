import { Button } from "@/components/ui/button";
import { FaGoogle, FaFacebookF, FaTwitter, FaDiscord, FaGithub } from "react-icons/fa";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface SocialLoginButtonsProps {
  mode?: "login" | "signup";
  variant?: "default" | "outline";
  size?: "sm" | "default" | "lg";
  className?: string;
  role?: "creator" | "fan"; // Role to assign during social signup
}

const socialProviders = [
  {
    name: "Google",
    provider: "google",
    icon: FaGoogle,
    color: "hover:bg-red-600",
    bgColor: "bg-red-500"
  },
  {
    name: "Facebook", 
    provider: "facebook",
    icon: FaFacebookF,
    color: "hover:bg-blue-700",
    bgColor: "bg-blue-600"
  },
  {
    name: "Twitter",
    provider: "twitter", 
    icon: FaTwitter,
    color: "hover:bg-sky-600",
    bgColor: "bg-sky-500"
  },
  {
    name: "Discord",
    provider: "discord",
    icon: FaDiscord,
    color: "hover:bg-indigo-700",
    bgColor: "bg-indigo-600"
  },
  {
    name: "GitHub",
    provider: "github",
    icon: FaGithub,
    color: "hover:bg-gray-800",
    bgColor: "bg-gray-700"
  }
];

export function SocialLoginButtons({ 
  mode = "login", 
  variant = "outline",
  size = "default",
  className = "",
  role 
}: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialLogin = (provider: string) => {
    setLoadingProvider(provider);
    // Navigate to OAuth endpoint with role parameter for signups
    let url = `/auth/${provider}`;
    if (mode === "signup" && role) {
      url += `?role=${role}`;
    }
    window.location.href = url;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <Separator className="bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-black dark:bg-gray-900 px-4 text-sm text-gray-400 uppercase tracking-wider font-medium">
            {mode === "login" ? "Or sign in with" : "Or sign up with"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {socialProviders.map((social) => {
          const Icon = social.icon;
          const isLoading = loadingProvider === social.provider;
          
          return (
            <Button
              key={social.provider}
              variant={variant}
              size={size}
              onClick={() => handleSocialLogin(social.provider)}
              disabled={isLoading}
              data-testid={`button-social-${social.provider}`}
              className={`
                relative overflow-hidden transition-all duration-300 
                border-2 border-gray-700 dark:border-gray-600
                ${variant === 'outline' 
                  ? `hover:border-${social.provider === 'google' ? 'red' : social.provider === 'facebook' ? 'blue' : social.provider === 'twitter' ? 'sky' : social.provider === 'discord' ? 'indigo' : 'gray'}-500 hover:text-white hover:${social.bgColor}` 
                  : `${social.bgColor} ${social.color} text-white border-transparent`
                }
                hover:scale-105 hover:shadow-lg hover:shadow-${social.provider === 'google' ? 'red' : social.provider === 'facebook' ? 'blue' : social.provider === 'twitter' ? 'sky' : social.provider === 'discord' ? 'indigo' : 'gray'}-500/25
                focus:ring-2 focus:ring-${social.provider === 'google' ? 'red' : social.provider === 'facebook' ? 'blue' : social.provider === 'twitter' ? 'sky' : social.provider === 'discord' ? 'indigo' : 'gray'}-500
                group
              `}
            >
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-purple-500/0 to-cyan-500/0 group-hover:from-pink-500/10 group-hover:via-purple-500/10 group-hover:to-cyan-500/10 transition-all duration-500" />
              
              <div className="relative flex items-center justify-center space-x-2">
                <Icon className={`text-lg ${isLoading ? 'animate-spin' : ''}`} />
                <span className="font-medium text-sm hidden sm:inline">
                  {social.name}
                </span>
              </div>

              {/* Animated border for BoyFanz neon effect */}
              <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 rounded-md border border-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 animate-pulse" />
              </div>
            </Button>
          );
        })}
      </div>

      {/* Security notice */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {mode === "login" 
            ? "Sign in securely with your social account" 
            : "Create your account using your favorite social platform"
          }
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
          We never store your social account passwords
        </p>
      </div>
    </div>
  );
}

export default SocialLoginButtons;