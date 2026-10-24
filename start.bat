@echo off
echo =====================================================================
echo  VERIFIN // Trustworthy Multi-Agent Financial Research & Adjudication
echo  INNOVISE 2026 - Problem Statement 1
echo =====================================================================
echo.

echo [1/2] Starting Verifin Backend (FastAPI on http://127.0.0.1:8000)...
start "Verifin Backend" cmd /k ".\backend\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [2/2] Starting Verifin Frontend (Vite on http://localhost:5173)...
start "Verifin Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul
echo.
echo Launching Verifin in default browser...
start http://localhost:5173

echo.
echo Both servers running! Press any key in this window to exit launcher script (servers will keep running in their own windows).
pause >nul
