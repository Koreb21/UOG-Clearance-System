import { test, expect } from "@playwright/test";

test.describe("Login UI", () => {
  test("landing shows primary access action", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /access clearance dashboard/i })).toBeVisible();
  });
});
