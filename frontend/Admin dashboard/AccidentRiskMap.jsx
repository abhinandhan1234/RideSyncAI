import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertOctagon, AlertTriangle, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';
import GlassCard from '../glass/GlassCard';

export const ACCIDENT_ZONES = [
  {
    id: 'RED-1',
    name: 'CBT Junction & Khade Bazar',
    sector: 'Z01 • Central',
    level: 'red',
    riskTitle: 'High Accident Zone',
    accidentsCount: 42,
    severity: 'Critical Hazard',
    center: [15.8497, 74.4977],
    radiusMeters: 900,
    cause: 'High pedestrian density, blind auto-bus confluences, and rapid turning conflicts.',
    color: '#EF4444',
  },
  {
    id: 'RED-2',
    name: 'Sambra Highway Merge (NH-48)',
    sector: 'Z04 • East Arterial',
    level: 'red',
    riskTitle: 'High Accident Zone',
    accidentsCount: 38,
    severity: 'Critical Hazard',
    center: [15.8640, 74.5350],
    radiusMeters: 1050,
    cause: 'High-speed highway entry, night glare, and freight vehicle overtaking.',
    color: '#EF4444',
  },
  {
    id: 'YELLOW-1',
    name: 'Tilakwadi 3rd Gate Overpass',
    sector: 'Z02 • Tilakwadi',
    level: 'yellow',
    riskTitle: 'Moderate Risk Zone',
    accidentsCount: 16,
    severity: 'Moderate Risk',
    center: [15.8360, 74.5020],
    radiusMeters: 800,
    cause: 'Railway level crossing bottlenecks and sudden deceleration congestion.',
    color: '#F59E0B',
  },
  {
    id: 'YELLOW-2',
    name: 'Udyambag Industrial Ring',
    sector: 'Z03 • Udyambag',
    level: 'yellow',
    riskTitle: 'Moderate Risk Zone',
    accidentsCount: 13,
    severity: 'Moderate Risk',
    center: [15.8230, 74.4820],
    radiusMeters: 900,
    cause: 'Heavy commercial logistics traffic and shoulder parking conflicts.',
    color: '#F59E0B',
  },
  {
    id: 'GREEN-1',
    name: 'Belagavi Military Cantonment',
    sector: 'Z04 • Camp',
    level: 'green',
    riskTitle: 'Safe Transit Corridor',
    accidentsCount: 2,
    severity: 'Minimal Risk',
    center: [15.8560, 74.4850],
    radiusMeters: 950,
    cause: 'Strict 30 km/h speed enforcement, wide dual lanes, and minimal cross-traffic.',
    color: '#10B981',
  },
  {
    id: 'GREEN-2',
    name: 'VTU University Boulevard',
    sector: 'Z01 • North West',
    level: 'green',
    riskTitle: 'Safe Transit Corridor',
    accidentsCount: 1,
    severity: 'Minimal Risk',
    center: [15.8750, 74.4750],
    radiusMeters: 900,
    cause: 'Dedicated median barriers, low vehicle density, and regulated intersections.',
    color: '#10B981',
  }
];

export default function AccidentRiskMap({ onSelectZone }) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const layersGroup = useRef(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [activeZone, setActiveZone] = useState(ACCIDENT_ZONES[0]);

  // Totals & Percentages
  const redAccidents = ACCIDENT_ZONES.filter(z => z.level === 'red').reduce((a, b) => a + b.accidentsCount, 0);
  const yellowAccidents = ACCIDENT_ZONES.filter(z => z.level === 'yellow').reduce((a, b) => a + b.accidentsCount, 0);
  const greenAccidents = ACCIDENT_ZONES.filter(z => z.level === 'green').reduce((a, b) => a + b.accidentsCount, 0);
  const totalAccidents = redAccidents + yellowAccidents + greenAccidents;
  const redPercentage = Math.round((redAccidents / totalAccidents) * 100);

  // Initialize Map
  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return;

    const map = L.map(mapElement.current, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: false
    });

    // Auto-fit all zone coordinates so all zones are immediately clear to see
    const bounds = L.latLngBounds(ACCIDENT_ZONES.map(z => z.center));
    map.fitBounds(bounds, { padding: [50, 50] });

    mapInstance.current = map;

    // OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    layersGroup.current = L.layerGroup().addTo(map);

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(mapElement.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Render Risk Zone Circles, Pulsing Markers & Prominent Labels
  useEffect(() => {
    if (!mapInstance.current || !layersGroup.current) return;
    layersGroup.current.clearLayers();

    const filtered = ACCIDENT_ZONES.filter(z => 
      selectedFilter === 'ALL' ? true : z.level === selectedFilter.toLowerCase()
    );

    filtered.forEach((zone) => {
      const isSelected = activeZone?.id === zone.id;

      // 1. Boundary Circle
      const circle = L.circle(zone.center, {
        radius: zone.radiusMeters,
        color: zone.color,
        weight: isSelected ? 3.5 : 2,
        fillColor: zone.color,
        fillOpacity: isSelected ? 0.38 : 0.22,
        dashArray: zone.level === 'red' ? '6, 6' : undefined
      }).addTo(layersGroup.current);

      // 2. High-Visibility Badge Marker
      const badgeIcon = L.divIcon({
        className: 'zone-map-badge',
        html: `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: ${zone.level === 'red' ? '#DC2626' : zone.level === 'yellow' ? '#D97706' : '#059669'};
            color: #FFFFFF;
            font-family: Inter, system-ui, sans-serif;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 9px;
            border-radius: 8px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.65);
            border: 2px solid ${isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.75)'};
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -120%);
          ">
            <span>${zone.level === 'red' ? '🔴' : zone.level === 'yellow' ? '🟡' : '🟢'}</span>
            <span>${zone.name}</span>
            <span style="
              background: rgba(0,0,0,0.3);
              padding: 2px 6px;
              border-radius: 5px;
              font-family: monospace;
              font-size: 10px;
            ">
              ${zone.accidentsCount} accidents
            </span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const labelMarker = L.marker(zone.center, { icon: badgeIcon }).addTo(layersGroup.current);

      // 3. Center Target Dot
      const centerDot = L.circleMarker(zone.center, {
        radius: isSelected ? 7 : 5,
        color: '#FFFFFF',
        weight: 2,
        fillColor: zone.color,
        fillOpacity: 1
      }).addTo(layersGroup.current);

      // Click Handlers
      const handleSelect = () => {
        setActiveZone(zone);
        onSelectZone?.(zone);
        mapInstance.current?.panTo(zone.center, { animate: true });
      };

      circle.on('click', handleSelect);
      labelMarker.on('click', handleSelect);
      centerDot.on('click', handleSelect);
    });

    if (filtered.length > 0 && selectedFilter !== 'ALL') {
      const filterBounds = L.latLngBounds(filtered.map(z => z.center));
      mapInstance.current.fitBounds(filterBounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [selectedFilter, activeZone, onSelectZone]);

  return (
    <div className="space-y-5">
      {/* ── Horizontal Heading & Clean Filter Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-bold text-text-primary tracking-tight whitespace-nowrap">
                Belagavi Accident Risk & Safety Zones Map
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                🔴 Red Zones = High Accident Frequency
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Spatial safety analysis correlating historical accidents with urban traffic density and bottleneck junctions.
            </p>
          </div>
        </div>

        {/* Horizontal Risk Filter Tabs */}
        <div className="ride-segment shrink-0 self-start lg:self-auto" aria-label="Risk level filter">
          <button
            type="button"
            aria-pressed={selectedFilter === 'ALL'}
            onClick={() => setSelectedFilter('ALL')}
            className="text-xs py-1.5 px-3 min-h-[38px] font-semibold"
          >
            All Zones ({totalAccidents})
          </button>
          <button
            type="button"
            aria-pressed={selectedFilter === 'RED'}
            onClick={() => setSelectedFilter('RED')}
            className="text-xs py-1.5 px-3 min-h-[38px] font-semibold text-rose-400"
          >
            🔴 Red ({redAccidents})
          </button>
          <button
            type="button"
            aria-pressed={selectedFilter === 'YELLOW'}
            onClick={() => setSelectedFilter('YELLOW')}
            className="text-xs py-1.5 px-3 min-h-[38px] font-semibold text-amber-400"
          >
            🟡 Yellow ({yellowAccidents})
          </button>
          <button
            type="button"
            aria-pressed={selectedFilter === 'GREEN'}
            onClick={() => setSelectedFilter('GREEN')}
            className="text-xs py-1.5 px-3 min-h-[38px] font-semibold text-emerald-400"
          >
            🟢 Green ({greenAccidents})
          </button>
        </div>
      </div>

      {/* ── Large, Clear Interactive Map ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.12] bg-[#111C21] shadow-2xl">
        <div 
          ref={mapElement} 
          style={{ height: '420px', width: '100%', zIndex: 1 }}
          className="leaflet-dark-mode" 
        />

        {/* Floating Minimal Legend Overlay */}
        <div className="absolute top-3 right-3 z-[500] p-3 rounded-xl bg-[#111C21]/90 backdrop-blur-md border border-white/[0.15] text-[11px] space-y-2 shadow-xl">
          <p className="font-bold text-text-primary text-[10px] uppercase tracking-wider border-b border-white/[0.08] pb-1">
            Zone Risk Legend
          </p>
          <div className="flex items-center gap-2 font-medium text-text-primary">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shrink-0" />
            <span><strong>Red:</strong> High Accidents (&gt;30)</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-text-primary">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shrink-0" />
            <span><strong>Yellow:</strong> Caution (10–30)</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-text-primary">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shrink-0" />
            <span><strong>Green:</strong> Safe Corridor (&lt;10)</span>
          </div>
        </div>
      </div>

      {/* ── Key Safety Conclusion Banner ── */}
      <div className="p-4 sm:p-5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-rose-300">
              Core Conclusion: Accidents Are Significantly Higher in Red Zones
            </h4>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              Red zones account for <strong className="text-rose-300">{redAccidents} of {totalAccidents} recorded accidents ({redPercentage}%)</strong> across Belagavi. The highest incidence is concentrated at <strong className="text-text-primary">CBT Junction</strong> (42) and <strong className="text-text-primary">Sambra Highway Merge</strong> (38) due to pedestrian confluences and high-speed merging.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold whitespace-nowrap">
            {redPercentage}% Accident Share
          </span>
        </div>
      </div>

      {/* ── 3 Clear Risk Category Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Red Category Card */}
        <GlassCard className="p-4 space-y-2 border-l-4 border-l-rose-500 hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h5 className="font-bold text-xs text-text-primary">🔴 Red Zones (Critical)</h5>
            </div>
            <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
              {redAccidents} Accidents
            </span>
          </div>
          <p className="text-[11px] text-text-secondary leading-snug">
            <strong>CBT Junction</strong> (42) & <strong>Sambra Merge</strong> (38). Frequent severe incidents due to pedestrian density and high-speed blind turns.
          </p>
        </GlassCard>

        {/* Yellow Category Card */}
        <GlassCard className="p-4 space-y-2 border-l-4 border-l-amber-500 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h5 className="font-bold text-xs text-text-primary">🟡 Yellow Zones (Caution)</h5>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
              {yellowAccidents} Accidents
            </span>
          </div>
          <p className="text-[11px] text-text-secondary leading-snug">
            <strong>Tilakwadi 3rd Gate</strong> (16) & <strong>Udyambag</strong> (13). Railway crossing delays and heavy industrial freight logistics.
          </p>
        </GlassCard>

        {/* Green Category Card */}
        <GlassCard className="p-4 space-y-2 border-l-4 border-l-emerald-500 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h5 className="font-bold text-xs text-text-primary">🟢 Green Zones (Safe)</h5>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
              {greenAccidents} Accidents
            </span>
          </div>
          <p className="text-[11px] text-text-secondary leading-snug">
            <strong>Military Cantonment</strong> (2) & <strong>VTU Boulevard</strong> (1). Dedicated median barriers and strict 30 km/h speed enforcement.
          </p>
        </GlassCard>
      </div>

      {/* Selected Zone Deep Dive (Interactive) */}
      {activeZone && (
        <GlassCard className="p-4 space-y-2 border border-white/[0.12] bg-white/[0.02]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-bold text-xs text-text-primary">Selected Zone Inspection: {activeZone.name}</span>
              <span className="text-[10px] font-mono text-text-muted">({activeZone.sector})</span>
            </div>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border self-start sm:self-auto ${
              activeZone.level === 'red'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : activeZone.level === 'yellow'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {activeZone.severity} • {activeZone.accidentsCount} Incidents Recorded
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            <strong className="text-text-primary">Primary Risk Factor: </strong>{activeZone.cause}
          </p>
        </GlassCard>
      )}
    </div>
  );
}
