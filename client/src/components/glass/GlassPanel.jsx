import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * GlassPanel: The foundational Liquid Glass surface component.
 * Features translucent blur, layered depth, and soft inner edge reflection.
 */
export const GlassPanel = React.forwardRef(({
  children,
  className = '',
  variant = 'default', // 'default' | 'subtle' | 'modal' | 'accent'
  interactive = false,
  onClick,
  animate = false,
  ...props
}, ref) => {
  const variantStyles = {
    default: 'bg-white/[0.08] backdrop-blur-glass border-white/[0.14] shadow-glass-md',
    subtle: 'bg-white/[0.04] backdrop-blur-md border-white/[0.08] shadow-glass-sm',
    modal: 'bg-slate-900/85 backdrop-blur-heavy border-white/[0.18] shadow-glass-lg',
    accent: 'bg-amber-500/[0.08] backdrop-blur-glass border-amber-500/30 shadow-glass-md',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:bg-white/[0.12] hover:border-white/[0.22] hover:shadow-glass-lg transition-all duration-300'
    : '';

  const combinedClasses = cn(
    'relative rounded-2xl border text-text-primary overflow-hidden',
    variantStyles[variant] || variantStyles.default,
    interactiveStyles,
    className
  );

  if (animate) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={combinedClasses}
        onClick={onClick}
        {...props}
      >
        {/* Subtle top glare highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {children}
      </motion.div>
    );
  }

  return (
    <div
      ref={ref}
      className={combinedClasses}
      onClick={onClick}
      {...props}
    >
      {/* Subtle top glare highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
});

GlassPanel.displayName = 'GlassPanel';

export default GlassPanel;

