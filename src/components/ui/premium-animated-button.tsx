'use client';

import { useState, type ButtonHTMLAttributes } from 'react';
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface PremiumAnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onPress?: () => Promise<void> | void;
  successDuration?: number;
}

export function PremiumAnimatedButton({
  children,
  className,
  onPress,
  onClick,
  disabled,
  successDuration = 1500,
  ...props
}: PremiumAnimatedButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || state !== 'idle') return;
    
    // Call standard onClick if passed
    if (onClick) {
      onClick(e);
    }
    
    // If onPress is passed and returns a promise, handle the loading and success states
    if (onPress) {
      try {
        const result = onPress();
        if (result instanceof Promise) {
          setState('loading');
          await result;
          setState('success');
          
          // Reset after duration
          setTimeout(() => {
            setState('idle');
          }, successDuration);
        }
      } catch (error) {
        console.error('Action failed:', error);
        setState('idle');
      }
    }
  };

  return (
    <button
      {...props}
      disabled={disabled || state !== 'idle'}
      onClick={handleClick}
      className={cn(
        'btn-premium',
        state === 'loading' && 'btn-premium-loading',
        state === 'success' && 'btn-premium-success',
        className
      )}
    >
      <div className={cn("flex items-center justify-center gap-2", state !== 'idle' && "opacity-0")}>
        {children}
      </div>
    </button>
  );
}
