import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types for local auth
type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
  role: "fan" | "creator";
  firstName?: string;
  lastName?: string;
};

export function useAuth() {
  const { toast } = useToast();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      let res: Response | undefined;
      
      try {
        res = await fetch("/api/auth/user", {
          credentials: "include",
        });
        
        // Return null for 401/403 (not authenticated) instead of throwing
        if (res.status === 401 || res.status === 403) {
          console.info(`Auth check: User not authenticated (${res.status})`);
          return null;
        }
        
        if (!res.ok) {
          // Get response text for detailed error logging
          let responseText = '';
          try {
            responseText = await res.text();
          } catch (textError) {
            console.error('Failed to read error response text:', textError);
          }
          
          console.error('Auth check failed:', {
            status: res.status,
            statusText: res.statusText,
            url: res.url,
            headers: Object.fromEntries(res.headers.entries()),
            responseText: responseText.substring(0, 1000), // Limit to first 1000 chars
          });
          return null;
        }
        
        // Check if response contains valid JSON before parsing
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await res.text();
          console.error('Auth check error: Invalid content type', {
            contentType,
            expectedContentType: 'application/json',
            responseText: responseText.substring(0, 500),
            status: res.status,
            url: res.url
          });
          return null;
        }
        
        // Parse JSON with error handling
        try {
          return await res.json();
        } catch (jsonError) {
          // Log JSON parsing error with response details
          let responseText = '';
          try {
            // Try to get the response text by cloning the response (if possible)
            const clonedRes = res.clone();
            responseText = await clonedRes.text();
          } catch (cloneError) {
            responseText = 'Unable to read response text';
          }
          
          console.error('Auth check JSON parsing error:', {
            error: jsonError,
            message: jsonError instanceof Error ? jsonError.message : 'Unknown JSON parsing error',
            responseText: responseText.substring(0, 500),
            contentType: res.headers.get('content-type'),
            status: res.status,
            url: res.url
          });
          return null;
        }
        
      } catch (networkError) {
        // Handle network and other fetch errors
        console.error('Auth check network error:', {
          error: networkError,
          message: networkError instanceof Error ? networkError.message : 'Unknown network error',
          stack: networkError instanceof Error ? networkError.stack : undefined,
          name: networkError instanceof Error ? networkError.name : undefined,
          url: res?.url || '/api/auth/user',
          timestamp: new Date().toISOString()
        });
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: any) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: any) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Welcome to BoyFanz!",
        description: "Your account has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    loginMutation,
    registerMutation,
    logoutMutation,
  };
}
