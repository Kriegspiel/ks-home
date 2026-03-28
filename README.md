# ks-home website contracts and static generation foundation

Step-900 Slice-910 + Slice-920 includes:

- canonical route map and URL policy
- navigation/footer contract
- content source contract (`../content` as source of truth)
- markdown frontmatter schema checks
- landing/home experience sections + CTA telemetry hook
- leaderboard experience with loading/empty/error/stale states
- leaderboard payload contract (`contracts/leaderboard-contract.json`)
- static generation scaffold and smoke/e2e/a11y checks for `/`, `/leaderboard`, `/rules`

## Commands

```bash
npm ci
npm run lint
npm run test -- --runInBand --watch=false
npm run test:coverage:check -- --lines 82 --functions 82 --branches 78 --statements 82
npm run test:e2e -- --grep "home|leaderboard"
npm run test:smoke -- --routes=/,/leaderboard,/rules
npm run test:a11y -- --routes=/,/leaderboard
npm run test:visual -- --suite=marketing-core
npm run routes:validate
npm run content:schema:check
npm run content:source-contract:check
npm run build
npm run serve:prod -- --host 127.0.0.1 --port 4180
```

The production deployment on rpi-server-02 serves the generated `dist/` output directly via `npm run serve:prod`; it does not use Vite preview.
