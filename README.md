# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/ksatria56/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/ksatria56/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Ledger — the offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5: a checklist with saved progress, filters and a spoiler setting, a roadmap to the platinum, the missable trophies flagged, and a cited guide for every trophy.

The checklist's "Pick one for me" button suggests one unearned trophy from the current filters — never the same one twice in a row — and keeps a short history of its last picks, so a stuck session always has a next trophy to chase.

The Kind filter also offers a Missable only preset, and the Next-up planner shows your percentage of the way to the platinum — so the trophies that can pass you by stay at the top of the list, and the "Forget previous picks" button clears the picker's short memory when you want a fresh start.

Round 5 adds a third per-trophy hint, a theme-color meta tag, an Escape key that closes the trophy guide pane, and a planner line counting the missables still to earn — the checklist, picker and tracker work exactly as before.

Round 6 adds planner tools that all read one new table in `app/data/trophies.json` (`estimates`: hours, Leonida region and a 1–5 effort score per trophy, 118.5 hours for the whole list). The Time to platinum page totals the hours, subtracts what you have earned and divides by your weekly pace (Casual 3 h, Steady 6 h, Hardcore 12 h) to give a finish date, with the remaining hours per roadmap stage. The Next trophy page scores every unearned trophy in the open — missables first, then quick wins, then trophies you have half-finished, then the earliest roadmap stage — and shows each suggestion's reasons. The Regions page breaks progress down by the six corners of Leonida instead of one flat percent.

Round 6 (part 2) adds the habit half: the Streak & goals page counts consecutive days with at least one earned trophy and the trophies earned this week against a goal you set (default 3/week), with a 14-day calendar — every tick is date-stamped in the save, and unticking removes the stamp. The Timeline page lays the seven roadmap stages out week by week at your pace with a finish date. The Export page turns the checklist into plain Markdown, grouped by roadmap stage with ticks, grades, difficulty and hours, to copy or download. The checklist rows now carry a difficulty tag (stars + label), and the strip under the toolbar always shows hours left, this week's earns and the weekly goal. The local server also answers `GET /plan.json` (total and per-region hours) and `GET /health`.

## Run it

```sh
node serve.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=v2s3h6sv&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
