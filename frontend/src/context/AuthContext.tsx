import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TelemetryResponse } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  token: string | null;
  loading: boolean;
  isLocked: boolean;
  isStepUpOpen: boolean;
  captureEnabled: boolean;
  latestTelemetry: TelemetryResponse | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, consent: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setStepUpOpen: (open: boolean) => void;
  setCaptureEnabled: (enabled: boolean) => void;
  handleTelemetryResult: (result: TelemetryResponse) => void;
  triggerLockout: () => void;
  unlockAfterStepUp: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('session_id'));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isStepUpOpen, setIsStepUpOpen] = useState<boolean>(false);
  const [captureEnabled, setCaptureEnabled] = useState<boolean>(true);
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryResponse | null>(null);

  const refreshUser = async () => {
    if (!localStorage.getItem('access_token')) {
      setLoading(false);
      return;
    }
    try {
      const u = await api.getMe();
      setUser(u);
      setIsLocked(false);
    } catch (err: any) {
      if (err.message === 'SESSION_LOCKED') {
        setIsLocked(true);
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('session_id');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('session_id', res.session_id);
      setToken(res.access_token);
      setSessionId(res.session_id);
      setUser(res.user);
      setIsLocked(false);
      setIsStepUpOpen(false);
      setCaptureEnabled(true);
      setLatestTelemetry(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, consent: boolean) => {
    setLoading(true);
    try {
      const res = await api.register(username, email, password, consent);
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('session_id', res.session_id);
      setToken(res.access_token);
      setSessionId(res.session_id);
      setUser(res.user);
      setIsLocked(false);
      setIsStepUpOpen(false);
      setCaptureEnabled(true);
      setLatestTelemetry(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('session_id');
    setUser(null);
    setToken(null);
    setSessionId(null);
    setIsLocked(false);
    setIsStepUpOpen(false);
    setLatestTelemetry(null);
  };

  const handleTelemetryResult = (res: TelemetryResponse) => {
    setLatestTelemetry(res);
    
    if (res.session_locked) {
      setIsLocked(true);
      setIsStepUpOpen(false);
      setCaptureEnabled(false);
      return;
    }

    if (res.decision === 'STEP_UP' || res.state === 'RED') {
      // 🛑 CRITICAL RULE: Explicitly pause telemetry when Step-Up is triggered
      setCaptureEnabled(false);
      setIsStepUpOpen(true);
    }
  };

  const triggerLockout = () => {
    setIsLocked(true);
    setIsStepUpOpen(false);
    setCaptureEnabled(false);
    if (sessionId) {
      api.lockSession(sessionId, 'MANUAL_OR_EXCEEDED_ATTEMPTS').catch(() => {});
    }
  };

  const unlockAfterStepUp = () => {
    setIsStepUpOpen(false);
    setCaptureEnabled(true); // ▶️ Resume telemetry
    setLatestTelemetry((prev) => prev ? { ...prev, state: 'GREEN', strike_count: 0, decision: 'ALLOW' } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      sessionId,
      token,
      loading,
      isLocked,
      isStepUpOpen,
      captureEnabled,
      latestTelemetry,
      login,
      register,
      logout,
      refreshUser,
      setStepUpOpen: setIsStepUpOpen,
      setCaptureEnabled,
      handleTelemetryResult,
      triggerLockout,
      unlockAfterStepUp
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
