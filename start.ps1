# DepositGuard Launch Script
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "  DepositGuard: Centralized Security Deposit & FDR Management Portal" -ForegroundColor Green
Write-Host "  AICTE Regulation Bureau - Ministry of Education, Government of India" -ForegroundColor White
Write-Host "  Official Portal for AICTE Officers & Issuing Bank Nodal Officers" -ForegroundColor Yellow
Write-Host "=========================================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- --host 127.0.0.1 --port 5173"

Write-Host "`nDepositGuard is running!" -ForegroundColor Green
Write-Host "Portal: http://127.0.0.1:5173/" -ForegroundColor Yellow
Write-Host "API Docs: http://127.0.0.1:8000/docs`n" -ForegroundColor Yellow
