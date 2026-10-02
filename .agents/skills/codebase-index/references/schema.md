# `INDEX.md` Canonical Schema Specification

This document defines the formal schema and structural contract required for all `INDEX.md` files managed by `codebase-index`.

---

## 1. Canonical Markdown Template

Every directory index must adhere strictly to the following sections:

```markdown
# Index: `<relative-path>`

**Responsibility**: <1-2 sentences stating the core domain purpose and architectural boundaries>
**Architectural Layer**: <Domain | Application | Infrastructure | Presentation | Shared>

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`child/`](./child/) | Purpose of child sub-module | [INDEX.md](./child/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`service.ts`](./service.ts) | <Architectural pattern> | <Public functions, types, classes> | <Couplings/libraries> |

## Invariants & Directory Rules

- <Architectural constraint or boundary restriction>
- <Security, state, or framework invariant>

<!-- Reconciled by codebase-index -->
```

---

## 2. Field Definitions

### Header
- **Relative Path**: Path from project root (e.g., `src/services/` or `/` for root).
- **Responsibility**: Semantic purpose within the system, not a generic file listing (e.g., *"Handles user authentication, JWT session verification, and OAuth providers"*).
- **Architectural Layer**:
  - `Domain` (Core business entities, pure business rules)
  - `Application` (Use cases, server actions, orchestrators)
  - `Infrastructure` (Database schemas, external API clients, workers)
  - `Presentation` (UI components, pages, design layouts)
  - `Shared` (Cross-cutting pure utilities, shared types)

### File Manifest
- **File**: Relative markdown link to the file (`[`filename.ts`](./filename.ts)`).
- **Role / Pattern**: Pattern identifier (e.g., `Server Action`, `Drizzle Schema`, `Factory`, `React Island`, `Pure Utility`).
- **Public Exports / API**: Concise list of externally consumed symbols (`createUser()`, `SessionToken`, `authMiddleware`). Never dump private internal functions or implementation code.
- **Key Dependencies**: Crucial third-party libraries or internal module couplings (`drizzle-orm`, `zod`, `@cloudflare/workers`).

### Invariants & Rules
Enforceable architectural boundaries. Examples:
- *"Client components must never directly import database clients."*
- *"All mutations must be validated with Zod schemas."*

---

## 3. High Information Density & Brevity Rules

- Indices must remain compact (typically 20 to 70 lines).
- Never paste source code or function bodies into an `INDEX.md`.
- The sole purpose of the index is to allow an AI agent or engineer to immediately understand **what each file does and what its contract is without opening the file**.
