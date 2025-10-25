# Test Order Creation with Payment
# Tests the order service and payment integration

Write-Host "🧪 Testing Order Creation Flow" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3005"  # Order Service

Write-Host "Creating test order..." -ForegroundColor Yellow
Write-Host ""

$orderBody = @{
    userId = "test-user-" + (Get-Random -Maximum 10000)
    items = @(
        @{
            productId = "prod-1"
            variantId = $null
            quantity = 2
        },
        @{
            productId = "prod-2"
            variantId = $null
            quantity = 1
        }
    )
    shippingAddress = @{
        name = "John Doe"
        phoneNumber = "+6281234567890"
        address = "123 Main Street, Jakarta"
        province = "DKI Jakarta"
        city = "Jakarta Selatan"
        district = "Kebayoran Baru"
        postalCode = "12345"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/orders" `
        -Method Post `
        -ContentType "application/json" `
        -Body $orderBody `
        -ErrorAction Stop

    Write-Host "✅ Order created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Orders Created: $($response.ordersCreated)" -ForegroundColor Gray
    Write-Host "Message: $($response.message)" -ForegroundColor Gray
    Write-Host ""

    if ($response.payments) {
        Write-Host "Payment Details:" -ForegroundColor Cyan
        foreach ($payment in $response.payments) {
            Write-Host "  Order ID: $($payment.orderId)" -ForegroundColor Gray
            Write-Host "  Payment URL: $($payment.paymentUrl)" -ForegroundColor Gray
            Write-Host "  Invoice ID: $($payment.invoiceId)" -ForegroundColor Gray
            Write-Host ""
        }
    }

    if ($response.failedPayments) {
        Write-Host "⚠️ Some payments failed:" -ForegroundColor Yellow
        foreach ($failed in $response.failedPayments) {
            Write-Host "  Order: $($failed.orderNumber)" -ForegroundColor Red
            Write-Host "  Error: $($failed.error)" -ForegroundColor Red
            Write-Host ""
        }
    }

    Write-Host "✅ Test completed!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Order creation failed" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error: $($errorMessage.error)" -ForegroundColor Red
    }
    else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
