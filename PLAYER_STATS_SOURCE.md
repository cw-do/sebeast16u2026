# Player stats source (internal)

This file is intentionally not linked from `index.html`, so it does not appear on the public webpage.

- Google Sheet: https://docs.google.com/spreadsheets/d/1II5uBT_KuIPIJ2D8Y_UILltH9FOIQxzb/edit?usp=drivesdk&ouid=111435744209575313482&rtpof=true&sd=true
- CSV export used for lookups: https://docs.google.com/spreadsheets/d/1II5uBT_KuIPIJ2D8Y_UILltH9FOIQxzb/export?format=csv
- Sheet title verified: `2026-2027 Southeast Beast Roster`
- Current layout: header row 5, roster totals begin on row 6; a second per-game/averages section begins later in the same export.

## Jason Do lookup

When Changwoo-ssi asks for Jason Do's player stats, run:

```bash
node scripts/player-stats.mjs --player "Jason Do"
```

The script fetches the current CSV directly, finds every matching athlete row, and prints the column names with each matching row. It does not modify the webpage or store a stale copy of the stats.

As of the initial verification, the sheet contains two `56 Jason Do` rows: one in the roster totals section and one in the later averages section. Report both sections (or clearly label the row context) rather than silently choosing one.
