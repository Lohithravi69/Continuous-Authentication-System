from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class MetricSummary(BaseModel):
    far: float # False Acceptance Rate
    frr: float # False Rejection Rate
    eer: float # Equal Error Rate
    roc_auc: float
    detection_delay_sec: float
    scoring_latency_ms: float
    total_genuine_windows: int
    total_impostor_windows: int

class RocPoint(BaseModel):
    fpr: float
    tpr: float
    threshold: float

class EvaluationReportResponse(BaseModel):
    user_id: str
    username: str
    model_version: str
    metrics: MetricSummary
    roc_curve: List[RocPoint]
    genuine_score_dist: List[float]
    impostor_score_dist: List[float]
