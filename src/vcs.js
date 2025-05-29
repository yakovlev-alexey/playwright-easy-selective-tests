import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Executes a VCS command and returns the output
 * @param {string} vcs - Version control system command
 * @param {string} args - Command arguments
 * @returns {Promise<string>} Command output
 */
async function execVcs(vcs, args) {
  try {
    const { stdout } = await execAsync(`${vcs} ${args}`);
    return stdout.trim();
  } catch (error) {
    // Return empty string on error (e.g., no changes)
    return "";
  }
}

/**
 * Gets the merge base between current branch and target branch
 * @param {string} vcs - Version control system command
 * @param {string} baseBranch - Base branch name
 * @returns {Promise<string>} Merge base commit
 */
export async function getMergeBase(vcs, baseBranch) {
  return execVcs(vcs, `merge-base HEAD ${baseBranch}`);
}

/**
 * Gets list of changed files
 * @param {string} vcs - Version control system command
 * @param {string} baseBranch - Base branch name
 * @returns {Promise<string[]>} Array of changed file paths
 */
export async function getChangedFiles(vcs, baseBranch) {
  const mergeBase = await getMergeBase(vcs, baseBranch);
  const output = await execVcs(vcs, `diff --name-status ${mergeBase}`);

  if (!output) return [];

  return output
    .split("\n")
    .filter((line) => line && !line.startsWith("D")) // Exclude deleted files
    .map((line) => line.substring(2).trim()) // Remove status prefix
    .filter(Boolean);
}

/**
 * Checks if any of the specified files were modified
 * @param {string} vcs - Version control system command
 * @param {string} baseBranch - Base branch name
 * @param {string[]} files - Files to check
 * @returns {Promise<boolean>} True if any file was modified
 */
export async function wereFilesModified(vcs, baseBranch, files) {
  const changedFiles = await getChangedFiles(vcs, baseBranch);

  return files.some((file) =>
    changedFiles.some(
      (changedFile) => changedFile === file || changedFile.endsWith(`/${file}`)
    )
  );
}

/**
 * Gets changed files matching a pattern
 * @param {string} vcs - Version control system command
 * @param {string} baseBranch - Base branch name
 * @param {RegExp} pattern - Pattern to match files
 * @returns {Promise<string[]>} Array of matching changed files
 */
export async function getChangedFilesMatching(vcs, baseBranch, pattern) {
  const changedFiles = await getChangedFiles(vcs, baseBranch);
  return changedFiles.filter((file) => pattern.test(file));
}
