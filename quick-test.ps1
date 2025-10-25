# Quick Service Health Check for Windows PowerShell
# Run this after starting all services

Write-Host "🧪 Quick Functionality Test" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

$services = @{
    "Auth Service" = 3001
    "Product Service" = 3002
    "Factory Service" = 3003
    "Group Buying Service" = 3004
    "Order Service" = 3005
    "Payment Service" = 3006
    "Notification Service" = 3007
    "Logistics Service" = 3008
    "Address Service" = 3009
    "Wallet Service" = 3010
    "Warehouse Service" = 3011
    "WhatsApp Service" = 3012
}

Write-Host "📡 Checking services..." -ForegroundColor Yellow
Write-Host ""

foreach ($service in $services.GetEnumerator()) {
    $name = $service.Key
    $port = $service.Value
    $url = "http://localhost:$port"

    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        Write-Host "✓ $name (port $port)" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠ $name not running on port $port" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 To test the fixes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Race Condition Protection:" -ForegroundColor White
Write-Host "   Run: .\test-race-condition.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  Price Validation:" -ForegroundColor White
Write-Host "   Run: .\test-price-validation.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  Webhook Idempotency:" -ForegroundColor White
Write-Host "   Run: .\test-webhook-idempotency.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Full testing guide: TESTING_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
