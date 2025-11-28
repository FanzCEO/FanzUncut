// BoyFanz Offline Status Indicator
// Shows network connectivity status with BoyFanz underground aesthetic

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { offlineStorage } from '@/lib/offlineStorage';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Check for pending sync actions
      updatePendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Initial check for pending actions
    updatePendingActions();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending actions periodically
    const interval = setInterval(updatePendingActions, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updatePendingActions = async () => {
    try {
      const actions = await offlineStorage.getPendingActions();
      setPendingActions(actions.length);
    } catch (error) {
      console.error('❌ Failed to get pending actions:', error);
    }
  };

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // Don't show indicator if online and no pending actions
  if (isOnline && pendingActions === 0) {
    return null;
  }

  return (
    <div className={cn("fixed top-4 left-4 z-40", className)}>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-lg border transition-all duration-300 cursor-pointer",
          isOnline
            ? "bg-yellow-900/90 border-yellow-500/30 text-yellow-200"
            : "bg-red-900/90 border-red-500/30 text-red-200"
        )}
        onClick={toggleDetails}
        data-testid="offline-indicator"
      >
        {isOnline ? (
          <Wifi className="h-4 w-4 text-yellow-400" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-400" />
        )}
        
        <span className="text-sm font-medium">
          {isOnline ? (
            pendingActions > 0 ? (
              `${pendingActions} syncing...`
            ) : (
              'Online'
            )
          ) : (
            'Offline'
          )}
        </span>

        {!isOnline && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 ml-1 text-red-300 hover:text-red-100 hover:bg-red-700/50"
            onClick={(e) => {
              e.stopPropagation();
              handleRetry();
            }}
            data-testid="button-retry-connection"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Details panel */}
      {showDetails && (
        <div className="mt-2 p-3 bg-black/90 backdrop-blur-lg border border-white/10 rounded-lg text-sm max-w-xs">
          <h4 className="font-semibold text-white mb-2">Connection Status</h4>
          
          <div className="space-y-2 text-white/70">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={isOnline ? "text-yellow-400" : "text-red-400"}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            
            {pendingActions > 0 && (
              <div className="flex justify-between">
                <span>Pending sync:</span>
                <span className="text-yellow-400">{pendingActions} actions</span>
              </div>
            )}
            
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-white/50">
                {isOnline
                  ? "Your actions will sync automatically"
                  : "Actions are saved locally and will sync when you're back online"
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfflineIndicator;