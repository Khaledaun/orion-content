
# Pull Request Template

## Description
Brief description of the changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## GitHub Copilot Review Instructions

### Automated Validation Checklist
Please ensure GitHub Copilot validates the following:

#### Code Quality & Standards
- [ ] TypeScript strict mode compliance
- [ ] ESLint rules adherence
- [ ] Prettier formatting applied
- [ ] No console.log statements in production code
- [ ] Proper error handling implemented

#### Next.js Best Practices
- [ ] App Router patterns followed
- [ ] Server/Client Components properly separated
- [ ] Server Actions used for form handling
- [ ] Proper loading and error states
- [ ] SEO considerations addressed

#### Database & Prisma Validation
- [ ] Prisma schema changes validated
- [ ] Database migrations tested
- [ ] Transaction handling implemented where needed
- [ ] No N+1 query problems
- [ ] Proper error handling for database operations

#### Edge Runtime Compatibility
- [ ] Code is Edge Runtime compatible
- [ ] No Node.js-specific APIs used inappropriately
- [ ] Web APIs used instead of Node.js APIs where applicable
- [ ] Third-party dependencies are Edge compatible

#### Security Validation
- [ ] No hardcoded secrets or API keys
- [ ] Input validation and sanitization implemented
- [ ] CSRF protection where applicable
- [ ] XSS prevention measures in place
- [ ] Proper authentication and authorization

#### Performance Validation
- [ ] Core Web Vitals impact assessed
- [ ] Bundle size impact evaluated
- [ ] Proper caching strategies implemented
- [ ] Dynamic imports used for code splitting
- [ ] Images and assets optimized

#### Accessibility Compliance
- [ ] ARIA labels and roles implemented
- [ ] Keyboard navigation supported
- [ ] Screen reader compatibility ensured
- [ ] Color contrast requirements met
- [ ] Focus management implemented

### Dependency & Environment Validation

#### Dependency Management
- [ ] New dependencies justified and documented
- [ ] Version compatibility verified
- [ ] Security vulnerabilities checked
- [ ] Bundle size impact assessed
- [ ] Peer dependencies properly configured

#### Environment Compatibility
- [ ] Works in development environment
- [ ] Staging environment compatibility verified
- [ ] Production environment tested
- [ ] Environment variables properly configured
- [ ] Secrets management implemented correctly

### Testing Requirements
- [ ] Unit tests written for new functionality
- [ ] Integration tests added where appropriate
- [ ] Component tests implemented
- [ ] Test coverage maintained above 80%
- [ ] All tests passing

### Documentation Updates
- [ ] README updated if necessary
- [ ] API documentation updated
- [ ] JSDoc comments added for public functions
- [ ] Changelog updated
- [ ] Migration guides provided if breaking changes

## Deployment Readiness Checklist

### Pre-deployment Validation
- [ ] All automated tests passing
- [ ] No TypeScript compilation errors
- [ ] Database migrations validated
- [ ] Environment configurations verified
- [ ] Performance benchmarks met

### Post-deployment Monitoring
- [ ] Error logging configured
- [ ] Performance monitoring in place
- [ ] Database query performance validated
- [ ] User experience metrics tracked

## Additional Context
Add any other context about the pull request here, including:
- Screenshots for UI changes
- Performance benchmarks
- Breaking change migration guides
- Related issues or dependencies

## Reviewer Notes
Special instructions for human reviewers:
- Areas requiring extra attention
- Known limitations or trade-offs
- Future improvement opportunities

---

**Note for Reviewers**: This PR has been validated against our comprehensive Copilot integration standards. Please verify that all automated checks have passed before approving.
