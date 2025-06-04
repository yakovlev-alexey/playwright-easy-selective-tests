import { test, expect } from "./test";

test("app2 dashboard page", async ({ page }) => {
  await page.goto("/app2");
  await expect(page.getByText("Welcome to App 2's dashboard")).toBeVisible();
});

test("app2 settings page", async ({ page }) => {
  await page.goto("/app2/settings");
  await expect(page.getByText("Configure App 2 settings here")).toBeVisible();
});
