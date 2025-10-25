#!/bin/bash

# Quick Test Script for Business Logic Fixes
# Run this after starting all services

echo "🧪 Quick Functionality Test"
echo "==========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

# Check if services are running
echo "📡 Checking services..."
echo ""

if curl -s http://localhost:3007 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Group Buying Service (port 3007)"
else
  echo -e "${YELLOW}⚠${NC} Group Buying Service not running on port 3007"
fi

if curl -s http://localhost:3006 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Payment Service (port 3006)"
else
  echo -e "${YELLOW}⚠${NC} Payment Service not running on port 3006"
fi

if curl -s http://localhost:3005 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Order Service (port 3005)"
else
  echo -e "${YELLOW}⚠${NC} Order Service not running on port 3005"
fi

echo ""
echo "==========================="
echo ""
echo "💡 To test the fixes:"
echo ""
echo "1️⃣  Race Condition Protection:"
echo "   Run: node test-race-condition.js"
echo ""
echo "2️⃣  Price Validation:"
echo "   Try submitting wrong price - should fail"
echo ""
echo "3️⃣  Check Logs:"
echo "   Look for structured JSON logs in service output"
echo ""
echo "4️⃣  Database Consistency:"
echo "   Check: SELECT * FROM group_participants GROUP BY group_session_id, user_id"
echo "   Should have no duplicates"
echo ""
echo "📖 Full testing guide: TESTING_GUIDE.md"
echo ""
