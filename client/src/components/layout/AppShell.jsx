import React from 'react';
import { cn } from '../../utils/cn';
import TopHeader from '../navigation/TopHeader';
import FloatingBottomNav from '../navigation/FloatingBottomNav';

/**
 * AppShell: The primary responsive layout wrapper for all application views.
 * Ensures consistent dark ambient backdrop, safe area insets, non-overlapping
 * content spacing, and global floating bottom navigation.
 */
export const AppShell = ({
  children,
  showHeader = true,
  showNav = true,
  className = '',
  contentClassName = '',
}) => {
  return (
    <div className="relative min-h-screen w-full bg-bg-primary text-text-primary flex flex-col bg-ambient-grid overflow-x-hidden">
      {/* Background ambient lighting accents */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-accent/[0.04] blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed -bottom-40 right-10 w-[450px] h-[350px] bg-blue-500/[0.03] blur-[140px] rounded-full" />

      {/* Top Header */}
      {showHeader && <TopHeader />}

      {/* Main Content Area: Padding bottom accounts for floating bottom navigation */}
      <main
        className={cn(
          'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6',
          showNav ? 'pb-28 sm:pb-32' : 'pb-8',
          contentClassName
        )}
      >
        {children}
      </main>

      {/* Mandatory Floating Liquid Glass Bottom Navigation */}
      {showNav && <FloatingBottomNav />}
    </div>
  );
};

export default AppShell;

