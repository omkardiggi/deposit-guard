@echo off
echo =========================================================================
echo   DepositGuard: Centralized Security Deposit & FDR Management Portal
echo   AICTE Regulation Bureau - Ministry of Education, Government of India
echo   Official Portal for AICTE Officers & Issuing Bank Nodal Officers
echo =========================================================================
echo.

echo Starting DepositGuard Backend (FastAPI on http://127.0.0.1:8000)...
start "DepositGuard Backend" cmd /k "cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting DepositGuard Frontend (Vite React on http://127.0.0.1:5173)...
start "DepositGuard Frontend" cmd /k "cd frontend && npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo Both servers initiated!
echo Access the portal at: http://127.0.0.1:5173/
echo API documentation at: http://127.0.0.1:8000/docs
echo =========================================================================
pause
