import React from 'react';
import { History, Calendar, CheckCircle } from 'lucide-react';
import GlassPanel from '../components/glass/GlassPanel';
import GlassCard from '../components/glass/GlassCard';

export const Activity = () => {
  const pastTrips = [
    {
      id: 'trip-1',
      date: 'Today, 11:20 AM',
      from: 'Belagavi Railway Station (SBC)',
      to: 'KLE Dr. Prabhakar Kore Hospital',
      fare: '₹124.00',
      status: 'Completed',
    },
    {
      id: 'trip-2',
      date: 'Yesterday, 04:45 PM',
      from: 'Tilakwadi 2nd Gate',
      to: 'Central Bus Terminus (CBT)',
      fare: '₹88.50',
      status: 'Completed',
    },
    {
      id: 'trip-3',
      date: '10 Nov, 08:30 AM',
      from: 'Bogarves Circle',
      to: 'VTU Main Campus',
      fare: '₹240.00',
      status: 'Completed',
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Trip Activity</h1>
          <p className="text-xs text-text-secondary">Past journeys and fare receipts in Belagavi</p>
        </div>
      </div>

      <div className="space-y-3">
        {pastTrips.map((trip) => (
          <GlassCard
            key={trip.id}
            title={trip.to}
            subtitle={`From: ${trip.from}`}
            interactive
            badge={
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {trip.status}
              </span>
            }
            footer={
              <>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-text-muted" />
                  {trip.date}
                </span>
                <span className="text-accent font-semibold">{trip.fare}</span>
              </>
            }
          >
            <p className="text-xs text-text-secondary">
              Dispatched via Multi-Factor Algorithm • 4.2 km traveled
            </p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default Activity;

