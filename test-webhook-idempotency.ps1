# Test Webhook Idempotency
# This tests that duplicate webhooks are not processed twice

Write-Host "🧪 Testing Webhook Idempotency" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3006"  # Payment Service
$callbackToken = "your-callback-token"  # Replace with your actual token

Write-Host "Sending webhook twice to test idempotency..." -ForegroundColor Yellow
Write-Host ""

$webhookBody = @{
    id = "test-webhook-" + (Get-Random -Maximum 10000)
    external_id = "order-test-123"
    user_id = "user-123"
    status = "PAID"
    amount = 100000
    paid_amount = 100000
    fees_paid_amount = 2000
    payment_method = "BANK_TRANSFER"
    payment_channel = "BCA"
    payment_destination = "1234567890"
    created = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    updated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    paid_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "x-callback-token" = $callbackToken
}

Write-Host "First webhook call..." -ForegroundColor Yellow
try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/webhooks/xendit" `
        -Method Post `
        -Headers $headers `
        -Body $webhookBody `
        -ErrorAction Stop

    Write-Host "✓ First call succeeded" -ForegroundColor Green
    Write-Host "Response: $($response1 | ConvertTo-Json)" -ForegroundColor Gray
}
catch {
    Write-Host "✗ First call failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Second webhook call (duplicate)..." -ForegroundColor Yellow

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/webhooks/xendit" `
        -Method Post `
        -Headers $headers `
        -Body $webhookBody `
        -ErrorAction Stop

    if ($response2.message -like "*Already processed*") {
        Write-Host "✅ PASS: Idempotency working!" -ForegroundColor Green
        Write-Host "Webhook was correctly identified as duplicate" -ForegroundColor Green
        Write-Host "Response: $($response2 | ConvertTo-Json)" -ForegroundColor Gray
    }
    else {
        Write-Host "⚠️ WARNING: Webhook processed again!" -ForegroundColor Yellow
        Write-Host "Response: $($response2 | ConvertTo-Json)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "✗ Second call failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 To verify in database:" -ForegroundColor Cyan
Write-Host "SELECT event_id, processed, created_at FROM webhook_events" -ForegroundColor Gray
Write-Host "WHERE event_id = 'your-webhook-id';" -ForegroundColor Gray
Write-Host ""
Write-Host "Expected: Only 1 row, processed = true" -ForegroundColor Gray
Write-Host ""
