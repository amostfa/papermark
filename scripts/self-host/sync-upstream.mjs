#!/usr/bin/env node

import {
  auditBoundary,
  formatBoundarySummary,
  loadManifest,
  repositoryRoot,
} from "./boundary-lib.mjs";
import {
  mergeInProgress,
  reapplyEeOverlay,
  runGit,
  unmergedFiles,
} from "./git-lib.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function printErrors(title, errors) {
  console.error(title);
  for (const error of errors) console.error(`  - ${error}`);
}

try {
  const manifest = await loadManifest(repositoryRoot);
  const remote = argumentValue("--remote") || manifest.upstream.remote;
  const url = argumentValue("--url") || manifest.upstream.url;
  const branch = argumentValue("--branch") || manifest.upstream.branch;

  if (mergeInProgress(repositoryRoot)) {
    throw new Error(
      "a merge is already in progress; finish it or run git merge --abort first",
    );
  }

  const status = runGit(repositoryRoot, [
    "status",
    "--porcelain",
    "--untracked-files=normal",
  ]).stdout.trim();
  if (status) {
    throw new Error(
      "the worktree must be clean before syncing upstream; commit or stash changes first",
    );
  }

  const beforeAudit = await auditBoundary({
    root: repositoryRoot,
    manifest,
  });
  if (beforeAudit.errors.length > 0) {
    printErrors("The current self-host boundary is invalid:", beforeAudit.errors);
    process.exit(1);
  }

  const existingRemote = runGit(
    repositoryRoot,
    ["remote", "get-url", remote],
    { allowFailure: true },
  );
  if (existingRemote.status !== 0) {
    runGit(repositoryRoot, ["remote", "add", remote, url]);
    console.log(`Added ${remote} remote: ${url}`);
  } else {
    console.log(`Using ${remote} remote: ${existingRemote.stdout.trim()}`);
  }

  console.log(`Fetching ${remote}/${branch}...`);
  runGit(repositoryRoot, ["fetch", "--prune", remote, branch]);

  const upstreamRef = `${remote}/${branch}`;
  const alreadyCurrent =
    runGit(
      repositoryRoot,
      ["merge-base", "--is-ancestor", upstreamRef, "HEAD"],
      { allowFailure: true },
    ).status === 0;
  if (alreadyCurrent) {
    console.log(`${upstreamRef} is already contained in HEAD; nothing to sync.`);
    process.exit(0);
  }

  console.log(`Merging ${upstreamRef} without committing...`);
  const merge = runGit(
    repositoryRoot,
    ["merge", "--no-commit", "--no-ff", upstreamRef],
    { allowFailure: true },
  );
  if (merge.status !== 0 && !mergeInProgress(repositoryRoot)) {
    throw new Error((merge.stderr || merge.stdout).trim());
  }

  const overlay = await reapplyEeOverlay({
    root: repositoryRoot,
    manifest,
  });
  console.log(
    `Overlay reapplied: ${overlay.restored.length} EE files and ${overlay.restoredSelfHostFiles.length} updater files restored; ${overlay.removed.length} EE files removed.`,
  );

  const conflicts = unmergedFiles(repositoryRoot);
  if (conflicts.length > 0) {
    printErrors(
      "Upstream has non-EE conflicts that require manual review:",
      conflicts,
    );
    console.error(
      "Resolve them, run npm run selfhost:apply-overlay, verify the app, then commit the merge.",
    );
    console.error("To abandon this update, run git merge --abort.");
    process.exit(2);
  }

  const afterAudit = await auditBoundary({
    root: repositoryRoot,
    manifest,
  });
  if (afterAudit.errors.length > 0) {
    printErrors(
      "Upstream changed the EE import surface and the compatibility layer needs attention:",
      afterAudit.errors,
    );
    console.error("The merge remains uncommitted so it can be reviewed or aborted.");
    process.exit(1);
  }

  console.log(formatBoundarySummary(afterAudit.summary));
  console.log("Upstream is merged and staged, but not committed.");
  console.log("Run the self-host verification suite, review the diff, then commit.");
} catch (error) {
  console.error("Unable to sync upstream safely:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
