/**
 * @type {import('playwright-easy-selective-tests').PestConfig}
 */
export default {
  vcs: "git",
  baseBranch: "main",
  forceAllTestsFiles: ["playwright.config.mjs"],
  exclude: [
    "node_modules",
    "\\.next",
    "\\.git",
    "tests/excluded-file\\.spec\\.ts",
  ],
  endpointRegex: "^pages/.*\\.js$",
  testFilesRegex: "^tests/.*\\.spec\\.js$",
  testEndpointMapFile: "tests/test-endpoints.json",
  tempDir: ".pest-temp",
  analysisFile: ".pest-temp/.pest-analysis.json",
  projectRoot: import.meta.url.includes("playwright-easy-selective-tests")
    ? "examples/next-basic"
    : undefined,
  workspacePatterns: ["examples/*"],
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
