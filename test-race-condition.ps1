# Test Race Condition Protection
# This tests that users cannot join the same session multiple times

Write-Host "Testing Race Condition Protection" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:3004"  # Group Buying Service
$sessionId = "test-session-" + (Get-Random -Maximum 10000)
$userId = "test-user-" + (Get-Random -Maximum 10000)

Write-Host "Creating test session first..." -ForegroundColor Yellow

# Step 1: Create a test group session
$createSessionBody = @{
    productId = "test-product-123"
    factoryId = "test-factory-123"
    sessionCode = "TEST-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    targetMoq = 10
    groupPrice = 100000
    endTime = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/group-buying" `
        -Method Post `
        -ContentType "application/json" `
        -Body $createSessionBody `
        -ErrorAction Stop

    $sessionId = $createResponse.data.id
    Write-Host "[OK] Session created: $sessionId" -ForegroundColor Green
}
catch {
    Write-Host "[WARN] Could not create session. Using test ID instead." -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Sending 5 concurrent join requests..." -ForegroundColor Yellow

# Step 2: Test concurrent joins
$joinBody = @{
    userId = $userId
    quantity = 1
    unitPrice = 100000
    totalPrice = 100000
} | ConvertTo-Json

$jobs = @()
$results = @()

# Send 5 concurrent requests
for ($i = 1; $i -le 5; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($url, $body)
        try {
            $response = Invoke-RestMethod -Uri $url `
                -Method Post `
                -ContentType "application/json" `
                -Body $body `
                -ErrorAction Stop

            return @{
                Success = $true
                Data = $response
                Error = $null
            }
        }
        catch {
            return @{
                Success = $false
                Data = $null
                Error = $_.Exception.Message
            }
        }
    } -ArgumentList "$baseUrl/api/group-buying/$sessionId/join", $joinBody
}

# Wait for all jobs to complete
$jobs | Wait-Job | Out-Null

# Collect results
foreach ($job in $jobs) {
    $result = Receive-Job -Job $job
    $results += $result
    Remove-Job -Job $job
}

Write-Host ""
Write-Host "Results:" -ForegroundColor Cyan
Write-Host "--------" -ForegroundColor Cyan

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$failureCount = ($results | Where-Object { $_.Success -eq $false }).Count

for ($i = 0; $i -lt $results.Count; $i++) {
    if ($results[$i].Success) {
        Write-Host "Request $($i+1): SUCCESS" -ForegroundColor Green
    }
    else {
        Write-Host "Request $($i+1): FAILED - $($results[$i].Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "--------" -ForegroundColor Cyan
Write-Host "[PASS] Successes: $successCount" -ForegroundColor Green
Write-Host "[FAIL] Failures: $failureCount" -ForegroundColor Red
Write-Host ""

# Verify the fix
if ($successCount -eq 1 -and $failureCount -eq 4) {
    Write-Host "*** PASS: Race condition protection working!" -ForegroundColor Green
    Write-Host "Only 1 join succeeded, 4 were correctly rejected." -ForegroundColor Green
}
elseif ($successCount -gt 1) {
    Write-Host "*** FAIL: Multiple joins succeeded! Race condition exists." -ForegroundColor Red
    Write-Host "Expected: 1 success, 4 failures" -ForegroundColor Red
    Write-Host "Got: $successCount successes, $failureCount failures" -ForegroundColor Red
}
else {
    Write-Host "*** WARNING: All requests failed. Check if service is running." -ForegroundColor Yellow
}

Write-Host ""
