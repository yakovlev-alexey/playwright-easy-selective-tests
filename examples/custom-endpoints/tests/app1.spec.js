import { test, expect } from "./test";

test("app1 home page", async ({ page }) => {
  await page.goto("/app1");
  await expect(page.getByText("Welcome to App 1")).toBeVisible();
});

test("app1 about page", async ({ page }) => {
  await page.goto("/app1/about");
  await expect(page.getByText("This is App 1's about page")).toBeVisible();
});
