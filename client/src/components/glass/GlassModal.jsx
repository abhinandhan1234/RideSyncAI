import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import GlassIconButton from './GlassIconButton';

/**
 * GlassModal: Centered dialog with frosted backdrop overlay,
 * entrance spring animation, and keyboard accessibility.
 */
export const GlassModal = ({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  closeOnBackdropClick = true,
}) => {
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={closeOnBackdropClick ? onClose : undefined}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={cn(
              'relative w-full rounded-2xl liquid-glass-modal p-6 text-text-primary z-10 shadow-2xl',
              sizeClasses[size] || sizeClasses.md,
              className
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs text-text-secondary mt-1">
                    {description}
                  </p>
                )}
              </div>
              {onClose && (
                <GlassIconButton
                  icon={X}
                  size="sm"
                  aria-label="Close modal"
                  onClick={onClose}
                  className="-mt-1 -mr-1"
                />
              )}
            </div>

            {/* Body */}
            <div className="py-2 text-sm text-text-primary">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="mt-6 pt-4 border-t border-white/[0.1] flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlassModal;

