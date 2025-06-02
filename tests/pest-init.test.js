import { describe, expect } from "vitest";
import { execAsync } from "./utils";
import { test } from "./test";
import { join } from "path";
import { exists } from "fs-extra";
import { writeFile, readFile, unlink } from "fs/promises"; // For creating and reading files in tests

describe("pest init", () => {
  test("should create pest.config.js if it does not exist", async ({
    cwd,
    signal,
  }) => {
    const configPath = join(cwd, "pest.config.js");
    await unlink(configPath).catch(() => {});
    // Ensure the file does not exist initially
    expect(await exists(configPath)).toBe(false);

    const { stdout } = await execAsync("pnpm pest init", { cwd, signal });

    expect(stdout).toContain("Created pest.config.js");
    expect(await exists(configPath)).toBe(true);
  });

  test("should not overwrite existing pest.config.js", async ({
    cwd,
    signal,
  }) => {
    const configPath = join(cwd, "pest.config.js");
    const initialContent = await readFile(configPath, "utf-8");

    expect(await exists(configPath)).toBe(true);

    await execAsync("pnpm pest init", { cwd, signal });

    const finalContent = await readFile(configPath, "utf-8");
    expect(finalContent).toBe(initialContent);
  });
});
