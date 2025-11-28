// BoyFanz PWA Installation Prompt Component
// Custom installation prompt with BoyFanz underground aesthetic

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Smartphone, Download } from 'lucide-react';
import { pwaManager } from '@/lib/pwa';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ onDismiss }: PWAInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Show prompt if PWA can be installed and isn't already installed
    const checkInstallability = () => {
      if (pwaManager.canInstall && !pwaManager.isInstalled) {
        setIsVisible(true);
      }
    };

    // Check on component mount
    checkInstallability();

    // Listen for installation readiness
    const handleBeforeInstallPrompt = () => {
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await pwaManager.promptInstall();
      if (success) {
        setIsVisible(false);
        // Track successful installation
        console.log('🎉 BoyFanz PWA installed successfully');
      }
    } catch (error) {
      console.error('❌ Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-4 right-4 left-4 md:left-auto md:w-80 z-50 animate-in slide-in-from-top-2 duration-300"
      data-testid="pwa-install-prompt"
    >
      <div className="bg-gradient-to-r from-red-900/95 to-red-800/95 backdrop-blur-lg border border-red-500/30 rounded-lg p-4 shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleDismiss}
          data-testid="button-dismiss-install"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="pr-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-500/20 rounded-lg p-2">
              <Smartphone className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Install BoyFanz App
              </h3>
              <p className="text-red-200 text-xs">
                Every Man's Playground
              </p>
            </div>
          </div>

          <p className="text-white/90 text-sm mb-4 leading-relaxed">
            Get the full app experience with offline access, push notifications, and faster loading.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            <div className="flex items-center gap-2 text-red-200">
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
              <span>Offline messaging</span>
            </div>
            <div className="flex items-center gap-2 text-red-200">
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
              <span>Push notifications</span>
            </div>
            <div className="flex items-center gap-2 text-red-200">
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
              <span>Faster loading</span>
            </div>
            <div className="flex items-center gap-2 text-red-200">
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
              <span>App-like experience</span>
            </div>
          </div>

          {/* Install button */}
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold border-0 shadow-lg"
            data-testid="button-install-pwa"
          >
            {isInstalling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Install App
              </>
            )}
          </Button>

          {/* Later button */}
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full mt-2 text-white/70 hover:text-white hover:bg-white/10"
            data-testid="button-install-later"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;