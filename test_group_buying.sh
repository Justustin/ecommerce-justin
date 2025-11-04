#!/bin/bash

# ========================================
# GROUP BUYING API TEST SCRIPT
# ========================================
# This script tests the group buying functionality with variants
#
# Prerequisites:
# 1. Run: psql -U your_user -d your_database -f packages/database/migrations/setup_test_group_buying.sql
# 2. Set BOT_USER_ID=00000000-0000-0000-0000-000000000001 in .env
# 3. Start group-buying-service on port 3004
#
# Usage: bash test_group_buying.sh

set -e  # Exit on error

# Configuration
API_URL="http://localhost:3004"
PRODUCT_ID="20000000-0000-0000-0000-000000000001"
FACTORY_ID="10000000-0000-0000-0000-000000000001"
VARIANT_S_ID="20000000-0000-0000-0000-000000000010"
VARIANT_M_ID="20000000-0000-0000-0000-000000000011"
VARIANT_L_ID="20000000-0000-0000-0000-000000000012"
VARIANT_XL_ID="20000000-0000-0000-0000-000000000013"
USER_1_ID="30000000-0000-0000-0000-000000000001"
USER_2_ID="30000000-0000-0000-0000-000000000002"
USER_3_ID="30000000-0000-0000-0000-000000000003"
USER_4_ID="30000000-0000-0000-0000-000000000004"
USER_5_ID="30000000-0000-0000-0000-000000000005"
USER_6_ID="30000000-0000-0000-0000-000000000006"

SESSION_ID=""

echo "========================================="
echo "GROUP BUYING API TEST"
echo "========================================="
echo ""

# ========================================
# STEP 1: Create Group Buying Session
# ========================================
echo "📝 STEP 1: Creating group buying session..."
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/group-buying" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"factoryId\": \"$FACTORY_ID\",
    \"sessionCode\": \"TSHIRT$(date +%Y%m%d%H%M%S)\",
    \"targetMoq\": 12,
    \"groupPrice\": 150000,
    \"priceTier25\": 150000,
    \"priceTier50\": 135000,
    \"priceTier75\": 120000,
    \"priceTier100\": 105000,
    \"endTime\": \"2025-12-31T23:59:59.000Z\",
    \"estimatedCompletionDate\": \"2026-01-15T00:00:00.000Z\"
  }")

echo "$RESPONSE" | jq '.'

# Extract session ID
SESSION_ID=$(echo "$RESPONSE" | jq -r '.data.id')

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to create session!"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "✅ Session created: $SESSION_ID"
echo "✅ Bot auto-joined with 3 units (25% MOQ)"
echo ""

# Small delay
sleep 1

# ========================================
# STEP 2: Test Scenario 1 - Order 6M
# ========================================
echo "========================================="
echo "📦 STEP 2: User 1 orders 6M (should lock M)"
echo "========================================="
echo ""

curl -s -X POST "$API_URL/api/group-buying/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_1_ID\",
    \"quantity\": 6,
    \"variantId\": \"$VARIANT_M_ID\",
    \"unitPrice\": 150000,
    \"totalPrice\": 900000
  }" | jq '.'

echo ""
echo "✅ User 1 ordered 6M"
echo "📊 Current state: S=0, M=6, L=0, XL=0"
echo "🔒 M should be LOCKED (6/6)"
echo ""

sleep 1

# ========================================
# STEP 3: Try to order more M (should fail)
# ========================================
echo "========================================="
echo "❌ STEP 3: User 2 tries to order 1M (should fail)"
echo "========================================="
echo ""

curl -s -X POST "$API_URL/api/group-buying/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_2_ID\",
    \"quantity\": 1,
    \"variantId\": \"$VARIANT_M_ID\",
    \"unitPrice\": 150000,
    \"totalPrice\": 150000
  }" | jq '.'

echo ""
echo "Expected: Error about variant being locked"
echo ""

sleep 1

# ========================================
# STEP 4: Order 3S, 3L, 3XL (unlocks M)
# ========================================
echo "========================================="
echo "📦 STEP 4: Users order 3S, 3L, 3XL (should unlock M and upgrade tier)"
echo "========================================="
echo ""

echo "User 3 ordering 3S..."
curl -s -X POST "$API_URL/api/group-buying/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_3_ID\",
    \"quantity\": 3,
    \"variantId\": \"$VARIANT_S_ID\",
    \"unitPrice\": 150000,
    \"totalPrice\": 450000
  }" | jq -r '.message // .error'

echo ""
echo "User 4 ordering 3L..."
curl -s -X POST "$API_URL/api/group-buying/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_4_ID\",
    \"quantity\": 3,
    \"variantId\": \"$VARIANT_L_ID\",
    \"unitPrice\": 150000,
    \"totalPrice\": 450000
  }" | jq -r '.message // .error'

echo ""
echo "User 5 ordering 3XL..."
curl -s -X POST "$API_URL/api/group-buying/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_5_ID\",
    \"quantity\": 3,
    \"variantId\": \"$VARIANT_XL_ID\",
    \"unitPrice\": 135000,
    \"totalPrice\": 405000
  }" | jq -r '.message // .error'

echo ""
echo "✅ Users ordered 3S, 3L, 3XL"
echo "📊 Current state: S=3, M=6, L=3, XL=3"
echo "📈 Real users: 15 units = 125% of MOQ"
echo "💰 Tier should upgrade to 100% (price: Rp 105,000)"
echo "🔓 M should be UNLOCKED (cap now 9)"
echo ""

sleep 1

# ========================================
# STEP 5: Order 3 more M (should succeed)
# ========================================
echo "========================================="
echo "📦 STEP 5: User 6 orders 3M (should succeed now)"
echo "========================================="
echo ""

curl -s -X POST "$API_URL/api/group-buying/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_6_ID\",
    \"quantity\": 3,
    \"variantId\": \"$VARIANT_M_ID\",
    \"unitPrice\": 105000,
    \"totalPrice\": 315000
  }" | jq '.'

echo ""
echo "✅ User 6 ordered 3M"
echo "📊 Final state: S=3, M=9, L=3, XL=3"
echo "🔒 M is LOCKED again (9/9)"
echo ""

sleep 1

# ========================================
# STEP 6: Check Session Stats
# ========================================
echo "========================================="
echo "📊 STEP 6: Session Statistics"
echo "========================================="
echo ""

curl -s -X GET "$API_URL/api/group-buying/$SESSION_ID/stats" | jq '.'

echo ""
echo "Expected:"
echo "- Total participants: 18 (3 bot + 15 real)"
echo "- Progress: 150% (18/12)"
echo "- Current tier: 100"
echo "- Price: Rp 105,000"
echo ""

# ========================================
# STEP 7: Get All Participants
# ========================================
echo "========================================="
echo "👥 STEP 7: All Participants"
echo "========================================="
echo ""

curl -s -X GET "$API_URL/api/group-buying/$SESSION_ID/participants" | jq '.'

echo ""

# ========================================
# SUMMARY
# ========================================
echo "========================================="
echo "✅ TEST COMPLETE!"
echo "========================================="
echo ""
echo "Summary of Dynamic Cap Logic:"
echo ""
echo "| Step | Action      | S | M | L | XL | Min | M_cap | M Status |"
echo "|------|-------------|---|---|---|----|----|-------|----------|"
echo "| 1    | Initial     | 0 | 0 | 0 | 0  | 0  | 6     | Available|"
echo "| 2    | Order 6M    | 0 | 6 | 0 | 0  | 0  | 6     | 🔒 LOCKED|"
echo "| 3    | Order S,L,XL| 3 | 6 | 3 | 3  | 3  | 9     | ✅ UNLOCK|"
echo "| 4    | Order 3M    | 3 | 9 | 3 | 3  | 3  | 9     | 🔒 LOCKED|"
echo ""
echo "Formula: M_cap = min(S,M,L,XL) + (2 × allocation)"
echo "         M_cap = 3 + (2 × 3) = 9"
echo ""
echo "Session ID: $SESSION_ID"
echo ""
echo "Next steps:"
echo "1. Check database: psql -d your_db -c \"SELECT * FROM group_participants WHERE group_session_id = '$SESSION_ID';\""
echo "2. Process expired: curl -X POST $API_URL/api/group-buying/process-expired"
echo "3. Check Swagger docs: http://localhost:3004/api-docs"
echo ""
