---
name: codebase-index
description: Enforces structured directory indexing via INDEX.md, hierarchical navigation, and deterministic index maintenance across the codebase. Use when exploring codebases, locating functions or symbols without reading raw files, planning changes, adding, modifying, moving, or deleting files, auditing repository organization, or preventing token exhaustion during long agent sessions. Triggers on 'explore codebase', 'where is', 'find function', 'locate file', 'codebase map', 'save tokens', 'audit index', 'add file', 'remove file', 'codebase structure'.
license: MIT
metadata:
  version: "1.1.0"
  author: "Santiago Prada"
---

# Codebase Index & Hierarchical Navigation Guide

This skill establishes an **Index-First Architecture** for navigating, documenting, and maintaining codebases. By decoupling discovery from raw file reading, AI agents locate functionality in seconds while consuming up to **85%–90% fewer tokens** and eliminating hallucinated imports.

---

## 🎯 When to Use This Skill

Activate and follow this skill whenever you encounter any of the following scenarios:

| Scenario / Intent | What the Agent Must Do |
| :--- | :--- |
| **Exploration & Discovery** *(“Where is the auth logic?”, “How are bookings handled?”)* | Consult the nearest `INDEX.md` to pinpoint target files before opening raw code. Never run full-repo greps blindly. |
| **Adding New Files or Modules** *(“Create a payment service”, “Add a new route”)* | Scaffold or add the new file to the folder's `INDEX.md` manifest with its role, public exports, and dependencies. |
| **Deleting or Moving Files** *(“Remove legacy auth”, “Move utils to lib”)* | Immediately update or remove the file's entry in the corresponding `INDEX.md` to prevent ghost references. |
| **Modifying Public Contracts / APIs** *(“Add a parameter to login()”, “Export new helper”)* | Reconcile the `Public Exports / API` column in `INDEX.md` in the exact same task. |
| **Pre-Flight / Task Completion** *(“I'm done with the refactor”)* | Run `python3 scripts/index_manager.py audit` before concluding to verify zero drift. |
| **Preventing Token Exhaustion** *(Long agent sessions, rate-limit constraints)* | Use indices as high-density semantic caches instead of dumping thousands of source lines into context. |

---

## 🚫 When NOT to Use This Skill

- **Direct In-File Edits**: When the exact file and lines to modify are already identified and open in context.
- **Throwaway Scratch Scripts**: One-off scripts in temporary directories (`/tmp`, scratchpads) that are not part of the committed architecture.
- **Single-File Micro-Projects**: Trivial repositories with fewer than 5 total files where folder hierarchy does not exist.

---

## 1. Core Principles & Why This Matters

1. **Information Density over Blind Traversal**:
   Reading five 300-line source files costs ~6,000 tokens. Reading one well-maintained 40-line `INDEX.md` costs ~150 tokens and provides exact exports, patterns, and architectural responsibilities upfront.
2. **Deterministic Parity (Zero-Drift)**:
   An index that does not match disk reality is worse than no index. Any file addition, deletion, or public contract change **must be reconciled in the same task**.
3. **Bounded Context Granularity**:
   Indices exist at architectural boundaries (root, `src/`, major layers like `actions/`, `db/`, `lib/`, `pages/`, `docs/`, etc.) and any sub-folder containing 3 or more files or a distinct sub-domain. Leaf utility folders with 1–2 files are documented inside their parent index.

---

## 2. The Index-First Navigation Protocol

Whenever an agent or developer is tasked with implementing a feature, fixing a bug, or understanding the architecture:

```
[Start Task]
      │
      ▼
Consult Root / Module INDEX.md
      │
      ▼
Locate target file, role, & public exports in manifest table
      │
      ├───────────────────────┬────────────────────────┐
      ▼                       ▼                        ▼
Target is directly      Target is in a           Target does not exist
in this directory       sub-module folder        (New feature needed)
      │                       │                        │
      ▼                       ▼                        ▼
Read ONLY that file     Traverse to Child        Proceed to create file
(surgical view_file)    INDEX.md                 & register in INDEX.md
```

### Prohibited Behaviors:
- **DO NOT** execute open-ended, deep recursive scans or grep the entire repo when an `INDEX.md` exists for that layer.
- **DO NOT** view multiple large source files sequentially just to "see what is inside" — read the directory's `INDEX.md` first.

---

## 3. How to Create & Document an Index

### Automated Scaffolding (Recommended)
Use the bundled Python tool to automatically inspect the directory, identify files, and preserve existing documentation:

```bash
python3 scripts/index_manager.py scaffold <path-to-directory>
```

### Canonical Schema
Every `INDEX.md` must follow this structure (see [references/schema.md](./references/schema.md) for full details):

```markdown
# Index: `<directory>`

**Responsibility**: <Directory purpose and domain boundary>
**Architectural Layer**: <Domain | Application | Infrastructure | Presentation | Shared>

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`submodule/`](./submodule/) | Purpose of sub-module | [INDEX.md](./submodule/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`service.ts`](./service.ts) | Use Case / Orchestrator | `createOrder()`, `cancelOrder()` | `drizzle-orm`, `zod` |

## Invariants & Directory Rules

- <Coupling rules, layer constraints, or security obligations>

<!-- Reconciled by codebase-index -->
```

---

## 4. Maintenance & Definition of Done

Maintenance is mandatory. Every agent modifying the repository must follow this reconciliation cycle:

### Trigger Conditions:
1. **File Created**:
   - Add the new file to the manifest table in the folder's `INDEX.md`.
   - Document its role, exports, and dependencies.
2. **File Deleted or Moved**:
   - Remove or update the corresponding entry in `INDEX.md`.
3. **Public API Modified**:
   - Update the `Public Exports / API` column in `INDEX.md`.
4. **New Subdirectory Added**:
   - Add a row in `Subdirectories & Child Modules` linking to its `INDEX.md`.

### Verification Step (Pre-Flight):
Before concluding your task, execute the audit command:

```bash
python3 scripts/index_manager.py audit
```

- If exit code is `0` (✅), the repository is consistent.
- If exit code is `1` (❌), fix the reported missing indices, unindexed files, or orphan entries before finishing.

---

## 5. Tooling Reference: `index_manager.py`

| Command | Usage | Description |
| :--- | :--- | :--- |
| `audit` | `python3 scripts/index_manager.py audit` | Audits the repo for missing indices, unindexed files, or orphan entries. |
| `scaffold <dir>` | `python3 scripts/index_manager.py scaffold src/services` | Scaffolds or updates `INDEX.md` in `<dir>` preserving existing docs. |
| `sync-all` | `python3 scripts/index_manager.py sync-all` | Re-syncs file manifests across all existing indices in the repo. |
| `tree` | `python3 scripts/index_manager.py tree` | Displays the architectural index map of the project. |
