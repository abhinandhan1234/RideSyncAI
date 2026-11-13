import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * GlassCard: Structured container with header, badge, content, and footer slots.
 */
export const GlassCard = React.forwardRef(({
  title,
  subtitle,
  badge,
  icon: Icon,
  children,
  footer,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  interactive = false,
  onClick,
  animate = false,
  ...props
}, ref) => {
  const CardWrapper = animate ? motion.div : 'div';
  const motionProps = animate ? {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  } : {};

  return (
    <CardWrapper
      ref={ref}
      {...motionProps}
      className={cn(
        'relative rounded-2xl border border-white/[0.12] bg-white/[0.07] backdrop-blur-glass shadow-glass-md text-text-primary overflow-hidden flex flex-col',
        interactive ? 'cursor-pointer hover:bg-white/[0.10] hover:border-white/[0.22] hover:shadow-glass-lg transition-all duration-200 active:scale-[0.99]' : '',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {/* Top subtle rim light */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {(title || subtitle || Icon || badge) && (
        <div className={cn('p-4 sm:p-5 pb-3 border-b border-white/[0.08] flex items-start justify-between gap-3', headerClassName)}>
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-semibold text-text-primary truncate tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-text-secondary truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {badge && (
            <div className="shrink-0">
              {badge}
            </div>
          )}
        </div>
      )}

      <div className={cn('p-4 sm:p-5 flex-1', bodyClassName)}>
        {children}
      </div>

      {footer && (
        <div className={cn('px-4 sm:px-5 py-3 border-t border-white/[0.08] bg-black/20 text-xs text-text-secondary flex items-center justify-between', footerClassName)}>
          {footer}
        </div>
      )}
    </CardWrapper>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;

