# ks-home website contracts and static generation foundation

Step-900 Slice-910 foundation includes:

- canonical route map and URL policy
- navigation/footer contract
- content source contract (`../content` as source of truth)
- markdown frontmatter schema checks
- static generation scaffold and route smoke tests

## Commands

```bash
npm ci
npm run lint
npm run test -- --runInBand --watch=false
npm run routes:validate
npm run content:schema:check
npm run content:source-contract:check
npm run build
```
