# Rule: Drizzle ORM with Cloudflare D1

## Mandatory Database Standard

- **Exclusively use Drizzle ORM (`drizzle-orm`)** as the data-access layer and ORM for **Cloudflare D1**.
- **No Alternative ORMs**: Do NOT introduce Prisma, Kysely, TypeORM, or un-typed SQLite drivers.
- **Client Implementation**:
  - Always use `drizzle(env.DB, { schema })` imported from `drizzle-orm/d1`.
  - Pass the typed D1 binding (`env.DB`) from the Cloudflare runtime context.
- **Schema Architecture**:
  - Define all tables and relations using SQLite schema primitives from `drizzle-orm/sqlite-core` (`sqliteTable`, `text`, `integer`, etc.).
  - Centralize schema exports in `src/lib/db/schema/` and re-export from `src/lib/db/schema/index.ts`.
- **Migrations & Tooling**:
  - Use `drizzle-kit` for schema diffing and SQL migration generation.
  - Configuration lives in `drizzle.config.ts` targeting dialect `sqlite`.
  - Migrations are applied to Cloudflare D1 via `wrangler d1 migrations apply <DB_NAME>`.
- **Type Safety**:
  - Always derive TypeScript models using `$inferSelect` and `$inferInsert`.
- **Documentation Synchronization**:
  - Whenever modifying schema files in `src/db/schema/`, you MUST update [`docs/database.md`](file:///Users/santiago/proyectos/movix/docs/database.md) (refer to [`.agents/rules/database-documentation.md`](file:///Users/santiago/proyectos/movix/.agents/rules/database-documentation.md)).
