# Release Notes

These notes summarize the static-site release history reconstructed from git
history. New runtime/site releases should add a section at the top when
`package.json` changes version. Test-only and docs-only changes do not need
version entries unless they ship a user-visible change.

## ks-home v. 1.3.7

- **Levels**: keep the feature matrix full-height on the page instead of
  using an internal vertical scroll area.

## ks-home v. 1.3.6

- **Levels**: mute unavailable Master and Elite feature columns and render
  undefined availability as dashes.

## ks-home v. 1.3.5

- **Levels**: color the tier code badges with the platform tier palette.

## ks-home v. 1.3.4

- **Levels**: show tier price and availability details in the matrix column
  headers.

## ks-home v. 1.3.3

- **Levels**: keep the tier matrix header row frozen while the matrix scrolls.

## ks-home v. 1.3.2

- **Levels**: make the `T#` tier code badges square instead of rounded.

## ks-home v. 1.3.1

- **Levels**: render tier headers as `Tier T#` labels with the `T#` code in a
  dark badge.

## ks-home v. 1.3.0

- **Static Site Version**: promote the public site package to `1.3.0` after
  the playing guide and levels page updates.

## ks-home v. 1.2.31

- **Levels**: style the public levels page as a tier feature matrix with
  tiered access columns and explicit Yes/No availability marks.

## ks-home v. 1.2.29

- **Playing Guide**: add a short platform play guide at `/playing` and link it
  from the Game footer column.

## ks-home v. 1.2.26

- **Campaign Attribution**: load a privacy-minimal UTM capture script on static
  pages and include `campaign_visit` in the public analytics contract.

## ks-home v. 1.2.25

- **Blog Spoilers**: keep multi-paragraph `Solution:` sections inside the same
  spoiler block until the next heading.

## ks-home v. 1.2.24

- **Problem Boards**: allow moved phantom pieces to capture real pieces during
  scratch-board exploration, while keeping new phantom placement limited to
  empty squares.

## ks-home v. 1.2.23

- **Problem Boards**: add undo and redo arrow controls for scratch-board
  exploration, including restoration of captured pieces and phantom-piece
  edits.

## ks-home v. 1.2.22

- **Problem Boards**: cache board geometry during pointer drags, derive target
  squares without repeated DOM hit testing, and use touch-safe/coarse-pointer
  CSS for smoother iPadOS Safari interactions.

## ks-home v. 1.2.21

- **Footer Rules Links**: remove the incomplete Dutch ruleset from the public
  footer while keeping the full rules page and comparison material available.

## ks-home v. 1.2.18

- **English Rules**: clarify that English en-passant captures are announced
  explicitly on the capturing pawn's landing square, while ordinary captures
  still omit capturing/captured piece identity.

## ks-home v. 1.2.17

- **Rules**: add Dutch as a historical/composition reference, clearly marked as
  not playable online, and include it in the rules index, footer, and
  comparison page.

## ks-home v. 1.2.15

- **Blog Discoverability**: publish RSS, Atom, and sitemap XML from the normal
  static build, add feed discovery links, and show blog author/date/tag
  metadata on posts.

## ks-home v. 1.2.14

- **Problem Boards**: replaced native HTML drag/drop with pointer-driven
  dragging so Safari and Chrome update the highlighted target square
  immediately while pieces move.

## ks-home v. 1.2.13

- **Problem Boards**: reduced drag/move work by caching board squares, skipping
  repeated drag-target DOM writes, moving existing piece nodes instead of
  recreating SVG images, and using a tiny transparent drag image for smoother
  Chrome/Safari dragging.

## ks-home v. 1.2.12

- **Problem Boards**: lazy-initialize interactive blog problem boards near the
  viewport, avoid re-rendering static pieces on startup, and reuse one phantom
  picker menu to improve large problem-post performance in Safari and Chrome.

## ks-home v. 1.2.11

- **Blog**: made reading-time labels grammatically singular for one-minute
  posts (`1 min read`) and plural otherwise (`N mins read`).

## ks-home v. 1.2.10

- **Blog**: changed reading-time labels from `min read` to `mins read` across
  blog index and post pages.

## ks-home v. 1.2.9

- **Problem Boards**: made interactive board sizing more explicit for Firefox so
  problem diagrams do not collapse to a tiny min-content board.

## ks-home v. 1.2.8

- **Problem Boards**: changed same-square clicks to deselect the selected piece
  instead of removing it, while preserving dragged-off-board removal.

## ks-home v. 1.2.7

- **Problem Boards**: aligned interactive square highlighting with the main app
  board by removing the extra focus outline, brightness boost, and z-index lifts.

## ks-home v. 1.2.6

- **Problem Boards**: prevented phantom pieces from being placed on occupied
  squares and made dragged-off-board pieces disappear for both real and phantom
  pieces.

## ks-home v. 1.2.5

- **Problem Boards**: fixed static FEN board row sizing so all eight ranks share
  the full board height and the bottom rank is no longer clipped.

## ks-home v. 1.2.4

- **Problem Boards**: moved bottom file labels away from the rounded clipped
  edge so large diagrams render fully inside the board frame.

## ks-home v. 1.2.3

- **Problem Boards**: moved bottom file-coordinate labels inward so the rounded
  board frame no longer clips them on large rendered diagrams.

## ks-home v. 1.2.2

- **Problem Boards**: aligned interactive blog/problem-board movement styling with
  the live app board semantics, including selected squares, last-move squares,
  drop targets, and phantom-piece visual classes.

## ks-home v. 1.0.49

- **API Contract**: static leaderboard regeneration now uses prefix-free
  `api.kriegspiel.org` paths so the public API host can reject `/api/...`
  while the browser app keeps same-origin `/api` traffic.

## ks-home v. 1.0.48

- **Prose Tables**: let long inline-code values wrap inside markdown tables so
  bot error-code tables do not overlap adjacent columns.

## ks-home v. 1.0.47

- **Social Card Asset**: copied the social preview PNG into generated static
  output and extended SEO validation to fail if an OpenGraph image is missing
  from `dist/`.

## ks-home v. 1.0.46

- **Social Link Cards**: added a versioned OpenGraph/Twitter preview image and
  required social-card metadata so shared links render with a proper image on
  X and other preview crawlers.

## ks-home v. 1.0.45

- **Rules Index**: marked RAND, English, and CrazyKrieg as implemented online
  alongside Berkeley, Cincinnati, and Wild 16.

## ks-home v. 1.0.44

- **Rules Comparison**: simplified matching illegal-try and promotion wording
  across Berkeley, RAND, English, and CrazyKrieg, and trimmed redundant English
  capture text.

## ks-home v. 1.0.43

- **Rules Comparison**: clarified CrazyKrieg illegal tries as public, aligned
  CrazyKrieg `Any?` handling with English, and made en passant/double-check
  comparison wording explicit.

## ks-home v. 1.0.42

- **CrazyKrieg Rules**: refreshed the CrazyKrieg reference page wording and
  added reserves/drop behavior to the rules comparison table.

## ks-home v. 1.0.41

- **Rules Polish**: changed the Cincinnati rules card label to `Cincinnati`
  and made the full-rules comparison buttons lay out three per row by default.

## ks-home v. 1.0.40

- **English Rules**: added the Gambit Club English rules as a published
  historical reference before CrazyKrieg, including footer/navigation links and
  rules comparison coverage.

## ks-home v. 1.0.39

- **CrazyKrieg Rules**: promoted CrazyKrieg from placeholder to published
  reference rules, added footer/navigation links, and included it in the rules
  comparison.

## ks-home v. 1.0.38

- **Rules Comparison**: simplified shared referee wording across rulesets,
  made the RAND full-rules button match the other labels, and kept the
  callout buttons evenly sized.
- **Test Runner**: made `npm test` enumerate test files explicitly so it works
  on newer Node versions.

## ks-home v. 1.0.37

- **Rules Comparison CTA**: top-aligned the full-rules callout, shortened the
  RAND button label, and made the rule buttons visually consistent.

## ks-home v. 1.0.36

- **Rules Comparison**: added RAND as a comparison column, including its
  pawn-try square announcements, rebuff counts, promotion notice, and best-fit
  context.

## ks-home v. 1.0.35

- **Rules Rendering**: kept spaced and nested ordered lists as a single
  hierarchy, fixing the RAND rules page where every item rendered as `1.`.

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
