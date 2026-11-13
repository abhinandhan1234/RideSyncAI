import React from 'react';
import { cn } from '../../utils/cn';

/**
 * GlassInput: Frosted glass form input with floating label support,
 * leading icon slot, and sea-glass focus illumination.
 */
export const GlassInput = React.forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  rightElement,
  className = '',
  wrapperClassName = '',
  type = 'text',
  id,
  disabled = false,
  ...props
}, ref) => {
  const automaticId = React.useId();
  const generatedId = id || automaticId;

  return (
    <div className={cn('w-full flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={generatedId}
          className="text-xs font-medium text-text-secondary tracking-wide select-none flex items-center justify-between"
        >
          <span>{label}</span>
          {helperText && <span className="text-[11px] text-text-muted">{helperText}</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-text-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-text-secondary" />
          </div>
        )}

        <input
          ref={ref}
          id={generatedId}
          type={type}
          disabled={disabled}
          className={cn(
            'w-full h-11 px-3.5 text-sm rounded-xl text-text-primary placeholder:text-text-muted/60',
            'liquid-glass-input',
            Icon ? 'pl-10' : '',
            rightElement ? 'pr-11' : '',
            error ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' : '',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            className
          )}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-400 mt-0.5 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

GlassInput.displayName = 'GlassInput';

export default GlassInput;

