import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Car, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  Radio, 
  ShieldCheck, 
  AlertCircle,
  Compass,
  Navigation,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../services/api';
import GlassPanel from '../components/glass/GlassPanel';
import GlassCard from '../components/glass/GlassCard';
import GlassButton from '../components/glass/GlassButton';
import AccidentRiskMap from '../components/admin/AccidentRiskMap';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedZone, setSelectedZone] = useState('ALL');

  const belagaviSectors = [
    { id: 'ALL', label: 'All Sectors' },
    { id: 'Z01', label: 'Z01 • Central (CBT)' },
    { id: 'Z02', label: 'Z02 • Tilakwadi' },
    { id: 'Z03', label: 'Z03 • Udyambag' },
    { id: 'Z04', label: 'Z04 • Camp' },
  ];

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await apiRequest('/admin/analytics');
      setAnalytics(data);
      setError('');
    } catch (err) {
      console.warn('Analytics API notice:', err.message);
      if (!analytics) {
        setAnalytics({
          period: 'today',
          summary: {
            totalRides: 3,
            completedRides: 2,
            cancelledRides: 0,
            activeRides: 1,
            activeDrivers: 4,
            availableDrivers: 3,
            busyDrivers: 1,
            offlineDrivers: 0,
          },
          drivers: [
            { driverId: 'D001', name: 'Synthetic Driver 1', status: 'AVAILABLE', vehicleType: 'CAR', plate: 'DEMO-1', location: [74.4987, 15.8497], zoneCode: 'Z01' },
            { driverId: 'D002', name: 'Synthetic Driver 2', status: 'AVAILABLE', vehicleType: 'CAR', plate: 'DEMO-2', location: [74.4997, 15.8497], zoneCode: 'Z01' },
            { driverId: 'D003', name: 'Synthetic Driver 3', status: 'BUSY', vehicleType: 'CAR', plate: 'DEMO-3', location: [74.5007, 15.8497], zoneCode: 'Z01' },
            { driverId: 'DEMO-CAPTAIN-1', name: 'Belagavi Captain 1', status: 'AVAILABLE', vehicleType: 'CAR', plate: 'KA-22-C-101', location: [74.4987, 15.8497], zoneCode: 'Z01' }
          ],
          recentRides: [
            { rideId: 'RIDE-DEMO-01', status: 'COMPLETED', routeType: 'fastest', passengerCount: 1, zoneCode: 'Z01', fare: 140, createdAt: new Date(Date.now() - 3600000).toISOString() },
            { rideId: 'RIDE-DEMO-02', status: 'COMPLETED', routeType: 'shortest', passengerCount: 2, zoneCode: 'Z01', fare: 240, createdAt: new Date(Date.now() - 1800000).toISOString() },
            { rideId: 'RIDE-DEMO-03', status: 'ONGOING', routeType: 'fastest', passengerCount: 1, zoneCode: 'Z01', fare: 180, createdAt: new Date().toISOString() }
          ]
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [analytics]);

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchAnalytics();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  const summary = analytics?.summary || {
    totalRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    activeRides: 0,
    activeDrivers: 0,
    availableDrivers: 0,
    busyDrivers: 0
  };

  const filteredDrivers = (analytics?.drivers || []).filter(d => 
    selectedZone === 'ALL' ? true : d.zoneCode === selectedZone
  );

  return (
    <section className="admin-dashboard max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Page Heading per UI Designer tokens */}
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">ADMIN / FLEET OPERATIONS RADAR</p>
          <h1>Belagavi Fleet Command</h1>
          <p>Real-time passenger dispatch velocity and connected driver availability across urban Belagavi.</p>
        </div>

        {/* Action Controls using ride-segment design */}
        <div className="admin-heading-controls flex flex-wrap items-center gap-3">
          <div className="ride-segment admin-navigation" aria-label="Admin navigation tabs">
            <button type="button" aria-pressed="true" className="text-xs font-semibold">
              Overview
            </button>
            <Link to="/admin/applications" className="flex items-center gap-1 px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
              Applications & Audit
            </Link>
          </div>

          <div className="ride-segment" aria-label="Auto polling toggle">
            <button
              type="button"
              aria-pressed={autoRefresh}
              onClick={() => setAutoRefresh(true)}
              className="flex items-center gap-1.5"
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-accent animate-pulse' : ''}`} />
              Live (5s)
            </button>
            <button
              type="button"
              aria-pressed={!autoRefresh}
              onClick={() => setAutoRefresh(false)}
            >
              Pause
            </button>
          </div>

          <GlassButton
            variant="primary"
            size="sm"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchAnalytics(true)}
          >
            Sync
          </GlassButton>
        </div>
      </div>

      {error && <p role="alert" className="ride-error">{error}</p>}

      {/* ── Focused 2 Hero Cards: Total Rides Today & Active Drivers ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Card 1: Total Rides Today */}
        <GlassPanel className="p-6 sm:p-7 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent shadow-accent-glow">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">DAILY VELOCITY</p>
                <h2 className="text-xl font-bold text-text-primary">Total Rides Today</h2>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-accent/20 text-accent border border-accent/40 font-mono">
              <Compass className="w-3.5 h-3.5" />
              {summary.activeRides} Active
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-3">
            <span className="text-5xl font-black text-text-primary tracking-tight font-mono">
              {loading ? '—' : summary.totalRides}
            </span>
            <span className="text-sm text-text-secondary">
              rides booked in Belagavi
            </span>
          </div>

          {/* Sub-breakdown */}
          <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20">
              <p className="text-[10px] font-bold uppercase text-emerald-400">Completed</p>
              <p className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{summary.completedRides}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-sky-500/[0.08] border border-sky-500/20">
              <p className="text-[10px] font-bold uppercase text-sky-400">In Progress</p>
              <p className="text-lg font-bold text-sky-300 font-mono mt-0.5">{summary.activeRides}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/[0.08] border border-rose-500/20">
              <p className="text-[10px] font-bold uppercase text-rose-400">Cancelled</p>
              <p className="text-lg font-bold text-rose-300 font-mono mt-0.5">{summary.cancelledRides}</p>
            </div>
          </div>
        </GlassPanel>

        {/* Card 2: How Many Active Drivers Are There */}
        <GlassPanel className="p-6 sm:p-7 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">FLEET READINESS</p>
                <h2 className="text-xl font-bold text-text-primary">Active Drivers</h2>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Online
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-3">
            <span className="text-5xl font-black text-text-primary tracking-tight font-mono">
              {loading ? '—' : summary.activeDrivers}
            </span>
            <span className="text-sm text-text-secondary">
              captains currently active
            </span>
          </div>

          {/* Sub-breakdown */}
          <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-400">Available For Dispatch</p>
                <p className="text-xs text-text-muted">Waiting for requests</p>
              </div>
              <span className="text-xl font-black text-emerald-300 font-mono">{summary.availableDrivers}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-amber-400">En Route / On Ride</p>
                <p className="text-xs text-text-muted">Serving trips</p>
              </div>
              <span className="text-xl font-black text-amber-300 font-mono">{summary.busyDrivers}</span>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* ── Section 2: Belagavi Accident Risk & Safety Zones Map (Full Width, Horizontal Layout) ── */}
      <GlassPanel className="p-6 sm:p-7 space-y-5">
        <AccidentRiskMap />
      </GlassPanel>

      {/* ── Section 3: Active Fleet Telemetry ── */}
      <GlassPanel className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Radio className="w-4 h-4 text-accent" />
              Active Fleet Telemetry
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Spatial location, status, and sector assignments in Belagavi.
            </p>
          </div>

          {/* Sector Switcher using ride-segment */}
          <div className="ride-segment" aria-label="Sector filter">
            {belagaviSectors.map((sector) => (
              <button
                key={sector.id}
                type="button"
                aria-pressed={selectedZone === sector.id}
                onClick={() => setSelectedZone(sector.id)}
                className="text-xs py-1.5 px-3 min-h-[36px]"
              >
                {sector.id}
              </button>
            ))}
          </div>
        </div>

        {filteredDrivers.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            No active drivers detected in sector <span className="font-mono text-accent">{selectedZone}</span>.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {filteredDrivers.map((driver) => {
              const isAvailable = driver.status === 'AVAILABLE';
              const isBusy = driver.status === 'BUSY' || driver.status === 'RESERVED';
              return (
                <GlassCard
                  key={driver.id || driver.driverId}
                  className="p-4 space-y-2 hover:border-accent/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-400' : isBusy ? 'bg-amber-400' : 'bg-slate-500'}`} />
                      <span className="font-bold text-xs text-text-primary">
                        {driver.name}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        isAvailable
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isBusy
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-white/[0.05] border-white/10 text-text-secondary'
                      }`}
                    >
                      {driver.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] text-text-secondary">
                    <div>
                      <span className="text-text-muted">Vehicle:</span>{' '}
                      <span className="text-text-primary font-medium">{driver.vehicleType}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Plate:</span>{' '}
                      <span className="font-mono text-text-primary font-semibold">{driver.plate}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1 border-t border-white/[0.04]">
                      <span className="flex items-center gap-1 font-mono text-[10px] text-text-muted">
                        <MapPin className="w-3 h-3 text-accent shrink-0" />
                        {Array.isArray(driver.location) ? `${driver.location[1].toFixed(4)}, ${driver.location[0].toFixed(4)}` : 'Belagavi Hub'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-accent font-mono text-[10px]">
                        {driver.zoneCode}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
