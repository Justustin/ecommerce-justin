# Test Price Validation
# This tests that users cannot submit fake prices

Write-Host "🧪 Testing Price Validation" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3004"  # Group Buying Service
$sessionId = "test-session-123"  # Use your actual session ID
$correctPrice = 100000

Write-Host "Test 1: Submitting INCORRECT price (should fail)" -ForegroundColor Yellow
Write-Host "------------------------------------------------" -ForegroundColor Yellow

$fakePriceBody = @{
    groupSessionId = $sessionId
    userId = "hacker-user-" + (Get-Random -Maximum 10000)
    quantity = 1
    variantId = $null
    unitPrice = 1  # Fake low price
    totalPrice = 1
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/group-buying/join" `
        -Method Post `
        -ContentType "application/json" `
        -Body $fakePriceBody `
        -ErrorAction Stop

    Write-Host "❌ FAIL: Request succeeded when it should have failed!" -ForegroundColor Red
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Red
}
catch {
    $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorMessage.error -like "*Invalid unit price*") {
        Write-Host "✅ PASS: Price validation working!" -ForegroundColor Green
        Write-Host "Error: $($errorMessage.error)" -ForegroundColor Gray
    }
    else {
        Write-Host "⚠️ UNEXPECTED ERROR: $($errorMessage.error)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Test 2: Submitting CORRECT price (should succeed)" -ForegroundColor Yellow
Write-Host "------------------------------------------------" -ForegroundColor Yellow

$correctPriceBody = @{
    groupSessionId = $sessionId
    userId = "legit-user-" + (Get-Random -Maximum 10000)
    quantity = 1
    variantId = $null
    unitPrice = $correctPrice
    totalPrice = $correctPrice
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/group-buying/join" `
        -Method Post `
        -ContentType "application/json" `
        -Body $correctPriceBody `
        -ErrorAction Stop

    Write-Host "✅ PASS: Valid price accepted!" -ForegroundColor Green
    Write-Host "Participant ID: $($response.data.participant.id)" -ForegroundColor Gray
}
catch {
    $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "⚠️ Request failed: $($errorMessage.error)" -ForegroundColor Yellow
    Write-Host "Note: This might be because the session doesn't exist" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Test 3: Submitting INCORRECT total (correct unit price)" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------" -ForegroundColor Yellow

$wrongTotalBody = @{
    groupSessionId = $sessionId
    userId = "hacker-user-2-" + (Get-Random -Maximum 10000)
    quantity = 2
    unitPrice = $correctPrice
    totalPrice = $correctPrice  # Should be 200000 for quantity 2
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/group-buying/join" `
        -Method Post `
        -ContentType "application/json" `
        -Body $wrongTotalBody `
        -ErrorAction Stop

    Write-Host "❌ FAIL: Request succeeded with wrong total!" -ForegroundColor Red
}
catch {
    $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorMessage.error -like "*Total price must be*") {
        Write-Host "✅ PASS: Total price validation working!" -ForegroundColor Green
        Write-Host "Error: $($errorMessage.error)" -ForegroundColor Gray
    }
    else {
        Write-Host "⚠️ UNEXPECTED ERROR: $($errorMessage.error)" -ForegroundColor Yellow
    }
}

Write-Host ""
