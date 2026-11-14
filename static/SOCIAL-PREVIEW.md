# Shared social preview

`social-card-20261114.svg` is the editable source for the 1200 × 630 PNG used by
both Kriegspiel sites. It embeds the existing logo and cburnett White pieces,
uses the homepage light palette and headline, and needs no remote assets.
DejaVu Sans and DejaVu Serif provide reproducible local sans/italic serif text.

To render with those fonts installed and Playwright Chromium available, run
from the repository root:

```sh
npx --yes --package=playwright@1.61.1 playwright screenshot --browser=chromium --viewport-size=1200,630 --wait-for-timeout=1000 file://"$PWD/static/social-card-20261114.svg" static/social-card-20261114.png
```

Inspect the PNG at full size and at 480 × 252 before release. Keep the app's
public PNG byte-identical. The canonical metadata URL is
`https://kriegspiel.org/social-card-20261114.png`; `src/pages.mjs` also uses it in
article structured data, and `scripts/build.mjs` copies the PNG into `dist/`.
Preserve the former `social-card-20260511.png` for cached shares. Social platforms
may retain old post cards until they fetch the page again.
