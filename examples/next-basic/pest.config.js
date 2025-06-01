/**
 * @type {import('playwright-easy-selective-tests').PestConfig}
 */
export default {
  vcs: "git",
  baseBranch: "main",
  forceAllTestsFiles: ["package.json", "pnpm-lock.yaml"],
  excludeDirectories: ["node_modules", ".next", ".git"],
  endpointRegex: "^pages/.*\\.js$",
  testFilesRegex: "^tests/.*\\.spec\\.js$",
  testEndpointMapFile: "tests/test-endpoints.json",
  projectRoot: import.meta.url.includes("playwright-easy-selective-tests")
    ? "examples/next-basic"
    : undefined,
};
