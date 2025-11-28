'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, hint, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-text">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            // Base styles
            'flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            // Light theme
            'bg-surface border-border text-text placeholder:text-text-secondary',
            // Focus styles
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary',
            // Hover styles
            'hover:border-border/80',
            // Disabled styles
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Error styles
            error && 'border-primary focus-visible:ring-primary',
            // Custom styles
            'neon-border-subtle',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-primary">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-sm text-text-secondary">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';