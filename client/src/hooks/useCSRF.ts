import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface CSRFResponse {
  csrfToken: string;
}

export function useCSRF() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<CSRFResponse>({
    queryKey: ['/api/csrf-token'],
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  useEffect(() => {
    if (data?.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
  }, [data]);

  // Get CSRF token from cookie as fallback
  const getCSRFTokenFromCookie = (): string | null => {
    if (typeof document === 'undefined') return null;
    
    const match = document.cookie.match(/csrfToken=([^;]+)/);
    return match ? match[1] : null;
  };

  // Get the current CSRF token (from query or cookie)
  const getCurrentToken = (): string | null => {
    return csrfToken || getCSRFTokenFromCookie();
  };

  // Add CSRF headers to request options
  const addCSRFHeaders = (headers: HeadersInit = {}): HeadersInit => {
    const token = getCurrentToken();
    if (!token) {
      console.warn('No CSRF token available');
      return headers;
    }

    return {
      ...headers,
      'X-CSRF-Token': token,
    };
  };

  return {
    csrfToken: getCurrentToken(),
    isLoading,
    error,
    addCSRFHeaders,
    refresh: () => {
      // Force refetch CSRF token
      window.location.reload();
    }
  };
}