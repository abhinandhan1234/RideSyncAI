import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import GlassIconButton from './GlassIconButton';

/**
 * GlassBottomSheet: Mobile-first sliding bottom sheet designed for
 * ride booking, driver details, fare breakdowns, and location picking.
 */
export const GlassBottomSheet = ({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  showDragHandle = true,
  closeOnBackdropClick = true,
  maxHeight = 'max-h-[85vh]',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnBackdropClick ? onClose : undefined}
          />

          {/* Bottom Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'relative z-10 w-full rounded-t-3xl border-t border-x border-white/[0.18]',
              'bg-slate-950/90 backdrop-blur-heavy shadow-2xl text-text-primary overflow-hidden flex flex-col',
              'pb-safe',
              maxHeight,
              className
            )}
          >
            {/* Top glare reflection */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Drag Handle Bar */}
            {showDragHandle && (
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
              </div>
            )}

            {/* Header */}
            {(title || onClose) && (
              <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  {title && <h3 className="text-base font-semibold text-text-primary">{title}</h3>}
                  {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
                </div>
                {onClose && (
                  <GlassIconButton
                    icon={X}
                    size="sm"
                    aria-label="Close sheet"
                    onClick={onClose}
                  />
                )}
              </div>
            )}

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto overflow-x-hidden flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlassBottomSheet;

