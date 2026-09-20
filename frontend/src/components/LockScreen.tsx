import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldX, Lock, RefreshCw, LogOut } from 'lucide-react';

export const LockScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel-glow-red rounded-3xl p-8 border border-rose-500/40 text-center relative overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Glowing red shield */}
        <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-950/80 animate-pulse">
          <ShieldX className="w-10 h-10" />
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Security Lockdown Active
        </h1>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-6">
          <Lock className="w-3.5 h-3.5" />
          SESSION STATUS: 423 LOCKED
        </div>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-left">
          Continuous behavioral anomaly thresholds were exceeded and 3 consecutive Step-Up authentication attempts failed.
          <br /><br />
          The active session token has been <strong>revoked server-side in PostgreSQL</strong>. To restore access, please re-authenticate with primary credentials.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => logout()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Return to Login</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 mt-6 font-mono">
          Security Event Logged | User: {user?.username}
        </div>
      </div>
    </div>
  );
};
