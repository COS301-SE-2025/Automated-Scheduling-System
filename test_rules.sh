#!/bin/bash

# Test script for Rule Engine Integration
echo "🧪 Testing Rule Engine Integration"
echo "=================================="

# Base URL
BASE_URL="http://localhost:8080"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo ""
echo "🔍 Testing Health Endpoint"
echo "-------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$response" -eq 200 ]; then
    print_result 0 "Health endpoint is working"
else
    print_result 1 "Health endpoint failed (HTTP $response)"
fi

echo ""
echo "📋 Testing Rules API (without auth - might fail)"
echo "-----------------------------------------------"
response=$(curl -s -w "%{http_code}" -o /tmp/rules_response.json "$BASE_URL/api/rules")
if [ "${response: -3}" -eq 200 ]; then
    print_result 0 "Rules API is accessible"
    echo "Rules response:"
    cat /tmp/rules_response.json | jq . 2>/dev/null || cat /tmp/rules_response.json
elif [ "${response: -3}" -eq 401 ]; then
    print_result 0 "Rules API requires authentication (expected)"
    echo "Response: Authentication required"
else
    print_result 1 "Rules API failed (HTTP ${response: -3})"
fi

echo ""
echo "🏗️  Testing Sample Rule Creation"
echo "--------------------------------"

# Sample cooldown rule
COOLDOWN_RULE='{
  "rule": {
    "id": "test-cooldown-rule",
    "type": "cooldown",
    "enabled": true,
    "params": {
      "days": 7,
      "checkType": "test"
    }
  }
}'

echo "Sample Cooldown Rule JSON:"
echo "$COOLDOWN_RULE" | jq .

# Sample recurring rule
RECURRING_RULE='{
  "rule": {
    "id": "test-recurring-rule",
    "type": "recurringCheck",
    "enabled": true,
    "frequency": {
      "months": 6
    },
    "params": {
      "checkType": "periodic-test",
      "notifyDaysBefore": 7
    }
  }
}'

echo ""
echo "Sample Recurring Rule JSON:"
echo "$RECURRING_RULE" | jq .

# Sample action rule
ACTION_RULE='{
  "rule": {
    "id": "test-action-rule",
    "type": "action",
    "enabled": true,
    "when": "user.role == \"admin\"",
    "actions": [
      {
        "type": "notify",
        "params": {
          "message": "Admin action triggered"
        }
      }
    ]
  }
}'

echo ""
echo "Sample Action Rule JSON:"
echo "$ACTION_RULE" | jq .

echo ""
echo -e "${YELLOW}💡 To test with authentication:${NC}"
echo "1. Login through the frontend to get a token"
echo "2. Use the token in Authorization header: 'Bearer <token>'"
echo "3. Then test rule creation with:"
echo "   curl -X POST -H 'Authorization: Bearer <token>' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '<rule_json>' \\"
echo "        $BASE_URL/api/rules"

echo ""
echo "🌐 Frontend Development Server"
echo "-----------------------------"
echo "Start the frontend with: cd frontend && npm run dev"
echo "Then visit: http://localhost:5173/rules"

rm -f /tmp/rules_response.json
