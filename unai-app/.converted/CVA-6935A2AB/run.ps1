# One-Click Local Startup Script for Windows PowerShell
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting Bcone SAP Supply Chain Agentic AI Platform     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if .venv exists
if (-Not (Test-Path ".\.venv\Scripts\activate.ps1")) {
    Write-Host "Virtual environment not found. Creating .venv..." -ForegroundColor Yellow
    python -m venv .venv
    .\.venv\Scripts\pip install -r requirements.txt
}

# Run pytest verification
Write-Host "`nRunning automated pytest test suite..." -ForegroundColor Green
.\.venv\Scripts\pytest tests/
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Some tests failed. Proceeding with caution..." -ForegroundColor Yellow
} else {
    Write-Host "All tests passed successfully (100% pass rate)!" -ForegroundColor Green
}

# Start FastAPI in background
Write-Host "`nStarting FastAPI REST Backend on http://localhost:8000..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\.venv\Scripts\activate; uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload"

# Start Streamlit in foreground
Write-Host "Starting Streamlit Control Tower on http://localhost:8501..." -ForegroundColor Cyan
Start-Process "http://localhost:8501"
.\.venv\Scripts\streamlit run src/ui/app.py --server.port 8501
