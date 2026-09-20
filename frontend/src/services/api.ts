import { 
  AuthResponse, User, TelemetryResponse, EnrollStartResponse, 
  EnrollSubmitResponse, StepUpResponse, EvaluationReport, AuditLogItem 
} from '../types';

const API_BASE = '/v1';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const api = {
  // Auth
  async register(username: string, email: string, password: string, consent: boolean): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, consent })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      if (res.status === 423) {
        throw new Error('SESSION_LOCKED');
      }
      throw new Error('Failed to fetch user');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders()
    }).catch(() => {});
  },

  // Enrollment
  async startEnrollment(): Promise<EnrollStartResponse> {
    const res = await fetch(`${API_BASE}/enroll/start`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to start enrollment');
    return res.json();
  },

  async submitEnrollWindow(
    enrollSessionId: string, 
    windowIndex: number, 
    events: any[], 
    durationMs: number, 
    backspaces: number, 
    paste: boolean
  ): Promise<EnrollSubmitResponse> {
    const res = await fetch(`${API_BASE}/enroll/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        enroll_session_id: enrollSessionId,
        window_index: windowIndex,
        payload: {
          events,
          client_duration_ms: durationMs,
          backspace_count: backspaces,
          paste_detected: paste
        }
      })
    });
    if (!res.ok) throw new Error('Failed to submit enrollment window');
    return res.json();
  },

  async completeEnrollment(enrollSessionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/enroll/complete?enroll_session_id=${enrollSessionId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Training failed' }));
      throw new Error(err.detail || 'Training failed');
    }
    return res.json();
  },

  // Active Telemetry
  async sendTelemetryWindow(sessionId: string, windowIndex: number, events: any[], durationMs: number): Promise<TelemetryResponse> {
    const res = await fetch(`${API_BASE}/telemetry/window`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        session_id: sessionId,
        window_index: windowIndex,
        payload: {
          events,
          client_duration_ms: durationMs
        }
      })
    });
    if (!res.ok) {
      if (res.status === 423) {
        return {
          decision: 'STEP_UP',
          risk_score: 1.0,
          raw_anomaly_score: -1.0,
          strike_count: 3,
          state: 'RED',
          message: 'Session is locked.',
          session_locked: true
        };
      }
      throw new Error('Telemetry submission failed');
    }
    return res.json();
  },

  // Session & Step-Up
  async verifyStepUp(sessionId: string, passwordOrAnswer: string): Promise<StepUpResponse> {
    const res = await fetch(`${API_BASE}/session/stepup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        session_id: sessionId,
        password_or_answer: passwordOrAnswer
      })
    });
    if (!res.ok) throw new Error('Step-Up verification failed');
    return res.json();
  },

  async lockSession(sessionId: string, reason: string): Promise<void> {
    await fetch(`${API_BASE}/session/lock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ session_id: sessionId, reason })
    });
  },

  // Evaluation & Audit
  async getEvaluationReport(): Promise<EvaluationReport> {
    const res = await fetch(`${API_BASE}/evaluation/report`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch report' }));
      throw new Error(err.detail || 'Failed to fetch report');
    }
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch(`${API_BASE}/audit/logs`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getWindowHistory(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/audit/windows`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return res.json();
  }
};
