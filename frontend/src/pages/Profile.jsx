import React from 'react';
import { User, Shield, Phone, Mail, Award, Settings } from 'lucide-react';
import GlassPanel from '../components/glass/GlassPanel';
import GlassCard from '../components/glass/GlassCard';
import GlassButton from '../components/glass/GlassButton';

export const Profile = () => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">User Profile</h1>
          <p className="text-xs text-text-secondary">Belagavi Passenger Account</p>
        </div>
      </div>

      <GlassPanel className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent text-slate-950 font-black text-xl flex items-center justify-center shadow-accent-glow">
            AL
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Abhinandhan Lohar</h2>
            <p className="text-xs text-text-secondary">abhinandhanlohar001@ridesync.demo</p>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-semibold mt-1">
              <Award className="w-3 h-3" />
              <span>Premium Passenger Tier</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <span className="text-[11px] text-text-muted">Total Rides</span>
            <p className="text-lg font-bold text-text-primary">28</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <span className="text-[11px] text-text-muted">Avg Rating Given</span>
            <p className="text-lg font-bold text-accent">4.95 ⭐</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <GlassButton variant="subtle" fullWidth icon={Settings}>
            Account Preferences
          </GlassButton>
        </div>
      </GlassPanel>
    </div>
  );
};

export default Profile;

