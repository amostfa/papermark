This draft PR was created by the self-host upstream-sync workflow.

The workflow merged `papermark/papermark:main`, restored the self-host EE
allowlist, removed any newly introduced EE implementation files, and completed
the disposable-PostgreSQL migration, type-check, production-build, and HTTP
smoke-test gates before opening this PR.

Before merging:

- Review all non-EE application and migration changes.
- Confirm that any newly required environment variables are configured.
- Inspect compatibility-stub changes requested by TypeScript or the build.
- Keep this PR as a manual merge; the workflow never deploys or auto-merges.
