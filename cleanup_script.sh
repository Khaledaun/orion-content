#!/bin/bash

# Technical Debt Cleanup Script for Orion Content
# Date: $(date +%Y-%m-%d)

set -e

echo "=== ORION CONTENT TECHNICAL DEBT CLEANUP ==="
echo "Starting cleanup at $(date)"
echo ""

# Initialize cleanup report
CLEANUP_REPORT="/tmp/cleanup_report.md"
cat > "$CLEANUP_REPORT" << 'EOF'
# Technical Debt Cleanup Report
**Date:** $(date +%Y-%m-%d)
**Repository:** Khaledaun/orion-content
**Branch:** tech-debt-cleanup/$(date +%Y%m%d)

## Summary
This report details the comprehensive technical debt cleanup performed on the Orion Content repository.

EOF

# 1. BACKUP FILES CLEANUP
echo "1. Cleaning up backup files..."
BACKUP_FILES=$(find . -name "*.bak" -o -name "*.backup" -o -name "*.old" -o -name "*~" 2>/dev/null | grep -v node_modules | grep -v .git || true)
if [ ! -z "$BACKUP_FILES" ]; then
    echo "Found backup files:"
    echo "$BACKUP_FILES"
    echo "$BACKUP_FILES" | xargs rm -f
    echo "## 1. Backup Files Removed" >> "$CLEANUP_REPORT"
    echo '```' >> "$CLEANUP_REPORT"
    echo "$BACKUP_FILES" >> "$CLEANUP_REPORT"
    echo '```' >> "$CLEANUP_REPORT"
    echo "" >> "$CLEANUP_REPORT"
else
    echo "No backup files found"
    echo "## 1. Backup Files" >> "$CLEANUP_REPORT"
    echo "No backup files found to remove." >> "$CLEANUP_REPORT"
    echo "" >> "$CLEANUP_REPORT"
fi

# 2. DUPLICATE AND UNNECESSARY FILES
echo "2. Cleaning up duplicate and unnecessary files..."
DUPLICATES=""

# Remove specific duplicates found in the repo
if [ -f "package.json.backup" ]; then
    rm -f "package.json.backup"
    DUPLICATES="$DUPLICATES\n- package.json.backup"
fi

# Remove empty files
EMPTY_FILES=$(find . -type f -empty -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null || true)
if [ ! -z "$EMPTY_FILES" ]; then
    echo "Removing empty files:"
    echo "$EMPTY_FILES"
    echo "$EMPTY_FILES" | xargs rm -f
    DUPLICATES="$DUPLICATES\n$EMPTY_FILES"
fi

# Remove old zip archives and diagnostic files
OLD_ARCHIVES=$(find . -maxdepth 1 -name "*.zip" -o -name "*.tgz" -o -name "*.tar.gz" | grep -E "(phase|orion-diag)" || true)
if [ ! -z "$OLD_ARCHIVES" ]; then
    echo "Removing old archive files:"
    echo "$OLD_ARCHIVES"
    echo "$OLD_ARCHIVES" | xargs rm -f
    DUPLICATES="$DUPLICATES\n$OLD_ARCHIVES"
fi

# Remove old diagnostic directories
if [ -d "orion-diag-20250829-090249" ]; then
    rm -rf "orion-diag-20250829-090249"
    DUPLICATES="$DUPLICATES\n- orion-diag-20250829-090249/ (directory)"
fi

if [ -d "__pycache__" ]; then
    rm -rf "__pycache__"
    DUPLICATES="$DUPLICATES\n- __pycache__/ (directory)"
fi

echo "## 2. Duplicate/Unnecessary Files Removed" >> "$CLEANUP_REPORT"
if [ ! -z "$DUPLICATES" ]; then
    echo '```' >> "$CLEANUP_REPORT"
    echo -e "$DUPLICATES" >> "$CLEANUP_REPORT"
    echo '```' >> "$CLEANUP_REPORT"
else
    echo "No duplicate files found to remove." >> "$CLEANUP_REPORT"
fi
echo "" >> "$CLEANUP_REPORT"

# 3. TODO/FIXME ANALYSIS
echo "3. Analyzing TODO/FIXME comments..."
TODO_ANALYSIS="/tmp/todo_analysis.txt"
if command -v rg >/dev/null 2>&1; then
    rg -n "TODO|FIXME|XXX|HACK" --type ts --type tsx --type js --type jsx . > "$TODO_ANALYSIS" 2>/dev/null || echo "No TODO/FIXME comments found" > "$TODO_ANALYSIS"
else
    grep -r -n "TODO\|FIXME\|XXX\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . > "$TODO_ANALYSIS" 2>/dev/null || echo "No TODO/FIXME comments found" > "$TODO_ANALYSIS"
fi

echo "## 3. TODO/FIXME Comments Analysis" >> "$CLEANUP_REPORT"
echo '```' >> "$CLEANUP_REPORT"
head -20 "$TODO_ANALYSIS" >> "$CLEANUP_REPORT"
TODO_COUNT=$(wc -l < "$TODO_ANALYSIS" 2>/dev/null || echo "0")
if [ "$TODO_COUNT" -gt 20 ]; then
    echo "... and $((TODO_COUNT - 20)) more items" >> "$CLEANUP_REPORT"
fi
echo '```' >> "$CLEANUP_REPORT"
echo "**Total TODO/FIXME items found:** $TODO_COUNT" >> "$CLEANUP_REPORT"
echo "" >> "$CLEANUP_REPORT"

# 4. DEPENDENCY ANALYSIS AND UPDATES
echo "4. Analyzing and updating dependencies..."
if [ -f "package.json" ]; then
    echo "## 4. Dependencies Analysis" >> "$CLEANUP_REPORT"
    
    # Check for outdated packages
    if command -v npm >/dev/null 2>&1; then
        echo "### Outdated Packages" >> "$CLEANUP_REPORT"
        echo '```' >> "$CLEANUP_REPORT"
        npm outdated >> "$CLEANUP_REPORT" 2>/dev/null || echo "All packages are up to date" >> "$CLEANUP_REPORT"
        echo '```' >> "$CLEANUP_REPORT"
        
        # Security audit
        echo "### Security Audit" >> "$CLEANUP_REPORT"
        echo '```' >> "$CLEANUP_REPORT"
        npm audit --audit-level=moderate >> "$CLEANUP_REPORT" 2>/dev/null || echo "No security vulnerabilities found" >> "$CLEANUP_REPORT"
        echo '```' >> "$CLEANUP_REPORT"
    fi
    echo "" >> "$CLEANUP_REPORT"
fi

# 5. CODE STRUCTURE ANALYSIS
echo "5. Analyzing code structure..."
echo "## 5. Code Structure Analysis" >> "$CLEANUP_REPORT"

# Count files by type
echo "### File Distribution" >> "$CLEANUP_REPORT"
echo '```' >> "$CLEANUP_REPORT"
echo "TypeScript files: $(find . -name "*.ts" -not -path "./node_modules/*" | wc -l)" >> "$CLEANUP_REPORT"
echo "TypeScript React files: $(find . -name "*.tsx" -not -path "./node_modules/*" | wc -l)" >> "$CLEANUP_REPORT"
echo "JavaScript files: $(find . -name "*.js" -not -path "./node_modules/*" | wc -l)" >> "$CLEANUP_REPORT"
echo "React files: $(find . -name "*.jsx" -not -path "./node_modules/*" | wc -l)" >> "$CLEANUP_REPORT"
echo "CSS files: $(find . -name "*.css" -not -path "./node_modules/*" | wc -l)" >> "$CLEANUP_REPORT"
echo "Markdown files: $(find . -name "*.md" -not -path "./node_modules/*" | wc -l)" >> "$CLEANUP_REPORT"
echo '```' >> "$CLEANUP_REPORT"

# Large files analysis
echo "### Large Files (>100KB)" >> "$CLEANUP_REPORT"
echo '```' >> "$CLEANUP_REPORT"
find . -type f -size +100k -not -path "./node_modules/*" -not -path "./.git/*" -exec ls -lh {} \; | sort -k5 -hr | head -10 >> "$CLEANUP_REPORT" 2>/dev/null || echo "No large files found" >> "$CLEANUP_REPORT"
echo '```' >> "$CLEANUP_REPORT"
echo "" >> "$CLEANUP_REPORT"

# 6. PERFORMANCE ANALYSIS
echo "6. Performance analysis..."
echo "## 6. Performance Metrics" >> "$CLEANUP_REPORT"

# Bundle size analysis (if Next.js)
if [ -f "next.config.js" ] && command -v npm >/dev/null 2>&1; then
    echo "### Bundle Analysis" >> "$CLEANUP_REPORT"
    echo "Analyzing Next.js bundle size..." >> "$CLEANUP_REPORT"
    
    # Check if we can run build
    if npm list next >/dev/null 2>&1; then
        echo "Next.js detected - bundle analysis available after build" >> "$CLEANUP_REPORT"
    fi
fi

# 7. CONFIGURATION OPTIMIZATION
echo "7. Checking configuration files..."
echo "## 7. Configuration Analysis" >> "$CLEANUP_REPORT"

CONFIG_FILES="next.config.js tsconfig.json tailwind.config.ts .eslintrc.json package.json"
echo "### Configuration Files Status" >> "$CLEANUP_REPORT"
echo '```' >> "$CLEANUP_REPORT"
for file in $CONFIG_FILES; do
    if [ -f "$file" ]; then
        echo "✓ $file - Present" >> "$CLEANUP_REPORT"
    else
        echo "✗ $file - Missing" >> "$CLEANUP_REPORT"
    fi
done
echo '```' >> "$CLEANUP_REPORT"
echo "" >> "$CLEANUP_REPORT"

# 8. DOCUMENTATION CLEANUP
echo "8. Documentation analysis..."
echo "## 8. Documentation Status" >> "$CLEANUP_REPORT"

DOC_FILES=$(find . -name "*.md" -not -path "./node_modules/*" | wc -l)
echo "**Total documentation files:** $DOC_FILES" >> "$CLEANUP_REPORT"

# Check for outdated documentation
OLD_DOCS=$(find . -name "*.md" -not -path "./node_modules/*" -mtime +30 2>/dev/null | head -10 || true)
if [ ! -z "$OLD_DOCS" ]; then
    echo "### Potentially Outdated Documentation (>30 days)" >> "$CLEANUP_REPORT"
    echo '```' >> "$CLEANUP_REPORT"
    echo "$OLD_DOCS" >> "$CLEANUP_REPORT"
    echo '```' >> "$CLEANUP_REPORT"
fi
echo "" >> "$CLEANUP_REPORT"

# 9. FINAL RECOMMENDATIONS
echo "## 9. Recommendations" >> "$CLEANUP_REPORT"
echo "### Immediate Actions Needed" >> "$CLEANUP_REPORT"
echo "- [ ] Review and resolve TODO/FIXME comments" >> "$CLEANUP_REPORT"
echo "- [ ] Update outdated dependencies" >> "$CLEANUP_REPORT"
echo "- [ ] Address security vulnerabilities" >> "$CLEANUP_REPORT"
echo "- [ ] Consider implementing automated linting/formatting" >> "$CLEANUP_REPORT"
echo "" >> "$CLEANUP_REPORT"

echo "### Long-term Improvements" >> "$CLEANUP_REPORT"
echo "- [ ] Implement comprehensive test coverage" >> "$CLEANUP_REPORT"
echo "- [ ] Set up automated dependency updates" >> "$CLEANUP_REPORT"
echo "- [ ] Establish code review guidelines" >> "$CLEANUP_REPORT"
echo "- [ ] Consider implementing bundle size monitoring" >> "$CLEANUP_REPORT"
echo "" >> "$CLEANUP_REPORT"

echo "=== CLEANUP COMPLETED ==="
echo "Report generated at: $CLEANUP_REPORT"
echo "Cleanup completed at $(date)"

# Copy report to repository
cp "$CLEANUP_REPORT" "./CLEANUP_REPORT.md"
echo "Report saved to ./CLEANUP_REPORT.md"
