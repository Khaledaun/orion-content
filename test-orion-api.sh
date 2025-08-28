#!/bin/Bash Terminal

# Orion API Test Script - Auto-detects port and tests Bearer token auth
echo "🚀 Orion API Test Script - Permanent Version"
echo "============================================="

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    pkill -f "next dev" 2>/dev/null || true
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Step 1: Complete cleanup
echo "🧹 Step 1: Cleaning up all existing processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true

# Kill processes on common ports
for port in 3000 3001 3002 3003 3004 3005; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

sleep 3
echo "✅ Cleanup complete"

# Step 2: Start server and auto-detect port
echo "🚀 Step 2: Starting server and detecting port..."
rm -f server.log
npm run dev > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 10

# Auto-detect port
DETECTED_PORT=""
for port in 3000 3001 3002 3003 3004 3005; do
    if curl -s "http://localhost:$port/api/health" > /dev/null 2>&1; then
        DETECTED_PORT=$port
        break
    fi
done

if [ -z "$DETECTED_PORT" ]; then
    echo "❌ Server not responding on any port"
    echo "📋 Server log:"
    tail -10 server.log
    exit 1
fi

echo "✅ Server detected on port: $DETECTED_PORT"
export ORION_BASE_URL="http://localhost:$DETECTED_PORT"
export ORION_CONSOLE_TOKEN="test-bearer-token-123"

# Step 3: Test complete flow
echo "🔍 Step 3: Testing complete API flow..."

# Health check
HEALTH=$(curl -s "$ORION_BASE_URL/api/health")
if [[ "$HEALTH" == *"ok"* ]]; then
    echo "✅ Health: PASS"
else
    echo "❌ Health: FAIL - $HEALTH"
    exit 1
fi

# Register token
TOKEN_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ORION_BASE_URL/api/setup/secrets" \
    -H 'Content-Type: application/json' \
    -d '{"kind":"console_api_token","data":{"token":"'$ORION_CONSOLE_TOKEN'"}}')

if [[ "$TOKEN_RESP" == *"HTTP_CODE:200"* ]]; then
    echo "✅ Token Registration: PASS"
else
    echo "❌ Token Registration: FAIL - $TOKEN_RESP"
    exit 1
fi

# Test Sites API
SITES_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $ORION_CONSOLE_TOKEN" "$ORION_BASE_URL/api/sites")
if [[ "$SITES_RESP" == *"HTTP_CODE:200"* ]]; then
    echo "✅ Sites API: PASS"
else
    echo "❌ Sites API: FAIL - $SITES_RESP"
fi

# Test Weeks API  
WEEKS_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $ORION_CONSOLE_TOKEN" "$ORION_BASE_URL/api/weeks")
if [[ "$WEEKS_RESP" == *"HTTP_CODE:200"* ]]; then
    echo "✅ Weeks API: PASS"
else
    echo "❌ Weeks API: FAIL - $WEEKS_RESP"
fi

# Final results
echo ""
echo "🎯 FINAL RESULTS:"
echo "🌐 Server URL: $ORION_BASE_URL"
echo "🔑 Bearer Token: $ORION_CONSOLE_TOKEN"
echo ""

if [[ "$SITES_RESP" == *"HTTP_CODE:200"* ]] && [[ "$WEEKS_RESP" == *"HTTP_CODE:200"* ]]; then
    echo "🎉 SUCCESS! All APIs working with Bearer token authentication!"
    echo "✅ Your Python CLI can use: $ORION_BASE_URL"
else
    echo "⚠️ Some APIs failed. Check responses above."
fi

