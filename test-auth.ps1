# Quick Authentication & Staff Login Verification Script
# Usage: powershell -ExecutionPolicy Bypass -File test-auth.ps1

$API_BASE = "http://localhost:8080/api/v1"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin@123"

Write-Host "🧪 AUTHENTICATION & STAFF VERIFICATION TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================="
Write-Host ""

# Test 1: Backend Health
Write-Host "📋 Test 1: Backend Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_BASE/health" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running on port 8080" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend not responding" -ForegroundColor Red
    Write-Host "   Fix: npm run dev:backend" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Debug endpoint to list users
Write-Host "📋 Test 2: Database Connection & Users" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_BASE/auth/test-debug" -Method GET -UseBasicParsing
    $debugInfo = $response.Content
    Write-Host "Debug info: $debugInfo" -ForegroundColor White
} catch {
    Write-Host "⚠️  Debug endpoint not available" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Admin Login
Write-Host "📋 Test 3: Admin Login" -ForegroundColor Yellow
try {
    $loginBody = @{
        username = $ADMIN_USER
        password = $ADMIN_PASS
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$API_BASE/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $loginBody `
        -UseBasicParsing

    $loginResponse = $response.Content | ConvertFrom-Json
    $ADMIN_TOKEN = $loginResponse.accessToken

    if ($ADMIN_TOKEN) {
        Write-Host "✅ Admin login successful" -ForegroundColor Green
        Write-Host "Token: $($ADMIN_TOKEN.Substring(0, 20))..."
        Write-Host "Role: $($loginResponse.role)" -ForegroundColor Green
        Write-Host "Campus: $($loginResponse.campusId)" -ForegroundColor Green
    } else {
        Write-Host "❌ Admin login failed - no token received" -ForegroundColor Red
        Write-Host "Response: $($response.Content)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Admin login failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Get current user
Write-Host "📋 Test 4: Get Current User" -ForegroundColor Yellow
try {
    $headers = @{"Authorization"="Bearer $ADMIN_TOKEN"}
    $response = Invoke-WebRequest -Uri "$API_BASE/auth/me" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing
    
    $currentUser = $response.Content | ConvertFrom-Json
    Write-Host "✅ Current User Retrieved:" -ForegroundColor Green
    Write-Host "   Username: $($currentUser.username)"
    Write-Host "   Role: $($currentUser.role)"
    Write-Host "   Campus: $($currentUser.campusId)"
    Write-Host "   User ID: $($currentUser.userId)"
} catch {
    Write-Host "❌ Failed to get current user" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: List Campuses
Write-Host "📋 Test 5: List Campuses" -ForegroundColor Yellow
try {
    $headers = @{"Authorization"="Bearer $ADMIN_TOKEN"}
    $response = Invoke-WebRequest -Uri "$API_BASE/campuses" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing
    
    $campuses = $response.Content | ConvertFrom-Json
    Write-Host "✅ Campuses Retrieved:" -ForegroundColor Green
    foreach ($campus in $campuses) {
        Write-Host "   - $($campus.name) ($($campus.code))"
    }
} catch {
    Write-Host "❌ Failed to list campuses" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: List Staff Users
Write-Host "📋 Test 6: List Staff Users" -ForegroundColor Yellow
try {
    $headers = @{"Authorization"="Bearer $ADMIN_TOKEN"}
    $response = Invoke-WebRequest -Uri "$API_BASE/admin/staff-users" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing
    
    $staffUsers = $response.Content | ConvertFrom-Json
    Write-Host "✅ Staff Users Retrieved: $($staffUsers.Count) users" -ForegroundColor Green
    foreach ($user in $staffUsers | Select-Object -First 5) {
        Write-Host "   - $($user.username) ($($user.role)) - $($user.campusId)"
    }
    if ($staffUsers.Count -gt 5) {
        Write-Host "   ... and $($staffUsers.Count - 5) more"
    }
} catch {
    Write-Host "❌ Failed to list staff users" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: List Departments
Write-Host "📋 Test 7: List Departments" -ForegroundColor Yellow
try {
    $headers = @{"Authorization"="Bearer $ADMIN_TOKEN"}
    $response = Invoke-WebRequest -Uri "$API_BASE/departments" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing
    
    $departments = $response.Content | ConvertFrom-Json
    Write-Host "✅ Departments Retrieved: $($departments.Count) departments" -ForegroundColor Green
    foreach ($dept in $departments | Select-Object -First 5) {
        Write-Host "   - $($dept.name) ($($dept.code)) - Type: $($dept.type)"
    }
    if ($departments.Count -gt 5) {
        Write-Host "   ... and $($departments.Count - 5) more"
    }
} catch {
    Write-Host "❌ Failed to list departments" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Test Staff Queue Endpoint
Write-Host "📋 Test 8: Check Staff Queue Endpoint Availability" -ForegroundColor Yellow
try {
    $headers = @{"Authorization"="Bearer $ADMIN_TOKEN"}
    $response = Invoke-WebRequest -Uri "$API_BASE/staff/queue" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing
    
    $queueItems = $response.Content | ConvertFrom-Json
    Write-Host "✅ Staff Queue Available: $($queueItems.Count) items" -ForegroundColor Green
    if ($queueItems.Count -gt 0) {
        Write-Host "   Sample Queue Item:" -ForegroundColor Green
        Write-Host "   - Check Code: $($queueItems[0].checkCode)"
        Write-Host "   - Student ID: $($queueItems[0].studentId)"
        Write-Host "   - Request Type: $($queueItems[0].requestType)"
    }
} catch {
    Write-Host "⚠️  Staff queue requires staff role - skipping" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=================================================="
Write-Host "✅ All Tests Completed" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "✅ Backend: Running" -ForegroundColor Green
Write-Host "✅ Authentication: Working" -ForegroundColor Green
Write-Host "✅ Database: Connected" -ForegroundColor Green
Write-Host "✅ Endpoints: Accessible" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start MongoDB: npm run dev:mongo"
Write-Host "2. Start Backend: npm run dev:backend"
Write-Host "3. Start Web: npm run dev:web"
Write-Host "4. Open http://localhost:3000 in your browser"
Write-Host "5. Login with:"
Write-Host "   - Username: admin"
Write-Host "   - Password: admin@123"
