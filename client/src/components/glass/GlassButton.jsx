import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * GlassButton: Premium tactile translucent or taxi-yellow button.
 * Enforces >= 44px touch target on mobile devices.
 */
export const GlassButton = React.forwardRef(({
  children,
  className = '',
  variant = 'glass', // 'primary' | 'glass' | 'subtle' | 'outline' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'h-10 min-h-[44px] px-3.5 text-xs font-medium rounded-xl gap-2',
    md: 'h-11 min-h-[44px] sm:min-h-0 sm:h-11 px-5 text-sm font-semibold rounded-xl gap-2.5',
    lg: 'h-13 min-h-[48px] px-6 text-base font-semibold rounded-2xl gap-3',
  };

  const variantStyles = {
    // Taxi Yellow accent button
    primary: 'bg-accent text-slate-950 font-bold hover:bg-accent-hover shadow-accent-glow border border-amber-300/40 active:brightness-95',
    // Translucent Liquid Glass button
    glass: 'bg-white/[0.09] hover:bg-white/[0.14] text-text-primary border border-white/[0.16] hover:border-white/[0.26] shadow-glass-sm backdrop-blur-md active:bg-white/[0.06]',
    // Subtle glassy pill
    subtle: 'bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary border border-white/[0.06] backdrop-blur-sm',
    // Outlined frosted border
    outline: 'bg-transparent hover:bg-white/[0.06] text-text-primary border border-white/[0.2] hover:border-accent/60',
    // Danger
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 backdrop-blur-md',
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      whileHover={disabled || loading ? {} : { scale: 1.015 }}
      whileTap={disabled || loading ? {} : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'relative inline-flex items-center justify-center select-none transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        sizeStyles[size] || sizeStyles.md,
        variantStyles[variant] || variantStyles.glass,
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {/* Subtle top sheen */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60" />

      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0 transition-transform" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0 transition-transform" />}
        </>
      )}
    </motion.button>
  );
});

GlassButton.displayName = 'GlassButton';

export default GlassButton;

