
# GitHub Actions Workflows for Orion Content

This directory contains the GitHub Actions workflow files that need to be manually added to `.github/workflows/` due to GitHub App permission restrictions.

## Workflow Files

### 1. `dependency-check.yml`
**Purpose**: Automated dependency security and compatibility validation

**Features**:
- NPM security audit with moderate severity threshold
- Outdated package detection and reporting
- Bundle size analysis and optimization recommendations
- Version compatibility testing across Node.js 18 and 20
- Automated dependency reports with artifacts

**Triggers**: Pull requests, pushes to main/develop, weekly schedule

### 2. `env-matrix.yml`
**Purpose**: Cross-platform environment compatibility testing

**Features**:
- Multi-OS testing (Ubuntu, Windows, macOS)
- Node.js version matrix testing (18, 20)
- Database integration testing with PostgreSQL
- Edge Runtime compatibility validation
- Performance baseline testing

**Triggers**: Pull requests and pushes to main/develop

### 3. `prisma-validate.yml`
**Purpose**: Database schema validation and safety checks

**Features**:
- Prisma schema syntax validation
- Database migration safety analysis
- Schema security vulnerability scanning
- Performance testing with PostgreSQL
- Migration deployment validation

**Triggers**: Pull requests and pushes affecting Prisma files

### 4. `edge-runtime.yml`
**Purpose**: Edge Runtime compatibility and optimization

**Features**:
- Comprehensive API compatibility analysis
- Bundle size optimization for Edge Runtime
- Cold start performance testing
- Vercel-specific Edge Function validation
- Automated compatibility reporting

**Triggers**: Pull requests and pushes to main/develop

## Installation Instructions

### Step 1: Copy Workflow Files
```bash
# Copy all workflow files to the .github/workflows directory
cp workflow-files/*.yml .github/workflows/

# Or copy individually:
cp workflow-files/dependency-check.yml .github/workflows/
cp workflow-files/env-matrix.yml .github/workflows/
cp workflow-files/prisma-validate.yml .github/workflows/
cp workflow-files/edge-runtime.yml .github/workflows/
```

### Step 2: Commit and Push
```bash
git add .github/workflows/
git commit -m "feat: add comprehensive GitHub Actions validation workflows

- Add dependency security and compatibility checking
- Implement cross-platform environment testing
- Add Prisma schema validation and safety checks
- Include Edge Runtime compatibility analysis"
git push origin main
```

### Step 3: Verify Workflow Execution
1. Create a test pull request
2. Check that all workflows execute successfully
3. Review workflow artifacts and reports
4. Adjust workflow configurations as needed

## Workflow Dependencies

### Required Secrets
No additional secrets are required. All workflows use standard GitHub Actions and public services.

### Required Permissions
The workflows require standard GitHub Actions permissions:
- `contents: read` - To checkout code
- `actions: read` - To access workflow artifacts
- `pull-requests: write` - To comment on PRs (if enabled)

### Service Dependencies
- **PostgreSQL**: Used in database testing workflows
- **Node.js**: Multiple versions tested (18, 20)
- **NPM**: For dependency management and auditing

## Customization Options

### Environment Variables
Add these to repository secrets if needed:
- `DATABASE_URL`: Custom database connection string
- `NODE_ENV`: Environment-specific configurations
- `VERCEL_TOKEN`: For Vercel-specific testing (optional)

### Workflow Triggers
Modify the `on:` sections to customize when workflows run:
```yaml
on:
  pull_request:
    branches: [ main, develop, staging ]
  push:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Mondays
```

### Matrix Configurations
Adjust testing matrices for different requirements:
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18, 20, 21]  # Add Node.js 21
    database: [postgres, mysql]  # Add MySQL testing
```

## Monitoring and Maintenance

### Workflow Performance
- Monitor workflow execution times
- Optimize slow-running jobs
- Use caching effectively for dependencies

### Artifact Management
- Review and clean up old artifacts regularly
- Configure artifact retention policies
- Use artifacts for debugging failed workflows

### Security Updates
- Keep action versions updated (e.g., `actions/checkout@v4`)
- Monitor security advisories for used actions
- Regularly audit workflow permissions

## Troubleshooting

### Common Issues

1. **Workflow Permission Errors**
   - Ensure repository has Actions enabled
   - Check workflow file syntax with GitHub's workflow validator
   - Verify required permissions are granted

2. **Database Connection Failures**
   - Check PostgreSQL service configuration
   - Verify database credentials and connection strings
   - Ensure proper health checks are in place

3. **Node.js Version Conflicts**
   - Use consistent Node.js versions across workflows
   - Update package.json engines field
   - Test locally with the same Node.js versions

4. **Edge Runtime Compatibility Issues**
   - Review Edge Runtime limitations
   - Use Web APIs instead of Node.js APIs
   - Test with Vercel CLI locally

### Debug Mode
Enable debug logging by adding this to workflow files:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

## Integration with Copilot

These workflows are designed to work seamlessly with the GitHub Copilot integration:

1. **Validation Rules**: Enforce the same standards defined in `.github/copilot-instructions.md`
2. **Quality Gates**: Prevent deployment of code that doesn't meet quality standards
3. **Automated Feedback**: Provide immediate feedback on code quality and compatibility
4. **Continuous Improvement**: Generate reports for ongoing optimization

## Support

For issues with these workflows:
1. Check the GitHub Actions logs for specific error messages
2. Review the workflow artifacts for detailed reports
3. Test workflow components locally when possible
4. Consult the GitHub Actions documentation for advanced configurations

---

**Last Updated**: September 2025
**Version**: 1.0.0
**Maintainer**: Orion Content Development Team
