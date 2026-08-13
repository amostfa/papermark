import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

import { listEeFiles, loadManifest } from "./boundary-lib.mjs";

export function runGit(root, args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    const detail = (
      result.stderr ||
      result.stdout ||
      "unknown git error"
    ).trim();
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }

  return {
    status: result.status ?? 1,
    stderr: result.stderr || "",
    stdout: result.stdout || "",
  };
}

export function nullSeparated(output) {
  return output.split("\0").filter(Boolean);
}

export function unmergedFiles(root) {
  return nullSeparated(
    runGit(root, ["diff", "--name-only", "--diff-filter=U", "-z"], {
      allowFailure: true,
    }).stdout,
  );
}

export function mergeInProgress(root) {
  return (
    runGit(root, ["rev-parse", "--verify", "-q", "MERGE_HEAD"], {
      allowFailure: true,
    }).status === 0
  );
}

export async function reapplyEeOverlay({ root, manifest: suppliedManifest }) {
  const manifest = suppliedManifest || (await loadManifest(root));
  const allowed = new Set(manifest.eeAllowlist);
  const unmerged = unmergedFiles(root);
  const tracked = nullSeparated(
    runGit(root, ["ls-files", "-z", "--", "ee"]).stdout,
  );
  const present = await listEeFiles(root);
  const knownEePaths = [
    ...new Set([...tracked, ...present, ...unmerged]),
  ].filter((file) => file === "ee" || file.startsWith("ee/"));
  const unexpected = knownEePaths.filter((file) => !allowed.has(file));
  const isMerging = mergeInProgress(root);
  const restored = isMerging
    ? [...manifest.eeAllowlist]
    : unmerged.filter((file) => allowed.has(file));
  const restoredSelfHostFiles = isMerging ? [...manifest.selfHostFiles] : [];

  if (restored.length > 0 || restoredSelfHostFiles.length > 0) {
    // Use the pre-merge self-host versions even when Git found a clean textual
    // merge. This prevents upstream EE code from leaking into an adapter and
    // keeps the updater itself on its reviewed version.
    runGit(root, [
      "checkout",
      "HEAD",
      "--",
      ...restored,
      ...restoredSelfHostFiles,
    ]);
  }

  if (unexpected.length > 0) {
    runGit(root, ["rm", "-f", "--ignore-unmatch", "--", ...unexpected], {
      allowFailure: true,
    });
    for (const file of unexpected) {
      await rm(path.join(root, file), { force: true, recursive: true });
    }
  }

  runGit(root, ["add", "-A", "--", "ee"]);
  if (restoredSelfHostFiles.length > 0) {
    runGit(root, ["add", "--", ...restoredSelfHostFiles]);
  }

  return {
    remainingConflicts: unmergedFiles(root),
    removed: unexpected.sort(),
    restored: restored.sort(),
    restoredSelfHostFiles: restoredSelfHostFiles.sort(),
  };
}
