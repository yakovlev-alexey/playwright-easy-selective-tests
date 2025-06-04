# Playwright Easy Selective Tests (PEST)

A powerful tool to easily setup selective test execution in Playwright. PEST analyzes your code dependencies to determine which tests need to run, significantly reducing CI/CD time.

## How It Works

1. **Analyse changes**: `pest analyze` analyzes your code changes using the VCS (git by default) and [dependency-cruiser](https://www.npmjs.com/package/dependency-cruiser) to find:
   - Which source files changed
   - Which endpoints/pages are affected by these changes
   - Which test files depend on the changed code
2. **Test Execution**: Playwright fixture:
   - Reads the analysis results
   - Skips tests that don't use any modified endpoints
   - Tracks which endpoints each test actually uses using URLs
   - Reports mismatches to keep the endpoint map up to date
3. **Endpoint Mapping**: After tests run, worker processes save endpoint usage data which can be merged using `pest merge` to maintain an accurate map of which tests use which endpoints.

## Installation

```bash
pnpm add -D playwright-easy-selective-tests
# or
npm install --save-dev playwright-easy-selective-tests
# or
yarn add -D playwright-easy-selective-tests
```

Do not forget to install peer dependencies:

```bash
pnpm add -D dependency-cruiser
# or
npm install --save-dev dependency-cruiser
# or
yarn add -D dependency-cruiser
```

> I assume you already have Playwright installed

## Quick Start

### 1. Initialize Configuration

```bash
pnpm pest init
```

This creates a `pest.config.js` file. Edit it to match your project:

```js
// pest.config.js
export default {
  vcs: "git",
  baseBranch: "main",
  forceAllTestsFiles: ["playwright.config.js", "src/shared/config.js"],
  exclude: ["node_modules", "dist", ".git"],
  endpointRegex: "^pages/.*\\.tsx?$",
  getEndpointFromFile: undefined,
  testFilesRegex: "^tests/.*\\.spec\\.ts$",
  testEndpointMapFile: "tests/test-endpoints.json",
  projectRoot: undefined,
  includeOnly: undefined,
  getEndpointFromUrl: (url) => {
    try {
      const u = new URL(url, "http://localhost:3000");
      // Next.js serves pages as /about, /, etc. Map to pages/about.js, pages/index.js
      let path = u.pathname;
      if (path === "/") return "pages/index.js";
      if (path.endsWith("/")) path = path.slice(0, -1);
      return `pages${path}.js`;
    } catch {
      return null;
    }
  },
};
```

### 2. Undestrand how your endpoints work

The only challenging bit of configuration you need to do is to help PEST match files and urls to endpoints. Endpoint is not necessarily a URL endpoint, but rather a single somewhat decoupled part of your application. For some projects endpoints might be represented by pages (for example, Next.js), other projects can have custom solutions, including monolithic setups with multiple applications in the same project - in this case endpoints may represent those applications. When you are settled with how this should work:

1. Update `endpointRegex` in `pest.config.js`. It should only match paths to your endpoints. For example, `^pages/.*\\.jsx?$` will match all page files in Next.js project and results will look like `pages/about/contacts.js`. Some projects can have chaotic folder structure. In this case some refactoring might be necessary.

> If using a regular expression is not an option, or you have an application that has highly coupled groups of pages, you can implement `getEndpointFromFile(file)` to implement custom endpoint resolution behaviour.

2. Create `getEndpointFromUrl(url)` function. It will be used in fixture in the next step

   This function is necessary to match URLs that are being visited when running the test to endpoints. Endpoint format should always match the results from previous step (be a path to endpoint file if using regex or have the exact same value as `getEndpointFromFile`).

   ```js
   getEndpointFromUrl: (url) => {
     try {
       const u = new URL(url, "http://localhost");
       // Example: Next.js serves pages as /about, /, etc. Map to pages/about.js, pages/index.js
       let path = u.pathname;
       if (path === "/") return "pages/index.js";
       if (path.endsWith("/")) path = path.slice(0, -1);
       return `pages${path}.js`;
     } catch {
       return null;
     }
   };
   ```

### 3. Configure Playwright Tests with the Selective Fixture

Add fixture to your extended `test`:

```js
// tests/test.js
import { test as base } from "@playwright/test";
import { createSelectiveTestFixture } from "playwright-easy-selective-tests/fixture";
// You can use the same config file
import config from "../pest.config.js";

const [selectiveTestFixture, afterAllHook] = createSelectiveTestFixture(config);

export const test = base.extend({
  // Fixture is already configured to run automatically on every test case
  selectiveTestFixture: selectiveTestFixture,
});

// Make sure to also include the hook!
test.afterAll(afterAllHook);

export const expect = base.expect;
```

> It's best to put the fixture as early as possible - otherwise it might take more time to skip a test due to other fixtures.

### 4. Simply run your tests

All tests fill fail with annotation about mismatch in used endpoints.

### 5. Merge Endpoint Mappings

After running tests, merge the endpoint mappings produced by the fixture:

```bash
pnpm pest merge
```

This command collects endpoint usage data from all test workers and updates your `test-endpoints.json` file.

### 6. Analyze changes before running tests

After making changes make sure to run analysis command:

```bash
pnpm pest analyze
```

This command will generate a temporary file with the list of changed endpoints. This file be later consumed by fixture to tell which tests need to run.

## Advanced Usage

### CI configuration

To use PEST in CI simply run `pnpm pest analyze` before running tests.

```yaml
# .github/workflows/test.yml
name: Analyze changes
run: pnpm pest analyze

name: Run affected tests
run: pnpm playwright test
```

> You might want to also upload directory with temporary files (`.pest-temp` by default) so that you can use remote run results to update endpoint mapping without running tests locally.

### Custom endpoint names

You can implement `getEndpointFromFile` function in `pest.config.js` to use custom endpoint names. This may be useful if your project is structured into multiple highly coupled apps with multiple pages (`apps/landings/pages/contacts-page.js` and `apps/landings/pages/index-page.js` will both result as `landings`). See [custom endpoints example](./examples/custom-endpoints) for reference.

### Monorepo Setup

You can provide a custom `projectRoot` function so that PEST can work within monorepos. `projectRoot` should include the path from VCS repository root (which should be the same as workspaces root). Only the changes from this path will be taken into account and this path will be omitted from results.

### Workspace Dependency Detection

If you are using a monorepo or workspace setup (e.g., with pnpm, yarn, npm workspaces), you can configure PEST to detect changes in dependency packages and automatically run all tests if any dependency package is modified.

Add the `workspacePatterns` option to your `pest.config.js`:

```js
export default {
  // ... other config ...
  projectRoot: "apps/web", // relative to workspace root
  workspacePatterns: ["packages/*"], // glob patterns for workspace packages
};
```

If both `workspacePatterns` and `projectRoot` are set, PEST will use `@pnpm/fs.find-packages` to find all workspace packages and their manifests. If any of these packages change, all tests will be run.

> One large caveat is that only direct dependencies are supported at the moment. Contributions are welcome

### Programmatic API

Programmatic API can be used, for example, to check how many shards you need to use in your CI flows. Also if you are using shards, this can be helpful to merge endpoint mappings from multiple shards from remotely executed tests.

```js
import {
  loadConfig,
  analyzeChanges,
  mergeEndpointMappings,
} from "playwright-easy-selective-tests";

async function runAnalysis() {
  const config = await loadConfig("./pest.config.js");
  const results = await analyzeChanges(config);
  console.log("Run all tests", results.runAllTests);
  console.log("Affected endpoints:", results.modifiedEndpoints);
  console.log("Affected test files:", results.modifiedTestFiles);
}

// Merge endpoint mappings programmatically
await mergeEndpointMappings(".pest-temp", "test-endpoints.json");
```

## Exports

- `createSelectiveTestFixture` — Main Playwright fixture factory
- `mergeEndpointMappings` — Programmatic endpoint merging
- `loadConfig`, `analyzeChanges` — Programmatic analysis

## Example Project

See [`examples/next-basic`](./examples/next-basic) for a full working setup with Playwright and Next.js.

## Requirements

- Node.js >= 18
- Playwright >= 1.40.0
- dependency-cruiser >= 12.0.0

## Contributing

Contributions are welcome! Share your experience using PEST and help make it more reusable for different projects.

## License

MIT
