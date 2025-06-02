import { describe, expect } from "vitest";
import {
  appendFile,
  execAsync,
  readJSON,
  updatePestConfiguration,
  updateTestEndpoints,
  mockPestAnalysis,
} from "./utils";
import { test } from "./test";
import { readdir, copyFile } from "fs/promises";
import path from "path";

describe("pest fixture", () => {
  test("when runAllTests is true, should run all tests", async ({
    cwd,
    signal,
  }) => {
    await mockPestAnalysis(cwd, {
      runAllTests: true,
      modifiedEndpoints: ["pages/about.js"],
      modifiedTestFiles: ["tests/index.spec.js"],
    });

    await execAsync(`pnpm test`, { cwd, signal });

    const testResults = await readJSON(cwd, "test-results.json");
    testResults.tests.forEach((test) => {
      expect(test.status).toBe("passed");
    });
  });

  test("when endpoints are specified, should run all affected tests", async ({
    cwd,
    signal,
  }) => {
    await mockPestAnalysis(cwd, {
      runAllTests: false,
      modifiedEndpoints: ["pages/index.js"],
      modifiedTestFiles: [],
    });

    await execAsync(`pnpm test`, { cwd, signal });

    const testResults = await readJSON(cwd, "test-results.json");
    const testEndpointMap = await readJSON(cwd, "tests/test-endpoints.json");

    Object.entries(testEndpointMap).forEach(([testTitle, endpoints]) => {
      const test = testResults.tests.find((t) => t.title === testTitle);
      expect(test).toBeDefined();
      if (endpoints.includes("pages/index.js")) {
        expect(test.status).toBe("passed");
      } else {
        expect(test.status).toBe("skipped");
      }
    });
  });

  test("when test files are specified, should run all affected tests", async ({
    cwd,
    signal,
  }) => {
    await mockPestAnalysis(cwd, {
      runAllTests: false,
      modifiedEndpoints: [],
      modifiedTestFiles: ["tests/index.spec.js"],
    });

    await execAsync(`pnpm test`, { cwd, signal });

    const testResults = await readJSON(cwd, "test-results.json");
    testResults.tests.forEach((test) => {
      if (test.file.includes("index.spec.js")) {
        expect(test.status).toBe("passed");
      } else {
        expect(test.status).toBe("skipped");
      }
    });
  });

  test("test should fail and output worker endpoint map if some of the endpoints are not used", async ({
    cwd,
    signal,
  }) => {
    await mockPestAnalysis(cwd, {
      runAllTests: false,
      modifiedEndpoints: ["pages/index.js"],
      modifiedTestFiles: [],
    });
    const testTitle = "index.spec.js::home page should have link to about";
    await updateTestEndpoints(cwd, {
      [testTitle]: ["pages/index.js", "pages/about.js"],
    });

    await execAsync(`pnpm test`, { cwd, signal }).catch(() => {});

    const testResults = await readJSON(cwd, "test-results.json");
    const testResult = testResults.tests.find(
      (test) => test.title === testTitle
    );
    expect(testResult).toBeDefined();
    expect(testResult.status).toBe("failed");

    const tempFiles = await readdir(path.join(cwd, ".pest-temp"));
    const workerFile = tempFiles.find((f) => f.startsWith("worker-"));
    expect(workerFile).toBeDefined();

    const workerData = await readJSON(cwd, path.join(".pest-temp", workerFile));
    expect(workerData[testTitle]).toEqual(["pages/index.js"]);
  });

  test("test should fail and output worker endpoint map if it is not present test endpoints map", async ({
    cwd,
    signal,
  }) => {
    await mockPestAnalysis(cwd, {
      runAllTests: false,
      modifiedEndpoints: [],
      modifiedTestFiles: ["tests/index2.spec.js"],
    });
    await copyFile(
      path.join(cwd, "tests/index.spec.js"),
      path.join(cwd, "tests/index2.spec.js")
    );

    await execAsync(`pnpm test`, { cwd, signal }).catch(() => {});

    const testResults = await readJSON(cwd, "test-results.json");
    testResults.tests.forEach((test) => {
      if (test.file.includes("index2.spec.js")) {
        expect(test.status).toBe("failed");
      } else {
        expect(test.status).toBe("skipped");
      }
    });

    const tempFiles = await readdir(path.join(cwd, ".pest-temp"));
    const workerFile = tempFiles.find((f) => f.startsWith("worker-"));
    expect(workerFile).toBeDefined();

    const workerData = await readJSON(cwd, path.join(".pest-temp", workerFile));
    Object.keys(workerData).forEach((key) => {
      expect(workerData[key]).toMatchObject(["pages/index.js"]);
    });
  });

  test("should use specified test endpoints map file", async ({
    cwd,
    signal,
  }) => {
    await updatePestConfiguration(cwd, {
      testEndpointMapFile: "test-endpoints.json",
    });

    await mockPestAnalysis(cwd, {
      runAllTests: false,
      modifiedEndpoints: [],
      modifiedTestFiles: ["tests/about.spec.js"],
    });
    await updateTestEndpoints(cwd, {}, "test-endpoints.json");

    await execAsync(`pnpm test`, { cwd, signal });

    const testResults = await readJSON(cwd, "test-results.json");
    testResults.tests.forEach((test) => {
      if (test.file.includes("about.spec.js")) {
        expect(test.status).toBe("passed");
      } else {
        expect(test.status).toBe("skipped");
      }
    });
  });

  test("should run and fail all tests if test-endpoints.json does not exist", async ({
    cwd,
    signal,
  }) => {
    await updatePestConfiguration(cwd, {
      testEndpointMapFile: "test-endpoints.json",
    });

    await mockPestAnalysis(cwd, {
      runAllTests: false,
      modifiedEndpoints: [],
      modifiedTestFiles: ["tests/about.spec.js"],
    });

    await execAsync(`pnpm test`, { cwd, signal }).catch(() => {});

    const testResults = await readJSON(cwd, "test-results.json");
    testResults.tests.forEach((test) => {
      expect(test.status).toBe("failed");
    });
  });

  test("should use specified temp directory for worker endpoint map", async ({
    cwd,
    signal,
  }) => {
    await updatePestConfiguration(cwd, {
      tempDir: "temp",
    });

    await mockPestAnalysis(cwd, {
      runAllTests: false,
      modifiedEndpoints: [],
      modifiedTestFiles: ["tests/index.spec.js"],
    });
    const testTitle = "index.spec.js::home page should have link to about";
    await updateTestEndpoints(cwd, {
      [testTitle]: [],
    });

    await execAsync(`pnpm test`, { cwd, signal }).catch(() => {});

    const tempFiles = await readdir(path.join(cwd, "temp"));
    const workerFile = tempFiles.find((f) => f.startsWith("worker-"));
    expect(workerFile).toBeDefined();
  });
});
