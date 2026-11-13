import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Sparkles, Box, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * TopHeader: Floating Liquid Glass app header displaying city context (Belagavi),
 * live telemetry status, and quick-access 3D Vehicle & Design System triggers.
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

        {/* Live Status Badge & Quick Role/Pill Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Dashboard */}
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none',
              location.pathname === '/admin'
                ? 'bg-accent/20 border border-accent/40 text-accent shadow-accent-pill'
                : 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-text-secondary hover:text-text-primary'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Admin</span>
            <span className="sm:hidden">Ops</span>
          </button>

          {/* 3D Taxi Direct Switch */}
          <button
            type="button"
            onClick={() => navigate('/3d')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none',
              location.pathname === '/3d'
                ? 'bg-accent/20 border border-accent/40 text-accent shadow-accent-pill'
                : 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-text-secondary hover:text-text-primary'
            )}
          >
            <Box className="w-3.5 h-3.5 text-accent" />
            <span className="hidden xs:inline">3D Honda Taxi</span>
            <span className="xs:hidden">3D</span>
          </button>

          {/* Design System Preview */}
          <button
            type="button"
            onClick={() => navigate('/design-preview')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none',
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
