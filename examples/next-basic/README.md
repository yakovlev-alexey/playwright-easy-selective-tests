# Next.js Example with playwright-easy-selective-tests

This is a minimal Next.js project demonstrating selective Playwright test execution using [playwright-easy-selective-tests](https://github.com/your-org/playwright-easy-selective-tests).

## Setup

```bash
pnpm install
pnpm playwright install
```

## Usage

1. **Analyze changes**

   ```bash
   pnpm pest analyze
   ```

2. **Run Playwright tests**

   ```bash
   pnpm playwright test
   ```

3. **Merge endpoint mappings** (after running tests)

   ```bash
   pnpm pest merge
   ```

## How it works

- Only tests affected by changes to `pages/*.js` will run.
- The fixture uses a matcher to map URLs like `/about` to `pages/about.js`.
- Endpoint usage is tracked and can be merged into `test-endpoints.json`.

## Test files

- `tests/home.spec.js` - tests the home page
- `tests/about.spec.js` - tests the about page

## Configuration

See `pest.config.js` for details.
