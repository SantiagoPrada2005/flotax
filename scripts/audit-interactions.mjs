#!/usr/bin/env node
/**
 * Interaction guardrail for FlotaX.
 *
 * Counts interaction-slop patterns in every .tsx and .astro file under `src/`
 * and compares them against `scripts/interaction-baseline.json`. This is a ratchet:
 * the debt can shrink, never grow. A file that already has debt may keep its
 * recorded counts (or go lower); an existing file may not exceed them, and a
 * file absent from the baseline fails as soon as it adds a single violation.
 *
 * Usage:
 *   node scripts/audit-interactions.mjs            # check (exit 1 on growth)
 *   node scripts/audit-interactions.mjs --update   # rewrite the baseline
 *   node scripts/audit-interactions.mjs --help
 *
 * Node built-ins only. No dependencies.
 *
 * Approximations (on purpose: this is a static text counter, not a JSX parser):
 *   - Regexes run over the whole file, so a comment, a docstring or a string
 *     literal that mentions a pattern counts as a hit. The baseline absorbs the
 *     current debt; the PR diff of the baseline is the manual review point.
 *   - `duration-*` only understands plain numbers (`duration-500`) and
 *     arbitrary millisecond values (`duration-[500ms]`). CSS-variable
 *     durations (`duration-(--x)`) are not measured.
 *   - `hover:` rules use a `(?<!group-)` lookbehind so `group-hover:scale-*`
 *     is counted once, by its own rule, and not again as `hover:scale-*`.
 *   - Clickable containers are found by scanning tags: from `<div`/`<article`
 *     to the first `>` that is outside a `{...}` expression, so `onClick={() => …}`
 *     is read correctly. A `>` inside a quoted attribute ends the tag early, and
 *     a `<` outside an expression aborts it; markup inside a string is a false
 *     positive. Multi-line tags are supported.
 *   - As specified, `onClick` on `div`/`article` is only reported for files
 *     that contain no `onKeyDown` at all (file-level check, not per element).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const SRC_ROOT = join(REPO_ROOT, 'src');
const BASELINE_PATH = join(REPO_ROOT, 'scripts', 'interaction-baseline.json');
const SOURCE_FILE = /\.(tsx|astro)$/;
const BASELINE_TOTALS_KEY = 'totals';

const countMatches = (source, pattern) => [...source.matchAll(pattern)].length;

/** `duration-400` and above: anything slower than the 320 ms page budget. */
function countLongDurations(source) {
  let count = 0;
  for (const match of source.matchAll(/duration-(\d+)\b/g)) {
    if (Number(match[1]) > 320) count += 1;
  }
  for (const match of source.matchAll(/duration-\[(\d+(?:\.\d+)?)ms\]/g)) {
    if (Number(match[1]) > 320) count += 1;
  }
  return count;
}

/**
 * Returns the end offset (exclusive) of the opening tag that starts at `start`,
 * or -1 when the tag never closes. Braces are tracked so `>` inside an arrow
 * function or a comparison does not end the tag.
 */
function findTagEnd(source, start) {
  let braceDepth = 0;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      braceDepth += 1;
    } else if (char === '}') {
      if (braceDepth > 0) braceDepth -= 1;
    } else if (char === '>' && braceDepth === 0) {
      return index + 1;
    } else if (char === '<' && braceDepth === 0) {
      return -1;
    }
  }
  return -1;
}

function countClickableContainers(source) {
  let count = 0;
  for (const match of source.matchAll(/<(div|article)\b/g)) {
    const end = findTagEnd(source, match.index);
    if (end === -1) continue;
    const tag = source.slice(match.index, end);
    if (/\bonClick\b/.test(tag)) count += 1;
  }
  return count;
}

/** File-level approximation from the brief: no `onKeyDown` anywhere => all clickable divs count. */
function countClickableContainersWithoutKeyboard(source) {
  if (/\bonKeyDown\b/.test(source)) return 0;
  return countClickableContainers(source);
}

const RULES = [
  {
    id: 'transition-all',
    label: 'transition-all',
    count: (source) => countMatches(source, /transition-all/g),
  },
  {
    id: 'duration-over-320',
    label: 'duration-* > 320ms',
    count: countLongDurations,
  },
  {
    id: 'hover-transform',
    label: 'hover:scale/rotate/translate',
    count: (source) => countMatches(source, /(?<!group-)hover:(?:scale|rotate|-?translate)-/g),
  },
  {
    id: 'hover-shadow',
    label: 'hover:shadow-*',
    count: (source) => countMatches(source, /(?<!group-)hover:shadow\b/g),
  },
  {
    id: 'group-hover-transform',
    label: 'group-hover:scale/rotate/translate',
    count: (source) => countMatches(source, /group-hover:(?:scale|rotate|-?translate)-/g),
  },
  {
    id: 'ios-press-bounce',
    label: 'ios-press-bounce',
    count: (source) => countMatches(source, /ios-press-bounce\b/g),
  },
  {
    id: 'focus-outline-none',
    label: 'focus:outline-none/hidden',
    count: (source) => countMatches(source, /focus:outline-(?:none|hidden)\b/g),
  },
  {
    id: 'clickable-div-no-keydown',
    label: 'div/article onClick without onKeyDown',
    count: countClickableContainersWithoutKeyboard,
  },
];

function* walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => {
    if (left.name < right.name) return -1;
    if (left.name > right.name) return 1;
    return 0;
  });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (SOURCE_FILE.test(entry.name)) yield path;
  }
}

function toBaselineKey(filePath) {
  return relative(REPO_ROOT, filePath).split(sep).join('/');
}

function countFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const counts = {};
  for (const rule of RULES) {
    const count = rule.count(source);
    if (count > 0) counts[rule.id] = count;
  }
  return counts;
}

function collect() {
  const files = {};
  const totals = Object.fromEntries(RULES.map((rule) => [rule.id, 0]));
  let scanned = 0;
  for (const filePath of walk(SRC_ROOT)) {
    scanned += 1;
    const counts = countFile(filePath);
    if (Object.keys(counts).length === 0) continue;
    files[toBaselineKey(filePath)] = counts;
    for (const rule of RULES) totals[rule.id] += counts[rule.id] ?? 0;
  }
  return { files, totals, scanned };
}

/** Stable shape: files sorted by path, rules in declaration order, `totals` last. */
function buildBaseline({ files, totals }) {
  const baseline = {};
  for (const filePath of Object.keys(files).sort()) {
    const counts = files[filePath];
    const ordered = {};
    for (const rule of RULES) {
      if (counts[rule.id]) ordered[rule.id] = counts[rule.id];
    }
    baseline[filePath] = ordered;
  }
  const orderedTotals = {};
  for (const rule of RULES) orderedTotals[rule.id] = totals[rule.id];
  baseline[BASELINE_TOTALS_KEY] = orderedTotals;
  return baseline;
}

function printTable(current, baselineTotals) {
  const ruleWidth = 38;
  console.log('');
  console.log(`${'rule'.padEnd(ruleWidth)}${'total'.padStart(8)}${'baseline'.padStart(10)}`);
  console.log('-'.repeat(ruleWidth + 18));
  for (const rule of RULES) {
    const total = current.totals[rule.id];
    const allowed = baselineTotals?.[rule.id];
    const baselineCell = allowed === undefined ? '—' : String(allowed);
    const hint = allowed !== undefined && total > allowed ? `  (+${total - allowed})` : '';
    console.log(`${rule.label.padEnd(ruleWidth)}${String(total).padStart(8)}${baselineCell.padStart(10)}${hint}`);
  }
}

function formatCounts(counts) {
  return Object.entries(counts)
    .map(([rule, count]) => `${rule}=${count}`)
    .join(', ');
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(
      `Missing baseline: ${toBaselineKey(BASELINE_PATH)}.\n` +
        'Run `node scripts/audit-interactions.mjs --update` to create it.',
    );
    process.exit(1);
  }
  const raw = readFileSync(BASELINE_PATH, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(`Invalid JSON in ${toBaselineKey(BASELINE_PATH)}: ${error.message}`);
    process.exit(1);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.error(`Baseline must be a JSON object mapping file -> rule counts.`);
    process.exit(1);
  }
  return parsed;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(
    'Usage: node scripts/audit-interactions.mjs [--update]\n' +
      '  (no flags)  compare src/**/*.{tsx,astro} against the baseline\n' +
      '  --update    rewrite the baseline with current counts\n' +
      'Approximation notes live at the top of this file.',
  );
  process.exit(0);
}

const unknownArgs = args.filter((arg) => arg !== '--update');
if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(' ')}. Use --help.`);
  process.exit(1);
}

const update = args.includes('--update');
const current = collect();

if (update) {
  const baseline = buildBaseline(current);
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  printTable(current, current.totals);
  console.log('');
  console.log(
    `Baseline written: ${toBaselineKey(BASELINE_PATH)} ` +
      `(${Object.keys(current.files).length} file(s) with debt, ${current.scanned} file(s) scanned).`,
  );
  process.exit(0);
}

const baseline = readBaseline();
const baselineTotals =
  baseline[BASELINE_TOTALS_KEY] && typeof baseline[BASELINE_TOTALS_KEY] === 'object'
    ? baseline[BASELINE_TOTALS_KEY]
    : undefined;

const grown = [];
const newFiles = [];
for (const [filePath, counts] of Object.entries(current.files)) {
  const recorded = baseline[filePath];
  if (!recorded || typeof recorded !== 'object') {
    newFiles.push({ filePath, counts });
    continue;
  }
  for (const [rule, count] of Object.entries(counts)) {
    const allowed = Number(recorded[rule] ?? 0);
    if (count > allowed) grown.push({ filePath, rule, count, allowed });
  }
}

console.log(`Scanned ${current.scanned} file(s) under src/.`);
printTable(current, baselineTotals);

if (grown.length === 0 && newFiles.length === 0) {
  console.log('');
  console.log('OK: every file is within its recorded interaction baseline.');
  process.exit(0);
}

console.log('');
console.log('FAIL: interaction budget exceeded.');
for (const { filePath, rule, count, allowed } of grown) {
  console.log(`  ${filePath}: ${rule} ${count} > baseline ${allowed}`);
}
for (const { filePath, counts } of newFiles) {
  console.log(`  ${filePath}: new file with ${formatCounts(counts)}`);
}
console.log('');
console.log(
  'Fix the regression, or run `node scripts/audit-interactions.mjs --update` ' +
    'after a reviewed cleanup that intentionally changes the baseline.',
);
process.exit(1);
