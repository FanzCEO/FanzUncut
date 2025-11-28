import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  glow = false,
  pulse = false,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary text-accent hover:shadow-red-glow transform hover:scale-105',
    secondary: 'bg-secondary text-background hover:shadow-lg transform hover:scale-105',
    ghost: 'bg-transparent text-text hover:bg-surface hover:text-primary',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-accent'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const glowClass = glow ? 'hover:shadow-red-glow-lg' : '';
  const pulseClass = pulse ? 'pulse-red' : '';

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        glowClass,
        pulseClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};