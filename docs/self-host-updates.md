# Maintaining the self-host fork

The self-host layer is intentionally fail-closed. Upstream application changes
merge normally, while the contents of `ee/` are constrained by
`scripts/self-host/manifest.json`.

Passkey login is optional. Configure both `HANKO_API_KEY` and
`NEXT_PUBLIC_HANKO_TENANT_ID` to enable it; when either is absent, the provider
and login control remain disabled without blocking the build.

Slack notifications are also optional. Their client is inert until a Slack
operation is requested; Slack-specific routes validate their variables when
used instead of blocking unrelated application routes during startup.

The year-in-review Open Graph route intentionally embeds a single font. Two
embedded TTF files push that Edge Function over Vercel's 1 MB plan limit, so
preserve the single-font pattern when resolving upstream changes to that route.

Vercel Hobby deployments intentionally inherit the shared Fluid Compute
duration and memory defaults. Route-specific `maxDuration` exports or a
non-empty `functions` object in `vercel.json` split otherwise compatible routes
into additional functions. `npm run selfhost:check` rejects those overrides so
an upstream update cannot silently reintroduce the 12-function deployment
failure.

The middleware must also exempt `NEXT_PUBLIC_APP_BASE_HOST` from Papermark's
document-view custom-domain routing. Otherwise a self-hosted application domain
such as `docs.bonumworks.com` is rewritten as a viewer vanity domain. The same
check rejects an upstream update that drops this exception, and the production
smoke test sends its login request through a non-Papermark app hostname.

## One-time GitHub setup

After these files reach `main`, open **Settings → Actions → General** and enable
**Allow GitHub Actions to create and approve pull requests**. The updater only
creates draft PRs; it never approves them. Repository or organization policy
must also permit the `actions/checkout` and `actions/setup-node` actions used by
the workflows. See GitHub's
[Actions repository settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).

GitHub disables scheduled workflows on a newly created public fork. Open
**Actions → Upstream self-host sync**, enable the workflow if prompted, and run
it once manually. GitHub can disable schedules again after 60 days without
repository activity, so re-enable it if the weekly run disappears. See
[Disabling and enabling workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).

## Automated updates

`.github/workflows/upstream-self-host-sync.yml` runs every Monday and can also
be started manually. It performs this sequence:

1. Fetch `papermark/papermark:main` into a dedicated automation branch.
2. Merge without committing.
3. Restore every allowlisted EE compatibility file from the self-host branch.
4. Restore the reviewed updater and workflow files from the self-host branch.
5. Remove every other file under `ee/`.
6. Stop if any non-EE merge conflict or unsupported EE import remains.
7. Push the automation branch and dispatch the trusted `main` copy of the
   self-host verification workflow against the candidate commit.
8. Record the verification result on the candidate commit.
9. Open a draft PR only after verification succeeds.

If a verified update PR is already open, later scheduled runs leave its branch
untouched. Review or close that PR before asking the scheduler to prepare a
newer upstream update.

The verification workflow uses a disposable PostgreSQL 16 database, applies
every Prisma migration, builds the production application, runs an independent
type-check against Next.js's generated declarations, boots it, and checks the
login page, the size-sensitive year-in-review image route, and a disabled EE
API. It never uses a production database or deploys the application.

The sync job has repository write access but does not install or execute
upstream dependencies. The separately dispatched verification job executes
merged application code with read-only repository permissions and no deployment
secrets. Its workflow definition comes from the trusted `main` branch, not from
the unreviewed update branch.

## Manual updates

Start from a clean `main` branch:

```bash
git pull --ff-only origin main
npm run selfhost:sync-upstream
```

If core files conflict, the command stops and lists them. Resolve only those
files, then reapply and check the EE boundary:

```bash
npm run selfhost:apply-overlay
npm run selfhost:check
```

Never use a repository-wide `-X ours` merge. The updater deliberately applies
the "ours" policy only to the EE allowlist and deletes other `ee/` files.

Before committing, run:

```bash
npm ci
npm run selfhost:test
npm run selfhost:format-check
NEXT_DISABLE_WEBPACK_CACHE=1 npm run build
npm run selfhost:typecheck
npm run selfhost:smoke
```

Run `prisma migrate deploy` against a fresh disposable PostgreSQL database as
CI does. Do not use the production database to test an unreviewed update.

If an update should be abandoned, run `git merge --abort`.

## Expected failure modes

- An unexpected file under `ee/` means the overlay was not reapplied.
- A relative import into `ee/` must be changed to the `@/ee/*` alias.
- A missing named export means upstream added an EE dependency. Add the smallest
  inert export to `ee/stubs.tsx`, or add a reviewed exact adapter and record it
  in both the manifest and `tsconfig.json`.
- A non-EE merge conflict requires a human decision and is never resolved by
  automation.

Every update remains a draft PR until a maintainer reviews and merges it.
