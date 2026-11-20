// Leonida Ledger — the GTA 6 trophy guide entry (Node 22, standard library only).
// The guide is this directory's app/ folder: plain static files a browser opens at
// app/index.html (ES modules, CSS, no build step), offline — it loads nothing over
// the network, and its trophy list and guides are app/data/trophies.json. This program
// hands it in: it copies app/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json, the summary the judge reads (the screenshots, the first
// load's files and bytes, and the source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for
// byte what its own copy writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

// Round 3: picker history, an unearned-only filter, per-trophy hints, reset-one-trophy, and a stage tip — all wired into the checklist, detail pane and roadmap.
// Round 4: a Missable only kind preset, a planner percentage, a picker-history reset, a second trophy hint, and a stage tip for the long activity counts.
// Round 5: a third trophy hint, a theme-color meta tag, an Escape key for the detail pane, a planner missables-left line, a strangers-stage tip, and a picker-button wrap fix — checklist, picker and tracker unchanged.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files:
// app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

// Round 6: validate the trophy data and print the platinum plan before
// handing the entry in — the calculator and the recommender both read the
// same estimates table, so a missing entry here would be a silent hole there.
const trophyDoc = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
const trophyList = trophyDoc.trophies ?? [];
const estimateTable = trophyDoc.estimates ?? {};
const missingEstimates = trophyList.filter((t) => !estimateTable[t.id]);
if (trophyList.length !== 55) {
  console.error(`Leonida Ledger: expected 55 trophies, found ${trophyList.length}`);
  process.exit(1);
}
if (missingEstimates.length) {
  console.error(`Leonida Ledger: ${missingEstimates.length} trophies without a time estimate`);
  process.exit(1);
}
const totalPlanHours = trophyList.reduce((sum, t) => sum + (estimateTable[t.id].h ?? 0), 0);
console.log(`Leonida Ledger: 55 trophies, ${totalPlanHours} estimated hours to the platinum.`);

// Round 6 (part 2): the same table broken down by region, so the printed
// plan shows where the hours actually live instead of one flat number.
const hoursByRegion = {};
for (const t of trophyList) {
  const row = estimateTable[t.id];
  hoursByRegion[row.r] = (hoursByRegion[row.r] ?? 0) + row.h;
}
for (const [region, hours] of Object.entries(hoursByRegion).sort((a, b) => b[1] - a[1])) {
  console.log(`Leonida Ledger: ${region} — ${hours} hours.`);
}
const paces = trophyDoc.paces ?? { steady: 6 };
const steadyWeeks = Math.max(1, Math.ceil(totalPlanHours / (paces.steady ?? 6)));
console.log(`Leonida Ledger: about ${steadyWeeks} weeks at the steady pace.`);
