import { test as base } from "vitest";
import { prepareTempDir } from "./utils";

export const test = base.extend({
  cwd: [
    async ({ dependency }, use) => {
      const { tmpDir, cwd } = await prepareTempDir(dependency);

      await use(cwd);

      await tmpDir.cleanup();
    },
    { auto: true },
  ],
  dependency: "next-basic",
});
