# Complete Group Buying Flow Test
# This script tests the full group buying workflow

Write-Host "Testing Group Buying Flow" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

$groupBuyingUrl = "http://localhost:3004"
$userId = "eb093914-48d9-4b32-bd76-96c99bbdb1a5"

# Step 1: Create a new group buying session
Write-Host "Step 1: Creating group buying session..." -ForegroundColor Yellow

$createSessionBody = @{
    productId = "9d0280b8-fb12-48c9-8727-4f1572b5fe40"
    factoryId = "dda326af-bdbd-4943-8090-4057c4517711"
    sessionCode = "TEST-" + (Get-Date -Format "yyyyMMddHHmmss")
    targetMoq = 5
    groupPrice = 140000
    endTime = (Get-Date).AddHours(24).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json

try {
    $sessionResponse = Invoke-RestMethod -Uri "$groupBuyingUrl/api/group-buying" `
        -Method Post `
        -ContentType "application/json" `
        -Body $createSessionBody `
        -ErrorAction Stop

    $sessionId = $sessionResponse.data.id
    Write-Host "[OK] Session created: $sessionId" -ForegroundColor Green
    Write-Host "    Session Code: $($sessionResponse.data.session_code)" -ForegroundColor Gray
    Write-Host "    Target MOQ: $($sessionResponse.data.target_moq)" -ForegroundColor Gray
    Write-Host "    Group Price: $($sessionResponse.data.group_price)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "[FAIL] Failed to create session" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Join the session
Write-Host "Step 2: User joining session..." -ForegroundColor Yellow

$joinBody = @{
    userId = $userId
    quantity = 2
    unitPrice = 140000
    totalPrice = 280000
    shippingAddress = @{
        postalCode = "12190"
    }
} | ConvertTo-Json

try {
    $joinResponse = Invoke-RestMethod -Uri "$groupBuyingUrl/api/group-buying/$sessionId/join" `
        -Method Post `
        -ContentType "application/json" `
        -Body $joinBody `
        -ErrorAction Stop

    Write-Host "[OK] Successfully joined session" -ForegroundColor Green
    Write-Host "    Participant ID: $($joinResponse.data.participant.id)" -ForegroundColor Gray
    Write-Host "    Payment ID: $($joinResponse.data.payment.id)" -ForegroundColor Gray
    Write-Host "    Payment Status: $($joinResponse.data.payment.payment_status)" -ForegroundColor Gray
    Write-Host "    Escrow: $($joinResponse.data.payment.is_in_escrow)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "[FAIL] Failed to join session" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error: $($errorObj.error)" -ForegroundColor Red
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# Step 3: Check session stats
Write-Host "Step 3: Checking session statistics..." -ForegroundColor Yellow

try {
    $statsResponse = Invoke-RestMethod -Uri "$groupBuyingUrl/api/group-buying/$sessionId/stats" `
        -Method Get `
        -ErrorAction Stop

    Write-Host "[OK] Session Statistics:" -ForegroundColor Green
    Write-Host "    Total Participants: $($statsResponse.data.totalParticipants)" -ForegroundColor Gray
    Write-Host "    Total Quantity: $($statsResponse.data.totalQuantity)" -ForegroundColor Gray
    Write-Host "    MOQ Progress: $($statsResponse.data.moqProgress)%" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "[WARN] Could not fetch stats" -ForegroundColor Yellow
}

# Step 4: Test race condition - try to join same session again
Write-Host "Step 4: Testing race condition (joining again)..." -ForegroundColor Yellow

try {
    $duplicateJoinResponse = Invoke-RestMethod -Uri "$groupBuyingUrl/api/group-buying/$sessionId/join" `
        -Method Post `
        -ContentType "application/json" `
        -Body $joinBody `
        -ErrorAction Stop

    Write-Host "[WARN] Duplicate join succeeded (race condition exists!)" -ForegroundColor Red
}
catch {
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorObj.error -like "*already joined*") {
            Write-Host "[PASS] Race condition protection working!" -ForegroundColor Green
            Write-Host "    Error: $($errorObj.error)" -ForegroundColor Gray
        } else {
            Write-Host "[WARN] Unexpected error: $($errorObj.error)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Test Summary:" -ForegroundColor Cyan
Write-Host "-------------" -ForegroundColor Cyan
Write-Host "Session ID: $sessionId" -ForegroundColor Gray
Write-Host "You can now:" -ForegroundColor Gray
Write-Host "  1. Add more participants to reach MOQ" -ForegroundColor Gray
Write-Host "  2. Process expired sessions: POST $groupBuyingUrl/api/group-buying/process-expired" -ForegroundColor Gray
Write-Host "  3. Check participants: GET $groupBuyingUrl/api/group-buying/$sessionId/participants" -ForegroundColor Gray
Write-Host ""
