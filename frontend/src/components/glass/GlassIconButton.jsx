import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * GlassIconButton: Circular/rounded tactile glass button for toolbar actions,
 * map controls, and modal close buttons. Enforces >= 44px mobile touch target.
 */
export const GlassIconButton = React.forwardRef(({
  children,
  icon: Icon,
  className = '',
  variant = 'glass', // 'glass' | 'subtle' | 'accent' | 'danger'
  size = 'md', // 'sm' (36px, with 44px touch target) | 'md' (44px) | 'lg' (52px)
  rounded = 'full', // 'full' | 'xl' | '2xl'
  disabled = false,
  onClick,
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'w-10 h-10 min-w-[44px] min-h-[44px] p-2 text-sm',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px] p-2.5 text-base',
    lg: 'w-13 h-13 min-w-[52px] min-h-[52px] p-3 text-lg',
  };

  const roundedStyles = {
    full: 'rounded-full',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  };

  const variantStyles = {
    glass: 'bg-white/[0.08] hover:bg-white/[0.14] text-text-primary border border-white/[0.15] shadow-glass-sm backdrop-blur-md',
    subtle: 'bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary border border-white/[0.06] backdrop-blur-sm',
    accent: 'bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 shadow-accent-pill backdrop-blur-md',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 backdrop-blur-md',
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.94 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'relative inline-flex items-center justify-center select-none transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        sizeStyles[size] || sizeStyles.md,
        roundedStyles[rounded] || roundedStyles.full,
        variantStyles[variant] || variantStyles.glass,
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/15 to-transparent opacity-50" />
      {Icon ? <Icon className="w-5 h-5 shrink-0" /> : children}
    </motion.button>
  );
});

GlassIconButton.displayName = 'GlassIconButton';

export default GlassIconButton;

