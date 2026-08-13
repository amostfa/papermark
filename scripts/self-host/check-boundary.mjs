#!/usr/bin/env node

import {
  auditBoundary,
  formatBoundarySummary,
  repositoryRoot,
} from "./boundary-lib.mjs";

try {
  const result = await auditBoundary({ root: repositoryRoot });
  if (result.errors.length > 0) {
    console.error("Self-host EE boundary check failed:");
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exitCode = 1;
  } else {
    console.log(formatBoundarySummary(result.summary));
  }
} catch (error) {
  console.error("Unable to check the self-host EE boundary:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
