#!/usr/bin/env node

import {
  auditBoundary,
  formatBoundarySummary,
  repositoryRoot,
} from "./boundary-lib.mjs";
import { mergeInProgress, reapplyEeOverlay } from "./git-lib.mjs";

try {
  if (!mergeInProgress(repositoryRoot)) {
    throw new Error(
      "no merge is in progress; this command only resolves the EE portion of an active upstream merge",
    );
  }

  const result = await reapplyEeOverlay({ root: repositoryRoot });

  if (result.restored.length > 0) {
    console.log(`Restored ${result.restored.length} self-host EE files.`);
  }
  if (result.removed.length > 0) {
    console.log(`Removed ${result.removed.length} non-allowlisted EE files.`);
  }

  const coreConflicts = result.remainingConflicts.filter(
    (file) => !file.startsWith("ee/"),
  );
  if (coreConflicts.length > 0) {
    console.error("Non-EE merge conflicts still require manual review:");
    for (const file of coreConflicts) console.error(`  - ${file}`);
    process.exitCode = 2;
  } else {
    const audit = await auditBoundary({ root: repositoryRoot });
    if (audit.errors.length > 0) {
      console.error("The overlay was applied, but its boundary is invalid:");
      for (const error of audit.errors) console.error(`  - ${error}`);
      process.exitCode = 1;
    } else {
      console.log(formatBoundarySummary(audit.summary));
    }
  }
} catch (error) {
  console.error("Unable to apply the self-host EE overlay:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
