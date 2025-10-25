# Quick Service Health Check for Windows PowerShell
# Run this after starting all services

Write-Host "Quick Functionality Test" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{Name="Auth Service"; Port=3001},
    @{Name="Product Service"; Port=3002},
    @{Name="Factory Service"; Port=3003},
    @{Name="Group Buying Service"; Port=3004},
    @{Name="Order Service"; Port=3005},
    @{Name="Payment Service"; Port=3006},
    @{Name="Notification Service"; Port=3007},
    @{Name="Logistics Service"; Port=3008},
    @{Name="Address Service"; Port=3009},
    @{Name="Wallet Service"; Port=3010},
    @{Name="Warehouse Service"; Port=3011},
    @{Name="WhatsApp Service"; Port=3012}
)

Write-Host "Checking services..." -ForegroundColor Yellow
Write-Host ""

foreach ($service in $services) {
    $name = $service.Name
    $port = $service.Port
    $url = "http://localhost:$port/health"

    try {
        $response = Invoke-RestMethod -Uri $url -TimeoutSec 2 -ErrorAction Stop
        if ($response.status -eq "healthy") {
            Write-Host "[OK] $name (port $port) - $($response.service)" -ForegroundColor Green
        } else {
            Write-Host "[OK] $name (port $port)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "[--] $name not responding on port $port" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test the fixes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Race Condition Protection:" -ForegroundColor White
Write-Host "   Run: .\test-race-condition.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Price Validation:" -ForegroundColor White
Write-Host "   Run: .\test-price-validation.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Webhook Idempotency:" -ForegroundColor White
Write-Host "   Run: .\test-webhook-idempotency.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Order Creation:" -ForegroundColor White
Write-Host "   Run: .\test-order-creation.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Full testing guide: TESTING_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
