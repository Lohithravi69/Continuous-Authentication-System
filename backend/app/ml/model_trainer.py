import os
import joblib
import numpy as np
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from typing import Tuple, Optional, Dict, Any
from app.core.config import settings
from app.ml.normalizer import default_normalizer

# Biometric human variance floors for robust intra-session profiling
STD_FLOORS = np.array([
    15.0, 8.0, 15.0, 10.0,  # Dwells (mean, std, median, iqr)
    30.0, 15.0,             # Flight DD (mean, std)
    25.0, 15.0,             # Flight UD (mean, std)
    20.0, 0.2, 1.0,         # WPM, pause ratio, pause count
    30.0, 30.0, 30.0, 30.0  # Digraphs
], dtype=np.float64)

class ModelArtifactManager:
    """
    Manages training, persistence, and loading of user-specific One-Class SVM models.
    """
    
    @staticmethod
    def get_paths(user_id: str, version: str = "v1.0") -> Tuple[str, str]:
        model_filename = f"user_{user_id}_{version}.joblib"
        scaler_filename = f"user_{user_id}_{version}_scaler.joblib"
        model_path = os.path.join(settings.MODELS_DIR, model_filename)
        scaler_path = os.path.join(settings.MODELS_DIR, scaler_filename)
        return model_path, scaler_path

    @classmethod
    def train_user_profile(
        cls, 
        user_id: str, 
        feature_matrix: np.ndarray, 
        version: str = "v1.0",
        nu: float = 0.05,
        gamma: float = 0.08
    ) -> Tuple[str, str, Dict[str, Any]]:
        """
        Fits a StandardScaler and OneClassSVM(kernel='rbf', nu=nu, gamma=gamma)
        on the enrolled user feature vectors and persists the artifact.
        """
        augmented = [feature_matrix]
        for _ in range(10):
            noise = np.random.normal(0, 0.35 * STD_FLOORS, size=feature_matrix.shape)
            augmented.append(feature_matrix + noise)
            
        train_matrix = np.vstack(augmented)
            
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(train_matrix)
        
        # Fit One-Class SVM with calibrated RBF kernel
        model = OneClassSVM(kernel="rbf", gamma=gamma, nu=nu)
        model.fit(X_scaled)
        
        model_path, scaler_path = cls.get_paths(user_id, version)
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        
        distances = model.decision_function(X_scaled)
        risks = default_normalizer.batch_distance_to_risk(distances)
        
        stats = {
            "n_samples": len(train_matrix),
            "mean_train_risk": float(np.mean(risks)),
            "max_train_risk": float(np.max(risks)),
            "model_type": "OneClassSVM",
            "kernel": "rbf",
            "nu": nu,
            "gamma": gamma
        }
        
        return model_path, scaler_path, stats

    @classmethod
    def score_window(
        cls, 
        user_id: str, 
        feature_vector: np.ndarray, 
        version: str = "v1.0"
    ) -> Tuple[float, float]:
        """
        Loads user model and scaler, computes raw distance and normalized Risk Score [0.0, 1.0].
        Returns (raw_distance, risk_score).
        """
        model_path, scaler_path = cls.get_paths(user_id, version)
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Model artifact not found for user {user_id}")
            
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        X_scaled = scaler.transform(feature_vector.reshape(1, -1))
        distance = float(model.decision_function(X_scaled)[0])
        risk = default_normalizer.distance_to_risk(distance)
        
        return distance, risk
