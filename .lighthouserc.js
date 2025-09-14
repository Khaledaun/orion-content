/**
 * Lighthouse CI Configuration
 * Phase 1 Enhancement: Performance monitoring and optimization
 */

module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/sites",
        "http://localhost:3000/drafts",
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --headless",
      },
    },
    assert: {
      assertions: {
        // Performance assertions
        "categories:performance": ["error", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.8 }],

        // Core Web Vitals
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],

        // Progressive Web App
        "installable-manifest": "off",
        "service-worker": "off",

        // Security
        "is-on-https": "off", // Disabled for local testing
        "uses-http2": "off",

        // Resource optimization
        "unused-javascript": ["warn", { maxNumericValue: 40000 }],
        "unused-css-rules": ["warn", { maxNumericValue: 40000 }],
        "uses-optimized-images": "warn",
        "uses-webp-images": "warn",
        "uses-text-compression": "warn",

        // Bundle size
        "total-byte-weight": ["warn", { maxNumericValue: 1600000 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
    server: {
      port: 9001,
      storage: ".lighthouseci",
    },
  },
};
