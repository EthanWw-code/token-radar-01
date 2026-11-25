// Token launch radar: sealed snapshot in, ranked board and dashboard out.
// Built under makefun anchor round 34253508 (kit init, 2026-11-24).
//
// Usage:
//   node main.ts [--input snapshot.json] [--output out] [--no-dossier]
// The grader runs it with no flags; it reads the sealed snapshot at
// /input/snapshot.json, writes the board, the dashboard and the screenshots
// to /output, and writes dossier.json last.
//
// What is produced:
//   board.json    every ranked row, with its model breakdown and farm plan
//   data.js       the dashboard's whole dataset as one script, no network
//   dashboard/    the static page (index.html, app.css, app.js)
//   screenshots/  three screenshots: the board, one protocol's detail, a
//                 filtered view
//   dossier.json  the dossier of /output, built from what is actually there
//
// The board is checked before anything is written: the watchlist must be
// covered in full, the ranks must be 1..n, the implied values must fall,
// and every row must carry a valid farm plan. When the board fails the
// check the run stops and nothing is written.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { boardIssue, buildRadar, dataScript, parseSnapshot, type Snapshot } from './lib/model.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_INPUT = '/input/snapshot.json';
const DEFAULT_OUTPUT = '/output';
const SCREENSHOTS = 3;
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const DASHBOARD_CAPS = { max_files: 400, max_bytes: 4_194_304 };

interface Flags {
  input: string;
  output: string;
  noDossier: boolean;
}

function usage(): never {
  console.error('usage: node main.ts [--input snapshot.json] [--output out] [--no-dossier]');
  process.exit(2);
}

function flags(argv: string[]): Flags {
  const out: Flags = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, noDossier: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') {
      const v = argv[i + 1];
      if (v === undefined) usage();
      out.input = resolve(v);
      i++;
    } else if (a === '--output') {
      const v = argv[i + 1];
      if (v === undefined) usage();
      out.output = resolve(v);
      i++;
    } else if (a === '--no-dossier') {
      out.noDossier = true;
    } else if (a === '--help' || a === '-h') {
      usage();
    } else {
      usage();
    }
  }
  return out;
}

function readSnapshot(path: string): Snapshot {
  if (!existsSync(path)) throw new Error(`snapshot not found at ${path}`);
  return parseSnapshot(readFileSync(path, 'utf8'));
}

function main(): void {
  const f = flags(process.argv.slice(2));
  const snapshot = readSnapshot(f.input);
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue !== null) throw new Error(`board issue: ${issue}`);
  if (!existsSync(join(REPO, 'dashboard', 'index.html'))) throw new Error('dashboard/index.html is missing');
  const shots = readdirSync(join(REPO, 'screenshots')).filter((n) => !n.startsWith('.'));
  if (shots.length < SCREENSHOTS) throw new Error(`the dashboard needs ${SCREENSHOTS} screenshots, found ${shots.length}`);
  for (const n of shots) {
    const p = join(REPO, 'screenshots', n);
    if (!statSync(p).isFile()) throw new Error(`screenshots/${n} is not a file`);
  }

  mkdirSync(f.output, { recursive: true });
  writeFileSync(join(f.output, 'board.json'), `${JSON.stringify(board, null, 2)}\n`);
  writeFileSync(join(f.output, 'data.js'), dataScript(radar));
  cpSync(join(REPO, 'dashboard'), join(f.output, 'dashboard'), { recursive: true });
  cpSync(join(REPO, 'screenshots'), join(f.output, 'screenshots'), { recursive: true });
  if (!f.noDossier) writeFileSync(join(f.output, 'dossier.json'), buildDossier(f.output, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: DASHBOARD_CAPS }));
  console.log(`board rows: ${radar.board_size} (watchlist ${radar.watchlist_size} + early ${radar.early_size})`);
  console.log(`live token rows: ${radar.live_size}`);
  console.log(`top 5: ${board.slice(0, 5).map((r) => `${r.rank}. ${r.name} $${r.implied_value_usd.toLocaleString('en-US')}`).join('; ')}`);
  console.log(`wrote ${f.output}`);
}

main();
