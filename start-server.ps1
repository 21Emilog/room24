# Room Rental Platform - Mobile Server Launcher
# Run this script to start the server for mobile testing

Write-Host "Starting Room Rental Platform Server..." -ForegroundColor Green
Write-Host ""
Write-Host "Your LAN IP: 10.159.50.90" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access from your phone:" -ForegroundColor Yellow
Write-Host "  http://10.159.50.90:8080" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Change to build directory and start Python HTTP server
Set-Location -Path "$PSScriptRoot\build"
python -m http.server 8080 --bind 0.0.0.0
