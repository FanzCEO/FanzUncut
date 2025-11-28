import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Immersive underground club loading animations with atmospheric effects
export function UndergroundLoader({ 
  isVisible = true, 
  message = "Entering the Underground...", 
  variant = 'full_experience',
  soundEnabled = false 
}: {
  isVisible?: boolean;
  message?: string;
  variant?: 'full_experience' | 'quick_load' | 'neon_pulse' | 'vinyl_spin' | 'smoke_fade';
  soundEnabled?: boolean;
}) {
  const [loadingPhase, setLoadingPhase] = useState<'entering' | 'atmosphere' | 'reveal' | 'complete'>('entering');
  const [progress, setProgress] = useState(0);
  const [atmosphereIntensity, setAtmosphereIntensity] = useState(0.3);
  const [smokeParticles, setSmokeParticles] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number; speed: number }>>([]);

  // Initialize atmospheric particles
  useEffect(() => {
    if (!isVisible) return;

    // Create smoke particles
    const particles = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 20,
      opacity: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 2 + 0.5
    }));
    setSmokeParticles(particles);

    // Loading progression
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 8 + 2, 100);
        
        // Update loading phases
        if (newProgress > 25 && loadingPhase === 'entering') {
          setLoadingPhase('atmosphere');
          setAtmosphereIntensity(0.6);
        } else if (newProgress > 75 && loadingPhase === 'atmosphere') {
          setLoadingPhase('reveal');
          setAtmosphereIntensity(0.9);
        } else if (newProgress >= 100 && loadingPhase === 'reveal') {
          setLoadingPhase('complete');
          // Don't reset - let parent component handle completion
          clearInterval(progressInterval);
        }
        
        return newProgress;
      });
    }, 200);

    // Animate smoke particles
    const animationInterval = setInterval(() => {
      setSmokeParticles(prev => prev.map(particle => {
        const newY = particle.y > -10 ? particle.y - particle.speed : 110;
        return {
          ...particle,
          y: newY,
          opacity: particle.y > -10 ? particle.opacity * 0.99 : Math.random() * 0.6 + 0.1,
        };
      }));
    }, 100);

    return () => {
      clearInterval(progressInterval);
      clearInterval(animationInterval);
    };
  }, [isVisible, loadingPhase]);

  if (!isVisible) return null;

  const getVariantContent = () => {
    switch (variant) {
      case 'quick_load':
        return <QuickLoadContent progress={progress} />;
      case 'neon_pulse':
        return <NeonPulseContent />;
      case 'vinyl_spin':
        return <VinylSpinContent />;
      case 'smoke_fade':
        return <SmokeFadeContent />;
      default:
        return <FullExperienceContent 
          loadingPhase={loadingPhase} 
          progress={progress}
          smokeParticles={smokeParticles}
          atmosphereIntensity={atmosphereIntensity}
        />;
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500",
      "bg-gradient-to-br from-black via-gray-900 to-red-950"
    )}>
      {/* Atmospheric background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Underground club lighting */}
        <div className="absolute inset-0 bg-gradient-radial from-red-900/20 via-transparent to-transparent animate-pulse" />
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl animate-ping" />
        <div className="absolute bottom-20 right-16 w-24 h-24 bg-cyan-500/15 rounded-full blur-2xl animate-bounce" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-purple-600/8 rounded-full blur-3xl animate-pulse" />

        {/* Film grain overlay */}
        <div 
          className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
            animation: 'grain 0.5s infinite'
          }}
        />

        {/* Scanlines for retro CRT effect */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: 'linear-gradient(transparent 50%, rgba(0,255,255,0.05) 50%)',
            backgroundSize: '100% 4px',
            animation: 'scanlines 0.1s linear infinite'
          }}
        />

        {/* Smoke particles */}
        {smokeParticles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gradient-radial from-white/20 to-transparent blur-sm"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              transform: `translate(-50%, -50%)`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`
            }}
          />
        ))}
      </div>

      {/* Main loading content */}
      <div className="relative z-10">
        {getVariantContent()}
        
        {/* Underground club loading message */}
        <div className="text-center mt-8 space-y-4">
          <div className="text-red-400 text-xl font-bold uppercase tracking-widest animate-pulse">
            {message}
          </div>
          <div className="text-gray-400 text-sm tracking-wide">
            {progress < 30 && "🚪 Checking the door..."}
            {progress >= 30 && progress < 60 && "🎵 Feeling the bass drop..."}
            {progress >= 60 && progress < 90 && "🍸 Bartender preparing your experience..."}
            {progress >= 90 && "✨ Welcome to BoyFanz Underground"}
          </div>
        </div>
      </div>

      {/* Audio visualization (visual only - no actual audio) */}
      {soundEnabled && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-red-600 to-cyan-400 rounded-full"
              style={{
                height: `${Math.random() * 40 + 10}px`,
                animation: `audioBar ${0.5 + Math.random() * 1}s ease-in-out infinite alternate`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Full immersive experience loader
function FullExperienceContent({ 
  loadingPhase, 
  progress, 
  smokeParticles, 
  atmosphereIntensity 
}: any) {
  return (
    <div className="text-center space-y-8">
      {/* Neon BoyFanz logo */}
      <div className="relative">
        <h1 
          className="text-6xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-cyan-500"
          style={{
            textShadow: '0 0 20px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.5), 0 0 60px rgba(239,68,68,0.3)',
            filter: `brightness(${0.8 + atmosphereIntensity * 0.4})`
          }}
        >
          BOYFANZ
        </h1>
        <div className="absolute inset-0 text-6xl font-black uppercase tracking-wider text-red-500 opacity-50 blur-sm animate-pulse">
          BOYFANZ
        </div>
      </div>

      {/* Underground club entrance */}
      <div className="relative w-80 h-48 mx-auto">
        {/* Door frame */}
        <div className="absolute inset-0 border-4 border-red-900 bg-black/80 rounded-lg overflow-hidden">
          {/* Door opening effect */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-black via-red-950 to-black transition-all duration-1000"
            style={{
              clipPath: loadingPhase === 'complete' ? 'inset(0 0 0 100%)' : `inset(0 ${100 - progress}% 0 0)`
            }}
          />
          
          {/* Glowing interior */}
          <div 
            className="absolute inset-0 bg-gradient-to-t from-red-800/50 to-purple-800/30 transition-opacity duration-1000"
            style={{ opacity: progress / 100 }}
          />
          
          {/* Mysterious figures/silhouettes */}
          <div className="absolute bottom-4 left-1/4 w-8 h-16 bg-black/60 rounded-t-full animate-pulse" />
          <div className="absolute bottom-4 right-1/3 w-6 h-12 bg-black/40 rounded-t-full animate-bounce" />
        </div>

        {/* Neon door sign */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black border-2 border-red-500 rounded">
          <div className="text-red-400 text-sm font-bold uppercase tracking-widest animate-flicker">
            UNDERGROUND
          </div>
        </div>
      </div>

      {/* Progress bar with underground theme */}
      <div className="w-80 mx-auto space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Loading Experience</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-red-900">
          <div 
            className="h-full bg-gradient-to-r from-red-600 via-pink-500 to-cyan-400 rounded-full transition-all duration-300 relative"
            style={{ width: `${progress}%` }}
          >
            {/* Glowing effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/50 via-pink-400/50 to-cyan-400/50 rounded-full blur-sm animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick load variant
function QuickLoadContent({ progress }: { progress: number }) {
  return (
    <div className="text-center space-y-6">
      <div className="text-4xl font-bold text-red-400 uppercase tracking-widest animate-pulse">
        BoyFanz
      </div>
      <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden mx-auto">
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-cyan-500 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );
}

// Neon pulse variant
function NeonPulseContent() {
  return (
    <div className="text-center">
      <div className="relative">
        <div className="w-32 h-32 mx-auto border-4 border-red-500 rounded-full animate-ping opacity-75" />
        <div className="absolute inset-0 w-32 h-32 mx-auto border-2 border-cyan-500 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }} />
        <div className="absolute inset-0 w-32 h-32 mx-auto flex items-center justify-center">
          <div className="text-2xl font-bold text-white uppercase">BF</div>
        </div>
      </div>
    </div>
  );
}

// Vinyl spin variant
function VinylSpinContent() {
  return (
    <div className="text-center space-y-4">
      <div className="relative w-32 h-32 mx-auto">
        {/* Vinyl record */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black rounded-full animate-spin-slow border-4 border-gray-600">
          <div className="absolute inset-4 bg-red-900 rounded-full">
            <div className="absolute inset-6 bg-black rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
            </div>
          </div>
          {/* Vinyl grooves */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute border border-gray-700 rounded-full opacity-30"
              style={{ inset: `${8 + i * 4}px` }}
            />
          ))}
        </div>
      </div>
      <div className="text-red-400 font-bold uppercase tracking-wider">Now Playing</div>
    </div>
  );
}

// Smoke fade variant
function SmokeFadeContent() {
  return (
    <div className="text-center space-y-8">
      <div className="relative">
        <div className="text-5xl font-bold text-red-400 opacity-90 animate-pulse">
          BoyFanz
        </div>
        <div className="absolute inset-0 text-5xl font-bold text-red-400 blur-md opacity-50 animate-pulse">
          BoyFanz
        </div>
      </div>
      <div className="text-gray-400 text-lg uppercase tracking-widest">
        Entering the Experience
      </div>
    </div>
  );
}