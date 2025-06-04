import { describe, expect } from "vitest";
import { test } from "./test.js";
import { appendFile, execAsync, readJSON, writeFile } from "./utils.js";

describe("pest getEndpointFromFile", () => {
  test.scoped({ dependency: "custom-endpoints" });

  test("should use getEndpointFromFile to identify endpoints", async ({
    cwd,
    signal,
  }) => {
    await appendFile(cwd, "app1/src/App.jsx", "// change");

    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).toContain("app1");
    expect(analysis.modifiedEndpoints).not.toContain("app2");
  });

  test("should handle null return from getEndpointFromFile", async ({
    cwd,
    signal,
  }) => {
    // Create a test file outside of apps
    await writeFile(cwd, "src/test.js", "// change");

    await execAsync(`pnpm pest analyze`, { cwd, signal });

    const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");

    expect(analysis.runAllTests).toBe(false);
    expect(analysis.modifiedEndpoints).not.toContain("app1");
    expect(analysis.modifiedEndpoints).not.toContain("app2");
  });
});
