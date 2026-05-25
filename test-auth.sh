#!/bin/bash
# Quick Authentication & Staff Login Verification Script
# Usage: bash test-auth.sh

API_BASE="http://localhost:8080/api/v1"
ADMIN_USER="admin"
ADMIN_PASS="admin@123"

echo "🧪 AUTHENTICATION & STAFF VERIFICATION TEST SUITE"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend Health
echo "📋 Test 1: Backend Health Check"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health")
if [ "$HEALTH" -eq 200 ]; then
    echo -e "${GREEN}✅ Backend is running on port 8080${NC}"
else
    echo -e "${RED}❌ Backend not responding (HTTP $HEALTH)${NC}"
    echo "   Fix: npm run dev:backend"
    exit 1
fi
echo ""

# Test 2: Debug endpoint to list users
echo "📋 Test 2: Database Connection & Users"
USER_LIST=$(curl -s "$API_BASE/auth/test-debug")
echo "Debug info: $USER_LIST"
echo ""

# Test 3: Admin Login
echo "📋 Test 3: Admin Login"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}")

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}❌ Admin login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Admin login successful${NC}"
echo "Token: ${ADMIN_TOKEN:0:20}..."
echo ""

# Test 4: Get current user
echo "📋 Test 4: Get Current User"
CURRENT_USER=$(curl -s -X GET "$API_BASE/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Current User: $CURRENT_USER"
echo ""

# Test 5: List Campuses
echo "📋 Test 5: List Campuses"
CAMPUSES=$(curl -s -X GET "$API_BASE/campuses" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Campuses: $CAMPUSES"
echo ""

# Test 6: List Staff Users
echo "📋 Test 6: List Staff Users"
STAFF_USERS=$(curl -s -X GET "$API_BASE/admin/staff-users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Staff Users: $STAFF_USERS"
echo ""

# Test 7: List Departments
echo "📋 Test 7: List Departments"
DEPARTMENTS=$(curl -s -X GET "$API_BASE/departments" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Departments: $DEPARTMENTS"
echo ""

echo "=================================================="
echo -e "${GREEN}✅ All Tests Completed${NC}"
echo ""
echo "Next Steps:"
echo "1. Start MongoDB: npm run dev:mongo"
echo "2. Start Backend: npm run dev:backend"
echo "3. Start Web: npm run dev:web"
echo "4. Login to http://localhost:3000"
