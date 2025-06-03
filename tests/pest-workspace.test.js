import path from "path";
import { execAsync, readJSON, writeFile } from "./utils";
import { describe } from "vitest";
import { afterEach } from "vitest";
import { test } from "./test";
import { expect } from "vitest";

describe("pest workspace", () => {
  const cwd = path.join(process.cwd(), "examples", "next-basic");

  afterEach(async () => {
    await execAsync("git checkout HEAD examples/workspace-dep/index.js");
    await execAsync("git checkout HEAD examples/workspace-package/index.js");
  });

  test.sequential(
    "when workspace dependency changes, should run all tests",
    async ({ signal }) => {
      // since there is no easy way to create isolated monorepo reproduction environment,
      // we will use the actual examples packages and run tests sequentially to avoid collisions
      await writeFile(
        process.cwd(),
        path.join("examples", "workspace-dep", "index.js"),
        "// changed this file"
      );
      await execAsync(`pnpm pest analyze`, { cwd, signal });

      const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
      expect(analysis.runAllTests).toBe(true);
    }
  );

  test.sequential(
    "when unrelated workspace package changes, should not run all tests",
    async ({ signal }) => {
      await writeFile(
        process.cwd(),
        path.join("examples", "workspace-package", "index.js"),
        "// changed this file"
      );
      await execAsync(`pnpm pest analyze`, { cwd, signal });

      const analysis = await readJSON(cwd, ".pest-temp", ".pest-analysis.json");
      expect(analysis.runAllTests).toBe(false);
    }
  );
});
