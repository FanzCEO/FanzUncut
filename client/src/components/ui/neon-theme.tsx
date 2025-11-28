import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Dynamic retro neon sign component with flickering effects
export function NeonSign({ 
  text, 
  color = 'red', 
  size = 'md', 
  flickering = true, 
  underground = false,
  className 
}: {
  text: string;
  color?: 'red' | 'blue' | 'pink' | 'purple' | 'gold' | 'cyan';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  flickering?: boolean;
  underground?: boolean;
  className?: string;
}) {
  const [isFlickering, setIsFlickering] = useState(false);
  const [opacity, setOpacity] = useState(1);

  // Dynamic flickering animation
  useEffect(() => {
    if (!flickering) return;

    const flickerInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance to flicker
        setIsFlickering(true);
        const flickerPattern = [0.2, 1, 0.1, 1, 0.3, 1, 0.8, 1];
        let step = 0;
        
        const flickerStep = setInterval(() => {
          if (step >= flickerPattern.length) {
            clearInterval(flickerStep);
            setIsFlickering(false);
            setOpacity(1);
            return;
          }
          setOpacity(flickerPattern[step]);
          step++;
        }, 80);
      }
    }, Math.random() * 5000 + 2000); // Random interval 2-7 seconds

    return () => clearInterval(flickerInterval);
  }, [flickering]);

  const colorClasses = {
    red: 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] shadow-red-500/50',
    blue: 'text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] shadow-blue-500/50',
    pink: 'text-pink-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] shadow-pink-500/50',
    purple: 'text-purple-400 drop-shadow-[0_0_15px_rgba(147,51,234,0.8)] shadow-purple-500/50',
    gold: 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] shadow-yellow-500/50',
    cyan: 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] shadow-cyan-500/50'
  };

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  return (
    <div
      className={cn(
        'relative font-black uppercase tracking-wider transition-all duration-100',
        colorClasses[color],
        sizeClasses[size],
        underground && 'transform -rotate-1 before:absolute before:inset-0 before:bg-gradient-to-r before:from-black/20 before:to-transparent before:-z-10',
        isFlickering && 'animate-pulse',
        className
      )}
      style={{ 
        opacity,
        textShadow: `0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor`,
        filter: underground ? 'sepia(20%) saturate(120%) contrast(110%)' : undefined
      }}
    >
      {text}
      
      {/* Aged neon tube effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-sm pointer-events-none" />
      
      {/* Electrical interference effect */}
      {isFlickering && (
        <div className="absolute -inset-2 opacity-30">
          <div className="w-full h-0.5 bg-current animate-pulse" />
          <div className="w-full h-0.5 bg-current animate-pulse mt-1" style={{ animationDelay: '0.2s' }} />
        </div>
      )}
    </div>
  );
}

// Underground club loading animation
export function UndergroundLoader({ 
  isLoading = false, 
  text = "Loading...", 
  variant = 'club' 
}: {
  isLoading?: boolean;
  text?: string;
  variant?: 'club' | 'neon' | 'smoke';
}) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="relative">
        {/* Atmospheric background */}
        <div className="absolute inset-0 -z-10">
          {/* Smoke effect */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-32 h-32 bg-gradient-radial from-white/10 to-transparent rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
          
          {/* Vintage film grain */}
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JhaW4iIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiLz48Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0iIzMzMyIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9InVybCgjZ3JhaW4pIi8+PC9zdmc+')] animate-pulse" />
        </div>

        {/* Main loading content */}
        <div className="text-center space-y-8">
          {/* Neon logo/branding */}
          <NeonSign 
            text="BOYFANZ" 
            size="xl" 
            color="red" 
            underground={true}
            className="mb-8"
          />
          
          {/* Loading animation */}
          {variant === 'club' && (
            <div className="relative">
              {/* Vinyl record animation */}
              <div className="w-32 h-32 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black rounded-full animate-spin-slow border-4 border-gray-600">
                  <div className="absolute inset-4 bg-red-900 rounded-full">
                    <div className="absolute inset-6 bg-black rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    </div>
                  </div>
                  {/* Vinyl grooves */}
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute border border-gray-700 rounded-full opacity-30"
                      style={{
                        inset: `${8 + i * 4}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Club lights */}
              <div className="flex justify-center space-x-4 mb-4">
                {['red', 'blue', 'pink', 'gold'].map((color, i) => (
                  <div
                    key={color}
                    className={cn(
                      'w-3 h-3 rounded-full animate-pulse',
                      color === 'red' && 'bg-red-500 shadow-red-500/50',
                      color === 'blue' && 'bg-blue-500 shadow-blue-500/50',
                      color === 'pink' && 'bg-pink-500 shadow-pink-500/50',
                      color === 'gold' && 'bg-yellow-500 shadow-yellow-500/50'
                    )}
                    style={{
                      animationDelay: `${i * 0.3}s`,
                      boxShadow: `0 0 15px currentColor`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Loading text */}
          <NeonSign 
            text={`${text}${dots}`}
            size="md"
            color="cyan"
            flickering={false}
          />
          
          {/* Progress bar */}
          <div className="w-64 h-1 mx-auto bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-500 via-pink-500 to-cyan-500 animate-pulse rounded-full" 
                 style={{
                   background: 'linear-gradient(90deg, #ef4444, #ec4899, #06b6d4)',
                   animation: 'loading-bar 2s ease-in-out infinite'
                 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Gritty vintage card component
export function VintageCard({ 
  children, 
  variant = 'default', 
  noir = false,
  className 
}: {
  children: React.ReactNode;
  variant?: 'default' | 'polaroid' | 'matchbook' | 'poster';
  noir?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        // Base styling
        variant === 'default' && 'bg-gray-900 border border-gray-700 rounded-lg shadow-2xl hover:shadow-red-500/20',
        variant === 'polaroid' && 'bg-yellow-50 p-4 shadow-2xl transform rotate-1 hover:rotate-0 border-4 border-white',
        variant === 'matchbook' && 'bg-gradient-to-b from-red-900 to-red-800 rounded-sm border-l-4 border-gold-400',
        variant === 'poster' && 'bg-gray-100 border-8 border-gray-200 shadow-2xl transform -rotate-2 hover:rotate-0',
        // Noir effects
        noir && 'sepia filter contrast-125 brightness-90',
        className
      )}
    >
      {/* Vintage paper texture overlay */}
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0idGV4dHVyZSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQiIGhlaWdodD0iNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjAuNSIgZmlsbD0iIzMzMyIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjdGV4dHVyZSkiLz48L3N2Zz4=')] pointer-events-none" />
      
      {/* Aged corners effect */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top corners */}
        <div className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-br from-black/30 to-transparent" />
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-black/30 to-transparent" />
        {/* Bottom corners */}
        <div className="absolute bottom-0 left-0 w-8 h-8 bg-gradient-to-tr from-black/30 to-transparent" />
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-black/30 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Underground club background
export function ClubBackground({ 
  children, 
  intensity = 'medium' 
}: {
  children: React.ReactNode;
  intensity?: 'low' | 'medium' | 'high';
}) {
  const [lightPhase, setLightPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLightPhase(prev => (prev + 1) % 360);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
      {/* Dynamic lighting effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Rotating club lights */}
        {intensity !== 'low' && (
          <>
            <div 
              className="absolute w-96 h-96 opacity-20 rounded-full blur-3xl bg-gradient-radial from-red-500 to-transparent"
              style={{
                transform: `rotate(${lightPhase}deg) translateX(200px) rotate(${-lightPhase}deg)`,
                left: '10%',
                top: '20%'
              }}
            />
            <div 
              className="absolute w-96 h-96 opacity-20 rounded-full blur-3xl bg-gradient-radial from-blue-500 to-transparent"
              style={{
                transform: `rotate(${lightPhase * 1.3}deg) translateX(250px) rotate(${-lightPhase * 1.3}deg)`,
                right: '10%',
                top: '30%'
              }}
            />
            <div 
              className="absolute w-96 h-96 opacity-15 rounded-full blur-3xl bg-gradient-radial from-pink-500 to-transparent"
              style={{
                transform: `rotate(${lightPhase * 0.7}deg) translateX(180px) rotate(${-lightPhase * 0.7}deg)`,
                left: '50%',
                bottom: '20%'
              }}
            />
          </>
        )}
        
        {/* Smoke/haze effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
        
        {/* Vintage film overlay */}
        {intensity === 'high' && (
          <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZmlsbSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjIiIGhlaWdodD0iMiI+PHJlY3Qgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzMzMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ1cmwoI2ZpbG0pIi8+PC9zdmc+')] animate-pulse" />
        )}
        
        {/* Scanlines for retro effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.1)_51%,transparent_52%)] bg-[length:100%_4px] animate-pulse" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Neon button component
export function NeonButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  pulsing = false,
  onClick,
  className 
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  pulsing?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const variantStyles = {
    primary: 'border-red-500 text-red-400 hover:bg-red-500/20 shadow-red-500/50',
    secondary: 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 shadow-cyan-500/50',
    danger: 'border-pink-500 text-pink-400 hover:bg-pink-500/20 shadow-pink-500/50',
    success: 'border-green-500 text-green-400 hover:bg-green-500/20 shadow-green-500/50',
    gold: 'border-yellow-500 text-yellow-400 hover:bg-yellow-500/20 shadow-yellow-500/50'
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative bg-black/50 border-2 backdrop-blur-sm font-semibold uppercase tracking-wider transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        pulsing && 'animate-pulse',
        disabled && 'hover:scale-100',
        className
      )}
      style={{
        boxShadow: `0 0 15px currentColor, inset 0 0 15px rgba(0,0,0,0.5)`,
        textShadow: '0 0 10px currentColor'
      }}
    >
      {/* Glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </button>
  );
}