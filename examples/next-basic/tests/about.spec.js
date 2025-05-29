import { test, expect } from "./fixtures.js";
import { aboutTitle } from "../pages/messages-about.js";

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
