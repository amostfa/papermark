# Self-host compatibility layer

This fork does not ship Papermark Enterprise Edition implementations. The
`@/ee/*` import surface is redirected to small compatibility stubs so the AGPL
application can compile and run without a commercial subscription.

- Enterprise UI controls render nothing; provider and layout wrappers preserve
  their children.
- Enterprise API handlers return a clear `404` response, schemas reject EE
  payloads, and background task handles are inert.
- SaaS billing quotas are removed for self-hosted core flows while EE feature
  flags remain disabled.
- Storage uses the normal single-region S3 or S3-compatible variables instead
  of per-team region routing.

The upstream commercial license is retained in `LICENSE.md` for provenance. No
upstream Enterprise Edition implementation remains in this directory.

The allowlist, upstream-sync procedure, and CI gates are documented in
[`docs/self-host-updates.md`](../docs/self-host-updates.md).
