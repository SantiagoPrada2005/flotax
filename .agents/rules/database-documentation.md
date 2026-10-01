# Rule: Database Documentation Synchronization

## Mandatory Synchronization Standard

Whenever any database schema, table, column, relation, or type in [`src/lib/db/schema/`](file:///Users/santiago/proyectos/phoenix/src/lib/db/schema/) is created, updated, or removed:

1. **Mandatory Documentation Update**:
   - You MUST immediately update [`docs/database.md`](file:///Users/santiago/proyectos/phoenix/docs/database.md) and [`docs/database.html`](file:///Users/santiago/proyectos/phoenix/docs/database.html) in the same task/commit.
   - Never leave documentation desynchronized from the actual Drizzle schema definitions.

2. **Required Updates**:
   - **Mermaid Class Diagram**:
     - Keep the `classDiagram` in both `docs/database.md` and `docs/database.html` updated with all table entities, primary keys (`PK`), foreign keys (`FK`), unique keys (`UK`), attributes, and relationship cardinalities (`"1" o-- "0..*"`, etc.).
   - **Entity & Module Descriptions**:
     - Keep Section 2 ("Schema Modules & Entities") updated with explanations of each table's functional purpose, column constraints, enums, and domain logic.
   - **File Links**:
     - Maintain accurate markdown links to the specific schema files under `src/lib/db/schema/`.

3. **Validation**:
   - Verify that all newly introduced field types, enums, and relation directions in Drizzle schemas correspond exactly to the Mermaid diagram syntax.
