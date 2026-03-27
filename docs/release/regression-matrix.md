# Public Website Regression Matrix (Slice 950)

| Route | Scenario | Evidence Command | Status |
| --- | --- | --- | --- |
| `/` | Home render + CTA path | `npm run test:e2e -- --grep "home"` | PASS |
| `/leaderboard` | Leaderboard render + empty/error fallback | `npm run test:e2e -- --grep "leaderboard"` | PASS |
| `/blog` (+ detail/archive) | Blog list/detail + pagination/archive links | `npm run test:e2e -- --grep "blog"` | PASS |
| `/changelog` (+ detail) | Changelog ordering + detail render | `npm run test:e2e -- --grep "changelog"` | PASS |
| `/rules` | Rules page render + revision metadata | `npm run test:smoke -- --routes=/rules` | PASS |

Waivers are only allowed with explicit release-owner approval and linked risk notes.
