import { describe, expect } from "vitest";
import {
  appendFile,
  execAsync,
  readJSON,
  updatePestConfiguration,
} from "./utils";
import { test } from "./test";
import path from "node:path";

describe.sequential("pest analyze", () => {
  test("when no changes, should match nothing", async ({ cwd }) => {
    await execAsync(`pnpm pest analyze`, { cwd });
    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("should output to provided path", async ({ cwd }) => {
    const outputPath = path.join(cwd, "pest-analysis.json");
    await execAsync(`pnpm pest analyze --output ${outputPath}`, { cwd });
    const analysis = await readJSON(cwd, "pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when lockfile changes, should run all tests by default", async ({
    cwd,
  }) => {
    await updatePestConfiguration(cwd, {
      forceAllTestsFiles: [],
    });
    await appendFile(cwd, "pnpm-lock.yaml", "# change");
    await execAsync(`pnpm pest analyze`, { cwd });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(true);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when provided forceAllTestsFiles changes, should run all tests", async ({
    cwd,
  }) => {
    await updatePestConfiguration(cwd, {
      forceAllTestsFiles: ["playwright.config.mjs"],
    });
    await appendFile(cwd, "playwright.config.mjs", "// change");
    await execAsync(`pnpm pest analyze`, { cwd });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(true);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when page changes, should detect only that page", async ({ cwd }) => {
    await appendFile(cwd, "pages/about.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject(["pages/about.js"]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });

  test("when page dependency changes, should detect all affected pages", async ({
    cwd,
  }) => {
    await appendFile(cwd, "src/anchors-about.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd });

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
  }) => {
    await appendFile(cwd, "src/messages-about.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject(["pages/about.js"]);
    expect(analysis.modifiedTestFiles).toMatchObject(["tests/about.spec.js"]);
  });

  test("when test file changes, should detect only that test file", async ({
    cwd,
  }) => {
    await appendFile(cwd, "tests/about.spec.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject(["tests/about.spec.js"]);
  });

  test("when tests dependency changes, should detect all affected test files", async ({
    cwd,
  }) => {
    await appendFile(cwd, "tests/test.js", "// change");
    await execAsync(`pnpm pest analyze`, { cwd });

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
  }) => {
    await appendFile(cwd, "README.md", "// change");
    await execAsync(`pnpm pest analyze`, { cwd });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject([]);
    expect(analysis.modifiedTestFiles).toMatchObject([]);
  });
});
