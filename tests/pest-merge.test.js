import { describe, expect } from "vitest";
import {
  execAsync,
  readJSON,
  updatePestConfiguration,
  createMockWorkerFile,
  createMockTestEndpointsFile,
} from "./utils";
import { test } from "./test";
import { join } from "path";
import { exists } from "fs-extra";
import { writeFile } from "fs/promises";

const DEFAULT_TEMP_DIR = ".pest-temp";
const DEFAULT_OUTPUT_FILE = "tests/test-endpoints.json";

describe("pest merge", () => {
  test("should merge worker files into the default output file", async ({
    cwd,
    signal,
  }) => {
    await createMockWorkerFile(cwd, DEFAULT_TEMP_DIR, "worker1", {
      "about.spec.js::about page should have about heading": ["pages/about.js"],
      "index.spec.js::home page should have welcome heading": [
        "pages/index.js",
      ],
    });
    await createMockWorkerFile(cwd, DEFAULT_TEMP_DIR, "worker2", {
      "about.spec.js::link to home should navigate to home page": [
        "pages/about.js",
        "pages/index.js",
      ],
      "about.spec.js::about page should have about heading": [
        "pages/about.js",
        "src/components/Layout.js",
      ],
    });

    await execAsync("pnpm pest merge", { cwd, signal });

    const mergedData = await readJSON(cwd, DEFAULT_OUTPUT_FILE);
    expect(mergedData).toMatchObject({
      "about.spec.js::about page should have about heading": [
        "pages/about.js",
        "src/components/Layout.js",
      ],
      "index.spec.js::home page should have welcome heading": [
        "pages/index.js",
      ],
      "about.spec.js::link to home should navigate to home page": [
        "pages/about.js",
        "pages/index.js",
      ],
    });

    expect(
      await exists(join(cwd, DEFAULT_TEMP_DIR, "worker-worker1.json"))
    ).toBe(false);
    expect(
      await exists(join(cwd, DEFAULT_TEMP_DIR, "worker-worker2.json"))
    ).toBe(false);
  });

  test("should create new custom output file if it doesn't exist", async ({
    cwd,
    signal,
  }) => {
    const customOutputFile = "custom-output.json";
    await updatePestConfiguration(cwd, {
      testEndpointMapFile: customOutputFile,
    });

    await createMockWorkerFile(cwd, DEFAULT_TEMP_DIR, "workerA", {
      "index.spec.js::home page should have link to about": ["pages/index.js"],
    });

    await execAsync("pnpm pest merge", { cwd, signal });

    const mergedData = await readJSON(cwd, customOutputFile);
    expect(mergedData).toEqual({
      "index.spec.js::home page should have link to about": ["pages/index.js"],
    });
  });

  test("should merge with existing custom output file", async ({
    cwd,
    signal,
  }) => {
    const customOutputFile = "existing-custom-output.json";
    await updatePestConfiguration(cwd, {
      testEndpointMapFile: customOutputFile,
    });

    await createMockTestEndpointsFile(cwd, customOutputFile, {
      "about.spec.js::about page should have about heading": ["pages/about.js"],
      "index.spec.js::home page should have welcome heading": [
        "pages/index.js",
      ],
    });

    await createMockWorkerFile(cwd, DEFAULT_TEMP_DIR, "workerNew", {
      "about.spec.js::link to home should navigate to home page": [
        "pages/about.js",
        "pages/index.js",
      ],
      "index.spec.js::home page should have welcome heading": [
        "pages/index.js",
        "src/components/Header.js",
      ],
    });

    await execAsync("pnpm pest merge", { cwd, signal });

    const mergedData = await readJSON(cwd, customOutputFile);
    expect(mergedData).toEqual({
      "about.spec.js::about page should have about heading": ["pages/about.js"],
      "index.spec.js::home page should have welcome heading": [
        "pages/index.js",
        "src/components/Header.js",
      ],
      "about.spec.js::link to home should navigate to home page": [
        "pages/about.js",
        "pages/index.js",
      ],
    });
  });

  test("should handle no worker files gracefully", async ({ cwd, signal }) => {
    const customOutputFile = "no-workers-custom-output.json";
    await updatePestConfiguration(cwd, {
      testEndpointMapFile: customOutputFile,
    });

    const { stdout, stderr } = await execAsync("pnpm pest merge", {
      cwd,
      signal,
    });

    expect(stdout).toContain("No worker files found to merge");
    expect(await exists(join(cwd, customOutputFile))).toBe(false);
  });

  test("should handle empty worker files", async ({ cwd, signal }) => {
    const customOutputFile = "empty-worker-custom-output.json";
    await updatePestConfiguration(cwd, {
      testEndpointMapFile: customOutputFile,
    });

    await createMockWorkerFile(cwd, DEFAULT_TEMP_DIR, "emptyWorker", {});

    await execAsync("pnpm pest merge", { cwd, signal });

    const mergedData = await readJSON(cwd, customOutputFile);
    expect(mergedData).toEqual({});
    expect(
      await exists(join(cwd, DEFAULT_TEMP_DIR, "worker-emptyWorker.json"))
    ).toBe(false);
  });

  test("should warn on malformed worker JSON and skip it", async ({
    cwd,
    signal,
  }) => {
    const customOutputFile = "malformed-worker-custom-output.json";
    await updatePestConfiguration(cwd, {
      testEndpointMapFile: customOutputFile,
    });

    await createMockWorkerFile(cwd, DEFAULT_TEMP_DIR, "goodWorker", {
      "index.spec.js::home page should have link to about": [
        "pages/index.js",
        "src/components/Footer.js",
      ],
    });
    const malformedFilePath = join(
      cwd,
      DEFAULT_TEMP_DIR,
      "worker-malformed.json"
    );
    await execAsync(`mkdir -p ${join(cwd, DEFAULT_TEMP_DIR)}`, { cwd, signal });
    await writeFile(malformedFilePath, '{"badJsonFormat');

    const { stdout, stderr } = await execAsync("pnpm pest merge", {
      cwd,
      signal,
    });

    expect(stderr).toContain("Error processing worker-malformed.json:");

    const mergedData = await readJSON(cwd, customOutputFile);
    expect(mergedData).toEqual({
      "index.spec.js::home page should have link to about": [
        "pages/index.js",
        "src/components/Footer.js",
      ],
    });

    expect(
      await exists(join(cwd, DEFAULT_TEMP_DIR, "worker-goodWorker.json"))
    ).toBe(false);
    // Malformed file should not be deleted
    expect(await exists(malformedFilePath)).toBe(true);
  });
});
