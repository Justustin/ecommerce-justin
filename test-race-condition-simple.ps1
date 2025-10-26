# Simple Race Condition Test
# Tests that the same user cannot join a session multiple times concurrently

Write-Host "Testing Race Condition Protection" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Use an existing active session ID or create one first
$sessionId = Read-Host "Enter an active session ID (or press Enter to use test ID)"
if ([string]::IsNullOrWhiteSpace($sessionId)) {
    $sessionId = "a1b2c3d4-e5f6-7890-1234-567890abcdef"
    Write-Host "Using test session ID: $sessionId" -ForegroundColor Yellow
}

$baseUrl = "http://localhost:3004"
$userId = "eb093914-48d9-4b32-bd76-96c99bbdb1a5"

Write-Host ""
Write-Host "Sending 5 concurrent join requests..." -ForegroundColor Yellow
Write-Host ""

# Prepare the join request body
$joinBody = @{
    userId = $userId
    quantity = 1
    unitPrice = 140000
    totalPrice = 140000
    shippingAddress = @{
        postalCode = "12190"
    }
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
            $errorMsg = if ($_.ErrorDetails.Message) {
                ($_.ErrorDetails.Message | ConvertFrom-Json).error
            } else {
                $_.Exception.Message
            }
            return @{
                Success = $false
                Data = $null
                Error = $errorMsg
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

Write-Host "Results:" -ForegroundColor Cyan
Write-Host "--------" -ForegroundColor Cyan

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$failureCount = ($results | Where-Object { $_.Success -eq $false }).Count

for ($i = 0; $i -lt $results.Count; $i++) {
    if ($results[$i].Success) {
        Write-Host "Request $($i+1): [PASS] SUCCESS" -ForegroundColor Green
    }
    else {
        Write-Host "Request $($i+1): [FAIL] $($results[$i].Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "--------" -ForegroundColor Cyan
Write-Host "Successes: $successCount" -ForegroundColor $(if ($successCount -eq 1) { "Green" } else { "Yellow" })
Write-Host "Failures: $failureCount" -ForegroundColor Gray
Write-Host ""

# Verify the fix
if ($successCount -eq 1 -and $failureCount -eq 4) {
    Write-Host "[PASS] Race condition protection working correctly!" -ForegroundColor Green
    Write-Host "Only 1 join succeeded, 4 were correctly rejected." -ForegroundColor Green
}
elseif ($successCount -gt 1) {
    Write-Host "[FAIL] Multiple joins succeeded! Race condition exists." -ForegroundColor Red
    Write-Host "Expected: 1 success, 4 failures" -ForegroundColor Red
    Write-Host "Got: $successCount successes, $failureCount failures" -ForegroundColor Red
}
else {
    Write-Host "[WARN] All requests failed. Check if session exists and is active." -ForegroundColor Yellow
}

Write-Host ""
