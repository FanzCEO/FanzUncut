import { useEffect } from 'react';
import { useAuth } from './useAuth';
import websocketService from '@/services/websocketService';

/**
 * Hook to initialize WebSocket connection when user is authenticated
 * This should be used at the top level of the app (App.tsx)
 */
export function useWebSocketInit() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Connect to WebSocket server
      websocketService.connect(user.id);
      
      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Cleanup on unmount or when user changes
      return () => {
        websocketService.disconnect();
      };
    } else {
      // Disconnect if not authenticated
      websocketService.disconnect();
    }
  }, [isAuthenticated, user?.id]);
}

export default useWebSocketInit;