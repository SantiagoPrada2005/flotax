# CLI reference

`jev --help` and `jev <verb> --help` print the same information from the tool itself. This page adds exit codes, error shapes and the spec file format.

## Providers

`jev` talks to TypeSafe's Jev decision model through one of two backends. Every provider-specific
value — endpoint, key, default model, attribution headers, price — comes from one table in the CLI,
so a future gateway is one more row, not a rewrite.

| Provider | Decisions endpoint | Key env | Default model | Key check |
|---|---|---|---|---|
| `typesafe` (default) | `https://api.typesafe.ai/v1/systemone` | `TYPESAFE_API_KEY` | `jev-latest` | `GET /v1/models` |
| `openrouter` | `https://openrouter.ai/api/alpha/decisions` | `OPENROUTER_API_KEY` | `~typesafe/jev-latest` | `GET /v1/key` |

Resolution order (first match wins): `--provider typesafe\|openrouter` → `$JEV_PROVIDER` env var →
`[jev] provider =` in `<config dir>/config.ini` → auto (`typesafe` if `TYPESAFE_API_KEY` is
configured, else `openrouter` if `OPENROUTER_API_KEY` is configured, else exit 2). `config.ini`
holds non-secret settings only (mode `0644`) and is written by `jev provider default ID`, never by
hand-editing recommended — `<config dir>/.env` holds secrets only (mode `0600`); a stray
`JEV_PROVIDER=` line inside `.env` is not read (settings and secrets are deliberately two files).
An explicitly chosen provider (via any of the first three) whose key is missing is an error naming
that provider's key and the matching `jev auth set` command — it never silently falls back to the
other provider. An unknown provider name, from `--provider`, `$JEV_PROVIDER` or `config.ini`, exits
2. `--verbose`, `--json` and `auth status`/`provider list` show which provider ran; nothing about
provider selection goes to stdout/stderr otherwise, so pipelines stay clean.

Every request carries `User-Agent: jev-cli/<VERSION> (+https://github.com/okooo5km/jev)`.
OpenRouter additionally gets `X-Title: jev-cli` and `HTTP-Referer: https://github.com/okooo5km/jev`
(its attribution headers, not authentication) — TypeSafe gets neither.

**Model normalization.** Whatever model resolves from `-m` / a spec's `model` / `$JEV_MODEL` / the
provider default is normalized for the active provider: for `typesafe`, a leading `~` and a
`typesafe/` prefix are stripped (`~typesafe/jev-latest` → `jev-latest`), and a two-segment version
like `jev-1.13` gets `.0` appended (`jev-1.13.0`) — verified live, the native API only accepts
three-segment versions and rejects `jev-1.13` as an unknown model; for `openrouter`, a bare model
without `/` maps `jev-latest`/`jev-preview` → `~typesafe/jev-latest`/`~typesafe/jev-preview`, a
bare `jev-X.Y.0` drops its `.0` (`typesafe/jev-X.Y`, OpenRouter's own two-segment form), anything
else bare → `typesafe/<model>`, and a model that already contains `/` passes through unchanged.
`jev-latest` and the `X.Y`/`X.Y.0` versioned pattern are portable this way. `jev-preview` is not:
verified live, OpenRouter has no `~typesafe/jev-preview` and answers `Model … does not exist`, so
use it with `--provider typesafe` only. Anything else — pass the provider's own id when in doubt, or run `jev auth check` (native) to see
which model names the account can actually use. `raw` does not go through this chain: it only fills
a missing `model` field with the active provider's default and otherwise sends the body verbatim,
including whatever `model` string it already contains.

## `provider` — inspect or pin the active backend

```text
jev provider list [--json]
jev provider default [ID|auto]
```

`list` prints one row per provider (`*` marks the active one): id, endpoint host, key env name,
whether a key is configured and its source (`env`/`JEV_ENV_FILE`/`config`), and the default model;
a last line names the active provider and why. Never prints a key character. `--json` gives
`{"provider", "reason", "providers": [...]}`.

`default` with no argument prints the pinned provider or `auto`. `default typesafe` or `default
openrouter` writes `[jev] provider = ID` to `config.ini` (atomic, `0644`, other sections/keys kept)
and prints the resulting active provider and why; if that provider has no key yet, a warning names
the matching `jev auth set` command. `default auto` clears the pin, reverting to auto-detection. An
unknown `ID` (not `typesafe`, `openrouter` or `auto`) exits 2.

## Verbs

### `yes` — yes/no with a calibrated probability

```text
jev yes QUESTION [-s STATE] [--true DESC] [--false DESC] [-t P] [--quiet]
```

Plain stdout: `yes\t0.97` or `no\t0.02`. `--quiet` prints nothing; use the exit code. `-t` sets the yes/no threshold (default `0.5`). `--true`/`--false` describe what each side means. The API requires both sides once `criteria` is present, so giving only one sends the other as an empty description.

### `pick` — one of N options

```text
jev pick QUESTION OPTION[=DESC] OPTION[=DESC]... [--other] [-p] [--min-confidence C]
```

At least two options. `--other` appends an `other` option meaning "none of the above". Plain stdout is the chosen option name; `-p` prints every option with its probability, high to low. `--min-confidence` sets exit code 1 (not an error) when `confidence` is below the threshold.

### `score` — ordinal scale

```text
jev score QUESTION LABEL LABEL... [-p]
jev score QUESTION --range A-B [-p]
```

2–10 labels, low to high, or `--range A-B` (inclusive integers, same 2–10 limit) instead of naming them. Plain stdout: `VALUE\tLABEL` — the expected value under the returned distribution, then the argmax label. `-p` prints every level with its probability.

### `filter` — semantic grep

```text
jev filter QUESTION [--true DESC] [--false DESC] [-t P] [-v] [--with-prob]
```

Always line-based (no `-l` needed). Prints matching lines to stdout, one call per input line. `-v` inverts (print non-matching lines). `--with-prob` prefixes each line with its probability. Exit 0 if at least one line matched, 1 if none matched, 2 if any line errored (matches found so far are still printed).

### `run` — a named or ad hoc spec

```text
jev run                 # list available specs: NAME<TAB>description
jev run SPEC [-s STATE]
jev run /path/to/custom.json
```

`SPEC` is a built-in name, a name under `<config dir>/specs/`, or a path to a spec file. Runs every question in the spec in one API call. Plain stdout is one `name  value  stats` row per question, columns aligned (CJK-width aware); `--json` gives `{"model", "id", "provider", "answers": {...}, "usage"}` with every question enriched the same way as single-question JSON output.

### `raw` — the request body, verbatim

```text
jev raw < body.json
```

Reads a complete `{"model", "state", "questions"}` request body from stdin (`model` defaults to `-m`/`$JEV_MODEL`/the active provider's default model if omitted) and prints the API's response JSON **unmodified** — no `provider` key is injected, no `criteria` normalization, no model-alias normalization on a `model` the body already has. Use this to debug a spec, hit a provider directly, or exercise a feature the typed verbs do not expose yet.

### `auth` — manage provider keys

```text
jev auth set [--provider typesafe|openrouter] [--stdin]
jev auth status [--provider typesafe|openrouter]
jev auth check [--provider typesafe|openrouter]
jev auth remove [--provider typesafe|openrouter]
```

`auth set` is the recommended way to store a key: the user runs it in their own terminal, and the key never goes through chat, a command-line argument or shell history.

- **`set`** — provider: `--provider` → `$JEV_PROVIDER` → `typesafe` (no auto-detection by existing key here; this command is how a key gets configured in the first place; it never consults a pinned `config.ini` default either — always resolves to `typesafe` unless told otherwise). Without `--stdin`: refuses unless stdin is a real TTY (exit 2, nothing changed) — an agent has no terminal to type into, by design. Interactively prompts `<Provider> API key（输入不回显，创建于 <key page>）: ` via `getpass` (input never echoed), strips whitespace, and rejects an empty answer. For `openrouter`, a value not starting with `sk-or-` gets a stderr warning and a `继续保存吗？[y/N]` confirmation (default no). For `typesafe` (no known key prefix), the only sanity check is the reverse: a value that *does* start with `sk-or-` triggers `这看起来是 OpenRouter 的密钥，要保存为 TypeSafe 密钥吗？[y/N]`. With `--stdin`: reads the first line of stdin as the key instead — no TTY needed, no confirmation prompts; a prefix mismatch is an immediate error (exit 2, nothing written) rather than a question, since there is no interactive confirmation to fall back on. This is for provisioning from a password manager (`op read "op://…" | jev auth set --stdin`), matching `gh auth login --with-token` / `codex login --with-api-key`; there is still no flag that takes a key value on the command line. Either way, on accept it writes `<KEY_ENV>=<key>` to `<config dir>/.env`: any other lines are preserved (including the other provider's key — one file can hold both), an existing `<KEY_ENV>=`/`export <KEY_ENV>=` line for that same provider is replaced, the config dir is created `0700` if missing, and the write is atomic (temp file in the same directory, `fsync`, `os.replace`, then `chmod 600`). If `.env` is itself a symlink, the target is written and the symlink is left pointing at it. Afterwards, if both providers now have a key and none is pinned, a stderr line suggests `jev provider default <id>` for reproducible scripts; the command always ends by printing the now-active provider and why. Never prints the key.
- **`status`** — first line names the active provider and why (`--provider` / `JEV_PROVIDER` / `config.ini` / `自动`), or that none resolves. Then one block per provider: configured or not (with the `jev auth set` hint if not), source (environment / `$JEV_ENV_FILE` / config file), file path (and symlink target, if any) and permission bits, with a `chmod 600` warning when group/other can read it. Never prints a key. Exit 0 if the active provider actually has a key configured, 1 otherwise (including when nothing is configured at all).
- **`check`** — checks the active (or explicitly given) provider's key, read-only and free. For `typesafe`: `GET $JEV_KEY_URL` (default `https://api.typesafe.ai/v1/models`); 200 → `密钥有效（TypeSafe）` plus the model names the account can use (the response shape is parsed defensively: a bare list, or an object with `data`/`models`, of strings or `{"id"|"name": ...}` objects — a real account returned exactly `jev-latest` and `jev-preview`); 401 or 403 → a message pointing at `jev auth set`, exit 2. For `openrouter`: unchanged from before — `GET $JEV_KEY_URL` (default `https://openrouter.ai/api/v1/key`) with the same `Authorization`/`User-Agent`/`X-Title`/`HTTP-Referer` headers as a decision call; reports validity, spend limit (`无上限` if null), remaining balance and total usage; never prints the response's `label` (an unlabeled key's `label` is a masked fragment of the key itself) or `creator_user_id`; HTTP 401 → a message pointing at `jev auth set --provider openrouter`, exit 2. A missing key or a network failure also exit 2 without guessing, for either provider.
- **`remove`** — provider: `--provider` → `$JEV_PROVIDER` → `typesafe` (same default as `set`). Deletes only that provider's `<KEY_ENV>=`/`export <KEY_ENV>=` line from `<config dir>/.env` (atomic, other lines and a symlinked `.env`'s target preserved; the file itself is kept even if it ends up empty), then prints the now-active provider and why. No key configured for that provider → a stderr message and exit 1, nothing changed. A key sourced from the environment or `$JEV_ENV_FILE` cannot be removed by this command (it isn't a file `jev` manages) — it says so, names the source, and exits 2. Works without a TTY; it handles no secret input.

## Common options

| Option | Applies to | Meaning |
|---|---|---|
| `-s, --state TEXT\|@FILE\|-` | all but `raw` | State source. Default: read stdin. `-` also means stdin. `@path` reads a file. Missing `-s` with stdin attached to a terminal is an error. |
| `--text` | all but `raw` | Always send state as a plain string; skip JSON auto-detection. |
| `-l, --lines` | `yes`, `pick`, `score`, `run` | One decision per non-empty input line, concurrent, order-preserved, streamed. (`filter` is always line-based.) |
| `--field KEY` | line mode | If a line is a JSON object, judge only `KEY` (coerced to a JSON-safe scalar; see below). |
| `-j, --jobs N` | line mode | Concurrency. Default 8. Keep at or below 16 (see Limits). |
| `--json` | all | Machine-readable output (JSONL in line mode) with every probability and field, input order preserved. |
| `-m, --model ID` | all | Overrides `$JEV_MODEL` / a spec's own `model` / the active provider's default. Normalized per provider — see above. |
| `--provider typesafe\|openrouter` | all but `auth` (which has it per subcommand) | Selects the backend for this call. See Providers above for resolution order. |
| `--timeout SECONDS` | all | Per-request timeout. Default 60. |
| `--retries N` | all | Retries for 429/5xx/network errors, exponential backoff with jitter, `Retry-After` respected. Default 3. |
| `--verbose` | all | stderr: provider, model, latency, tokens, cost (`≈$` when the provider estimates rather than reports cost; line mode: one summary at the end, plus connection counts — `连接 新建 N / 复用 M`). |
| `--version` | — | Print `jev X.Y.Z` and exit. |

State auto-detection (without `--text`): if the trimmed input starts with `{` or `[` and parses as JSON, it is sent as a structured `state` (object or array); otherwise it is sent as a string.

`--field` coercion: a JSON object field that is itself a `str`/`dict`/`list` is sent as-is; a JSON `bool` or `null` is sent as its JSON text (`"true"`, `"null"`); a number is sent via `str()` (`"42"`, `"3.5"`). This keeps every field type on the wire as a scalar or JSON-composite `state`, never a bare number/bool that the API would reject.

## Environment variables

| Variable | Effect |
|---|---|
| `TYPESAFE_API_KEY` | The TypeSafe native key. See lookup order below. |
| `OPENROUTER_API_KEY` | The OpenRouter key. Same lookup order. |
| `JEV_PROVIDER` | Selects the provider (`typesafe`/`openrouter`), below `--provider`, above a pinned `config.ini` default and auto-detection. Environment variable only — a same-named line inside `.env` is not read. |
| `JEV_ENV_FILE` | An additional `.env`-style file to check for either key, before the config-dir default. |
| `JEV_MODEL` | Default model ID, below an explicit `-m` and a spec's own `model`, above the provider default. |
| `JEV_BASE_URL` | Overrides the decisions endpoint of the **active** provider (default per the Providers table above); used by this project's own tests, and useful if an endpoint moves. |
| `JEV_KEY_URL` | Overrides the `auth check` endpoint of the active provider (same defaults as the Providers table). |
| `XDG_CONFIG_HOME` | Overrides the config dir's parent (default `~/.config`); the config dir is `$XDG_CONFIG_HOME/jev` or `~/.config/jev`. |
| `JEV_DEBUG=1` | Print each outgoing request body to stderr, plus one line per request saying whether the connection was reused. Never prints a key. |

Key lookup order (per provider): environment (`TYPESAFE_API_KEY` or `OPENROUTER_API_KEY`) → `$JEV_ENV_FILE` → `<config dir>/.env`. There is no repository-local `./.env` lookup — a key belongs to the user, not a checkout.

**Two files, deliberately separate** (same split as `gh`'s `hosts.yml`/`config.yml`, AWS's `credentials`/`config`, `llm`'s `keys.json`): `<config dir>/.env` holds secrets only — a plain `KEY=value` file, one line per key, mode `600`, written by `jev auth set` / `jev auth remove`. `<config dir>/config.ini` holds non-secret settings only — currently just `[jev]` `provider = typesafe|openrouter`, mode `644`, written by `jev provider default`, parsed with `configparser`. Neither file should normally be hand-edited; `jev auth status` and `jev provider list` report what's active without printing a key.

## Speed

A single call opens a new connection, so it pays connection setup on top of model time — typically
0.5–1 s in total. Line mode (`-l`, `filter`, `run -l`) keeps each worker's connection open, so every
call after the first takes about 0.3–0.4 s, in line with TypeSafe's documented 70–500 ms; measured on
40 lines with `-j 4`, about 4 s versus about 7.5 s reconnecting every time. For more than a handful of
items, use line mode instead of looping single calls in a shell; put several questions about the same
input into one spec (one call answers them all); raise `-j` (default 8, keep at or below 16) for
large batches. `--verbose` reports the connection counts in line mode: `连接 新建 N / 复用 M`.

## Exit codes

| Command | 0 | 1 | 2 |
|---|---|---|---|
| `yes` | yes | no | error |
| `pick` | ran | below `--min-confidence` | error |
| `score` | ran | — | error |
| `filter` | ≥1 line matched | 0 lines matched | any line errored |
| `run`, `raw` | ran | — | error |
| `auth status` | active provider has a key | no key for the active provider (or none at all) | — |
| `auth set` | saved | — | no TTY (without `--stdin`), empty input, declined confirmation (or a `--stdin` prefix mismatch), unknown provider, or write failure |
| `auth check` | valid | — | invalid (401/403), missing key, unknown provider, or network error |
| `auth remove` | removed | key not configured for that provider | key is env/`$JEV_ENV_FILE`-sourced (not removable here), or unknown provider |
| `provider list` | ran | — | — |
| `provider default` | ran (get, set or clear) | — | unknown `ID` |
| line mode (`-l`) | all lines ok | — | ≥1 line failed (detail on stderr; `--json` also emits `{"input","error"}` for that line) |
| any command, Ctrl-C | — | — | 130 |

A client-side validation failure (bad arguments, an unknown `--provider`, an out-of-range `score` label count, an unreadable spec) exits 2 without making a request.

## Error shapes

API errors print to stderr as `jev: API 错误 (HTTP n): <detail>` and exit 2. `<detail>` is extracted from the response body, which takes one of these shapes:

**OpenRouter:**

1. **A Zod issue array**, serialized as a JSON string inside `error.message` — e.g. `error.message == '[{"path":["questions","answer","criteria"],"message":"Required"}]'`. Rendered as `path: message` pairs joined by `; `.
2. **`HTTP 400: {"detail": ...}`** — `error.message` itself starts with `HTTP `; the remainder is parsed as JSON and its `detail` (a string, or an object with a `message`) is used.
3. **A plain string** — used verbatim.

**TypeSafe native:** a top-level `{"detail": ...}` (no `error` wrapper). All three shapes below were confirmed against a real account:

1. **An object** — its `message` field, or the object itself if there is none. Verified examples: an unrecognized question `type` → `{"detail":{"error_type":"api_usage_error","message":"Invalid request."}}`; an unusable model → `{"detail":{"error_type":"api_usage_error","message":"Unknown model: jev-1.13"}}` (jev appends a further hint on the next line: `jev: 提示：运行 jev auth check 查看这个账号可用的模型名`).
2. **A FastAPI-style validation list** — `[{"loc": [...], "msg": "...", "type": "...", "input": ...}, ...]` at `422`, rendered from `loc`/`msg` as `loc.joined.by.dots: msg` pairs joined by `; ` (`type`/`input` are ignored). Verified example, a missing required field: `{"detail":[{"type":"missing","loc":["body","questions","q","choice","criteria"],"msg":"Field required","input":{...}}]}`.
3. **A string** — used verbatim. Verified example, too many score levels: `{"detail":"Too many score levels. Must have at most 10 levels."}` at `400`.

Auth-failure hints, appended on a new line: TypeSafe `401` or `403` → `jev: 提示：请在你自己的终端运行 jev auth set`. OpenRouter `401` → `jev: 提示：请检查 OPENROUTER_API_KEY 是否正确，或运行 jev auth set --provider openrouter 重新设置。` A missing key never reaches the network: `jev: 未找到 <KEY_ENV>. ...` prints immediately, exit 2.

One verified behavior difference between backends: a `noul` question with only `criteria.true` (no `false`) is accepted (`200`) by the native API but rejected by OpenRouter. This only matters to `jev raw`, which sends a body verbatim — every typed verb and spec already fills the missing side with an empty string before sending, so a question works unchanged on either provider.

`429` and `5xx`/`529` are retried (`--retries`, default 3) with exponential backoff and jitter, honoring a `Retry-After` header when present, on both providers; only a retry exhausted this way becomes a printed error.

## Spec files

A spec mirrors the API request body plus a `description` and an optional `threshold` (the yes/no cutoff `run`'s plain output uses for `noul` questions, default `0.5`). A spec's `model`, if set, participates in the normal `-m` → spec `model` → `$JEV_MODEL` → provider default chain and is normalized for whichever provider ends up active.

```json
{
  "description": "One line shown by `jev run`",
  "model": "jev-1.13.0",
  "threshold": 0.5,
  "questions": {
    "category": {
      "type": "choice",
      "instructions": "Which kind of request is this?",
      "criteria": { "bug": "Reports a crash or a broken feature", "billing": "Payment, refund or license problem", "other": "None of the above" }
    },
    "urgency": {
      "type": "score",
      "instructions": "How soon must someone act?",
      "criteria": ["can wait", "this week", "today", "now"]
    },
    "needs_reply": {
      "type": "noul",
      "instructions": "The sender expects a personal reply",
      "criteria": { "true": "Expects a decision or response", "false": "Pure notice, no response needed" }
    }
  }
}
```

Field rules, enforced before any request is sent: every question needs `type` (`choice`/`score`/`noul`) and non-empty `instructions`. `choice.criteria` is an object with ≥2 entries. `score.criteria` is an array of 2–10 labels, low to high. `noul.criteria` is optional, but if present must have both `true` and `false` — the API rejects one-sided criteria. A question may hold only `type`, `instructions` and `criteria`; any other key (for example `true`/`false` placed beside `instructions` instead of inside `criteria`) is an error, never silently dropped.

Lookup order for `jev run NAME` (first match wins): `<config dir>/specs/NAME.toml` or `.json` → the skill's own `specs/NAME.json`. `jev run /any/path.json` bypasses discovery. TOML needs Python ≥ 3.11 (`tomllib`); on older Python a same-named `.json` wins, and a TOML-only spec fails with a clear "needs 3.11+" error instead of a traceback. The five built-ins ship as JSON so they work on Python 3.9 out of the box: `mail`, `feedback`, `signal`, `commit`, `route` — see [SKILL.md](../SKILL.md) for what each judges.

## Limits

- `score` allows at most 10 levels (an API limit, checked client-side too).
- **TypeSafe native**: 64K token context per request, 32K for state + the longest question; over ~30K estimated tokens, jev prints a non-blocking warning to stderr. Rate limit about 1,200 requests/minute; keep `-j`/line-mode concurrency at 16 or below.
- **OpenRouter**: same practical size guidance; the endpoint is OpenRouter's **alpha**
  `https://openrouter.ai/api/alpha/decisions` and may change — override with `JEV_BASE_URL` if it does.
