# Playwright Easy Selective Tests (PEST)

A powerful tool for running only the Playwright tests affected by your code changes. PEST analyzes your code dependencies to determine which tests need to run, significantly reducing CI/CD time.

## Features

- 🎯 **Selective Test Execution** - Run only tests affected by changed code
- 🔍 **Dependency Analysis** - Uses dependency-cruiser to trace code dependencies
- 🔧 **Configurable** - Flexible configuration for different project structures
- 🚀 **Easy Integration** - Simple fixture for Playwright tests
- 📊 **Endpoint Tracking** - Track which endpoints/pages each test uses

## Installation

```bash
npm install --save-dev playwright-easy-selective-tests
# or
pnpm add -D playwright-easy-selective-tests
# or
yarn add -D playwright-easy-selective-tests
```

## Quick Start

### 1. Initialize Configuration

```bash
npx pest init
```

This creates a `pest.config.js` file. Edit it to match your project:

```javascript
// pest.config.js
export default {
  // Version control system command
  vcs: "git", // or 'arc' for Phabricator

  // Branch to compare against
  baseBranch: "main",

  // Files that trigger all tests when changed
  forceAllTestsFiles: [
    "playwright.config.js",
    ".github/workflows/*.yml",
    "src/shared/config.js",
  ],

  // Directories to exclude from analysis
  excludeDirectories: ["node_modules", "dist", ".git"],

  // Pattern for your app's entry points (pages, bundles, etc.)
  endpointRegex: "^src/pages/.*\\.tsx?$",

  // Pattern for test files
  testFilesRegex: "^tests/.*\\.spec\\.ts$",

  // File to store test-endpoint mappings
  testEndpointMapFile: "test-endpoints.json",
};
```

### 2. Add Analysis to Your CI Pipeline

Add a step before running tests:

```yaml
# .github/workflows/test.yml
- name: Analyze changes
  run: npx pest analyze

- name: Run affected tests
  run: npx playwright test
```

### 3. Configure Playwright Tests

Update your Playwright configuration to use the selective test fixture:

```javascript
// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  // your existing config...
});
```

Create a custom test fixture:

```javascript
// tests/fixtures.js
import { test as base } from "@playwright/test";
import {
  createSelectiveTestFixture,
  createAfterAllHook,
} from "playwright-easy-selective-tests/fixture";

export const test = base.extend({
  page: createSelectiveTestFixture({
    analysisFile: ".pest-analysis.json",
    endpointMapFile: "test-endpoints.json",
    endpointRegex: "^/pages/.*", // URL pattern for your pages
  }),
});

// Add afterAll hook to save endpoint data
test.afterAll(createAfterAllHook());

export { expect } from "@playwright/test";
```

### 4. Use in Your Tests

```javascript
// tests/example.spec.ts
import { test, expect } from "./fixtures";

test("user can login", async ({ page }) => {
  await page.goto("/pages/login");
  // Your test code...
});

test("user can view profile", async ({ page }) => {
  await page.goto("/pages/profile");
  // Your test code...
});
```

### 5. Merge Endpoint Mappings

After running tests, merge the endpoint mappings:

```bash
npx pest merge
```

This command collects endpoint usage data from all test workers and updates your `test-endpoints.json` file.

## How It Works

1. **Analysis Phase**: PEST analyzes your code changes using the VCS (git by default) and dependency-cruiser to find:

   - Which source files changed
   - Which endpoints/pages are affected by these changes
   - Which test files depend on the changed code

2. **Test Execution**: The Playwright fixture:

   - Reads the analysis results
   - Skips tests that don't use any modified endpoints
   - Tracks which endpoints each test actually uses
   - Reports mismatches to keep the endpoint map up to date

3. **Endpoint Mapping**: After tests run, worker processes save endpoint usage data which can be merged to maintain an accurate map of which tests use which endpoints.

## Advanced Usage

### Custom VCS Commands

For non-git version control systems:

```javascript
// pest.config.js
export default {
  vcs: "arc", // Uses 'arc diff' instead of 'git diff'
  baseBranch: "trunk",
  // ...
};
```

### Multiple Entry Point Types

```javascript
// pest.config.js
export default {
  // Match multiple patterns
  endpointRegex: "^(src/pages/.*\\.tsx?|src/bundles/.*\\.js)$",
  // ...
};
```

### Programmatic API

```javascript
import { loadConfig, analyzeChanges } from "playwright-easy-selective-tests";

async function runAnalysis() {
  const config = await loadConfig("./pest.config.js");
  const results = await analyzeChanges(config);

  console.log("Run all tests?", results.runAllTests);
  console.log("Modified endpoints:", results.modifiedEndpoints);
  console.log("Modified test files:", results.modifiedTestFiles);
}
```

### Environment Variables

The analysis results are also exposed as environment variables:

- `RUN_ALL_TESTS` - "1" if all tests should run, "0" otherwise
- `MODIFIED_BUNDLES` - Pipe-separated list of modified endpoints
- `MODIFIED_TEST_FILES` - Pipe-separated list of modified test files

## Configuration Reference

| Option                | Type     | Default                 | Description                             |
| --------------------- | -------- | ----------------------- | --------------------------------------- |
| `vcs`                 | string   | `'git'`                 | Version control command                 |
| `baseBranch`          | string   | `'main'`                | Branch to diff against                  |
| `forceAllTestsFiles`  | string[] | `[]`                    | Additional files that trigger all tests |
| `excludeDirectories`  | string[] | `[]`                    | Directories to exclude from analysis    |
| `endpointRegex`       | string   | required                | Pattern for endpoint files              |
| `testFilesRegex`      | string   | required                | Pattern for test files                  |
| `testEndpointMapFile` | string   | `'test-endpoints.json'` | Endpoint mapping file                   |

## CLI Commands

### `pest analyze`

Analyzes code changes and generates test execution data.

Options:

- `-c, --config <path>` - Path to config file (default: `pest.config.js`)
- `-o, --output <path>` - Output file path (default: `.pest-analysis.json`)

### `pest merge`

Merges test endpoint mappings from worker files.

Options:

- `-d, --temp-dir <path>` - Temporary directory (default: `.pest-temp`)
- `-o, --output <path>` - Output file (default: `test-endpoints.json`)

### `pest init`

Creates a starter configuration file.

## Tips

1. **Initial Setup**: Run all tests once to generate the initial endpoint mappings
2. **CI Integration**: The analyze command exits with code 0 when all tests should run
3. **Debugging**: Check `.pest-analysis.json` to see what PEST detected
4. **Performance**: Exclude large directories and node_modules for faster analysis

## License

MIT
