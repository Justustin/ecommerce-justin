# Test Retry Logic
# This tests that service calls retry on temporary failures

Write-Host "🧪 Testing Retry Logic" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️ Manual Test Required" -ForegroundColor Yellow
Write-Host ""
Write-Host "To test retry logic:" -ForegroundColor White
Write-Host ""
Write-Host "1. Start watching the Group Buying service logs" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Stop the Payment service:" -ForegroundColor Gray
Write-Host "   (Press Ctrl+C in the Payment service terminal)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Try to join a session:" -ForegroundColor Gray

$baseUrl = "http://localhost:3004"
$joinBody = @{
    groupSessionId = "test-session-123"
    userId = "retry-test-user"
    quantity = 1
    unitPrice = 100000
    totalPrice = 100000
} | ConvertTo-Json

Write-Host ""
Write-Host "Command to run:" -ForegroundColor Cyan
Write-Host @"
`$body = @{
    groupSessionId = "test-session-123"
    userId = "retry-test-user"
    quantity = 1
    unitPrice = 100000
    totalPrice = 100000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3004/api/group-buying/join" ``
    -Method Post ``
    -ContentType "application/json" ``
    -Body `$body
"@ -ForegroundColor Gray

Write-Host ""
Write-Host "4. Watch the logs - you should see:" -ForegroundColor Gray
Write-Host "   - 'Retry attempt 1/3 after 1000ms delay'" -ForegroundColor Gray
Write-Host "   - 'Retry attempt 2/3 after 2000ms delay'" -ForegroundColor Gray
Write-Host "   - 'Retry attempt 3/3 after 4000ms delay'" -ForegroundColor Gray
Write-Host ""
Write-Host "5. (Optional) Restart Payment service during retries" -ForegroundColor Gray
Write-Host "   If you restart it before retries finish, the request should succeed!" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Success Criteria:" -ForegroundColor Green
Write-Host "   - Logs show exponential backoff (1s, 2s, 4s)" -ForegroundColor Green
Write-Host "   - Request eventually fails after 3 retries" -ForegroundColor Green
Write-Host "   - OR succeeds if service comes back during retry" -ForegroundColor Green
Write-Host ""
