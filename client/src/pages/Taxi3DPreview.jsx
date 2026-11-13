import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  RotateCw, 
  Lightbulb, 
  Camera, 
  Gauge, 
  Layers, 
  Info, 
  Sparkles,
  Maximize2,
  CheckCircle2,
  Zap,
  Sliders
} from 'lucide-react';
import TaxiScene from '../three/TaxiScene';
import GlassPanel from '../components/glass/GlassPanel';
import GlassButton from '../components/glass/GlassButton';
import GlassCard from '../components/glass/GlassCard';
import GlassIconButton from '../components/glass/GlassIconButton';

export const Taxi3DPreview = () => {
  // 3D Scene Interactive State
  const [cameraPreset, setCameraPreset] = useState('cinematic');
  const [autoRotate, setAutoRotate] = useState(true);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [isDriving, setIsDriving] = useState(false);
  const [underglow, setUnderglow] = useState(true);
  const [modelDetails, setModelDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('controls'); // 'controls' | 'specs' | 'hierarchy'

  const cameraOptions = [
    { id: 'cinematic', label: 'Cinematic 3/4' },
    { id: 'front', label: 'Front Grille' },
    { id: 'side', label: 'Side Profile' },
    { id: 'cockpit', label: 'Cockpit View' },
    { id: 'top', label: 'Top-Down Aerial' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-semibold shadow-accent-pill mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phase 2 • Real GLB Three.js Vehicle Rig</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Honda Taxi 3D Experience
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Real <code className="text-accent font-mono">/models/honda-taxi.glb</code> model with automotive studio shaders, wheel spin kinematics, and interactive camera controls.
          </p>
        </div>

        {/* Live Model Status Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>GLB Validated (181 KB)</span>
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Showcase Container */}
      <div className="relative w-full h-[380px] sm:h-[500px] lg:h-[540px] rounded-3xl overflow-hidden border border-white/[0.16] shadow-glass-lg bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-bg-deep">
        {/* Background Radial Light Accent */}
        <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-30" />

        {/* 3D Scene */}
        <TaxiScene
          cameraPreset={cameraPreset}
          autoRotate={autoRotate}
          headlightsOn={headlightsOn}
          isDriving={isDriving}
          underglow={underglow}
          onModelLoaded={setModelDetails}
          className="w-full h-full"
        />

        {/* Top Floating Overlay: Camera Preset Selector */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          {/* Preset Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-full liquid-glass-nav border border-white/[0.14] overflow-x-auto max-w-full">
            <Camera className="w-4 h-4 text-accent ml-2 mr-1 shrink-0 hidden xs:block" />
            {cameraOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCameraPreset(opt.id)}
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  cameraPreset === opt.id
                    ? 'bg-accent text-slate-950 shadow-accent-pill'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.08]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Quick Reset / Fullscreen Action */}
          <div className="pointer-events-auto hidden sm:flex items-center gap-2">
            <GlassIconButton
              icon={RotateCw}
              size="sm"
              aria-label="Toggle Auto-Rotate"
              variant={autoRotate ? 'accent' : 'glass'}
              onClick={() => setAutoRotate(!autoRotate)}
            />
          </div>
        </div>

        {/* Bottom Floating Overlay: Interactive Feature Toggles */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between gap-2">
          {/* Interactive Rig Quick Toggles */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-1.5 rounded-2xl liquid-glass-nav border border-white/[0.14]">
            {/* Auto Rotate Toggle */}
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                autoRotate
                  ? 'bg-accent/20 border border-accent/40 text-accent'
                  : 'bg-white/[0.05] border border-white/[0.08] text-text-secondary hover:text-text-primary'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
              <span>360° Turntable</span>
            </button>

            {/* Wheel Spin / Drive Toggle */}
            <button
              type="button"
              onClick={() => setIsDriving(!isDriving)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isDriving
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-white/[0.05] border border-white/[0.08] text-text-secondary hover:text-text-primary'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{isDriving ? 'Wheels Spinning' : 'Spin Wheels'}</span>
            </button>

            {/* Headlights Toggle */}
            <button
              type="button"
              onClick={() => setHeadlightsOn(!headlightsOn)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                headlightsOn
                  ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                  : 'bg-white/[0.05] border border-white/[0.08] text-text-secondary hover:text-text-primary'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Headlights</span>
            </button>

            {/* Underglow Toggle */}
            <button
              type="button"
              onClick={() => setUnderglow(!underglow)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                underglow
                  ? 'bg-accent/20 border border-accent/40 text-accent'
                  : 'bg-white/[0.05] border border-white/[0.08] text-text-secondary hover:text-text-primary'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Underglow</span>
            </button>
          </div>

          {/* Interactive Hint */}
          <div className="pointer-events-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-[11px] text-text-secondary">
            <span>Drag to Orbit • Scroll to Zoom</span>
          </div>
        </div>
      </div>

      {/* Tabs: Interactive Inspector & Telemetry */}
      <div className="space-y-4">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'controls'
                ? 'bg-accent/15 border border-accent/30 text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Vehicle Controls & Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'hierarchy'
                ? 'bg-accent/15 border border-accent/30 text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            GLTF Hierarchy & Materials
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'specs'
                ? 'bg-accent/15 border border-accent/30 text-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Belagavi Fleet Specifications
          </button>
        </div>

        {/* Tab 1: Vehicle Controls */}
        {activeTab === 'controls' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassCard
              icon={Camera}
              title="Camera Presets"
              subtitle="Smooth Interpolated Views"
              footer={<span>Current: {cameraPreset}</span>}
            >
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                Switching angles animates with Three.js smooth vector lerping while retaining full 360-degree touch orbit.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {cameraOptions.map((opt) => (
                  <GlassButton
                    key={opt.id}
                    size="sm"
                    variant={cameraPreset === opt.id ? 'primary' : 'subtle'}
                    onClick={() => setCameraPreset(opt.id)}
                  >
                    {opt.label}
                  </GlassButton>
                ))}
              </div>
            </GlassCard>

            <GlassCard
              icon={Gauge}
              title="Kinematic Wheel Rig"
              subtitle="Rotational Axle Physics"
              footer={
                <span>Speed: {isDriving ? '12 rad/s' : '0 rad/s'}</span>
              }
            >
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                Rear axle and front steerable wheels have centered geometries for in-place rotational realism.
              </p>
              <GlassButton
                variant={isDriving ? 'primary' : 'glass'}
                fullWidth
                size="sm"
                onClick={() => setIsDriving(!isDriving)}
              >
                {isDriving ? 'Halt Wheel Rotation' : 'Engage Wheel Spin'}
              </GlassButton>
            </GlassCard>

            <GlassCard
              icon={Lightbulb}
              title="Automotive Shaders"
              subtitle="Emissive & Metallic Maps"
              footer={
                <span>Status: {headlightsOn ? 'Beams Engaged' : 'Daylight Mode'}</span>
              }
            >
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                Dual projected spotlights for headlights, emissive taillights, and yellow underglow fill.
              </p>
              <div className="flex gap-2">
                <GlassButton
                  variant={headlightsOn ? 'primary' : 'glass'}
                  size="sm"
                  fullWidth
                  onClick={() => setHeadlightsOn(!headlightsOn)}
                >
                  Headlights
                </GlassButton>
                <GlassButton
                  variant={underglow ? 'primary' : 'glass'}
                  size="sm"
                  fullWidth
                  onClick={() => setUnderglow(!underglow)}
                >
                  Underglow
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Tab 2: GLTF Hierarchy & Materials Inspection */}
        {activeTab === 'hierarchy' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassPanel className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                Validated GLB Node Hierarchy
              </h3>
              <ul className="text-xs space-y-2 text-text-secondary">
                <li className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                  <span className="font-mono text-accent">Taxi_Cube.009</span>
                  <span className="text-[11px] text-text-muted">Chassis, Roof Sign, Cabin</span>
                </li>
                <li className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                  <span className="font-mono text-accent">Taxi_BackWheels_Cube.010</span>
                  <span className="text-[11px] text-text-muted">Dual Rear Wheel Mesh</span>
                </li>
                <li className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                  <span className="font-mono text-accent">Taxi_FrontLeftWheel_Cube.013</span>
                  <span className="text-[11px] text-text-muted">Front Left Steerable Wheel</span>
                </li>
                <li className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                  <span className="font-mono text-accent">Taxi_FrontRightWheel_Cube.014</span>
                  <span className="text-[11px] text-text-muted">Front Right Steerable Wheel</span>
                </li>
              </ul>
            </GlassPanel>

            <GlassPanel className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent" />
                Material Slots & Shaders
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="font-semibold text-text-primary">Yellow</span>
                  <p className="text-[11px] text-accent mt-0.5">Automotive Clearcoat #F59E0B</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="font-semibold text-text-primary">Windows</span>
                  <p className="text-[11px] text-text-secondary mt-0.5">Tinted Glass 72% Opacity</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="font-semibold text-text-primary">Headlights</span>
                  <p className="text-[11px] text-amber-300 mt-0.5">Emissive Intensity 3.0</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="font-semibold text-text-primary">TailLights</span>
                  <p className="text-[11px] text-rose-400 mt-0.5">Emissive Intensity 2.5</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="font-semibold text-text-primary">Black</span>
                  <p className="text-[11px] text-text-muted mt-0.5">Matte Tire Rubber</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="font-semibold text-text-primary">Grey</span>
                  <p className="text-[11px] text-text-muted mt-0.5">Metallic Wheel Rims</p>
                </div>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* Tab 3: Belagavi Fleet Specs */}
        {activeTab === 'specs' && (
          <GlassPanel className="p-5">
            <h3 className="text-sm font-bold text-text-primary mb-3">Belagavi Municipal Fleet Configuration</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <span className="text-text-muted">Length</span>
                <p className="text-base font-bold text-text-primary mt-1">4.22 m</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <span className="text-text-muted">Width</span>
                <p className="text-base font-bold text-text-primary mt-1">1.80 m</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <span className="text-text-muted">Height</span>
                <p className="text-base font-bold text-text-primary mt-1">1.31 m</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <span className="text-text-muted">Seating Capacity</span>
                <p className="text-base font-bold text-accent mt-1">4 + 1 Driver</p>
              </div>
            </div>
          </GlassPanel>
        )}
      </div>
    </div>
  );
};

export default Taxi3DPreview;
