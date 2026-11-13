import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import GlassButton from '../components/glass/GlassButton';
import GlassCard from '../components/glass/GlassCard';

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero Header Section */}
      <section className="text-center space-y-4 pt-4 sm:pt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-semibold shadow-accent-pill"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Belagavi Intelligent Ride Matching Platform</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-primary max-w-2xl mx-auto leading-tight"
        >
          Your City. Your Ride. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent to-accent">
            Smarter Connections.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed"
        >
          Intelligent ride matching for a faster, smarter and more connected journey across Belagavi.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <GlassButton
            variant="primary"
            size="lg"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => navigate('/book')}
            className="w-full sm:w-auto"
          >
            Book a Ride
          </GlassButton>

        </motion.div>
      </section>

      {/* Feature Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <GlassCard
          icon={Zap}
          title="Weighted Matching"
          subtitle="Multi-Factor Optimization"
          interactive
          onClick={() => navigate('/book')}
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Allocates vehicles by balancing distance, live road ETA, driver rating, and current fatigue.
          </p>
        </GlassCard>

        <GlassCard
          icon={ShieldCheck}
          title="Belagavi Grid"
          subtitle="Geospatial Hubs"
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Pre-calibrated for CBT, Railway Station, KLE Hospital, Tilakwadi, VTU, and Sambra Airport.
          </p>
        </GlassCard>
      </section>
    </div>
  );
};

export default Home;

