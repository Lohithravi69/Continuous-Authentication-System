import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles, Fingerprint, KeyRound } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Demo auto-fill for examiners
  const fillDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 cyber-grid relative">
      
      {/* Ambient Radial Lights */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md ultra-glass rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Neon top laser line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75" />

        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 border border-cyan-400/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>Keystroke Sentinel</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
              v2.0
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Privacy-Preserving Zero-Trust Continuous Biometrics
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 transition-all shadow-inner"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 transition-all font-mono shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-slate-300 absolute right-3.5 top-3.5 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Examiner Quick-Fill Demo Account Helper */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Examiner Demo Auto-Fill:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('demo_user', 'Password123!')}
                className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-white transition-all text-left font-mono"
              >
                <div className="text-cyan-400 font-bold">demo_user</div>
                <div className="text-[10px] text-slate-500">Primary Account</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('impostor_test', 'Password123!')}
                className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-rose-500/50 text-[11px] text-slate-300 hover:text-white transition-all text-left font-mono"
              >
                <div className="text-rose-400 font-bold">impostor_test</div>
                <div className="text-[10px] text-slate-500">Impostor Test</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02]"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>Sign In to Workspace</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Don't have an enrolled profile?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-4"
            >
              Enroll & Register
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
