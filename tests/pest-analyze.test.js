import { describe, expect } from "vitest";
import {
  appendFile,
  execAsync,
  readJSON,
  updatePestConfiguration,
  writeFile,
} from "./utils";
import { test } from "./test";

describe("pest analyze", () => {
  test("when no changes, should match nothing", async ({ cwd, signal }) => {
    await execAsync(`pnpm pest analyze`, { cwd, signal });
    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("should output to provided path", async ({ cwd, signal }) => {
    await updatePestConfiguration(cwd, {
      analysisFile: "pest-analysis.json",
      excludeDirectories: ["node_modules", "pest.config.js"],
    });
    await execAsync("pnpm pest analyze", { cwd, signal });
    const analysis = await readJSON(cwd, "pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when lockfile changes, should run all tests by default", async ({
    cwd,
    signal,
  }) => {
    await updatePestConfiguration(cwd, {
      forceAllTestsFiles: [],
    });
    await appendFile(cwd, "pnpm-lock.yaml", "# change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(true);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when provided forceAllTestsFiles changes, should run all tests", async ({
    cwd,
    signal,
  }) => {
    await updatePestConfiguration(cwd, {
      forceAllTestsFiles: ["playwright.config.mjs"],
    });
    await appendFile(cwd, "playwright.config.mjs", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(true);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when page changes, should detect only that page", async ({
    cwd,
    signal,
  }) => {
    await appendFile(cwd, "pages/about.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject(["pages/about.js"]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when page dependency changes, should detect all affected pages", async ({
    cwd,
    signal,
  }) => {
    await appendFile(cwd, "src/anchors-about.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([
      "pages/about.js",
      "pages/index.js",
    ]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when page and test dependency changes, should detect both", async ({
    cwd,
    signal,
  }) => {
    await appendFile(cwd, "src/messages-about.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject(["pages/about.js"]);
    expect(analysis.modifiedTestFiles).toMatchObject(["tests/about.spec.js"]);
  });

  test("when test file changes, should detect only that test file", async ({
    cwd,
    signal,
  }) => {
    await appendFile(cwd, "tests/about.spec.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject(["tests/about.spec.js"]);
  });

  test("when tests dependency changes, should detect all affected test files", async ({
    cwd,
    signal,
  }) => {
    await appendFile(cwd, "tests/test.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([
      "tests/about.spec.js",
      "tests/index.spec.js",
    ]);
  });

  test("when irrelevant file changes, should detect nothing", async ({
    cwd,
    signal,
  }) => {
    await appendFile(cwd, "README.md", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when new page is added, should detect it", async ({ cwd, signal }) => {
    await writeFile(cwd, "pages/new.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject(["pages/new.js"]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when new test file is added, should detect it", async ({
    cwd,
    signal,
  }) => {
    await writeFile(cwd, "tests/new.spec.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject(["tests/new.spec.js"]);
  });
});
