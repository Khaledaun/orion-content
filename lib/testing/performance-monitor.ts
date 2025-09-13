
/**
 * Performance Monitoring for Tests
 * Phase 1 Enhancement: Real-time performance tracking and analysis
 */

import { logger } from '@/lib/logger'

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: Date
  context?: Record<string, any>
}

interface PerformanceThreshold {
  name: string
  maxValue: number
  unit: string
  critical: boolean
}

interface PerformanceReport {
  testName: string
  duration: number
  metrics: PerformanceMetric[]
  thresholdViolations: string[]
  memoryUsage: NodeJS.MemoryUsage
  resourceUtilization: {
    cpu: number
    memory: number
  }
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private thresholds: Map<string, PerformanceThreshold> = new Map()
  private activeTests: Map<string, { startTime: number; startMemory: NodeJS.MemoryUsage }> = new Map()

  private constructor() {
    this.setupDefaultThresholds()
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  public startTest(testName: string): void {
    this.activeTests.set(testName, {
      startTime: Date.now(),
      startMemory: process.memoryUsage()
    })
    
    if (!this.metrics.has(testName)) {
      this.metrics.set(testName, [])
    }
  }

  public endTest(testName: string): PerformanceReport | null {
    const testData = this.activeTests.get(testName)
    if (!testData) {
      logger.warn('Attempted to end test that was not started', { testName })
      return null
    }

    const duration = Date.now() - testData.startTime
    const currentMemory = process.memoryUsage()
    const metrics = this.metrics.get(testName) || []
    
    // Calculate memory usage difference
    const memoryUsage: NodeJS.MemoryUsage = {
      rss: currentMemory.rss - testData.startMemory.rss,
      heapTotal: currentMemory.heapTotal - testData.startMemory.heapTotal,
      heapUsed: currentMemory.heapUsed - testData.startMemory.heapUsed,
      external: currentMemory.external - testData.startMemory.external,
      arrayBuffers: currentMemory.arrayBuffers - testData.startMemory.arrayBuffers
    }

    // Calculate resource utilization
    const resourceUtilization = this.calculateResourceUtilization(memoryUsage)

    // Check threshold violations
    const thresholdViolations = this.checkThresholdViolations(testName, duration, metrics)

    const report: PerformanceReport = {
      testName,
      duration,
      metrics,
      thresholdViolations,
      memoryUsage,
      resourceUtilization
    }

    // Clean up
    this.activeTests.delete(testName)
    this.metrics.delete(testName)

    // Log performance report
    this.logPerformanceReport(report)

    return report
  }

  public recordMetric(
    testName: string,
    metricName: string,
    value: number,
    unit: string = 'ms',
    context?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name: metricName,
      value,
      unit,
      timestamp: new Date(),
      context
    }

    const testMetrics = this.metrics.get(testName) || []
    testMetrics.push(metric)
    this.metrics.set(testName, testMetrics)
  }

  public async measureAsyncOperation<T>(
    testName: string,
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()

    try {
      const result = await operation()
      const duration = Date.now() - startTime
      const endMemory = process.memoryUsage()

      this.recordMetric(testName, `${operationName}-duration`, duration, 'ms', {
        ...context,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed
      })

      return result

    } catch (error) {
      const duration = Date.now() - startTime
      this.recordMetric(testName, `${operationName}-error-duration`, duration, 'ms', {
        ...context,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  public measureSyncOperation<T>(
    testName: string,
    operationName: string,
    operation: () => T,
    context?: Record<string, any>
  ): T {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()

    try {
      const result = operation()
      const duration = Date.now() - startTime
      const endMemory = process.memoryUsage()

      this.recordMetric(testName, `${operationName}-duration`, duration, 'ms', {
        ...context,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed
      })

      return result

    } catch (error) {
      const duration = Date.now() - startTime
      this.recordMetric(testName, `${operationName}-error-duration`, duration, 'ms', {
        ...context,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  public setThreshold(
    name: string,
    maxValue: number,
    unit: string = 'ms',
    critical: boolean = false
  ): void {
    this.thresholds.set(name, { name, maxValue, unit, critical })
  }

  public getPerformanceStats(testName: string): {
    totalMetrics: number
    avgDuration: number
    maxDuration: number
    minDuration: number
    memoryMetrics: PerformanceMetric[]
  } | null {
    const metrics = this.metrics.get(testName)
    if (!metrics || metrics.length === 0) {
      return null
    }

    const durationMetrics = metrics.filter(m => m.unit === 'ms')
    const memoryMetrics = metrics.filter(m => m.unit === 'bytes')

    const durations = durationMetrics.map(m => m.value)
    
    return {
      totalMetrics: metrics.length,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      memoryMetrics
    }
  }

  public generateReport(): string {
    const allTests = Array.from(this.metrics.keys())
    
    let report = '# Performance Test Report\n\n'
    report += `Generated at: ${new Date().toISOString()}\n`
    report += `Total tests: ${allTests.length}\n\n`

    for (const testName of allTests) {
      const stats = this.getPerformanceStats(testName)
      if (!stats) continue

      report += `## ${testName}\n`
      report += `- Total metrics: ${stats.totalMetrics}\n`
      report += `- Average duration: ${stats.avgDuration.toFixed(2)}ms\n`
      report += `- Max duration: ${stats.maxDuration}ms\n`
      report += `- Min duration: ${stats.minDuration}ms\n`
      report += `- Memory metrics: ${stats.memoryMetrics.length}\n\n`
    }

    return report
  }

  private setupDefaultThresholds(): void {
    this.setThreshold('test-duration', 30000, 'ms', true) // 30 seconds max
    this.setThreshold('api-response', 1000, 'ms', false) // 1 second for API
    this.setThreshold('database-query', 500, 'ms', false) // 500ms for DB queries
    this.setThreshold('memory-usage', 100 * 1024 * 1024, 'bytes', true) // 100MB max
  }

  private calculateResourceUtilization(memoryUsage: NodeJS.MemoryUsage): { cpu: number; memory: number } {
    // Simplified resource utilization calculation
    // In a real implementation, this would use more sophisticated CPU monitoring
    const memoryUtilization = (memoryUsage.heapUsed / (1024 * 1024 * 1024)) * 100 // % of 1GB
    
    return {
      cpu: 0, // Would need CPU monitoring library
      memory: Math.min(100, Math.max(0, memoryUtilization))
    }
  }

  private checkThresholdViolations(
    testName: string,
    duration: number,
    metrics: PerformanceMetric[]
  ): string[] {
    const violations: string[] = []

    // Check test duration threshold
    const durationThreshold = this.thresholds.get('test-duration')
    if (durationThreshold && duration > durationThreshold.maxValue) {
      violations.push(`Test duration (${duration}ms) exceeded threshold (${durationThreshold.maxValue}ms)`)
    }

    // Check metric thresholds
    for (const metric of metrics) {
      const threshold = this.thresholds.get(metric.name)
      if (threshold && metric.value > threshold.maxValue) {
        violations.push(`${metric.name} (${metric.value}${metric.unit}) exceeded threshold (${threshold.maxValue}${threshold.unit})`)
      }
    }

    return violations
  }

  private logPerformanceReport(report: PerformanceReport): void {
    const logLevel = report.thresholdViolations.length > 0 ? 'warn' : 'info'
    
    logger[logLevel]('Performance test completed', {
      testName: report.testName,
      duration: report.duration,
      metricsCount: report.metrics.length,
      thresholdViolations: report.thresholdViolations,
      memoryUsage: {
        heapUsed: `${(report.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        external: `${(report.memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
      },
      resourceUtilization: report.resourceUtilization
    })
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Test decorator for automatic performance monitoring
export function MonitorPerformance(testName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const monitorTestName = testName || `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startTest(monitorTestName)
      
      try {
        const result = await originalMethod.apply(this, args)
        performanceMonitor.endTest(monitorTestName)
        return result
      } catch (error) {
        performanceMonitor.endTest(monitorTestName)
        throw error
      }
    }

    return descriptor
  }
}
