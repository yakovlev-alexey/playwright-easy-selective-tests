# Test info

- Name: app1 home page
- Location: /Users/yakovlev-alex/Repos/playwright-easy-selective-tests/examples/custom-endpoints/tests/app1.spec.js:3:1

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: getByText('Welcome to App 1')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for getByText('Welcome to App 1')

    at /Users/yakovlev-alex/Repos/playwright-easy-selective-tests/examples/custom-endpoints/tests/app1.spec.js:5:52
```

# Test source

```ts
   1 | import { test, expect } from "./test";
   2 |
   3 | test("app1 home page", async ({ page }) => {
   4 |   await page.goto("/app1");
>  5 |   await expect(page.getByText("Welcome to App 1")).toBeVisible();
     |                                                    ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
   6 | });
   7 |
   8 | test("app1 about page", async ({ page }) => {
   9 |   await page.goto("/app1/about");
  10 |   await expect(page.getByText("This is App 1's about page")).toBeVisible();
  11 | });
  12 |
```