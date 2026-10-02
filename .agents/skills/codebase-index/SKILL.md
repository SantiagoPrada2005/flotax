---
name: codebase-index
description: Enforces structured directory indexing via INDEX.md, hierarchical navigation, and deterministic index maintenance across the codebase. ALWAYS activate and follow this skill when exploring the project, searching for existing features or symbols, planning architectural changes, adding, modifying, moving, or deleting files, or auditing project organization. Guarantees token-efficient navigation and zero-drift documentation.
license: MIT
metadata:
  version: "1.0.0"
  author: "Movix Architecture Team"
---

# Codebase Index & Hierarchical Navigation Guide

This skill establishes a strict **Index-First Architecture** for navigating, documenting, and maintaining the codebase. By decoupling discovery from raw file reading, agents locate functionality in seconds while consuming up to **90% fewer tokens** and eliminating hallucinated imports.

---

## 1. Core Principles & Why This Matters

1. **Information Density over File Traversal**:
   Reading five 300-line source files costs ~6,000 tokens. Reading one well-maintained 40-line `INDEX.md` costs ~150 tokens and provides exact exports, patterns, and architectural responsibilities upfront.
2. **Deterministic Parity (Zero-Drift)**:
   An index that does not match disk reality is worse than no index. Any file addition, deletion, or public contract change **must be reconciled in the same task**.
3. **Bounded Context Granularity**:
   Indices exist at architectural boundaries (root, `src/`, major layers like `actions/`, `db/`, `lib/`, `pages/`, `docs/`, etc.) and any sub-folder containing 3 or more files or a distinct sub-domain. Leaf utility folders with 1–2 files are documented inside their parent index.

---

## 2. The Index-First Navigation Protocol

Whenever you are asked to implement a feature, fix a bug, or understand how something works:

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
python3 .agents/skills/codebase-index/scripts/index_manager.py scaffold <path-to-directory>
```

### Canonical Schema
Every `INDEX.md` must follow this structure (see [schema.md](./references/schema.md) for full details):

```markdown
# Índice: `<directorio>`

**Responsabilidad**: <Propósito del directorio y frontera de dominio>
**Capa Arquitectónica**: <Domain | Application | Infrastructure | Presentation | Shared>

## Subdirectorios y Módulos Hijos

| Subdirectorio | Responsabilidad | Índice |
| :--- | :--- | :--- |
| [`submodulo/`](./submodulo/) | Propósito del submódulo | [INDEX.md](./submodulo/INDEX.md) |

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`servicio.ts`](./servicio.ts) | Caso de uso / Orquestador | `crearReserva()`, `cancelarReserva()` | `drizzle-orm`, `zod` |

## Invariantes y Reglas del Directorio

- <Reglas de acoplamiento, límites de capa o convenciones obligatorias>

<!-- Reconciled by codebase-index -->
```

### Documentation Standards:
- **Rol / Patrón**: Must state the architectural pattern (e.g., `Server Action`, `Drizzle Schema`, `Astro Layout`, `Pure Function`, `Factory`).
- **Exports Públicos**: Explicitly name functions, classes, or types consumed by other modules. Do not detail private helpers.
- **Dependencias Clave**: Significant third-party packages or internal layer couplings.

---

## 4. Maintenance & Definition of Done

Maintenance is not optional. Every agent modifying the repository must follow this reconciliation cycle:

### Trigger Conditions:
1. **File Created**:
   - Add the new file to the manifest table in the folder's `INDEX.md`.
   - Document its role, exports, and dependencies.
2. **File Deleted or Moved**:
   - Remove or update the corresponding entry in `INDEX.md`.
3. **Public API Modified**:
   - Update the `Exports Públicos / API` column in `INDEX.md`.
4. **New Subdirectory Added**:
   - Add row in `Subdirectorios y Módulos Hijos` linking to its `INDEX.md`.

### Verification Step (Pre-Flight):
Before concluding your task, execute the audit command:

```bash
python3 .agents/skills/codebase-index/scripts/index_manager.py audit
```

- If exit code is `0` (✅), the repository is consistent.
- If exit code is `1` (❌), fix the reported missing indices, unindexed files, or orphan entries before finishing.

---

## 5. Tooling Reference: `index_manager.py`

The script located at `.agents/skills/codebase-index/scripts/index_manager.py` provides:

| Command | Usage | Description |
| :--- | :--- | :--- |
| `audit` | `python3 .../index_manager.py audit` | Audits the repo for missing indices, unindexed files, or orphan entries. |
| `scaffold <dir>` | `python3 .../index_manager.py scaffold src/db` | Scaffolds or updates `INDEX.md` in `<dir>` preserving existing docs. |
| `sync-all` | `python3 .../index_manager.py sync-all` | Re-syncs file manifests across all existing indices in the repo. |
| `tree` | `python3 .../index_manager.py tree` | Displays the architectural index map of the project. |
