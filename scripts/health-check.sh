
#!/bin/bash

# Phase 8 Production Health Check Script

set -e

echo "=== Phase 8 System Health Check ==="
echo "Timestamp: $(date -u)"
echo "Host: $(hostname)"
echo "======================================"

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-10}"
EXIT_CODE=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    EXIT_CODE=1
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# 1. API Health Check
echo ""
echo "1. API Health Check"
echo "-------------------"
if curl -sf --max-time $TIMEOUT "$BASE_URL/api/health" > /dev/null 2>&1; then
    check_pass "API health endpoint responding"
else
    check_fail "API health endpoint not responding"
fi

# 2. Database Connectivity
echo ""
echo "2. Database Connectivity"
echo "------------------------"
if command -v npx > /dev/null && npx prisma db pull --preview-feature > /dev/null 2>&1; then
    check_pass "Database connection successful"
else
    check_fail "Database connection failed"
fi

# 3. Redis Connectivity (if configured)
echo ""
echo "3. Redis Connectivity"
echo "--------------------"
if [ -n "$REDIS_URL" ]; then
    if command -v redis-cli > /dev/null && timeout $TIMEOUT redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
        check_pass "Redis connection successful"
    else
        check_fail "Redis connection failed"
    fi
else
    check_warn "Redis not configured (development mode)"
fi

# 4. External API Connectivity
echo ""
echo "4. External API Connectivity"
echo "----------------------------"

# OpenAI API
if [ -n "$OPENAI_API_KEY" ]; then
    if curl -sf --max-time $TIMEOUT \
         -H "Authorization: Bearer $OPENAI_API_KEY" \
         https://api.openai.com/v1/models > /dev/null 2>&1; then
        check_pass "OpenAI API accessible"
    else
        check_fail "OpenAI API not accessible"
    fi
else
    check_warn "OpenAI API key not configured"
fi

# Perplexity API
if [ -n "$PERPLEXITY_API_KEY" ]; then
    if curl -sf --max-time $TIMEOUT \
         -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
         -H "Content-Type: application/json" \
         -d '{"model":"pplx-7b-online","messages":[{"role":"user","content":"test"}],"max_tokens":1}' \
         https://api.perplexity.ai/chat/completions > /dev/null 2>&1; then
        check_pass "Perplexity API accessible"
    else
        check_fail "Perplexity API not accessible"
    fi
else
    check_warn "Perplexity API key not configured"
fi

# 5. Core API Routes
echo ""
echo "5. Core API Routes"
echo "------------------"

# Test rulebook endpoint (should return 401)
rulebook_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL/api/rulebook" -X POST)
if [ "$rulebook_status" = "401" ]; then
    check_pass "Rulebook API route responding (401 as expected)"
elif [ "$rulebook_status" = "404" ]; then
    check_fail "Rulebook API route not found (404)"
else
    check_warn "Rulebook API route returned unexpected status: $rulebook_status"
fi

# Test strategy endpoint (should return 401)
strategy_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL/api/sites/123/strategy" -X POST)
if [ "$strategy_status" = "401" ]; then
    check_pass "Strategy API route responding (401 as expected)"
elif [ "$strategy_status" = "404" ]; then
    check_fail "Strategy API route not found (404)"
else
    check_warn "Strategy API route returned unexpected status: $strategy_status"
fi

# Test ops status endpoint (should return 401)
ops_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL/api/ops/status")
if [ "$ops_status" = "401" ]; then
    check_pass "Ops status API route responding (401 as expected)"
elif [ "$ops_status" = "404" ]; then
    check_fail "Ops status API route not found (404)"
else
    check_warn "Ops status API route returned unexpected status: $ops_status"
fi

# 6. Migration Status
echo ""
echo "6. Migration Status"
echo "------------------"
if command -v npx > /dev/null; then
    if migration_output=$(npx prisma migrate status 2>&1); then
        if echo "$migration_output" | grep -q "drift"; then
            check_fail "Database migration drift detected"
        else
            check_pass "Database migrations up to date"
        fi
    else
        check_fail "Cannot check migration status"
    fi
else
    check_warn "Prisma CLI not available"
fi

# 7. Recent Error Rate
echo ""
echo "7. Recent Error Rate"
echo "-------------------"
if [ -f "/var/log/app/audit.log" ]; then
    current_hour=$(date '+%Y-%m-%d %H')
    error_count=$(grep "$current_hour" /var/log/app/audit.log | grep -c '"success":false' || echo "0")
    total_count=$(grep "$current_hour" /var/log/app/audit.log | grep -c 'pipeline_completed\|pipeline_failed' || echo "0")
    
    if [ "$total_count" -gt 0 ]; then
        error_rate=$(echo "scale=1; $error_count * 100 / $total_count" | bc 2>/dev/null || echo "0")
        if [ "${error_rate%.*}" -lt 10 ]; then
            check_pass "Error rate acceptable: ${error_rate}% ($error_count/$total_count)"
        elif [ "${error_rate%.*}" -lt 20 ]; then
            check_warn "Error rate elevated: ${error_rate}% ($error_count/$total_count)"
        else
            check_fail "Error rate high: ${error_rate}% ($error_count/$total_count)"
        fi
    else
        check_pass "No recent activity to analyze"
    fi
else
    check_warn "Audit log file not found"
fi

# 8. Disk Space
echo ""
echo "8. Disk Space"
echo "------------"
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    check_pass "Disk usage acceptable: ${disk_usage}%"
elif [ "$disk_usage" -lt 90 ]; then
    check_warn "Disk usage elevated: ${disk_usage}%"
else
    check_fail "Disk usage critical: ${disk_usage}%"
fi

# 9. Memory Usage
echo ""
echo "9. Memory Usage"
echo "--------------"
if command -v free > /dev/null; then
    memory_usage=$(free | awk 'NR==2{printf "%.1f", $3/$2*100}')
    if [ "${memory_usage%.*}" -lt 80 ]; then
        check_pass "Memory usage acceptable: ${memory_usage}%"
    elif [ "${memory_usage%.*}" -lt 90 ]; then
        check_warn "Memory usage elevated: ${memory_usage}%"
    else
        check_fail "Memory usage critical: ${memory_usage}%"
    fi
else
    check_warn "Cannot check memory usage"
fi

# Summary
echo ""
echo "======================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 Overall Health: HEALTHY${NC}"
else
    echo -e "${RED}⚠️  Overall Health: ISSUES DETECTED${NC}"
fi
echo "Health check completed at: $(date -u)"
echo "======================================"

exit $EXIT_CODE
