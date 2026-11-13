import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * TopHeader: Floating Liquid Glass app header displaying city context (Belagavi),
 * live telemetry status, and role quick-indicators.
 */
export const TopHeader = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 w-full px-4 sm:px-6 pt-3 pb-2',
        'backdrop-blur-glass bg-bg-primary/70 border-b border-white/[0.08]',
        'transition-all duration-300',
        className
      )}
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & City Context */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          {/* Logo Icon */}
          <div className="w-8 h-8 rounded-xl bg-accent text-slate-950 font-black flex items-center justify-center shadow-accent-glow text-sm tracking-tighter">
            RS
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-text-primary flex items-center gap-1.5">
              RideSync <span className="text-accent">AI</span>
            </span>
            <div className="flex items-center gap-1 text-[11px] text-text-secondary">
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              <span>Belagavi Hub</span>
            </div>
          </div>
        </div>

        {/* Live Status Badge & Quick Role Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Belagavi Live Network Indicator */}
          <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>OSM Active</span>
          </div>

          {/* Quick Nav to Preview */}
          <button
            type="button"
            onClick={() => navigate('/design-preview')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              location.pathname === '/design-preview'
                ? 'bg-accent/20 border border-accent/40 text-accent shadow-accent-pill'
                : 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-text-secondary hover:text-text-primary'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Design System</span>
            <span className="sm:hidden">Tokens</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;

