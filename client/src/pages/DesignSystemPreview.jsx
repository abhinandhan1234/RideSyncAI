import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  MapPin, 
  Navigation, 
  Search, 
  ShieldCheck, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ArrowRight,
  Eye,
  Sliders
} from 'lucide-react';
import GlassPanel from '../components/glass/GlassPanel';
import GlassButton from '../components/glass/GlassButton';
import GlassInput from '../components/glass/GlassInput';
import GlassCard from '../components/glass/GlassCard';
import GlassModal from '../components/glass/GlassModal';
import GlassBottomSheet from '../components/glass/GlassBottomSheet';
import GlassIconButton from '../components/glass/GlassIconButton';

export const DesignSystemPreview = () => {
  // Modal & Sheet States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  // Form input demo states
  const [pickup, setPickup] = useState('Central Bus Terminus (CBT), Belagavi');
  const [destination, setDestination] = useState('KLE Dr. Prabhakar Kore Hospital');
  const [selectedZone, setSelectedZone] = useState('CBT Hub');

  const belagaviZones = [
    { id: 'cbt', name: 'CBT Hub', demand: 'High', drivers: 14 },
    { id: 'rly', name: 'Belagavi Rly Station', demand: 'High', drivers: 19 },
    { id: 'kle', name: 'KLE JNMC Campus', demand: 'Medium', drivers: 11 },
    { id: 'tlk', name: 'Tilakwadi 3rd Gate', demand: 'Medium', drivers: 8 },
    { id: 'vtu', name: 'VTU Main Campus', demand: 'Normal', drivers: 5 },
    { id: 'ixg', name: 'Sambra Airport (IXG)', demand: 'Surge', drivers: 4 },
  ];

  const handleSimulateAction = () => {
    setButtonLoading(true);
    setTimeout(() => setButtonLoading(false), 1600);
  };

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="relative">
        <GlassPanel variant="accent" className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Phase 1 Verified Foundation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                Liquid Glass Design System
              </h1>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                Apple-inspired translucent surfaces, tactile controls, mobile-first responsive geometry, and taxi-yellow active illumination tailored for Belagavi smart mobility.
              </p>
            </div>

            {/* Quick Interactive Actions */}
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              <GlassButton
                variant="primary"
                icon={Eye}
                size="sm"
                onClick={() => setIsModalOpen(true)}
              >
                Inspect Glass Modal
              </GlassButton>
              <GlassButton
                variant="glass"
                icon={Layers}
                size="sm"
                onClick={() => setIsSheetOpen(true)}
              >
                Inspect Bottom Sheet
              </GlassButton>
            </div>
          </div>
        </GlassPanel>
      </section>

      {/* 1. Design Tokens & Color Palette */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            1. Core Design Tokens & Palette
          </h2>
          <span className="text-xs text-text-secondary">Tailwind CSS + CSS Variables</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <GlassPanel className="p-4 flex flex-col justify-between h-28 border-white/10">
            <div className="w-7 h-7 rounded-lg bg-bg-primary border border-white/20" />
            <div>
              <p className="text-xs font-semibold text-text-primary">Primary Bg</p>
              <p className="text-[11px] font-mono text-text-muted">#0B0F14</p>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4 flex flex-col justify-between h-28 border-white/10">
            <div className="w-7 h-7 rounded-lg bg-bg-secondary border border-white/20" />
            <div>
              <p className="text-xs font-semibold text-text-primary">Secondary Bg</p>
              <p className="text-[11px] font-mono text-text-muted">#111827</p>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4 flex flex-col justify-between h-28 border-amber-500/30">
            <div className="w-7 h-7 rounded-lg bg-accent shadow-accent-glow" />
            <div>
              <p className="text-xs font-semibold text-accent">Taxi Yellow</p>
              <p className="text-[11px] font-mono text-text-muted">#F59E0B</p>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4 flex flex-col justify-between h-28 border-white/10">
            <div className="w-7 h-7 rounded-lg bg-white/[0.12] backdrop-blur-glass border border-white/25" />
            <div>
              <p className="text-xs font-semibold text-text-primary">Glass Blur</p>
              <p className="text-[11px] font-mono text-text-muted">24px blur (180% sat)</p>
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* 2. Glass Buttons Showcase */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          2. Tactile Glass Buttons (≥ 44px Touch Targets)
        </h2>

        <GlassPanel className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs text-text-muted font-medium">Primary Accent</span>
              <GlassButton variant="primary" fullWidth icon={ArrowRight} iconPosition="right">
                Book Belagavi Ride
              </GlassButton>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-text-muted font-medium">Translucent Glass</span>
              <GlassButton variant="glass" fullWidth icon={Car}>
                Select Vehicle
              </GlassButton>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-text-muted font-medium">Subtle Pill</span>
              <GlassButton variant="subtle" fullWidth icon={ShieldCheck}>
                Safety Protocol
              </GlassButton>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-text-muted font-medium">Interactive Loading</span>
              <GlassButton 
                variant="primary" 
                fullWidth 
                loading={buttonLoading} 
                onClick={handleSimulateAction}
              >
                Click To Animate
              </GlassButton>
            </div>
          </div>

          {/* Size Variations */}
          <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center gap-3">
            <span className="text-xs text-text-muted font-medium mr-2">Sizes:</span>
            <GlassButton size="sm" variant="glass">Small (sm)</GlassButton>
            <GlassButton size="md" variant="glass">Medium (md - Standard)</GlassButton>
            <GlassButton size="lg" variant="primary">Large (lg - Hero Action)</GlassButton>
            <GlassIconButton icon={Navigation} size="md" variant="accent" aria-label="Locate me" />
          </div>
        </GlassPanel>
      </section>

      {/* 3. Glass Form Inputs */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          3. Glass Form Inputs & Belagavi Geocoding Pickers
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassPanel className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Ride Route Input Fields</h3>
            
            <GlassInput
              label="Pickup Location"
              icon={MapPin}
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="Enter pickup point in Belagavi"
              helperText="Auto-detected"
            />

            <GlassInput
              label="Dropoff Destination"
              icon={Navigation}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination"
              rightElement={
                <button
                  type="button"
                  className="px-2 py-1 text-[11px] font-semibold text-accent hover:text-accent-light"
                  onClick={() => setDestination('Sambra Airport (IXG)')}
                >
                  Quick Airport
                </button>
              }
            />

            <GlassInput
              label="Driver Allocation Code"
              icon={Search}
              placeholder="e.g. BEL-DRV-044"
              error=""
            />
          </GlassPanel>

          {/* Belagavi Hub Selection Chips */}
          <GlassPanel className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Belagavi Transit Hubs</h3>
              <span className="text-xs text-accent font-medium">Real Coordinates</span>
            </div>

            <p className="text-xs text-text-secondary">
              Select key Belagavi locations to test interactive feedback on active glass pills:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {belagaviZones.map((zone) => {
                const isSelected = selectedZone === zone.name;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedZone(zone.name)}
                    className={`p-3 rounded-xl text-left border transition-all duration-200 select-none ${
                      isSelected
                        ? 'bg-accent/15 border-accent text-text-primary shadow-accent-pill'
                        : 'bg-white/[0.04] border-white/[0.08] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary'
                    }`}
                  >
                    <p className="text-xs font-semibold truncate">{zone.name}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted">
                      <span>{zone.drivers} drivers</span>
                      <span className={zone.demand === 'Surge' ? 'text-amber-400 font-bold' : ''}>
                        {zone.demand}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <p className="text-xs text-text-muted">
                Active Selection: <span className="text-accent font-semibold">{selectedZone}</span>
              </p>
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* 4. Structured Glass Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          4. Structured Glass Cards
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard
            icon={Car}
            title="Honda Taxi (3D)"
            subtitle="Belagavi Municipal Fleet"
            badge={
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                Available
              </span>
            }
            interactive
            footer={
              <>
                <span>Base Fare: ₹45.00</span>
                <span className="text-accent font-semibold">ETA: 3 mins</span>
              </>
            }
          >
            <p className="text-xs text-text-secondary leading-relaxed">
              Standard 4-seater Sedan calibrated for Belagavi urban streets, featuring Three.js 3D telemetry tracking.
            </p>
          </GlassCard>

          <GlassCard
            icon={Sliders}
            title="Multi-Factor Matching"
            subtitle="Algorithmic Dispatch"
            badge={
              <span className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-semibold">
                Active
              </span>
            }
            interactive
            footer={
              <>
                <span>Weights: 40/30/20/10</span>
                <span className="text-text-primary font-mono text-[11px]">Score: 94.2%</span>
              </>
            }
          >
            <p className="text-xs text-text-secondary leading-relaxed">
              Intelligently evaluates distance, road traffic, driver rating, and workload instead of simple nearest-neighbor.
            </p>
          </GlassCard>

          <GlassCard
            icon={CheckCircle2}
            title="Real-Time Telemetry"
            subtitle="Socket.IO Stream"
            badge={
              <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-semibold">
                Online
              </span>
            }
            interactive
            footer={
              <>
                <span>GPS Latency: 18ms</span>
                <span className="text-emerald-400 font-semibold">Synced</span>
              </>
            }
          >
            <p className="text-xs text-text-secondary leading-relaxed">
              Continuous bidirectional location synchronization connecting Leaflet maps with 3D Three.js vehicle rigs.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* 5. Mobile & Viewport Simulation Information */}
      <section className="space-y-4">
        <GlassPanel className="p-6 border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
            <AlertCircle className="w-4 h-4 text-accent" />
            <span>Mobile-First Responsive Verification</span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Resize your browser window or switch to mobile device emulation in Chrome DevTools to verify:
          </p>
          <ul className="text-xs sm:text-sm text-text-muted space-y-1.5 list-disc pl-5">
            <li>Zero horizontal scroll on 360px, 375px, 390px, 430px viewports.</li>
            <li>Floating bottom navigation pill maintains a minimum 44px touch target per icon.</li>
            <li>Safe area padding (<code className="text-text-primary">env(safe-area-inset-bottom)</code>) ensures iPhone home indicator clearance.</li>
            <li>Content has bottom clearance (<code className="text-text-primary">pb-28 sm:pb-32</code>) and is never obscured by the floating nav bar.</li>
          </ul>
        </GlassPanel>
      </section>

      {/* Interactive Glass Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Liquid Glass Modal Dialog"
        description="Centered modal with background blur and spring animation"
        footer={
          <>
            <GlassButton variant="subtle" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              Confirm Action
            </GlassButton>
          </>
        }
      >
        <div className="space-y-3 text-xs sm:text-sm text-text-secondary">
          <p>
            This modal uses <code className="text-accent">liquid-glass-modal</code> with 32px backdrop blur, high saturation, and an illuminated outer glow.
          </p>
          <p>
            Pressing <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-text-primary font-mono text-[11px]">ESC</kbd> or clicking the backdrop automatically closes it with smooth Framer Motion spring physics.
          </p>
        </div>
      </GlassModal>

      {/* Interactive Glass Bottom Sheet */}
      <GlassBottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Mobile Glass Bottom Sheet"
        subtitle="Swipeable interaction for booking & driver telemetry"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.1] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Estimated Fare</span>
              <span className="text-base font-bold text-accent">₹142.50</span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Distance</span>
              <span>4.8 km via Congress Rd</span>
            </div>
          </div>

          <GlassButton
            variant="primary"
            fullWidth
            size="lg"
            onClick={() => setIsSheetOpen(false)}
          >
            Confirm Belagavi Ride
          </GlassButton>
        </div>
      </GlassBottomSheet>
    </div>
  );
};

export default DesignSystemPreview;

