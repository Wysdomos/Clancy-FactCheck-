# Clancy case fact-check

A small offline-capable web app that checks the claims circulating about the Lindsay Clancy case against the trial record. Every underlined phrase links to the news report or court coverage it came from.

No build step, no framework, no dependencies. Plain HTML, CSS and JavaScript, so it runs on GitHub Pages as-is.

```
clancy-factcheck/
  index.html            app shell (relative paths, so it works in any subfolder)
  css/app.css           styles: light/dark, text size, dock, settings sheet
  js/app.js             rendering, search, routing, share links, settings
  js/data.js            ALL THE CONTENT: sources, timeline, claims, evidence
  sw.js                 service worker (offline + instant load)
  manifest.webmanifest  Add to Home Screen metadata
  icons/                favicon.svg, icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
  .nojekyll             tells GitHub Pages to publish files exactly as they are
```

## Put it on GitHub Pages

Pick whichever matches how your site is set up. All three work because every path in the app is relative.

**A. As a folder inside a repo that already publishes to Pages**
1. Upload the whole `clancy-factcheck` folder to the root of that repo (Add file, Upload files, then drag the folder in from a desktop browser).
2. Commit. The app is live at `https://<user>.github.io/<repo>/clancy-factcheck/` (or `https://<user>.github.io/clancy-factcheck/` if the repo is your user site).

**B. As its own repo**
1. Create a repo called `clancy-factcheck`.
2. Upload the *contents* of the folder (so `index.html` sits at the repo root).
3. Settings, Pages, Source: Deploy from a branch, Branch: `main`, folder `/ (root)`. Save.
4. The app is live at `https://<user>.github.io/clancy-factcheck/` in a minute or two.

**C. Inside the mlb-slate repo**
Same as A. It will not interfere with the daily build; nothing in this folder is touched by your workflows and the service worker only controls its own folder.

Tip: uploading a folder needs a desktop browser or GitHub Desktop. From the phone, the GitHub app can add files one at a time, but see the smart-quotes warning below.

## Update the facts

Everything readers see comes from `js/data.js`. To add or fix something:

1. Add the source to `S` (one line per report):
   ```js
   ap_retrial:{o:"AP",t:"Headline of the report",d:"Oct 1, 2026",u:"https://apnews.com/..."},
   ```
2. Link a fact anywhere in the text with double brackets: `[[ap_retrial|the DA announced a retrial]]`.
   Whatever is between `|` and `]]` becomes the underlined, clickable text. Use as many links per sentence as you want.
3. Update `UPDATED` at the bottom of `data.js`.
4. Bump `CACHE_VERSION` in `sw.js` (for example `v1.0.0` to `v1.0.1`). Phones that already installed the app pick up the change on the next open.

Text fields use backticks (`...`) so quotes and apostrophes inside them are fine. Do not type curly "smart" quotes inside the `S` entries or the app will not load: iOS autocorrect inserts them. Safer to edit in a code editor and upload the file than to type in the GitHub mobile editor.

To add a new theory about Patrick, copy one block in `CLAIMS`:
```js
{id:"D9",cat:"D",v:"Not evidence",vc:"v-neutral",
 claim:`"The claim, in the words people use."`,
 rec:`What the record shows, with [[key|links]] on every fact.`},
```
Categories: A timeline and alibi, B scene and forensics, C digital evidence, D behavior and demeanor. Verdict color classes: `v-false`/`v-contra` (red), `v-warn` (amber), `v-ok` (green), `v-neutral` (blue).

## How it behaves

- Search covers every section; if a word is not in the section you are on, it shows where it is.
- Cards are collapsed by default (tap a claim to open it). Change that under More, Settings, Cards.
- Theme follows the phone (auto) or can be forced light or dark. Text size and link emphasis are also in Settings. Settings are remembered on the device.
- Share and Copy link on any card produce a link that opens straight to that card, for example `#claims/claim-B5`.
- The service worker caches the app itself, not the news articles, so links still need a connection.

## Content

Compiled Sept. 7, 2026 from trial testimony and reporting by AP, CNN, NBC, CBS Boston, The Boston Globe, Boston.com, WBUR, the Patriot Ledger, Court TV and others; the full list is in the Sources section. It is a summary of public reporting, not legal advice. The code is yours to reuse however you like.
