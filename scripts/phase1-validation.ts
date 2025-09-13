
/**
 * Phase 1 Validation Script
 * Comprehensive validation of enhanced foundation and architecture
 */

import { execSync } from 'child_process'
import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface ValidationResult {
  category: string
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

interface ValidationSummary {
  totalTests: number
  passed: number
  failed: number
  warnings: number
  results: ValidationResult[]
  overallStatus: 'pass' | 'fail'
}

class Phase1Validator {
  private results: ValidationResult[] = []

  public async runValidation(): Promise<ValidationSummary> {
    console.log('🚀 Starting Phase 1 Enhanced Foundation Validation')
    console.log('=' .repeat(50))

    // Stream A: Infrastructure & Database
    await this.validateInfrastructure()
    
    // Stream B: Core Architecture  
    await this.validateArchitecture()
    
    // Stream C: Development Tooling
    await this.validateTooling()
    
    // Integration Tests
    await this.validateIntegration()

    return this.generateSummary()
  }

  private async validateInfrastructure(): Promise<void> {
    console.log('\n📊 Validating Infrastructure & Database (Stream A)')
    
    // Check file existence
    this.checkFileExists(
      'Database Connection Manager',
      'lib/database/connection-manager.ts'
    )
    
    this.checkFileExists(
      'Query Optimizer',
      'lib/database/query-optimizer.ts'
    )
    
    this.checkFileExists(
      'Migration Manager',
      'lib/database/migration-manager.ts'
    )

    // Check Prisma configuration
    await this.validatePrismaSetup()
  }

  private async validateArchitecture(): Promise<void> {
    console.log('\n🏗️ Validating Core Architecture (Stream B)')
    
    this.checkFileExists(
      'Service Container',
      'lib/architecture/service-container.ts'
    )
    
    this.checkFileExists(
      'Middleware Stack',
      'lib/architecture/middleware-stack.ts'
    )
    
    this.checkFileExists(
      'Error Handler',
      'lib/architecture/error-handler.ts'
    )

    // Check middleware integration
    await this.validateMiddlewareIntegration()
  }

  private async validateTooling(): Promise<void> {
    console.log('\n🔧 Validating Development Tooling (Stream C)')
    
    this.checkFileExists(
      'Enhanced Jest Config',
      'jest.config.js'
    )
    
    this.checkFileExists(
      'Test Helpers',
      'lib/testing/test-helpers.ts'
    )
    
    this.checkFileExists(
      'Performance Monitor',
      'lib/testing/performance-monitor.ts'
    )
    
    this.checkFileExists(
      'Enhanced CI Pipeline',
      '.github/workflows/ci-enhanced.yml'
    )

    // Validate testing setup
    await this.validateTestingSetup()
  }

  private async validateIntegration(): Promise<void> {
    console.log('\n🔗 Validating System Integration')
    
    this.checkFileExists(
      'Environment Manager',
      'lib/config/environment-manager.ts'
    )
    
    this.checkFileExists(
      'Health Monitor',
      'lib/monitoring/health-monitor.ts'
    )
    
    this.checkFileExists(
      'Health API Endpoint',
      'app/api/health/route.ts'
    )
    
    this.checkFileExists(
      'Enhanced Middleware Integration',
      'lib/integration/enhanced-middleware.ts'
    )

    // Test health endpoint availability
    await this.validateHealthEndpoint()
  }

  private checkFileExists(name: string, filePath: string): void {
    const fullPath = join(process.cwd(), filePath)
    const exists = existsSync(fullPath)
    
    this.results.push({
      category: 'File Structure',
      test: name,
      status: exists ? 'pass' : 'fail',
      message: exists ? `File exists: ${filePath}` : `Missing file: ${filePath}`,
      details: { path: fullPath }
    })
  }

  private async validatePrismaSetup(): Promise<void> {
    try {
      console.log('  Checking Prisma configuration...')
      execSync('npx prisma validate --schema=prisma/schema.prisma', { stdio: 'pipe' })
      
      this.results.push({
        category: 'Database',
        test: 'Prisma Schema Validation',
        status: 'pass',
        message: 'Prisma schema is valid'
      })
    } catch (error) {
      this.results.push({
        category: 'Database',
        test: 'Prisma Schema Validation',
        status: 'fail',
        message: 'Prisma schema validation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async validateMiddlewareIntegration(): Promise<void> {
    try {
      console.log('  Checking middleware integration...')
      const middlewareContent = require('fs').readFileSync('middleware.ts', 'utf8')
      
      if (middlewareContent.includes('enhancedMiddleware')) {
        this.results.push({
          category: 'Architecture',
          test: 'Middleware Integration',
          status: 'pass',
          message: 'Enhanced middleware is properly integrated'
        })
      } else {
        this.results.push({
          category: 'Architecture',
          test: 'Middleware Integration',
          status: 'warning',
          message: 'Enhanced middleware not found in main middleware file'
        })
      }
    } catch (error) {
      this.results.push({
        category: 'Architecture',
        test: 'Middleware Integration',
        status: 'fail',
        message: 'Could not validate middleware integration',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async validateTestingSetup(): Promise<void> {
    try {
      console.log('  Checking testing configuration...')
      
      // Check Jest config
      const jestConfig = require(join(process.cwd(), 'jest.config.js'))
      
      if (jestConfig && jestConfig.collectCoverage) {
        this.results.push({
          category: 'Testing',
          test: 'Jest Configuration',
          status: 'pass',
          message: 'Jest is properly configured with coverage'
        })
      } else {
        this.results.push({
          category: 'Testing',
          test: 'Jest Configuration',
          status: 'warning',
          message: 'Jest configuration incomplete'
        })
      }

      // Check for integration test file
      if (existsSync('__tests__/phase1-integration.test.ts')) {
        this.results.push({
          category: 'Testing',
          test: 'Integration Tests',
          status: 'pass',
          message: 'Phase 1 integration tests found'
        })
      } else {
        this.results.push({
          category: 'Testing',
          test: 'Integration Tests',
          status: 'fail',
          message: 'Phase 1 integration tests missing'
        })
      }
    } catch (error) {
      this.results.push({
        category: 'Testing',
        test: 'Testing Setup Validation',
        status: 'fail',
        message: 'Could not validate testing setup',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async validateHealthEndpoint(): Promise<void> {
    try {
      console.log('  Checking health endpoint...')
      
      // For now, just check if the file exists and has the right structure
      const healthRouteContent = require('fs').readFileSync('app/api/health/route.ts', 'utf8')
      
      if (healthRouteContent.includes('healthMonitor') && healthRouteContent.includes('runAllHealthChecks')) {
        this.results.push({
          category: 'Integration',
          test: 'Health Endpoint',
          status: 'pass',
          message: 'Health endpoint properly implemented'
        })
      } else {
        this.results.push({
          category: 'Integration',
          test: 'Health Endpoint',
          status: 'warning',
          message: 'Health endpoint implementation incomplete'
        })
      }
    } catch (error) {
      this.results.push({
        category: 'Integration',
        test: 'Health Endpoint',
        status: 'fail',
        message: 'Health endpoint validation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private generateSummary(): ValidationSummary {
    const totalTests = this.results.length
    const passed = this.results.filter(r => r.status === 'pass').length
    const failed = this.results.filter(r => r.status === 'fail').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const overallStatus: 'pass' | 'fail' = failed === 0 ? 'pass' : 'fail'

    return {
      totalTests,
      passed,
      failed,
      warnings,
      results: this.results,
      overallStatus
    }
  }
}

// Main execution
async function main() {
  const validator = new Phase1Validator()
  const summary = await validator.runValidation()

  console.log('\n' + '=' .repeat(50))
  console.log('📋 VALIDATION SUMMARY')
  console.log('=' .repeat(50))
  console.log(`Total Tests: ${summary.totalTests}`)
  console.log(`✅ Passed: ${summary.passed}`)
  console.log(`❌ Failed: ${summary.failed}`)
  console.log(`⚠️  Warnings: ${summary.warnings}`)
  console.log(`Overall Status: ${summary.overallStatus === 'pass' ? '✅ PASS' : '❌ FAIL'}`)

  // Detailed results
  console.log('\n📋 DETAILED RESULTS')
  console.log('-'.repeat(50))
  
  const categories = [...new Set(summary.results.map(r => r.category))]
  
  for (const category of categories) {
    console.log(`\n${category}:`)
    const categoryResults = summary.results.filter(r => r.category === category)
    
    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
      console.log(`  ${icon} ${result.test}: ${result.message}`)
      
      if (result.details && result.status === 'fail') {
        console.log(`     Details: ${JSON.stringify(result.details, null, 2)}`)
      }
    }
  }

  // Save detailed report
  const reportPath = join(process.cwd(), 'phase1-validation-report.json')
  writeFileSync(reportPath, JSON.stringify(summary, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)

  // Exit with appropriate code
  process.exit(summary.overallStatus === 'pass' ? 0 : 1)
}

// Run validation
main().catch((error) => {
  console.error('❌ Validation failed with error:', error)
  process.exit(1)
})
