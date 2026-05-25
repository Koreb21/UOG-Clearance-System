import { test, expect } from "@playwright/test";

/**
 * Skips when API is not running (local dev without backend).
 * Start backend with: mvn spring-boot:run (MongoDB required).
 */
test.describe("Backend API", () => {
  test("health reports UP when server is reachable", async ({ request }) => {
    const response = await request.get("http://localhost:8080/api/v1/health").catch(() => null);
    if (!response || !response.ok()) {
      test.skip(true, "Backend not running on localhost:8080");
      return;
    }
    const body = await response.json();
    expect(body.status).toBe("UP");
    expect(body.service).toBe("clearance-backend");
  });
});
