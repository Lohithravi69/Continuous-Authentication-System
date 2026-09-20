import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import asyncio
import numpy as np
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import init_db

@pytest.mark.asyncio
async def test_complete_continuous_auth_pipeline():
    await init_db()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "HEALTHY"
        
        # 2. Register new user with unique username
        import uuid
        uid = str(uuid.uuid4())[:8]
        reg_payload = {
            "username": f"user_{uid}",
            "email": f"user_{uid}@example.com",
            "password": "SecurePassword123!",
            "consent": True
        }
        res = await client.post("/v1/auth/register", json=reg_payload)
        assert res.status_code == 201
        data = res.json()
        token = data["access_token"]
        session_id = data["session_id"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Start Enrollment
        res = await client.post("/v1/enroll/start", headers=headers)
        assert res.status_code == 200
        enroll_id = res.json()["enroll_session_id"]
        
        # 4. Submit 3 Enrollment Windows (simulated consistent genuine typing with natural human jitter)
        np.random.seed(42)
        for i in range(3):
            events = []
            curr_ts = 1000.0 + i * 10000.0
            for k in range(25):
                jitter = float(np.random.normal(0, 6.0))
                down = curr_ts + k * 120.0 + jitter
                up = down + 90.0 + float(np.random.normal(0, 4.0))
                events.append({"key": f"Key{chr(65 + (k % 26))}", "down_ts": down, "up_ts": up})
                
            payload = {
                "enroll_session_id": enroll_id,
                "window_index": i + 1,
                "payload": {
                    "events": events,
                    "client_duration_ms": 5000.0,
                    "backspace_count": 0,
                    "paste_detected": False
                }
            }
            res = await client.post("/v1/enroll/submit", json=payload, headers=headers)
            assert res.status_code == 200
            assert res.json()["quality"] == "ACCEPT"
            
        # 5. Complete Enrollment (Train One-Class SVM)
        res = await client.post(f"/v1/enroll/complete?enroll_session_id={enroll_id}", headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] == "READY"
        assert res.json()["model_version"] == "v1.0"
        
        # 6. Active Telemetry: Normal Genuine Window (Should be GREEN / Allow)
        genuine_events = []
        curr_ts = 50000.0
        for k in range(20):
            jitter = float(np.random.normal(0, 5.0))
            down = curr_ts + k * 120.0 + jitter
            up = down + 90.0 + float(np.random.normal(0, 3.0))
            genuine_events.append({"key": f"Key{chr(65 + (k % 26))}", "down_ts": down, "up_ts": up})
            
        telemetry_payload = {
            "session_id": session_id,
            "window_index": 1,
            "payload": {
                "events": genuine_events,
                "client_duration_ms": 5000.0
            }
        }
        res = await client.post("/v1/telemetry/window", json=telemetry_payload, headers=headers)
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["decision"] == "ALLOW"
        assert res_data["state"] == "GREEN"
        assert res_data["strike_count"] == 0
        
        # 7. Active Telemetry: 15-Key Gate (< 15 keys -> IDLE state, zero penalty)
        idle_events = [{"key": "KeyA", "down_ts": 100.0 + i*100, "up_ts": 190.0 + i*100} for i in range(5)]
        res = await client.post("/v1/telemetry/window", json={
            "session_id": session_id,
            "window_index": 2,
            "payload": {"events": idle_events, "client_duration_ms": 5000.0}
        }, headers=headers)
        assert res.status_code == 200
        assert res.json()["decision"] == "IDLE"
        assert res.json()["strike_count"] == 0
        
        # 8. Active Telemetry: Impostor / Anomaly Window (Should trigger Yellow / Red)
        impostor_events = []
        curr_ts = 60000.0
        for k in range(20):
            down = curr_ts + k * 280.0 + float(np.random.normal(0, 15.0)) # Slow erratic flight
            up = down + 240.0 + float(np.random.normal(0, 15.0))          # Long abnormal dwell
            impostor_events.append({"key": f"Key{chr(65 + (k % 26))}", "down_ts": down, "up_ts": up})
            
        res = await client.post("/v1/telemetry/window", json={
            "session_id": session_id,
            "window_index": 3,
            "payload": {"events": impostor_events, "client_duration_ms": 5000.0}
        }, headers=headers)
        assert res.status_code == 200
        anom_data = res.json()
        assert anom_data["state"] in ["YELLOW", "RED"]
        assert anom_data["strike_count"] >= 1
        
        # 9. Step-Up Verification Test (Pass -> Strikes Reset to 0)
        res = await client.post("/v1/session/stepup", json={
            "session_id": session_id,
            "password_or_answer": "SecurePassword123!"
        }, headers=headers)
        assert res.status_code == 200
        assert res.json()["success"] is True
        assert res.json()["strike_count"] == 0
        
        # 10. Step-Up 3 Failed Attempts -> Server-Side Lockout
        for attempt in range(3):
            res = await client.post("/v1/session/stepup", json={
                "session_id": session_id,
                "password_or_answer": "WrongPassword!!!"
            }, headers=headers)
            
        assert res.json()["session_locked"] is True
        
        # 11. Verify subsequent API call returns 423 Locked
        res = await client.get("/v1/auth/me", headers=headers)
        assert res.status_code == 423
        
        # 12. Biometric Evaluation Report Test
        # Create separate clean session for evaluation test
        eval_login = await client.post("/v1/auth/login", json={
            "username": f"user_{uid}",
            "password": "SecurePassword123!"
        })
        eval_token = eval_login.json()["access_token"]
        eval_headers = {"Authorization": f"Bearer {eval_token}"}
        
        eval_res = await client.get("/v1/evaluation/report", headers=eval_headers)
        assert eval_res.status_code == 200
        eval_data = eval_res.json()
        assert "metrics" in eval_data
        assert "roc_curve" in eval_data
        assert eval_data["metrics"]["eer"] >= 0.0
        assert eval_data["metrics"]["roc_auc"] >= 0.5
        print("\nAll 12 Automated Pipeline Tests Passed Successfully!")

if __name__ == "__main__":
    asyncio.run(test_complete_continuous_auth_pipeline())
