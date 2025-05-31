import { test, expect } from "./test.js";
import { homeTitle } from "../src/messages-home.js";

test("home page should have welcome heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText(homeTitle);
});

test("home page should have link to about", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("a", { hasText: "About" })).toHaveAttribute(
    "href",
    "/about"
  );
});
