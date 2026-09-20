export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  consent: boolean;
  is_active: boolean;
  has_model: boolean;
  model_version: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  session_id: string;
  user: User;
}

export interface RawKeyEvent {
  key: string;
  down_ts: number;
  up_ts: number;
}

export interface FeatureSummary {
  dwell_mean_ms: number;
  dwell_std_ms: number;
  flight_dd_mean_ms: number;
  flight_ud_mean_ms: number;
  wpm: number;
  n_keystrokes: number;
}

export interface TelemetryResponse {
  decision: 'ALLOW' | 'WARN' | 'STEP_UP' | 'IDLE';
  risk_score: number;
  raw_anomaly_score: number;
  strike_count: number;
  state: 'GREEN' | 'YELLOW' | 'RED';
  message: string;
  features?: FeatureSummary;
  session_locked: boolean;
}

export interface EnrollStartResponse {
  enroll_session_id: string;
  required_windows: number;
  windows_captured: number;
  status: string;
  prompt_text: string;
}

export interface EnrollSubmitResponse {
  enroll_session_id: string;
  window_index: number;
  quality: string;
  windows_captured: number;
  required_windows: number;
  message: string;
  is_ready_to_train: boolean;
}

export interface StepUpResponse {
  success: boolean;
  message: string;
  strike_count: number;
  attempts_remaining: number;
  session_locked: boolean;
}

export interface MetricSummary {
  far: number;
  frr: number;
  eer: number;
  roc_auc: number;
  detection_delay_sec: number;
  scoring_latency_ms: number;
  total_genuine_windows: number;
  total_impostor_windows: number;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface EvaluationReport {
  user_id: string;
  username: string;
  model_version: string;
  metrics: MetricSummary;
  roc_curve: RocPoint[];
  genuine_score_dist: number[];
  impostor_score_dist: number[];
}

export interface AuditLogItem {
  id: string;
  event_type: string;
  event_data: Record<string, any>;
  created_at: string;
}
