
#!/usr/bin/env node

/**
 * Phase 8 Load Testing Harness
 * Tests concurrent pipeline processing under realistic load
 */

const { performance } = require('perf_hooks')

// Configuration
const CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
  bearerToken: process.env.TEST_BEARER_TOKEN || 'test-token',
  concurrentSites: parseInt(process.env.CONCURRENT_SITES || '10'),
  requestsPerSite: parseInt(process.env.REQUESTS_PER_SITE || '5'),
  requestInterval: parseInt(process.env.REQUEST_INTERVAL || '1000'),
  testDurationMinutes: parseInt(process.env.TEST_DURATION || '5'),
  enableRealApis: process.env.ENABLE_REAL_APIS === 'true',
  outputFile: process.env.OUTPUT_FILE || 'load-test-results.json'
}

class LoadTestHarness {
  constructor() {
    this.results = {
      startTime: new Date().toISOString(),
      config: CONFIG,
      sites: [],
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalLatency: 0,
        averageLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        rateLimitHits: 0,
        authFailures: 0,
        errors: []
      }
    }
  }

  async runLoadTest() {
    console.log('🚀 Starting Phase 8 Load Test')
    console.log('Configuration:', CONFIG)
    console.log('=' * 50)

    const startTime = performance.now()

    // Create concurrent site processors
    const sitePromises = []
    for (let i = 1; i <= CONFIG.concurrentSites; i++) {
      sitePromises.push(this.processSite(i))
    }

    // Wait for all sites to complete
    const siteResults = await Promise.allSettled(sitePromises)
    
    const endTime = performance.now()
    const totalTime = endTime - startTime

    // Process results
    this.results.endTime = new Date().toISOString()
    this.results.totalDurationMs = totalTime
    this.results.sites = siteResults.map((result, index) => ({
      siteId: index + 1,
      status: result.status,
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null
    }))

    this.calculateSummary()
    this.generateReport()

    return this.results
  }

  async processSite(siteId) {
    const siteResult = {
      siteId,
      requests: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        averageLatency: 0,
        errors: []
      }
    }

    console.log(`🔄 Processing Site ${siteId}`)

    for (let i = 1; i <= CONFIG.requestsPerSite; i++) {
      try {
        const requestResult = await this.makeRequest(siteId, i)
        siteResult.requests.push(requestResult)
        siteResult.summary.total++

        if (requestResult.success) {
          siteResult.summary.successful++
        } else {
          siteResult.summary.failed++
          siteResult.summary.errors.push(requestResult.error)
        }

        // Wait between requests to simulate realistic load
        if (i < CONFIG.requestsPerSite) {
          await this.sleep(CONFIG.requestInterval)
        }

      } catch (error) {
        siteResult.requests.push({
          requestId: i,
          success: false,
          error: error.message,
          latency: 0,
          timestamp: new Date().toISOString()
        })
        siteResult.summary.failed++
        siteResult.summary.errors.push(error.message)
      }
    }

    // Calculate site averages
    const successfulRequests = siteResult.requests.filter(r => r.success)
    siteResult.summary.averageLatency = successfulRequests.length > 0
      ? successfulRequests.reduce((sum, r) => sum + r.latency, 0) / successfulRequests.length
      : 0

    console.log(`✅ Site ${siteId} completed: ${siteResult.summary.successful}/${siteResult.summary.total} successful`)
    return siteResult
  }

  async makeRequest(siteId, requestId) {
    const startTime = performance.now()
    const timestamp = new Date().toISOString()

    // Generate realistic test content
    const testContent = this.generateTestContent(siteId, requestId)

    try {
      const response = await fetch(`${CONFIG.baseUrl}/api/sites/${siteId}/strategy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.bearerToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'OrionLoadTest/1.0'
        },
        body: JSON.stringify(testContent),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      const endTime = performance.now()
      const latency = endTime - startTime

      const result = {
        siteId,
        requestId,
        success: response.ok,
        statusCode: response.status,
        latency,
        timestamp,
        responseSize: 0
      }

      // Track specific response types
      if (response.status === 429) {
        result.rateLimited = true
      } else if (response.status === 401 || response.status === 403) {
        result.authFailure = true
      }

      // Try to get response body (but don't fail if it errors)
      try {
        const responseBody = await response.text()
        result.responseSize = responseBody.length
        result.responsePreview = responseBody.substring(0, 200)
      } catch (e) {
        result.responseSize = 0
      }

      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`
      }

      return result

    } catch (error) {
      const endTime = performance.now()
      const latency = endTime - startTime

      return {
        siteId,
        requestId,
        success: false,
        statusCode: 0,
        latency,
        timestamp,
        error: error.message,
        responseSize: 0
      }
    }
  }

  generateTestContent(siteId, requestId) {
    const languages = ['en', 'ar', 'fr', 'he']
    const lang = languages[Math.floor(Math.random() * languages.length)]
    
    const titles = {
      en: `Advanced Technology Trends ${siteId}-${requestId}`,
      ar: `اتجاهات التكنولوجيا المتقدمة ${siteId}-${requestId}`,
      fr: `Tendances technologiques avancées ${siteId}-${requestId}`,
      he: `מגמות טכנולוגיות מתקדמות ${siteId}-${requestId}`
    }

    const contents = {
      en: '<p>This is a comprehensive analysis of emerging technology trends in the modern digital landscape.</p>',
      ar: '<p>هذا تحليل شامل لاتجاهات التكنولوجيا الناشئة في المشهد الرقمي الحديث.</p>',
      fr: '<p>Ceci est une analyse complète des tendances technologiques émergentes dans le paysage numérique moderne.</p>',
      he: '<p>זהו ניתוח מקיף של מגמות טכנולוגיות מתפתחות בנוף הדיגיטלי המודרני.</p>'
    }

    return {
      pipelineResult: {
        title: titles[lang],
        html: contents[lang],
        score: Math.floor(Math.random() * 40) + 60, // 60-99
        details: {
          eeat: Math.floor(Math.random() * 20) + 80,
          seo: Math.floor(Math.random() * 20) + 75,
          readability: Math.floor(Math.random() * 15) + 85
        },
        lang
      },
      flags: {
        loadTest: true,
        ignore_rulebook: Math.random() < 0.1 // 10% bypass rate
      },
      metadata: {
        loadTestRun: true,
        concurrentSite: siteId,
        requestSequence: requestId
      }
    }
  }

  calculateSummary() {
    const summary = this.results.summary
    const allRequests = this.results.sites
      .filter(site => site.result)
      .flatMap(site => site.result.requests)

    summary.totalRequests = allRequests.length
    summary.successfulRequests = allRequests.filter(r => r.success).length
    summary.failedRequests = allRequests.filter(r => !r.success).length
    summary.rateLimitHits = allRequests.filter(r => r.rateLimited).length
    summary.authFailures = allRequests.filter(r => r.authFailure).length

    const successfulRequests = allRequests.filter(r => r.success && r.latency)
    if (successfulRequests.length > 0) {
      const latencies = successfulRequests.map(r => r.latency)
      summary.totalLatency = latencies.reduce((sum, l) => sum + l, 0)
      summary.averageLatency = summary.totalLatency / latencies.length
      summary.minLatency = Math.min(...latencies)
      summary.maxLatency = Math.max(...latencies)

      // Calculate percentiles
      const sortedLatencies = latencies.sort((a, b) => a - b)
      summary.p50Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)]
      summary.p90Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.9)]
      summary.p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
      summary.p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)]
    }

    // Collect unique errors
    const allErrors = allRequests
      .filter(r => r.error)
      .map(r => r.error)
    summary.errors = [...new Set(allErrors)]

    summary.successRate = summary.totalRequests > 0 
      ? (summary.successfulRequests / summary.totalRequests) * 100 
      : 0
  }

  generateReport() {
    console.log('\n' + '=' * 60)
    console.log('📊 LOAD TEST RESULTS')
    console.log('=' * 60)
    
    const s = this.results.summary
    console.log(`🎯 Test Configuration:`)
    console.log(`   • Concurrent Sites: ${CONFIG.concurrentSites}`)
    console.log(`   • Requests per Site: ${CONFIG.requestsPerSite}`)
    console.log(`   • Total Duration: ${(this.results.totalDurationMs / 1000).toFixed(2)}s`)
    
    console.log(`\n📈 Performance Metrics:`)
    console.log(`   • Total Requests: ${s.totalRequests}`)
    console.log(`   • Success Rate: ${s.successRate.toFixed(2)}%`)
    console.log(`   • Average Latency: ${s.averageLatency?.toFixed(2) || 'N/A'}ms`)
    console.log(`   • Min/Max Latency: ${s.minLatency?.toFixed(2) || 'N/A'}ms / ${s.maxLatency?.toFixed(2) || 'N/A'}ms`)
    
    if (s.p50Latency !== undefined) {
      console.log(`   • Latency Percentiles:`)
      console.log(`     - P50: ${s.p50Latency.toFixed(2)}ms`)
      console.log(`     - P90: ${s.p90Latency.toFixed(2)}ms`)
      console.log(`     - P95: ${s.p95Latency.toFixed(2)}ms`)
      console.log(`     - P99: ${s.p99Latency.toFixed(2)}ms`)
    }
    
    console.log(`\n🔒 Security & Rate Limiting:`)
    console.log(`   • Rate Limit Hits: ${s.rateLimitHits}`)
    console.log(`   • Auth Failures: ${s.authFailures}`)
    console.log(`   • Other Failures: ${s.failedRequests - s.rateLimitHits - s.authFailures}`)
    
    if (s.errors.length > 0) {
      console.log(`\n❌ Error Summary:`)
      s.errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
      if (s.errors.length > 5) {
        console.log(`   ... and ${s.errors.length - 5} more`)
      }
    }
    
    console.log(`\n💾 Results saved to: ${CONFIG.outputFile}`)
    console.log('=' * 60)

    // Save detailed results to file
    require('fs').writeFileSync(
      CONFIG.outputFile, 
      JSON.stringify(this.results, null, 2)
    )
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Performance benchmarking
async function runPerformanceBenchmarks() {
  console.log('\n🏁 Running Performance Benchmarks...')
  
  const benchmarks = {
    healthCheck: await benchmarkEndpoint('/api/health', 'GET'),
    unauthorizedRulebook: await benchmarkEndpoint('/api/rulebook', 'POST'),
    unauthorizedStrategy: await benchmarkEndpoint('/api/sites/123/strategy', 'POST')
  }
  
  console.log('\n📊 Benchmark Results:')
  Object.entries(benchmarks).forEach(([name, result]) => {
    console.log(`   ${name}: ${result.averageLatency.toFixed(2)}ms avg (${result.samples} samples)`)
  })
  
  return benchmarks
}

async function benchmarkEndpoint(path, method, samples = 10) {
  const latencies = []
  
  for (let i = 0; i < samples; i++) {
    const start = performance.now()
    try {
      await fetch(`${CONFIG.baseUrl}${path}`, { method })
    } catch (e) {
      // Ignore errors for benchmarking
    }
    latencies.push(performance.now() - start)
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return {
    samples: latencies.length,
    averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    minLatency: Math.min(...latencies),
    maxLatency: Math.max(...latencies)
  }
}

// Main execution
if (require.main === module) {
  (async () => {
    try {
      const harness = new LoadTestHarness()
      
      // Run performance benchmarks first
      const benchmarks = await runPerformanceBenchmarks()
      
      // Run main load test
      const results = await harness.runLoadTest()
      
      // Exit with success/failure code
      const exitCode = results.summary.successRate >= 95 ? 0 : 1
      
      if (exitCode === 0) {
        console.log('\n✅ Load test PASSED (success rate >= 95%)')
      } else {
        console.log('\n❌ Load test FAILED (success rate < 95%)')
      }
      
      process.exit(exitCode)
      
    } catch (error) {
      console.error('\n💥 Load test error:', error)
      process.exit(1)
    }
  })()
}

module.exports = { LoadTestHarness }
