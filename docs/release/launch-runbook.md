# Website Track Launch + Rollback Runbook (Slice 950)

## Ownership Matrix

- Content owner: validates content quality and publication intent.
- Engineering owner: validates CI gates and release artifacts.
- Release owner: executes deploy/rollback and signs go/no-go.
- Approver (Fil): required for Cloudflare tunnel auth and production DNS route updates.

## Release Gate Checklist

1. Required checks green in GitHub:
   - website-lint
   - website-unit
   - website-e2e-public-routes
   - website-a11y-public-routes
   - website-visual-regression
   - website-smoke-public-routes
   - website-seo-validate
   - website-build-public
   - website-static-regen-on-content
   - website-sitemap-check
   - website-feed-check
   - preview-deploy-website-pr / preview-deploy-content-pr
2. Public regression matrix in `docs/release/regression-matrix.md` is PASS or approved-waived.
3. Cloudflared production approvals completed.

## Deploy

```bash
# from ks-home
BASE_URL="https://kriegspiel.org" ./scripts/deploy/smoke.sh --routes "/,/leaderboard,/blog,/changelog,/rules"
```

## Failed Deploy Policy

If smoke fails after production cutover:
1. Stop rollout.
2. Execute rollback immediately:
   ```bash
   ./scripts/deploy/rollback.sh --to previous
   BASE_URL="https://kriegspiel.org" ./scripts/deploy/smoke.sh --routes "/,/leaderboard,/blog,/changelog,/rules"
   ```
3. Page release owner and engineering owner.
4. Keep release frozen until root cause and remediation PR are approved.

## Incident Triggers / Freeze Criteria

- Any required route returns non-2xx.
- Cloudflared in restart loop or unhealthy state.
- Sitemap/feed/SEO contract mismatch in production artifact.

Any trigger above enforces release freeze until explicit release-owner signoff.

## Rollback Drill Evidence

- Command transcript: `./scripts/deploy/rollback.sh --to previous`
- Smoke transcript (all routes): `./scripts/deploy/smoke.sh ...`
- Recorded outcome: PASS/FAIL, timestamp, operator.
