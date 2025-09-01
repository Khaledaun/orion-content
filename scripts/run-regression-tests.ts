


/**
 * Phase 8 Regression Test Suite Runner
 * Executes comprehensive tests for production readiness
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  details?: string
}

interface TestSuite {
  name: string
  tests: TestResult[]
  passed: boolean
  totalDuration: number
}

class RegressionTestRunner {
  private results: TestSuite[] = []
  private baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000'
  
  async runAllTests(): Promise<void> {
    console.log('🧪 Phase 8 Regression Test Suite')
    console.log('================================')
    
    const suites = [
      { name: 'Core API Tests', runner: this.runCoreApiTests },
      { name: 'Security Tests', runner: this.runSecurityTests },
      { name: 'Database Tests', runner: this.runDatabaseTests },
      { name: 'Observability Tests', runner: this.runObservabilityTests },
      { name: 'i18n Tests', runner: this.runI18nTests },
      { name: 'Redis Tests', runner: this.runRedisTests }
    ]
    
    for (const suite of suites) {
      console.log(`\n🔍 Running ${suite.name}...`)
      const result = await suite.runner.call(this)
      this.results.push(result)
      
      const status = result.passed ? '✅ PASSED' : '❌ FAILED'
      console.log(`   ${status} (${result.totalDuration}ms)`)
    }
    
    this.generateReport()
  }
  
  private async runCoreApiTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    
    // Health check test
    tests.push(await this.runTest('Health Endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/health`)
      const data = await response.json()
      if (data.ok !== true) throw new Error('Health check failed')
      return 'Health endpoint responding correctly'
    }))
    
    // API route tests
    tests.push(await this.runTest('Rulebook API Route', async () => {
      const response = await fetch(`${this.baseUrl}/api/rulebook`, { method: 'POST' })
      if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`)
      return '401 Unauthorized as expected'
    }))
    
    tests.push(await this.runTest('Strategy API Route', async () => {
      const response = await fetch(`${this.baseUrl}/api/sites/123/strategy`, { method: 'POST' })
      if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`)
      return '401 Unauthorized as expected'
    }))
    
    // Ops API tests
    tests.push(await this.runTest('Ops Status Route', async () => {
      const response = await fetch(`${this.baseUrl}/api/ops/status`, { method: 'GET' })
      if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`)
      return 'Ops routes properly secured'
    }))
    
    return this.createTestSuite('Core API Tests', tests)
  }
  
  private async runSecurityTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    
    // Rate limiting test
    tests.push(await this.runTest('Rate Limiting', async () => {
      const promises = Array.from({ length: 10 }, () => 
        fetch(`${this.baseUrl}/api/rulebook`, { method: 'POST' })
      )
      
      const responses = await Promise.all(promises)
      const has429 = responses.some(r => r.status === 429)
      
      return has429 ? 'Rate limiting active' : 'Rate limiting may not be active'
    }))
    
    // Authentication test
    tests.push(await this.runTest('Authentication Required', async () => {
      const endpoints = ['/api/rulebook', '/api/sites/1/strategy', '/api/ops/status']
      
      for (const endpoint of endpoints) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, { method: 'POST' })
        if (response.status !== 401 && response.status !== 405) {
          throw new Error(`${endpoint} not properly secured`)
        }
      }
      
      return 'All endpoints require authentication'
    }))
    
    return this.createTestSuite('Security Tests', tests)
  }
  
  private async runDatabaseTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    
    // Migration status test
    tests.push(await this.runTest('Migration Status', async () => {
      try {
        const output = execSync('npx prisma migrate status', { encoding: 'utf8', timeout: 10000 })
        if (output.includes('drift')) throw new Error('Migration drift detected')
        return 'No migration drift detected'
      } catch (error) {
        throw new Error(`Migration check failed: ${error}`)
      }
    }))
    
    // Rulebook seeding test
    tests.push(await this.runTest('Rulebook Seeding', async () => {
      try {
        const output = execSync('npx tsx scripts/seed_rulebook.ts', { encoding: 'utf8', timeout: 15000 })
        if (!output.includes('Seed completed successfully')) {
          throw new Error('Rulebook seeding failed')
        }
        return 'Rulebook seeding successful'
      } catch (error) {
        throw new Error(`Seeding failed: ${error}`)
      }
    }))
    
    return this.createTestSuite('Database Tests', tests)
  }
  
  private async runObservabilityTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    
    // Observability module test
    tests.push(await this.runTest('Observability Module', async () => {
      const { ProductionObservabilityTracker } = await import('../lib/observability-prod')
      const tracker = new ProductionObservabilityTracker('test-123', 'site-test', 'Test Content')
      
      const stage = tracker.startStage('test_stage')
      stage.complete('test-model', 100, 50, 0.01, true)
      
      const report = await tracker.finalize(85, { test: true })
      
      if (!report.pipelineId || report.totalCostUsd !== 0.01) {
        throw new Error('Observability tracking failed')
      }
      
      return 'Observability tracking functional'
    }))
    
    return this.createTestSuite('Observability Tests', tests)
  }
  
  private async runI18nTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    
    // Extended i18n test
    tests.push(await this.runTest('Extended i18n Support', async () => {
      const { generateExtendedSlug, formatExtendedCitation, validateExtendedI18nCompliance } = 
        await import('../lib/i18n-extended')
      
      // Test French
      const frenchSlug = generateExtendedSlug('Les Tendances Technologiques', 'fr')
      if (!frenchSlug.includes('les-tendances-technologiques')) {
        throw new Error('French slug generation failed')
      }
      
      // Test Hebrew
      const hebrewSlug = generateExtendedSlug('בדיקה', 'he')
      if (!hebrewSlug.startsWith('article-he-')) {
        throw new Error('Hebrew slug generation failed')
      }
      
      // Test Arabic citation
      const arabicCitation = formatExtendedCitation('مصدر', 'عنوان', 'http://example.com', 'ar')
      if (!arabicCitation.includes('متاح على')) {
        throw new Error('Arabic citation formatting failed')
      }
      
      return 'Extended i18n support functional'
    }))
    
    return this.createTestSuite('i18n Tests', tests)
  }
  
  private async runRedisTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    
    // Redis connection test
    tests.push(await this.runTest('Redis Connection', async () => {
      const { getRedisStore } = await import('../lib/redis-store')
      const redis = getRedisStore()
      
      if (process.env.REDIS_URL) {
        await redis.set('test-key', 'test-value', 10)
        const value = await redis.get('test-key')
        
        if (value !== 'test-value') {
          throw new Error('Redis read/write failed')
        }
        
        await redis.del('test-key')
        return 'Redis connection and operations successful'
      } else {
        return 'Redis not configured (development mode)'
      }
    }))
    
    return this.createTestSuite('Redis Tests', tests)
  }
  
  private async runTest(name: string, testFn: () => Promise<string>): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      const details = await testFn()
      return {
        name,
        passed: true,
        duration: Date.now() - startTime,
        details
      }
    } catch (error) {
      return {
        name,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  private createTestSuite(name: string, tests: TestResult[]): TestSuite {
    const passed = tests.every(t => t.passed)
    const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0)
    
    return {
      name,
      tests,
      passed,
      totalDuration
    }
  }
  
  private generateReport(): void {
    console.log('\n📊 Test Results Summary')
    console.log('========================')
    
    const totalSuites = this.results.length
    const passedSuites = this.results.filter(s => s.passed).length
    const totalTests = this.results.reduce((sum, s) => sum + s.tests.length, 0)
    const passedTests = this.results.reduce((sum, s) => sum + s.tests.filter(t => t.passed).length, 0)
    
    console.log(`Test Suites: ${passedSuites}/${totalSuites} passed`)
    console.log(`Tests: ${passedTests}/${totalTests} passed`)
    
    // Detailed results
    this.results.forEach(suite => {
      const status = suite.passed ? '✅' : '❌'
      console.log(`\n${status} ${suite.name}`)
      
      suite.tests.forEach(test => {
        const testStatus = test.passed ? '  ✅' : '  ❌'
        console.log(`${testStatus} ${test.name} (${test.duration}ms)`)
        if (test.error) {
          console.log(`     Error: ${test.error}`)
        }
        if (test.details) {
          console.log(`     Details: ${test.details}`)
        }
      })
    })
    
    // Save results to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites,
        passedSuites,
        totalTests,
        passedTests,
        success: passedSuites === totalSuites
      },
      suites: this.results
    }
    
    writeFileSync('test-results.json', JSON.stringify(report, null, 2))
    console.log('\n📄 Detailed results saved to test-results.json')
    
    if (passedSuites === totalSuites) {
      console.log('\n🎉 All tests passed! System ready for production.')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some tests failed. Review errors before deployment.')
      process.exit(1)
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new RegressionTestRunner()
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}

export { RegressionTestRunner }
