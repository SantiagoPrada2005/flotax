# Rule: Package Manager & Engine Constraints

## 1. Mandatory Package Manager: pnpm

- **Exclusively use `pnpm`** for all package management, dependency installation, workspace scripts, and CLI executions in this project.
- **NEVER** use `npm`, `npx`, `yarn`, or `bun` to install dependencies, run scripts, or execute tools.
- Command mapping:
  - Install dependencies: `pnpm install`
  - Add dependency: `pnpm add <pkg>`
  - Add dev dependency: `pnpm add -D <pkg>`
  - Run script: `pnpm run <script>` (or `pnpm <script>`)
  - Execute binary: `pnpm dlx <pkg>` or `pnpm exec <cmd>`
- Maintain `pnpm-lock.yaml` as the single source of truth for dependencies.
- Node.js version target: `>=20.0.0` (active LTS / current environment: Node v24.x).

## 2. Mandatory End-to-End Type Safety with Drizzle ORM

- **Obligatory End-to-End Typing**: Every database interaction, query result, repository method, and domain mapper must be strictly typed using Drizzle ORM schemas.
- **No `any` or Untyped Data**: Untyped queries, loose casts, or ignoring Drizzle inference is strictly prohibited.
- **Derivation from Schema**:
  - Always derive types using `$inferSelect` and `$inferInsert` directly from the table definitions.
  - Domain entities and data transfer objects (DTOs) must maintain type congruence with these schema types.
- **Strict Query Builders & Relations**:
  - Use Drizzle's relational query API (`db.query.*`) to ensure relations and nested records remain 100% type-checked at compile time.

## 3. Super Strict TypeScript & Astro Mode (Zero `any` Policy)

- **Super Strict Mode**: TypeScript and Astro must always run with `astro/tsconfigs/strictest`, `strict: true`, `noImplicitAny: true`, and `noUncheckedIndexedAccess: true`.
- **Zero `any` Policy**: The `any` keyword is strictly prohibited across all source code, definitions, interfaces, function signatures, generics, and return types.
- **Safe Handling of Dynamic Data**:
  - Use `unknown` with narrow type guards or runtime validation for external payloads.
  - Guard all array/record indexing against `undefined` due to `noUncheckedIndexedAccess`.
  - With `exactOptionalPropertyTypes`, optional properties that may be explicitly assigned `undefined` must declare `T | undefined`.
- **Compile Verification**:
  - All code must pass `pnpm check` (`astro check`) with 0 errors, 0 warnings, and 0 hints before any commit or task completion.
