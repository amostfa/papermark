# Maintaining the self-host fork

The self-host layer is intentionally fail-closed. Upstream application changes
merge normally, while the contents of `ee/` are constrained by
`scripts/self-host/manifest.json`.

Set `NEXT_PUBLIC_SELF_HOSTED=true` for this fork. Self-host mode leaves each
team's stored billing plan untouched, but presents `datarooms-unlimited` as the
effective runtime entitlement. That removes SaaS upgrade modals, Stripe
checkout, and core dataroom quotas without restoring any Enterprise Edition
implementation. A Prisma result extension applies the effective plan to both
direct and nested team reads, while the client plan hook skips the absent SaaS
billing endpoint. The entitlement audit and disposable-database smoke test make
an upstream regression fail CI instead of silently restoring the payment wall.
Shared Slack and billing-currency hooks also stay dormant in self-host mode, and
the desktop and mobile navigation omit their SaaS-only controls.

Dataroom sharing uses the core link sheet in this fork, so creating and editing
standard and group links remains functional without the Enterprise Edition
sheet. Granular per-file permissions remain unavailable in the self-hosted
fallback.

Passkey login is optional. Configure both `HANKO_API_KEY` and
`NEXT_PUBLIC_HANKO_TENANT_ID` to enable it; when either is absent, the provider
and login control remain disabled without blocking the build.

Slack notifications are also optional. Their client is inert until a Slack
operation is requested; Slack-specific routes validate their variables when
used instead of blocking unrelated application routes during startup.

Document uploads require private S3 or an S3-compatible object store. Set
`NEXT_PUBLIC_UPLOAD_TRANSPORT=s3` and configure the `NEXT_PRIVATE_UPLOAD_*`
bucket, region, endpoint, and credential variables before building the client.
Leave the distribution host/domain and signing keys blank to use direct,
presigned S3-compatible URLs. Set them only for a configured CloudFront
distribution. Vercel Blob remains usable for public assets but is not a
document-storage transport. Generate and configure `INTERNAL_API_KEY` for the
server-to-server requests that issue signed document URLs. The TUS upload routes
use an in-memory lock when the two `UPSTASH_REDIS_REST_LOCKER_*` variables are
blank; configure both for a distributed lock when multiple server instances may
handle the same upload.

Email-code login uses the existing PostgreSQL database for its short-lived
codes and abuse rate limits; it does not require Upstash Redis. Apply every
Prisma migration before starting the application. Configure `RESEND_API_KEY`
and `RESEND_FROM_EMAIL` with a sender on a domain verified in Resend, for
example `BONUM <noreply@send.example.com>`. The sender does not need to be a
mailbox, and a dedicated sending subdomain avoids interfering with an existing
mail provider. Authentication waits for Resend to accept the message, so a
delivery configuration failure is reported instead of showing a false success.

Set `NEXTAUTH_URL` to the public application origin, including `https://` (for
example `https://docs.example.com`). Leave `NEXTAUTH_COOKIE_DOMAIN` empty for
the safer host-only session cookie. Set it to a parent domain such as
`.example.com` only if the same login session must be shared by multiple
subdomains. The verification page must use a full document navigation for the
single-use NextAuth callback; the self-host check guards both requirements.

The self-host checks preserve this PostgreSQL-only login path during upstream
updates. CI also exercises concurrent code issuance, one-time consumption,
expiration, failed-delivery cleanup, and rate limiting against its disposable
database.

The self-hosted authentication journey is branded for BONUM in
`components/auth/bonum-auth-shell.tsx`, the login and code-entry pages, their
route metadata, and the verification email. The authentication configuration
check asserts those markers, so an upstream update that removes the BONUM
surface fails verification instead of silently restoring Papermark branding.
Keep authentication behavior in the upstream page clients and presentation in
the shared BONUM shell when resolving future conflicts.

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
The link sheet presents this application hostname as its built-in share domain
and excludes any duplicate team custom-domain record for the same hostname.
The custom-domain API and settings view exclude the application hostname as
well. Background verification and every Vercel-domain removal path protect it,
so stale database records cannot mark or remove the live application domain.
Built-in share links always use the stable `/view/:linkId` route, including
links that still reference a stale custom-domain row for the application host.
Link creation and editing clear those stale relations when they are next saved.

Preview and data-room viewer sessions are short-lived HMAC-signed tokens backed
by `NEXTAUTH_SECRET`; they do not require Upstash Redis. When the general
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` variables are absent,
request rate limits use a best-effort in-memory sliding window so core sharing
and preview flows remain available. Configure general Upstash Redis when rate
limits must be coordinated across multiple server instances or when using
features that explicitly store queues, caches, or revocable sessions in Redis.
These variables are separate from the optional TUS upload-locker variables.

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
