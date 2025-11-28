import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Volume2, 
  VolumeX, 
  Type, 
  Contrast, 
  Eye,
  SkipForward,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccessibilityToolbarProps {
  className?: string;
}

// Comprehensive accessibility toolbar and features
export function AccessibilityToolbar({ className }: AccessibilityToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);

  // Apply accessibility settings
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    root.style.setProperty('--accessibility-font-scale', `${fontSize}%`);
    
    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Screen reader optimizations
    if (screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
  }, [fontSize, highContrast, reducedMotion, screenReaderMode]);

  // Load saved preferences
  useEffect(() => {
    const savedPrefs = localStorage.getItem('accessibility-preferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setFontSize(prefs.fontSize || 100);
        setHighContrast(prefs.highContrast || false);
        setReducedMotion(prefs.reducedMotion || false);
        setScreenReaderMode(prefs.screenReaderMode || false);
      } catch (error) {
        console.error('Failed to load accessibility preferences:', error);
      }
    }
  }, []);

  // Save preferences
  const savePreferences = () => {
    const prefs = {
      fontSize,
      highContrast,
      reducedMotion,
      screenReaderMode
    };
    localStorage.setItem('accessibility-preferences', JSON.stringify(prefs));
  };

  useEffect(() => {
    savePreferences();
  }, [fontSize, highContrast, reducedMotion, screenReaderMode]);

  const resetSettings = () => {
    setFontSize(100);
    setHighContrast(false);
    setReducedMotion(false);
    setScreenReaderMode(false);
  };

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      {/* Accessibility Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        aria-label="Open accessibility menu"
        aria-expanded={isOpen}
        data-testid="accessibility-toggle"
      >
        <Eye size={24} />
      </Button>

      {/* Accessibility Panel */}
      {isOpen && (
        <div 
          className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80"
          role="dialog"
          aria-label="Accessibility settings"
          data-testid="accessibility-panel"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Accessibility Settings
          </h3>

          {/* Font Size Control */}
          <div className="mb-4">
            <label 
              htmlFor="font-size-slider"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
            >
              Font Size: {fontSize}%
            </label>
            <div className="flex items-center space-x-2">
              <Type size={16} />
              <input
                id="font-size-slider"
                type="range"
                min="80"
                max="150"
                step="10"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                aria-label={`Font size: ${fontSize} percent`}
                data-testid="font-size-slider"
              />
              <Type size={20} />
            </div>
          </div>

          {/* High Contrast Toggle */}
          <div className="mb-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                data-testid="high-contrast-toggle"
              />
              <Contrast size={18} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                High Contrast Mode
              </span>
            </label>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="mb-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                data-testid="reduced-motion-toggle"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reduce Motion
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">
              Minimizes animations and transitions
            </p>
          </div>

          {/* Screen Reader Mode */}
          <div className="mb-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={screenReaderMode}
                onChange={(e) => setScreenReaderMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                data-testid="screen-reader-toggle"
              />
              <Volume2 size={18} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Screen Reader Optimized
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">
              Enhanced descriptions and navigation
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={resetSettings}
              variant="outline"
              size="sm"
              className="flex-1"
              data-testid="reset-accessibility"
            >
              Reset
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              size="sm"
              className="flex-1"
              data-testid="close-accessibility"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Skip links for keyboard navigation
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="fixed top-0 left-0 z-50 bg-blue-600 text-white px-4 py-2 rounded-br-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="skip-to-main"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="fixed top-0 left-32 z-50 bg-blue-600 text-white px-4 py-2 rounded-br-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="skip-to-nav"
      >
        Skip to navigation
      </a>
    </div>
  );
}

// Focus trap for modals and dialogs
export function FocusTrap({ 
  children, 
  isActive, 
  restoreFocus = true 
}: { 
  children: React.ReactNode; 
  isActive: boolean; 
  restoreFocus?: boolean;
}) {
  const trapRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const trapElement = trapRef.current;
    if (!trapElement) return;

    // Get all focusable elements
    const focusableElements = trapElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus the first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, restoreFocus]);

  if (!isActive) return <>{children}</>;

  return (
    <div ref={trapRef} data-testid="focus-trap">
      {children}
    </div>
  );
}

// Live region for screen reader announcements
export function LiveRegion({ 
  children, 
  politeness = 'polite' 
}: { 
  children: React.ReactNode; 
  politeness?: 'polite' | 'assertive';
}) {
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
      data-testid="live-region"
    >
      {children}
    </div>
  );
}

// Enhanced media player with accessibility controls
export function AccessibleMediaPlayer({
  src,
  type,
  poster,
  autoplay = false,
  controls = true,
  className
}: {
  src: string;
  type: 'video' | 'audio';
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
}) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlayPause = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const media = mediaRef.current;
    if (media) {
      setCurrentTime(media.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const media = mediaRef.current;
    if (media) {
      setDuration(media.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const MediaElement = type === 'video' ? 'video' : 'audio';

  return (
    <div className={cn("relative", className)} data-testid="accessible-media-player">
      <MediaElement
        ref={mediaRef as any}
        src={src}
        poster={type === 'video' ? poster : undefined}
        autoPlay={autoplay}
        controls={controls}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full"
        aria-label={`${type} player`}
        data-testid={`${type}-element`}
      />

      {/* Custom accessible controls overlay */}
      {!controls && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2"
          role="toolbar"
          aria-label="Media controls"
        >
          <div className="flex items-center space-x-2">
            <Button
              onClick={togglePlayPause}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white hover:bg-opacity-20"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              data-testid="play-pause-button"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </Button>

            <div className="flex-1 mx-2">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={(e) => {
                  const media = mediaRef.current;
                  if (media) {
                    media.currentTime = Number(e.target.value);
                  }
                }}
                className="w-full h-1 bg-white bg-opacity-30 rounded-lg appearance-none cursor-pointer"
                aria-label={`Seek to position. Current time: ${formatTime(currentTime)} of ${formatTime(duration)}`}
                data-testid="seek-slider"
              />
            </div>

            <span 
              className="text-sm whitespace-nowrap"
              aria-live="polite"
              data-testid="time-display"
            >
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <Button
              onClick={() => {
                const media = mediaRef.current;
                if (media) {
                  media.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white hover:bg-opacity-20"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              data-testid="mute-button"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}