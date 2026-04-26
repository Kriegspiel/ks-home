# Release Notes

These notes summarize the static-site release history reconstructed from git
history. New runtime/site releases should add a section at the top when
`package.json` changes version. Test-only and docs-only changes do not need
version entries unless they ship a user-visible change.

## ks-home v. 1.0.34

- **Rules Index**: promoted RAND to a linked historical reference and kept
  CrazyKrieg as a placeholder without adding "rules" to either display name.

## ks-home v. 1.0.33

- **Rules Index**: marked the implemented online rulesets as live and added
  placeholders for RAND and CrazyKrieg rules.

## ks-home v. 1.0.32

- **Rules Comparison**: refined wording for Berkeley, Cincinnati, and Wild 16
  differences, including illegal tries, pawn-capture handling, and best-fit
  guidance.

## ks-home v. 1.0.31

- **Rules Comparison Links**: rule names in the comparison table are clickable.

## ks-home v. 1.0.30

- **Cincinnati Labels**: shortened Cincinnati labels in rules navigation and
  comparison surfaces.

## ks-home v. 1.0.29

- **Cincinnati Rules**: added the Cincinnati-style Kriegspiel rules page and
  connected it to rules navigation and comparison content.

## ks-home v. 1.0.28

- **Blog Simplification**: removed visible blog author labels from rendered blog
  pages.

## ks-home v. 1.0.27

- **Mobile Research Tables**: kept wide research tables readable on narrow
  screens.

## ks-home v. 1.0.26

- **Mobile Leaderboard**: fixed the static leaderboard layout on phones so the
  table remains readable instead of collapsing into a single column.

## ks-home v. 1.0.25

- **Default Theme**: the public site now defaults to light theme.

## ks-home v. 1.0.24

- **Build Cleanup**: removed the obsolete `public_html` app snapshot from the
  static-site build.

## ks-home v. 1.0.23

- **Markdown Rendering**: markdown thematic breaks now render correctly as
  horizontal rules.

## ks-home v. 1.0.22

- **Static Leaderboard**: the public static leaderboard now lists human players
  only.

## ks-home v. 1.0.21

- **About Page Version**: fixed the source used for the about-page version
  display.

## ks-home v. 1.0.20 - 1.0.18

- **Header and Footer Polish**: tightened header height and flattened the home
  navigation/footer chrome.

## ks-home v. 1.0.17 - 1.0.14

- **Rules Pages**: simplified the rules comparison page, corrected the Wild 16
  summary, and polished Wild 16 labels.

## ks-home v. 1.0.13 - 1.0.10

- **Prose and Tables**: improved nested prose list indentation, restored blog
  table column widths, and added GitHub-like code snippet colors.
- **Rules Cards**: added status notes to rules cards.

## ks-home v. 1.0.9 - 1.0.5

- **Static Leaderboard Cleanup**: removed stale fallback behavior, player links,
  and extra buttons from the static leaderboard, then fixed rendering.

## ks-home v. 1.0.4 - 1.0.1

- **App Leaderboard Note**: added guidance that more detailed leaderboard data
  is available in the app.
- **Refresh Automation**: added hourly static-site refresh support.
- **Link UX**: made footer and site links use explicit pointer behavior.

## ks-home v. 1.0.0

- **Site Link Polish**: standardized pointer cursor behavior for public site
  links.

## ks-home v. 0.1.1

- **Button Polish**: kept site buttons visually stable on hover.

## ks-home v. 0.1.0

- **Static Site Foundation**: implemented route/content contracts, home and
  leaderboard rendering, blog/changelog generation, rules trust surfaces, code
  snippet includes, syntax highlighting, and the production static server.
