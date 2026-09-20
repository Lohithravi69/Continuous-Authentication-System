# -*- coding: utf-8 -*-
"""
Single-command launcher for the Continuous Keystroke Dynamics Authentication System.
Starts the FastAPI backend on port 8000 and the Vite React frontend on port 5173.
"""

import subprocess
import sys
import os
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

def main():
    print("=" * 65)
    print("  CONTINUOUS KEYSTROKE BIOMETRICS AUTHENTICATION SYSTEM (v2.0)  ")
    print("=" * 65)
    print("\n[1/2] Launching FastAPI Backend on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR
    )

    time.sleep(2)

    print("[2/2] Launching Vite React Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR,
        shell=True
    )

    print("\n" + "=" * 65)
    print("  SYSTEM READY:")
    print("  • Frontend App:     http://localhost:5173")
    print("  • Backend API Docs: http://localhost:8000/docs")
    print("  • API Health:       http://localhost:8000/health")
    print("=" * 65)
    print("\nPress Ctrl+C to shut down both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
