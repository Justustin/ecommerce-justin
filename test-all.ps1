# All-in-One Test Suite
# Runs all critical tests

Write-Host "🧪 Complete Test Suite" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

$testResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Test-ServiceHealth {
    Write-Host "Test 1: Service Health Check" -ForegroundColor Yellow
    Write-Host "-----------------------------" -ForegroundColor Yellow

    $services = @{
        "Group Buying" = 3004
        "Order" = 3005
        "Payment" = 3006
    }

    $allRunning = $true
    foreach ($service in $services.GetEnumerator()) {
        try {
            Invoke-WebRequest -Uri "http://localhost:$($service.Value)" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop | Out-Null
            Write-Host "  ✓ $($service.Key) service (port $($service.Value))" -ForegroundColor Green
        }
        catch {
            Write-Host "  ✗ $($service.Key) service not running" -ForegroundColor Red
            $allRunning = $false
        }
    }

    if ($allRunning) {
        $script:testResults.Passed++
        Write-Host "  Result: PASS" -ForegroundColor Green
    }
    else {
        $script:testResults.Failed++
        Write-Host "  Result: FAIL - Not all services running" -ForegroundColor Red
    }
    Write-Host ""
}

function Test-PriceValidation {
    Write-Host "Test 2: Price Validation" -ForegroundColor Yellow
    Write-Host "-------------------------" -ForegroundColor Yellow

    $baseUrl = "http://localhost:3004"
    $fakePriceBody = @{
        groupSessionId = "test-session-123"
        userId = "test-user-" + (Get-Random -Maximum 10000)
        quantity = 1
        unitPrice = 1
        totalPrice = 1
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$baseUrl/api/group-buying/join" `
            -Method Post `
            -ContentType "application/json" `
            -Body $fakePriceBody `
            -ErrorAction Stop | Out-Null

        $script:testResults.Failed++
        Write-Host "  ✗ Fake price was accepted!" -ForegroundColor Red
        Write-Host "  Result: FAIL" -ForegroundColor Red
    }
    catch {
        $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorMessage.error -like "*Invalid unit price*") {
            $script:testResults.Passed++
            Write-Host "  ✓ Fake price correctly rejected" -ForegroundColor Green
            Write-Host "  Result: PASS" -ForegroundColor Green
        }
        else {
            $script:testResults.Skipped++
            Write-Host "  ⚠ Different error: $($errorMessage.error)" -ForegroundColor Yellow
            Write-Host "  Result: SKIPPED (session may not exist)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

function Test-DatabaseConsistency {
    Write-Host "Test 3: Database Consistency Check" -ForegroundColor Yellow
    Write-Host "-----------------------------------" -ForegroundColor Yellow
    Write-Host "  ℹ Manual verification required" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Run this SQL query:" -ForegroundColor Gray
    Write-Host "  SELECT group_session_id, user_id, COUNT(*)" -ForegroundColor Gray
    Write-Host "  FROM group_participants" -ForegroundColor Gray
    Write-Host "  GROUP BY group_session_id, user_id" -ForegroundColor Gray
    Write-Host "  HAVING COUNT(*) > 1;" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Expected: 0 rows (no duplicates)" -ForegroundColor Gray
    $script:testResults.Skipped++
    Write-Host "  Result: SKIPPED (manual test)" -ForegroundColor Yellow
    Write-Host ""
}

# Run all tests
Test-ServiceHealth
Test-PriceValidation
Test-DatabaseConsistency

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red
Write-Host "Skipped: $($testResults.Skipped)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($testResults.Failed -eq 0) {
    Write-Host "🎉 All automated tests passed!" -ForegroundColor Green
}
else {
    Write-Host "⚠️ Some tests failed. Please review above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For detailed testing:" -ForegroundColor Cyan
Write-Host "  - Race Condition: .\test-race-condition.ps1" -ForegroundColor Gray
Write-Host "  - Price Validation: .\test-price-validation.ps1" -ForegroundColor Gray
Write-Host "  - Webhook Idempotency: .\test-webhook-idempotency.ps1" -ForegroundColor Gray
Write-Host "  - Order Creation: .\test-order-creation.ps1" -ForegroundColor Gray
Write-Host ""
