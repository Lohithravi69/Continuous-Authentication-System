import numpy as np

class ScoreNormalizer:
    """
    Transforms raw One-Class SVM decision_function output into a calibrated
    Risk Score in the range [0.0, 1.0].
    
    Since One-Class SVM decision_function output typically spans from +0.05 (inlier)
    down to -0.10 (outlier), an alpha scaling factor of ~25.0 maps this cleanly:
    - High inlier (d > +0.04)  -> Risk < 0.25 (GREEN)
    - Boundary    (d ~ 0.00)   -> Risk ~ 0.50 (YELLOW)
    - Outlier     (d < -0.08)  -> Risk > 0.85 (RED)
    """
    
    def __init__(self, alpha: float = 25.0, shift: float = 0.0):
        self.alpha = alpha
        self.shift = shift

    def distance_to_risk(self, decision_distance: float) -> float:
        """
        Applies calibrated inverted sigmoid:
        R = 1.0 / (1.0 + exp(alpha * (d - shift)))
        """
        val = self.alpha * (decision_distance - self.shift)
        val = np.clip(val, -20.0, 20.0)
        risk = 1.0 / (1.0 + np.exp(val))
        return float(np.clip(risk, 0.0, 1.0))

    def batch_distance_to_risk(self, distances: np.ndarray) -> np.ndarray:
        val = self.alpha * (distances - self.shift)
        val = np.clip(val, -20.0, 20.0)
        return 1.0 / (1.0 + np.exp(val))

default_normalizer = ScoreNormalizer(alpha=25.0, shift=0.0)
