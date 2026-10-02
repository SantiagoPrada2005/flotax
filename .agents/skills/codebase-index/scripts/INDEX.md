# Index: `scripts`

**Responsabilidad**: CLI tools in pure Python for deterministic repository indexing, auditing, and scaffolding.
**Architectural Layer**: Tooling / CLI

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index_manager.py`](./index_manager.py) | CLI Tool / Core Engine | `audit`, `scaffold`, `sync-all`, `tree` commands | Python standard library (`pathlib`, `argparse`, `re`) |

## Invariants & Directory Rules

- All scripts must remain zero-dependency (rely solely on Python 3 standard library).

<!-- Reconciled by codebase-index -->
