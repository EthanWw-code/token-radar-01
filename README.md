[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/EthanWw-code/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/EthanWw-code/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Launch Radar

A ranked board of pre-token protocols, scored only from a sealed snapshot of
the protocol universe. The model is `radar-2`: implied launch value =
TVL × category multiple × growth × maturity × chains.

## What it is

- **board.json** — every ranked row, with its model breakdown and farm plan.
- **dashboard/** — a static page (no network) that renders the board, the top
  10, one protocol's model breakdown and farm plan, and a live-token
  comparison.
- **screenshots/** — three screenshots: the board, one protocol's detail, a
  filtered view.
- **dossier.json** — the dossier of the output, built from what is actually
  there.

## The model (radar-2)

Implied value follows only from the snapshot's own figures. A launch is
priced by what the business is, not only by how big it is:

    implied = TVL × category multiple × growth × maturity × chains

- **Category multiple** — fee-capturing curators and allocators earn the most
  per dollar of TVL (0.38), then lending and real-world-asset protocols
  (0.32), then exchanges and yield (0.26), then bridges and staking wrappers
  (0.16–0.18), whose value is mostly the underlying asset, not a new token.
- **Growth** — 1 + (7-day TVL change, clamped to −60%…+120%) × 0.6.
- **Maturity** — 0.6 + min(age in days, 1095) / 1095 × 0.4. A protocol with no
  listing date is scored as 365 days old.
- **Chains** — 1 + min(chain count, 8) × 0.025. More chains, wider
  distribution, a launch that reaches more users.
- **Early rows** — the watchlist is the floor, never the ceiling. Pre-token
  protocols below the $50M floor are added by TVL, up to 160 rows.
- **Excluded** — centralised exchanges, versioned pools, and any protocol
  that already has a token.

No protocol name is ever special-cased: the same function scores every row.

## Run

    node main.ts [--input snapshot.json] [--output out] [--no-dossier]

The grader runs it with no flags: it reads the sealed snapshot at
`/input/snapshot.json`, writes the board, the dashboard and the screenshots
to `/output`, and writes `dossier.json` last. The board is checked before
anything is written: the watchlist must be covered in full, the ranks must
be 1..n, the implied values must fall, and every row must carry a valid
farm plan.

## License

MIT. See LICENSE.
