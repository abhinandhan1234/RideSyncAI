import React from 'react';
import { Navigation2, Radio } from 'lucide-react';
import GlassPanel from '../components/glass/GlassPanel';
import GlassCard from '../components/glass/GlassCard';

export const Tracking = () => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center">
          <Navigation2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Live Tracking</h1>
          <p className="text-xs text-text-secondary">Real-time GPS telemetry & 3D Honda Taxi</p>
        </div>
      </div>

      <GlassPanel className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Telemetry Stream Ready (Phase 2 & 4)</span>
        </div>

        <GlassCard
          title="Vehicle: Honda Taxi Belagavi"
          subtitle="License: KA-22-TX-4091"
          footer={
            <>
              <span>Driver: Anand Patil (⭐ 4.9)</span>
              <span className="text-emerald-400 font-semibold">Status: En Route</span>
            </>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            In Phase 2, the actual Honda Taxi GLB model will be rendered here with Three.js/React Three Fiber and synchronized with live Leaflet coordinates.
          </p>
        </GlassCard>
      </GlassPanel>
    </div>
  );
};

export default Tracking;

