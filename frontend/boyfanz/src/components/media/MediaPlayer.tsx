'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Play, Pause, Volume2, VolumeX, Maximize, Heart, Share2, Flag, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  title: string;
  thumbnail: string;
  url: string;
  duration?: string;
  isSubscriptionOnly: boolean;
  creatorId: string;
  creatorName: string;
  likes: number;
  isLiked: boolean;
  description?: string;
  tags?: string[];
}

interface MediaPlayerProps {
  media: MediaItem;
  isSubscribed?: boolean;
  onLike?: (mediaId: string) => void;
  onShare?: (mediaId: string) => void;
  onReport?: (mediaId: string) => void;
  onSubscribe?: (creatorId: string) => void;
}

export function MediaPlayer({
  media,
  isSubscribed = false,
  onLike,
  onShare,
  onReport,
  onSubscribe
}: MediaPlayerProps) {
  const { isAuthenticated } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const canViewContent = !media.isSubscriptionOnly || isSubscribed;

  const handleLike = () => {
    if (!isAuthenticated) {
      // Could trigger login modal here
      return;
    }
    onLike?.(media.id);
  };

  const handleShare = () => {
    onShare?.(media.id);
  };

  const handleReport = () => {
    if (!isAuthenticated) {
      return;
    }
    onReport?.(media.id);
  };

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      // Could trigger login modal here
      return;
    }
    onSubscribe?.(media.creatorId);
  };

  // Subscription Gate
  if (!canViewContent) {
    return (
      <div className="relative">
        {/* Blurred Background */}
        <div className="relative aspect-video bg-surface rounded-lg overflow-hidden">
          {media.type === 'image' ? (
            <Image
              src={media.thumbnail}
              alt={media.title}
              fill
              className="object-cover filter blur-lg scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Play className="w-16 h-16 text-text-secondary opacity-50" />
            </div>
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              
              <h3 className="text-xl font-heading text-text mb-2">
                Subscription Required
              </h3>
              
              <p className="text-text-secondary mb-6">
                Subscribe to @{media.creatorName} to unlock this exclusive content and support their work.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={handleSubscribe}
                  className="w-full neon-glow"
                  disabled={!isAuthenticated}
                >
                  Subscribe to Unlock
                </Button>
                
                {!isAuthenticated && (
                  <p className="text-text-secondary text-sm">
                    Sign in to subscribe
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Info */}
        <div className="mt-4">
          <h2 className="text-lg font-heading text-text mb-2">{media.title}</h2>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">@{media.creatorName}</span>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className="flex items-center space-x-1 text-text-secondary hover:text-primary transition-colors"
              >
                <Heart className={`w-4 h-4 ${media.isLiked ? 'fill-primary text-primary' : ''}`} />
                <span>{media.likes}</span>
              </button>
              
              <button
                onClick={handleShare}
                className="text-text-secondary hover:text-text transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleReport}
                className="text-text-secondary hover:text-primary transition-colors"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Media Content */}
      <div className="relative aspect-video bg-background rounded-lg overflow-hidden neon-border">
        {media.type === 'image' ? (
          <Image
            src={media.url}
            alt={media.title}
            fill
            className="object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            src={media.url}
            className="w-full h-full object-cover bg-black"
            muted={isMuted}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        )}
        
        {/* Video Controls Overlay */}
        {media.type === 'video' && (
          <div 
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Play/Pause Button */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pause();
                  } else {
                    videoRef.current.play();
                  }
                }
              }}
              className="w-16 h-16 bg-primary/80 rounded-full flex items-center justify-center neon-glow hover:bg-primary transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-accent" />
              ) : (
                <Play className="w-8 h-8 text-accent ml-1" />
              )}
            </button>
            
            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                    }
                  }}
                  className="text-text hover:text-primary transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                
                {media.duration && (
                  <span className="text-text text-sm">{media.duration}</span>
                )}
              </div>
              
              <button className="text-text hover:text-primary transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-xl font-heading text-text mb-1">{media.title}</h2>
            <p className="text-text-secondary">by @{media.creatorName}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                media.isLiked
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-text-secondary hover:text-text'
              }`}
            >
              <Heart className={`w-4 h-4 ${media.isLiked ? 'fill-current' : ''}`} />
              <span>{media.likes}</span>
            </button>
            
            <button
              onClick={handleShare}
              className="p-2 border border-border rounded-lg text-text-secondary hover:border-primary/50 hover:text-text transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleReport}
              className="p-2 border border-border rounded-lg text-text-secondary hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        {media.description && (
          <p className="text-text-secondary mb-3 leading-relaxed">
            {media.description}
          </p>
        )}

        {/* Tags */}
        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {media.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-surface border border-border rounded text-xs text-text-secondary hover:border-primary/50 cursor-pointer transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}