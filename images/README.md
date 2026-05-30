# Landing page images

Drop your real photos here using the **exact filenames** below. Until a file
exists, the page shows a styled placeholder box with the filename + suggested
dimensions, so the layout never looks broken.

To swap in a real photo, just save it at the path with the matching name — no
HTML/CSS changes needed.

| Filename            | Where it appears                  | Suggested size (px) | Mood / direction                                              |
|---------------------|-----------------------------------|---------------------|---------------------------------------------------------------|
| `hero-couple.jpg`   | Hero, full background (landscape) | 1920 × 1200 (16:10) | Warm, candid two people. Leave the left ~half calmer/darker so the headline panel stays readable. |
| `editorial-life.jpg`| "Rather be living" section        | 1792 × 1008 (16:9)  | Someone enjoying real life — coffee, travel, laughing.        |
| `editorial-meet.jpg`| "Meet when it's real" section     | 1000 × 800 (5:4)    | A genuine first meeting — eye contact, a real moment.         |

Notes:
- Prefer warm, editorial, slightly desaturated photography to match the mauve
  (`#8E4B6E`) + gold palette. Avoid stocky / overly posed shots.
- `.jpg` is expected. If you use a different extension, update the `src`
  attributes in `index.html`.
- Images are lazy-loaded except the hero (loaded eagerly for LCP).
