/**
 * @type {import('playwright-easy-selective-tests').PestConfig}
 */
export default {
  vcs: "git",
  baseBranch: "main",
  forceAllTestsFiles: ["playwright.config.js"],
  exclude: ["node_modules", "dist", ".git"],
  endpointRegex: "^app[12]/src/.*\\.jsx?$",
  testFilesRegex: "^app[12]/tests/.*\\.spec\\.js$",
  testEndpointMapFile: "tests/test-endpoints.json",
  tempDir: ".pest-temp",
  analysisFile: ".pest-temp/.pest-analysis.json",
  projectRoot: import.meta.url.includes("playwright-easy-selective-tests")
    ? "examples/custom-endpoints"
    : undefined,
  getEndpointFromFile: (filePath) => {
    // Extract app name from file path
    const match = filePath.match(/^app([12])/);
    if (match) {
      return `app${match[1]}`;
    }
    return null;
  },
  getEndpointFromUrl: (url) => {
    try {
      const u = new URL(url, "http://localhost:3000");
      // Extract app name from URL path
      const match = u.pathname.match(/^\/app([12])/);
      if (match) {
        return `app${match[1]}`;
      }
      return null;
    } catch {
      return null;
    }
  },
};
