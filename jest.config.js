/**
 * Enhanced Jest Configuration
 * Phase 1 Enhancement: Comprehensive testing setup with coverage and performance monitoring
 */

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  testEnvironment: "jest-environment-jsdom",

  // Test file patterns
  testMatch: [
    "<rootDir>/**/__tests__/**/*.(ts|tsx|js|jsx)",
    "<rootDir>/**/?(*.)(spec|test).(ts|tsx|js|jsx)",
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/coverage/",
    "<rootDir>/dist/",
    "<rootDir>/build/",
  ],

  // Module name mapping
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/*.stories.{ts,tsx}",
    "!**/*.config.{ts,js}",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!**/test/**",
    "!**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "text-summary",
    "lcov",
    "html",
    "json",
    "json-summary",
    "cobertura",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    // Specific thresholds for critical modules
    "./lib/database/": {
      branches: 90,
      functions: 90,
      lines: 95,
      statements: 95,
    },
    "./lib/architecture/": {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },

  // Performance monitoring
  slowTestThreshold: 5,
  verbose: true,

  // Test environment setup
  testEnvironmentOptions: {
    url: "http://localhost:3000",
  },

  // Transform configuration
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },

  // Module file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Globals
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },

  // Reporters
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "coverage/html-report",
        filename: "report.html",
        expand: true,
      },
    ],
    [
      "jest-junit",
      {
        outputDirectory: "coverage",
        outputName: "junit.xml",
        ancestorSeparator: " › ",
        uniqueOutputName: "false",
        suiteNameTemplate: "{filepath}",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
      },
    ],
  ],

  // Maximum number of worker processes
  maxWorkers: "50%",

  // Cache configuration
  cache: true,
  cacheDirectory: "<rootDir>/.jest/cache",

  // Watch plugins
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
  ],

  // Error handling
  errorOnDeprecated: true,

  // Test timeout
  testTimeout: 30000,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
