# Index: `/`

**Responsibility**: Root of the codebase-index open-source skill, schema specification, and CLI toolsuite for index-first AI agent navigation.
**Architectural Layer**: Root / Tooling

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`references/`](./references/) | Canonical schema specifications and documentation contracts | [INDEX.md](./references/INDEX.md) |
| [`scripts/`](./scripts/) | Pure Python CLI tools (`index_manager.py`) for auditing and scaffolding | [INDEX.md](./scripts/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`LICENSE`](./LICENSE) | Open Source License | MIT License terms | - |
| [`README.md`](./README.md) | Project Documentation | Installation guide, ROI, CLI usage, CI integration | - |
| [`SKILL.md`](./SKILL.md) | Agent Skill Definition | Core protocol, instructions, and prompt trigger metadata | - |

## Invariants & Directory Rules

- Any new scripts, reference docs, or files added to this repository must be registered in this index.
- Keep the repository self-auditing via `python3 scripts/index_manager.py audit`.

<!-- Reconciled by codebase-index -->
