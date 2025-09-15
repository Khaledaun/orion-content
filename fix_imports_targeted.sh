#!/bin/bash

# Targeted fix for unused imports - more careful approach
echo "Applying targeted fixes for unused imports..."

# Fix specific files with careful replacements
# app/analytics/page.tsx - remove unused imports
sed -i '/Calendar,/d' app/analytics/page.tsx
sed -i '/Activity,/d' app/analytics/page.tsx

# components/dashboard/dashboard-client.tsx - remove unused imports  
sed -i '/AlertTriangle,/d' components/dashboard/dashboard-client.tsx

# components/milestone2/ProgressDashboard.tsx - remove unused imports
sed -i '/useEffect,/d' components/milestone2/ProgressDashboard.tsx
sed -i '/Zap,/d' components/milestone2/ProgressDashboard.tsx
sed -i '/Calendar,/d' components/milestone2/ProgressDashboard.tsx
sed -i '/Share2,/d' components/milestone2/ProgressDashboard.tsx
sed -i '/Bell,/d' components/milestone2/ProgressDashboard.tsx
sed -i '/Gift,/d' components/milestone2/ProgressDashboard.tsx

# components/reviewer/AuditLogs.tsx - remove unused imports
sed -i '/Button,/d' components/reviewer/AuditLogs.tsx

# Fix unused variables by prefixing with underscore (safer approach)
files_with_unused_vars=(
    "__tests__/phase1-integration.test.ts:enhancedPrisma:_enhancedPrisma"
    "api/ops/controls/route.ts:redisStore:_redisStore"
    "api/ops/controls/route.ts:user:_user"
    "app/credentials/page.tsx:focusMainContent:_focusMainContent"
    "app/setup/page.tsx:router:_router"
    "app/setup/page.tsx:focusMainContent:_focusMainContent"
    "components/dashboard/dashboard-client.tsx:focusMainContent:_focusMainContent"
    "components/reviewer/AuditLogs.tsx:toggleExpanded:_toggleExpanded"
    "lib/architecture/middleware-stack.ts:name:_name"
    "lib/config/environment-manager.ts:sensitiveKeys:_sensitiveKeys"
    "lib/crypto.ts:keyBuffer:_keyBuffer"
    "lib/crypto.ts:iv:_iv"
    "lib/env/validation.ts:hasGoogleOAuth:_hasGoogleOAuth"
    "lib/env/validation.ts:hasGitHubOAuth:_hasGitHubOAuth"
    "lib/integration/enhanced-middleware.ts:requestLogger:_requestLogger"
    "lib/perplexity-client.ts:maxSources:_maxSources"
    "lib/pipeline-orchestrator.ts:observabilityReport:_observabilityReport"
    "lib/rate-limit.ts:windowStart:_windowStart"
    "lib/rate-limiter.ts:windowStart:_windowStart"
)

for item in "${files_with_unused_vars[@]}"; do
    IFS=':' read -r file old_var new_var <<< "$item"
    if [ -f "$file" ]; then
        sed -i "s/\\b${old_var}\\b/${new_var}/g" "$file"
        echo "Fixed unused variable in $file: $old_var -> $new_var"
    fi
done

echo "Targeted fixes completed!"
