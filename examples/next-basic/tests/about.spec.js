import { test, expect } from "./test.js";
import { aboutTitle } from "../src/messages-about.js";
import { homeTitle } from "../src/messages-home.js";

test("about page should have about heading", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("h1")).toHaveText(aboutTitle);
});

test("about page should have link to home", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("a", { hasText: "Home" })).toHaveAttribute(
    "href",
    "/"
  );
});

test("link to home should navigate to home page", async ({ page }) => {
  await page.goto("/about");
  await page.locator("a", { hasText: "Home" }).click();
  await expect(page.locator("h1")).toHaveText(homeTitle);
});
