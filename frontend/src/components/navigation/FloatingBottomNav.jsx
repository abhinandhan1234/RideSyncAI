import {useRide} from '../../context/RideContext';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Compass,
  Navigation2,
  History,
  User
} from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * FloatingBottomNav: The mandatory global floating Liquid Glass bottom navigation.
 * Standard Passenger Navigation Items (Strict 5 items per specification):
 * 1. Home
 * 2. Book Ride
 * 3. Track
 * 4. Activity
 * 5. Profile
 */
export const FloatingBottomNav = ({ className = '' }) => {
  const {auth}=useRide();
  const location = useLocation();
  const navigate = useNavigate();

  // Strict 5 Passenger Navigation Items per Master Specification
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      icon: Home,
    },
    {
      id: 'book',
      label: 'Book Ride',
      path: '/book',
      icon: Compass,
    },
    {
      id: 'track',
      label: 'Track',
      path: '/track',
      icon: Navigation2,
    },
    {
      id: 'activity',
      label: 'Activity',
      path: '/activity',
      icon: History,
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/profile',
      icon: User,
    },
  ];

  const currentPath = location.pathname;

  return (
    <nav
      aria-label="Primary Navigation"
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-40',
        'bottom-3 sm:bottom-6',
        'w-[calc(100%-1.5rem)] max-w-[390px] sm:max-w-[440px]',
        'transition-all duration-300',
        className
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Pill Container */}
      <div className="relative flex items-center justify-between p-1.5 rounded-full liquid-glass-nav shadow-glass-lg border border-white/[0.18]">
        {/* Top Rim Glare Reflection */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {(auth?.user.role==='driver'?[{id:'sarathi',label:'Dashboard',path:'/captain',icon:Compass},...navItems.filter(n=>['activity','profile'].includes(n.id))]:navItems).map((item) => {
          const isActive = currentPath === item.path ||
            (item.path !== '/' && currentPath.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex-1 py-2 sm:py-2.5 px-1 sm:px-2 rounded-full',
                'flex flex-col items-center justify-center gap-0.5 sm:gap-1',
                'min-h-[44px] touch-manipulation select-none outline-none',
                'transition-colors duration-200 group'
              )}
            >
              {/* Animated Active Background Glow & Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 rounded-full bg-accent/[0.14] border border-accent/40 shadow-accent-pill"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}

              {/* Icon with Taxi-Yellow Active Glow */}
              <div className="relative z-10 transition-transform duration-200 group-active:scale-90">
                <Icon
                  className={cn(
                    'w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200',
                    isActive
                      ? 'text-accent drop-shadow-[0_0_8px_rgba(168,197,191,0.6)] stroke-[2.2]'
                      : 'text-text-secondary/80 group-hover:text-text-primary stroke-[1.8]'
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  'relative z-10 text-[10px] sm:text-[11px] font-medium tracking-tight truncate max-w-full transition-colors duration-200',
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-text-secondary/70 group-hover:text-text-primary'
                )}
              >
                {item.label}
              </span>

              {/* Micro Active Dot */}
              {isActive && (
                <motion.span
                  layoutId="activeDot"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-accent shadow-[0_0_6px_#A8C5BF]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default FloatingBottomNav;
