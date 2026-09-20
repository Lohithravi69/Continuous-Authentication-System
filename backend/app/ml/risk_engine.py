from datetime import datetime, timezone
from typing import Tuple, Dict, Any
from app.core.config import settings

class RiskPolicyEngine:
    """
    Decoupled Policy Engine translating normalized ML Risk Scores into application actions:
    GREEN (Allow), YELLOW (Warning / +1 Strike), RED (Step-Up Challenge).
    Also manages strike decay and session status transitions.
    """

    @staticmethod
    def evaluate(
        risk_score: float,
        current_strikes: int,
        last_clean_ts: datetime,
        now_ts: datetime = None
    ) -> Tuple[str, str, int, datetime, str]:
        """
        Returns (state, decision, new_strikes, updated_last_clean_ts, message)
        state: "GREEN" | "YELLOW" | "RED"
        decision: "ALLOW" | "WARN" | "STEP_UP"
        """
        if now_ts is None:
            now_ts = datetime.now(timezone.utc)
        elif now_ts.tzinfo is None:
            now_ts = now_ts.replace(tzinfo=timezone.utc)
            
        if last_clean_ts is None:
            last_clean_ts = now_ts
        elif last_clean_ts.tzinfo is None:
            last_clean_ts = last_clean_ts.replace(tzinfo=timezone.utc)
            
        elapsed_clean_sec = (now_ts - last_clean_ts).total_seconds()
        
        # 1. LOW RISK (GREEN): Consistent typing behavior
        if risk_score < settings.GREEN_THRESHOLD:
            new_strikes = current_strikes
            # Apply Strike Decay: if user has accumulated strikes but types normally for 30s
            if current_strikes > 0 and elapsed_clean_sec >= settings.STRIKE_DECAY_CLEAN_SEC:
                new_strikes = max(0, current_strikes - 1)
                last_clean_ts = now_ts # reset decay timer after decay
                
            return "GREEN", "ALLOW", new_strikes, last_clean_ts, "Behavior consistent with user profile."

        # 2. MEDIUM RISK (YELLOW): Mild deviation, increment strike
        elif settings.GREEN_THRESHOLD <= risk_score <= settings.YELLOW_THRESHOLD:
            new_strikes = current_strikes + 1
            last_clean_ts = now_ts # reset clean timer on anomaly
            
            if new_strikes >= settings.MAX_STRIKES_BEFORE_STEPUP:
                return "RED", "STEP_UP", new_strikes, last_clean_ts, f"Accumulated {new_strikes} security strikes. Step-Up authentication required."
            else:
                return "YELLOW", "WARN", new_strikes, last_clean_ts, f"Unusual typing pattern variance detected (Strike {new_strikes} of {settings.MAX_STRIKES_BEFORE_STEPUP})."

        # 3. HIGH RISK (RED): Immediate deviation / impostor profile
        else:
            new_strikes = current_strikes + 1
            last_clean_ts = now_ts
            return "RED", "STEP_UP", new_strikes, last_clean_ts, "High behavioral anomaly detected. Step-Up identity verification required."
