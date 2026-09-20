from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from app.schemas.enrollment import RawKeyEvent, RawWindowPayload

# Top 10 English Digraphs
TOP_DIGRAPHS = [
    ("KeyT", "KeyH"), ("KeyH", "KeyE"), ("KeyI", "KeyN"), 
    ("KeyE", "KeyR"), ("KeyA", "KeyN"), ("KeyR", "KeyE"),
    ("KeyO", "KeyN"), ("KeyA", "KeyT"), ("KeyE", "KeyN"), 
    ("KeyN", "KeyD")
]

FEATURE_NAMES = [
    "dwell_mean", "dwell_std", "dwell_median", "dwell_iqr",
    "flight_dd_mean", "flight_dd_std",
    "flight_ud_mean", "flight_ud_std",
    "wpm", "pause_ratio", "pause_count",
    "digraph_0_mean", "digraph_1_mean", "digraph_2_mean", "digraph_3_mean"
]

class KeystrokeFeatureExtractor:
    """
    Extracts statistical non-reversible timing features from keystroke down/up events.
    Zero raw alphanumeric text is stored or returned.
    """
    
    @staticmethod
    def validate_quality(payload: RawWindowPayload) -> Tuple[bool, str]:
        events = payload.events
        n = len(events)
        
        if n < 8:
            return False, "REJECT_TOO_SHORT"
            
        if payload.paste_detected:
            return False, "REJECT_PASTE"
            
        if payload.backspace_count and (payload.backspace_count / max(1, n)) > 0.25:
            return False, "REJECT_BACKSPACE"
            
        # Check timestamps consistency
        dwells = [max(0.0, e.up_ts - e.down_ts) for e in events if e.up_ts >= e.down_ts]
        if not dwells or np.var(dwells) < 1.0: # Macro / bot detection check
            return False, "REJECT_INVALID_VARIANCE"
            
        return True, "ACCEPT"

    @classmethod
    def extract_features(cls, events: List[RawKeyEvent], duration_ms: float = 5000.0) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Calculates 15-dimensional numeric feature vector and dictionary summary.
        """
        if len(events) < 2:
            empty_vec = np.zeros(len(FEATURE_NAMES), dtype=np.float64)
            return empty_vec, {name: 0.0 for name in FEATURE_NAMES}

        # 1. Dwell Times (Hold duration)
        dwell_times = []
        for e in events:
            hold = max(10.0, min(1000.0, e.up_ts - e.down_ts))
            dwell_times.append(hold)
            
        dwell_arr = np.array(dwell_times, dtype=np.float64)
        dwell_mean = float(np.mean(dwell_arr))
        dwell_std = float(np.std(dwell_arr)) if len(dwell_arr) > 1 else 0.0
        dwell_median = float(np.median(dwell_arr))
        q75, q25 = np.percentile(dwell_arr, [75, 25])
        dwell_iqr = float(q75 - q25)

        # 2. Flight Times: Down-to-Down (DD) and Up-to-Down (UD)
        flight_dd = []
        flight_ud = []
        pauses = 0
        pause_total_time = 0.0

        for i in range(len(events) - 1):
            e_curr = events[i]
            e_next = events[i+1]
            
            dd = e_next.down_ts - e_curr.down_ts
            ud = e_next.down_ts - e_curr.up_ts
            
            if 0.0 <= dd <= 3000.0:
                flight_dd.append(dd)
            if -500.0 <= ud <= 3000.0:
                flight_ud.append(ud)
                
            if ud > 500.0:
                pauses += 1
                pause_total_time += min(2000.0, ud)

        dd_arr = np.array(flight_dd, dtype=np.float64) if flight_dd else np.array([120.0])
        ud_arr = np.array(flight_ud, dtype=np.float64) if flight_ud else np.array([40.0])
        
        flight_dd_mean = float(np.mean(dd_arr))
        flight_dd_std = float(np.std(dd_arr)) if len(dd_arr) > 1 else 0.0
        flight_ud_mean = float(np.mean(ud_arr))
        flight_ud_std = float(np.std(ud_arr)) if len(ud_arr) > 1 else 0.0

        # 3. Typing Speed & Pause Ratio
        total_time_min = max(0.01, duration_ms / 60000.0)
        wpm = float((len(events) / 5.0) / total_time_min)
        pause_ratio = float(pause_total_time / max(1.0, duration_ms))
        pause_count = float(pauses)

        # 4. Top Digraph Latencies
        digraph_means = [flight_dd_mean] * 4
        for d_idx, (k1, k2) in enumerate(TOP_DIGRAPHS[:4]):
            matched_d = []
            for i in range(len(events) - 1):
                # Anonymized key comparisons
                if (events[i].key == k1 and events[i+1].key == k2) or (events[i].key.endswith(k1[-1:]) and events[i+1].key.endswith(k2[-1:])):
                    matched_d.append(events[i+1].down_ts - events[i].down_ts)
            if matched_d:
                digraph_means[d_idx] = float(np.mean(matched_d))

        feature_dict = {
            "dwell_mean": round(dwell_mean, 2),
            "dwell_std": round(dwell_std, 2),
            "dwell_median": round(dwell_median, 2),
            "dwell_iqr": round(dwell_iqr, 2),
            "flight_dd_mean": round(flight_dd_mean, 2),
            "flight_dd_std": round(flight_dd_std, 2),
            "flight_ud_mean": round(flight_ud_mean, 2),
            "flight_ud_std": round(flight_ud_std, 2),
            "wpm": round(wpm, 1),
            "pause_ratio": round(pause_ratio, 3),
            "pause_count": pause_count,
            "digraph_0_mean": round(digraph_means[0], 2),
            "digraph_1_mean": round(digraph_means[1], 2),
            "digraph_2_mean": round(digraph_means[2], 2),
            "digraph_3_mean": round(digraph_means[3], 2),
            "n_keystrokes": len(events)
        }

        feature_vector = np.array([feature_dict[name] for name in FEATURE_NAMES], dtype=np.float64)
        return feature_vector, feature_dict
