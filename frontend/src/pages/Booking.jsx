import React from 'react';
import { Compass, MapPin, ArrowRight } from 'lucide-react';
import GlassPanel from '../components/glass/GlassPanel';
import GlassButton from '../components/glass/GlassButton';
import GlassCard from '../components/glass/GlassCard';

export const Booking = () => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Book a Ride</h1>
          <p className="text-xs text-text-secondary">Intelligent matching across Belagavi, Karnataka</p>
        </div>
      </div>

      <GlassPanel className="p-6 space-y-4">
        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent leading-relaxed">
          <p className="font-semibold mb-1">Phase 1 Foundation Active</p>
          <p className="text-text-secondary">
            The full interactive OpenStreetMap booking flow and intelligent multi-factor matching algorithms will be loaded in Phase 3 & 4.
          </p>
        </div>

        <GlassCard
          title="Central Bus Terminus (CBT) ➔ KLE Hospital"
          subtitle="Simulated Belagavi Route"
          footer={
            <>
              <span>Distance: 5.2 km</span>
              <span className="text-accent font-semibold">ETA: 11 mins</span>
            </>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Multi-factor scoring algorithm will evaluate nearby drivers using weights: Distance (40%), ETA (30%), Rating (20%), and Workload (10%).
          </p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
};

export default Booking;

