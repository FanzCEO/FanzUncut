import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'neon' | 'surface';
  glow?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  glow = false,
  children,
  ...props
}) => {
  const baseStyles = 'rounded-lg transition-all duration-300';

  const variants = {
    default: 'bg-surface border border-border',
    neon: 'bg-surface/90 neon-border hover:shadow-red-glow',
    surface: 'bg-background border border-border'
  };

  const glowClass = glow ? 'hover:shadow-red-glow' : '';

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        glowClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('p-6 pb-0', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('p-6 pt-0 flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  );
};