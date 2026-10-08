# Rule: Schema-First Typing & Zero Redundant Interfaces (Drizzle Single Source of Truth)

## 1. Core Principle: The Database Schema is the Canonical Domain Type

In FlotaX, data models are defined using **Drizzle ORM** in `src/db/schema/*.ts`.
All agents, developers, and code generators MUST treat Drizzle schemas as the **Single Source of Truth** for domain entities across the entire application stack.

```
Canonical Source of Truth:
[ Drizzle Schema (`src/db/schema/*.ts`) ]
         │
         ├───> Exported Select & Insert Types (`VehiculoSelect`, `ReservaSelect`, etc.)
         │
         ├───> Repositories & Domain Services
         │
         └───> UI Components Props (Tier 1 & Tier 2)
```

---

## 2. Strict Prohibitions

1. **PROHIBITED Ad-Hoc Interfaces**:
   - Never invent arbitrary component interfaces (e.g. `interface TodayTask`, `interface GoalItem`, `interface DashboardTask`) for data that represents an entity from the database.
   - Prohibited creating parallel type definitions that map 1:1 to a database record with slight naming variations.
2. **PROHIBITED Artificial Parsing & Field Mapping**:
   - Do not create adapter layers or helper functions whose only purpose is mapping database fields (`isFrogA1`) to made-up UI names (`isFrog`) unless there is a genuine mathematical or domain transformation.
   - Props must accept the schema field names directly (`isFrogA1`, `priority`, `date`, `status`).
3. **PROHIBITED Mock Types in Production Code**:
   - Development fixtures and fallbacks MUST satisfy the exact Drizzle `*Select` type.
   - No mock-specific interfaces in domain modules.

---

## 3. Mandatory Component Props Patterns

### Pattern A: Direct Schema Entity
When a component displays or acts on an entire record:
```astro
---
import type { TaskSelect } from '../../../lib/db/schema/index.js';

interface Props {
  task: TaskSelect;
  class?: string;
}

const { task, class: className } = Astro.props;
---
```

### Pattern B: Projections (Pick / Omit)
When a component strictly needs a subset of fields, use TypeScript's standard utility types directly on the Drizzle type:
```astro
---
import type { TaskSelect } from '../../../lib/db/schema/index.js';

interface Props {
  task: Pick<TaskSelect, 'id' | 'title' | 'priority' | 'isFrogA1' | 'status'>;
  class?: string;
}
---
```

### Pattern C: Composed Relations
When a component receives a record joined with relations:
```astro
---
import type { TaskSelect, NightPlanSelect } from '../../../lib/db/schema/index.js';

export interface NightPlanWithTasks extends NightPlanSelect {
  tasks: TaskSelect[];
}

interface Props {
  plan: NightPlanWithTasks;
}
---
```

---

## 4. Verification Checklist Before Approving Frontend PRs

1. [ ] Are all domain component props typed using `*Select` / `*Insert` from `src/lib/db/schema/` or `Pick<*Select, ...>`?
2. [ ] Are there zero custom entity interfaces defined inside `.astro` files?
3. [ ] Does `pnpm check` pass with zero type errors without requiring type assertions (`as unknown as ...`)?
