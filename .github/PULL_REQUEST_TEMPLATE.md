## Pull Request Summary

### 🎯 Purpose
<!-- Brief description of what this PR accomplishes -->

### 🔄 Type of Change
<!-- Mark relevant items with [x] -->
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security enhancement
- [ ] 🗃️ Database schema change
- [ ] 🔄 Dependency update

### 📋 Changes Made
<!-- Detailed list of changes -->
- 
- 
- 

### 🧪 Testing Done
<!-- Describe testing performed -->
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance testing (if applicable)
- [ ] Security testing (if applicable)

### 📊 Performance Impact
<!-- Assess performance implications -->
- [ ] No performance impact
- [ ] Performance improvement
- [ ] Potential performance degradation (explain mitigation)
- [ ] Bundle size impact analyzed

### 🔒 Security Checklist
<!-- Verify security considerations -->
- [ ] Input validation implemented
- [ ] Output sanitization verified
- [ ] Authentication/authorization checked
- [ ] No sensitive data exposed
- [ ] SQL injection prevention verified
- [ ] XSS prevention implemented

### 🌐 Edge Runtime Compatibility
<!-- Verify Vercel Edge Runtime compatibility -->
- [ ] No Node.js-specific APIs used
- [ ] Web APIs used where appropriate
- [ ] Cold start performance considered
- [ ] Bundle size optimized for edge

### 🗃️ Database Changes
<!-- If database changes are involved -->
- [ ] Migration scripts created
- [ ] Migration tested locally
- [ ] Rollback plan documented
- [ ] Production migration plan approved
- [ ] Data integrity verified

### 📱 UI/UX Changes
<!-- If UI changes are involved -->
- [ ] Responsive design verified
- [ ] Accessibility (WCAG 2.1 AA) compliance checked
- [ ] Cross-browser compatibility tested
- [ ] Mobile devices tested
- [ ] Loading states implemented
- [ ] Error states handled

### 🔗 Dependencies
<!-- List any new or updated dependencies -->
- None / List dependencies here

### 📝 Breaking Changes
<!-- Describe any breaking changes -->
- None / Describe breaking changes

### 🚀 Deployment Notes
<!-- Special deployment considerations -->
- [ ] Environment variables added/updated
- [ ] Configuration changes required
- [ ] External service updates needed
- [ ] Post-deployment verification steps documented

### 📸 Screenshots/Videos
<!-- Add screenshots or videos for UI changes -->

### 🔗 Related Issues
<!-- Link to related issues -->
Closes #
Related to #

### 📋 Pre-merge Checklist
<!-- Final checks before merge -->
- [ ] Code reviewed by at least one team member
- [ ] All CI checks pass
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
- [ ] Feature flags configured (if applicable)
- [ ] Monitoring/alerting configured (if applicable)

---

## 🤖 Copilot Review Instructions

### Automated Validation Priority
1. **Security**: Verify input validation, authentication, and data sanitization
2. **Performance**: Check for performance regressions and optimization opportunities
3. **Type Safety**: Ensure TypeScript types are comprehensive and correct
4. **Edge Compatibility**: Validate Vercel Edge Runtime compatibility
5. **Database Safety**: Review Prisma operations and migration safety

### Focus Areas for Review
- Error handling completeness
- Resource cleanup and memory leaks
- API endpoint security and validation
- Component accessibility and responsiveness
- Test coverage for critical paths

### Automated Checks to Perform
- [ ] TypeScript compilation with no errors
- [ ] ESLint rules compliance
- [ ] Prettier formatting consistency
- [ ] Unit test coverage maintenance
- [ ] Bundle size impact analysis
- [ ] Security vulnerability scan
- [ ] Performance regression detection

### Code Quality Metrics
- Cyclomatic complexity < 10
- Function length < 50 lines
- File size < 300 lines
- Test coverage > 80% for new code
- No TODO comments in production code

---

## 📝 Additional Notes
<!-- Any additional context or notes -->