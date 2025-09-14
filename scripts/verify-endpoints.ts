#!/usr/bin/env npx tsx

/**
 * Endpoint Verification Script
 * Tests NextAuth endpoints and other critical API routes after deployment
 */

interface EndpointTest {
  name: string;
  url: string;
  method: "GET" | "POST";
  expectedStatus: number[];
  validator?: (response: Response, body: any) => boolean;
  description: string;
}

class EndpointVerifier {
  private baseUrl: string;
  private timeout: number = 30000; // 30 seconds

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  private tests: EndpointTest[] = [
    {
      name: "NextAuth Providers",
      url: "/api/auth/providers",
      method: "GET",
      expectedStatus: [200],
      validator: (response, body) => {
        return body && typeof body === "object" && Object.keys(body).length > 0;
      },
      description: "NextAuth providers configuration endpoint",
    },
    {
      name: "NextAuth Session",
      url: "/api/auth/session",
      method: "GET",
      expectedStatus: [200],
      validator: (response, body) => {
        // Should return empty object when not authenticated, or session object when authenticated
        return body !== null && typeof body === "object";
      },
      description:
        "NextAuth session endpoint (should return {} when not logged in)",
    },
    {
      name: "NextAuth CSRF",
      url: "/api/auth/csrf",
      method: "GET",
      expectedStatus: [200],
      validator: (response, body) => {
        return body && body.csrfToken && typeof body.csrfToken === "string";
      },
      description: "NextAuth CSRF token endpoint",
    },
    {
      name: "Health Check",
      url: "/api/health",
      method: "GET",
      expectedStatus: [200, 404, 503], // 503 is OK if services are not fully configured, 404 is OK if endpoint doesn't exist
      description: "Application health check endpoint (optional)",
    },
    {
      name: "API Status",
      url: "/api/ops/status",
      method: "GET",
      expectedStatus: [200, 401, 404], // 401 is OK if endpoint is protected, 404 is OK if endpoint doesn't exist
      description: "Operational status endpoint (optional, may be protected)",
    },
  ];

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async testEndpoint(test: EndpointTest): Promise<{
    success: boolean;
    status: number;
    error?: string;
    body?: any;
    responseTime: number;
  }> {
    const url = `${this.baseUrl}${test.url}`;
    const startTime = Date.now();

    try {
      console.log(`  Testing ${test.name}...`);

      const response = await this.fetchWithTimeout(url, {
        method: test.method,
        headers: {
          Accept: "application/json",
          "User-Agent": "OrionCMS-EndpointVerifier/1.0",
        },
      });

      const responseTime = Date.now() - startTime;
      let body: any = null;

      try {
        const text = await response.text();
        if (text) {
          body = JSON.parse(text);
        }
      } catch {
        // Not JSON, that's OK for some endpoints
      }

      const statusOk = test.expectedStatus.includes(response.status);
      const validatorOk = !test.validator || test.validator(response, body);

      return {
        success: statusOk && validatorOk,
        status: response.status,
        body,
        responseTime,
        error: !statusOk
          ? `Expected status ${test.expectedStatus.join(" or ")}, got ${response.status}`
          : !validatorOk
            ? "Response validation failed"
            : undefined,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        status: 0,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async verifyEndpoints(): Promise<{
    success: boolean;
    results: Array<{
      test: EndpointTest;
      result: any;
    }>;
  }> {
    console.log(`🔍 Verifying endpoints at ${this.baseUrl}\n`);

    const results = [];
    let allSuccess = true;

    for (const test of this.tests) {
      const result = await this.testEndpoint(test);
      results.push({ test, result });

      if (result.success) {
        console.log(
          `  ✅ ${test.name}: ${result.status} (${result.responseTime}ms)`,
        );
        if (result.body && Object.keys(result.body).length > 0) {
          console.log(
            `     Response: ${JSON.stringify(result.body).slice(0, 100)}${JSON.stringify(result.body).length > 100 ? "..." : ""}`,
          );
        }
      } else {
        console.log(
          `  ❌ ${test.name}: ${result.error} (${result.responseTime}ms)`,
        );
        allSuccess = false;
      }
    }

    return { success: allSuccess, results };
  }

  public printSummary(results: any): void {
    console.log("\n📋 Endpoint Verification Summary:\n");

    const successful = results.results.filter((r: any) => r.result.success);
    const failed = results.results.filter((r: any) => !r.result.success);

    console.log(
      `✅ Successful: ${successful.length}/${results.results.length}`,
    );
    if (failed.length > 0) {
      console.log(`❌ Failed: ${failed.length}/${results.results.length}`);
      console.log("\nFailed endpoints:");
      failed.forEach((f: any) => {
        console.log(`  - ${f.test.name}: ${f.result.error}`);
      });
    }

    if (results.success) {
      console.log("\n🎉 All critical endpoints are working correctly!");
    } else {
      console.log(
        "\n⚠️ Some endpoints failed. Check the configuration and try again.",
      );
    }
  }

  public generateCurlCommands(): string[] {
    console.log("\n📋 Curl commands for manual testing:\n");

    const commands = this.tests
      .filter((test) => test.method === "GET")
      .map((test) => {
        const url = `${this.baseUrl}${test.url}`;
        const command = `curl -s -w "\\nStatus: %{http_code}\\nTime: %{time_total}s\\n" "${url}"`;
        console.log(`# ${test.description}`);
        console.log(command);
        console.log();
        return command;
      });

    return commands;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  // Filter out options to find the base URL
  const urlArg = args.find((arg) => !arg.startsWith("--"));
  const baseUrl = urlArg || process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npx tsx scripts/verify-endpoints.ts [BASE_URL] [OPTIONS]

Arguments:
  BASE_URL    Base URL to test (default: NEXTAUTH_URL or http://localhost:3000)

Options:
  --curl-only    Only generate curl commands, don't run tests
  --help, -h     Show this help message

Examples:
  npx tsx scripts/verify-endpoints.ts
  npx tsx scripts/verify-endpoints.ts https://your-app.vercel.app
  npx tsx scripts/verify-endpoints.ts --curl-only
`);
    process.exit(0);
  }

  const verifier = new EndpointVerifier(baseUrl);

  if (args.includes("--curl-only")) {
    verifier.generateCurlCommands();
    process.exit(0);
  }

  verifier
    .verifyEndpoints()
    .then((results) => {
      verifier.printSummary(results);
      verifier.generateCurlCommands();

      if (!results.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Verification failed:", error);
      process.exit(1);
    });
}

export { EndpointVerifier };
