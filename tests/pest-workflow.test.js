import { describe, expect } from "vitest";
import { appendFile, execAsync, readJSON } from "./utils";
import { test } from "./test";

describe("pest workflow", () => {
  test("should analyze and output affected endpoints, only run affected tests", async ({
    cwd,
    signal,
  }) => {
    await appendFile(cwd, "src/messages-about.js", "\n// change");

    await execAsync(`pnpm pest analyze`, { cwd, signal });
    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");

    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toMatchObject(["pages/about.js"]);
    expect(analysis.modifiedTestFiles).toMatchObject(["tests/about.spec.js"]);

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
});
