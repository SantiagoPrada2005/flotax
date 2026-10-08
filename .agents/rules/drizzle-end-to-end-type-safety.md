# Rule: Drizzle ORM End-to-End Type Safety Governance (Zero-Assertion Policy)

**Código:** RUL-FLX-019  
**Proyecto:** FlotaX — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Referencia Oficial:** [Drizzle ORM Documentation (https://orm.drizzle.team)](https://orm.drizzle.team)  
**Directorio Fuente de Verdad:** [`src/db/schema/`](file:///Users/santiago/proyectos/movix/src/db/schema/), [`src/actions/`](file:///Users/santiago/proyectos/movix/src/actions/), [`src/components/`](file:///Users/santiago/proyectos/movix/src/components/)  
**Ámbito:** Todas las operaciones de base de datos, consultas relacionales, Astro Actions, servicios de dominio y contratos de componentes UI.

---

## 1. Principio Fundamental: Continuidad del Tipado de Extremo a Extremo (E2E)

En FlotaX, **el tipado estricto debe fluir de forma ininterrumpida** desde la definición de las columnas de base de datos en Cloudflare D1 hasta la renderización en las plantillas Astro y las islas reactivas React 19.

Drizzle ORM está diseñado para que **TypeScript infiera automáticamente todos los tipos a partir del esquema y las consultas**. No se debe romper jamás esta cadena de inferencia mediante interfaces manuales paralelas, adaptadores redundantes o aserciones de tipo (`as`).

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CADENA DE TIPADO CONTINUO E2E                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Esquema Drizzle (`src/db/schema/*.ts`)                                  │
│     └── sqliteTable, sqlite-core primitives, .notNull(), constraints        │
│                                                                             │
│  2. Tipos de Dominio Inferidos                                              │
│     └── $inferSelect / $inferInsert (Single Source of Truth)                 │
│                                                                             │
│  3. Consultas Tipadas (Drizzle Queries API / Query Builders)                │
│     └── db.query.* / db.select() con proyección exacta y relaciones 1:N    │
│                                                                             │
│  4. Frontera de Servidor (Astro Actions & Endpoints)                        │
│     └── Validación Zod 4 compatible con $inferInsert + retornos inferidos   │
│                                                                             │
│  5. Capa de Presentación (Astro Templates & Islas React 19)                 │
│     └── Props tipadas directamente con *Select o Pick<*Select, ...>         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inferencia Canónica de Modelos desde el Esquema

### 2.1 Exportación Obligatoria de Tipos Inferidos
Toda tabla definida con `sqliteTable` en [`src/db/schema/`](file:///Users/santiago/proyectos/movix/src/db/schema/) debe exportar obligatoriamente sus tipos inferidos de selección e inserción:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const vehiculos = sqliteTable('vehiculos', {
  id: text('id').primaryKey(),
  placa: text('placa').notNull().unique(),
  modelo: text('modelo').notNull(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});

// ✅ CANÓNICO: Tipos derivados automáticamente mediante Drizzle
export type VehiculoSelect = typeof vehiculos.$inferSelect;
export type VehiculoInsert = typeof vehiculos.$inferInsert;
```

### 2.2 Tipado Especializado en Columnas SQLite
Aprovechar las capacidades nativas de Drizzle para columnas de tipado enriquecido:
- **Booleanos**: `integer('activo', { mode: 'boolean' })`.
- **Fechas / Marcas de Tiempo**: `integer('fecha', { mode: 'timestamp' })` (produce instancias `Date` nativas).
- **Enums Estrictos**: `text('estado', { enum: ['disponible', 'alquilado', 'taller', 'baja'] }).notNull()`.
- **Metadatos JSON**: Utilizar el modificador tipado `$type<T>()` de Drizzle:
  ```typescript
  export interface ChecklistSalida {
    kilometraje: number;
    nivelCombustible: number;
    lucesOperativas: boolean;
  }

  export const inspecciones = sqliteTable('inspecciones', {
    // ...
    datosChecklist: text('datos_checklist', { mode: 'json' })
      .$type<ChecklistSalida>()
      .notNull(),
  });
  ```

---

## 3. Consultas Relacionales Tipadas (Drizzle Queries API)

### 3.1 Preferencia por `db.query.*` para Jerarquías Complejas
Para consultas que incluyan relaciones padre-hijo (ej. un contrato con su cliente, vehículo e inspecciones asociadas), utilizar la **Relational Queries API** de Drizzle configurada con el esquema centralizado:

```typescript
// ✅ CANÓNICO: Drizzle infiere automáticamente la estructura anidada exacta
const contratoConDetalle = await db.query.contratosAlquiler.findFirst({
  where: eq(contratosAlquiler.id, contratoId),
  with: {
    cliente: true,
    vehiculo: true,
    inspecciones: {
      orderBy: (inspecciones, { desc }) => [desc(inspecciones.creadoEn)],
    },
  },
});
```

### 3.2 Inferencia de Tipos para Resultados Relacionales
Cuando una función de repositorio o servicio devuelve el resultado de una consulta relacional, inferir su tipo directamente sin redactar interfaces duplicadas:

```typescript
// ✅ CANÓNICO: Extraer el tipo usando ReturnType y Awaited
export type ContratoConRelaciones = NonNullable<
  Awaited<ReturnType<typeof obtenerContratoPorId>>
>;

export async function obtenerContratoPorId(db: DrizzleD1Database, id: string) {
  return await db.query.contratosAlquiler.findFirst({
    where: eq(contratosAlquiler.id, id),
    with: { cliente: true, vehiculo: true },
  });
}
```

---

## 4. Proyecciones Parciales con `db.select()`

Al proyectar únicamente campos específicos, permitir que Drizzle construya el tipo anónimo exacto:

```typescript
// ✅ CANÓNICO: Drizzle infiere { id: string; placa: string }[]
const resumenFlota = await db
  .select({
    id: vehiculos.id,
    placa: vehiculos.placa,
  })
  .from(vehiculos)
  .where(eq(vehiculos.activo, true));
```

---

## 5. Prohibiciones Absolutas (Anti-Patrones de Tipado)

1. ❌ **PROHIBIDO el Uso de Aserciones de Tipo (`as`, `as unknown as`, `as any`)**:
   - Forzar el tipo de una consulta o resultado con `as` es una violación crítica que enmascara errores de esquema y rompe la seguridad en tiempo de compilación.
2. ❌ **PROHIBIDO Crear Interfaces de Entidad Duplicadas**:
   - Prohibido escribir `interface Vehiculo { id: string; placa: string; ... }` manualmente. Debe consumirse `VehiculoSelect` o `Pick<VehiculoSelect, ...>`.
3. ❌ **PROHIBIDO Consultas SQL Crudas sin Tipado**:
   - Prohibido ejecutar `db.run(sql`...`)` o strings SQL crudos cuando Drizzle Query Builder provee la operación tipada equivalente. Si se requiere `sql` para una función SQLite nativa (ej. agregación), debe usarse el genérico explícito: `sql<number>\`count(*)\``.
4. ❌ **PROHIBIDO Payloads de Inserción/Actualización no Alineados**:
   - Los datos pasados a `.insert()` o `.update().set()` deben coincidir estrictamente con `$inferInsert` o `Partial<VehiculoInsert>`.
5. ❌ **PROHIBIDO Ignorar la Verificación de Nulabilidad**:
   - En TypeScript estricto (`noUncheckedIndexedAccess: true`), las consultas `findFirst()` pueden devolver `undefined`. Debe realizarse comprobación de existencia antes de acceder a las propiedades.

---

## 6. Integración con Astro Actions y Componentes UI

### 6.1 En Astro Actions (`src/actions/`)
Validar la entrada con Zod 4 garantizando compatibilidad con el esquema Drizzle, y retornar registros tipados:

```typescript
import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { db } from '@/lib/db';
import { localesAlquiler } from '@/db/schema';

export const crearLocal = defineAction({
  input: z.object({
    nombre: z.string().min(1, { error: 'El nombre es obligatorio' }),
    slug: z.string().min(1, { error: 'El slug es obligatorio' }),
    ciudad: z.string().optional(),
  }),
  handler: async (input, context) => {
    // Inserción estrictamente tipada con retorno automático
    const [nuevoLocal] = await db
      .insert(localesAlquiler)
      .values({
        id: crypto.randomUUID(),
        nombre: input.nombre,
        slug: input.slug,
        ciudad: input.ciudad,
        duenoId: context.locals.user.id,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      })
      .returning();

    // `nuevoLocal` es de tipo `LocalAlquilerSelect` sin necesidad de casts
    return { ok: true, local: nuevoLocal };
  },
});
```

### 6.2 En Componentes e Islas React 19 (`src/components/`)
Las props de los componentes consumen exclusivamente los tipos derivados de Drizzle:

```tsx
// ✅ CANÓNICO: Isla React 19 tipada con Drizzle
import type { LocalAlquilerSelect } from '@/db/schema';

interface LocalCardProps {
  local: LocalAlquilerSelect;
  onSeleccionar?: (id: string) => void;
}

export function LocalCard({ local, onSeleccionar }: LocalCardProps) {
  return (
    <div className="bg-[#1F2937] border border-[#4B5563] p-4 rounded-xl">
      <h3 className="text-[#EDEDED] font-semibold">{local.nombre}</h3>
      <p className="text-[#9CA3AF] text-sm">{local.ciudad ?? 'Sin ubicación'}</p>
    </div>
  );
}
```

---

## 7. Criterios de Aceptación y Verificación

Antes de aprobar cualquier cambio que involucre persistencia o consumo de datos:

1. **Compilación Limpia**:
   ```bash
   pnpm check
   ```
   Debe arrojar `0 errors, 0 warnings, 0 hints`.
2. **Cero `any` o Aserciones**:
   Verificar que no existan palabras clave `any` ni `as unknown as` en los archivos modificados.
3. **Sincronización Documental**:
   Si se modificó alguna columna o relación en el esquema, verificar que [`docs/database.md`](file:///Users/santiago/proyectos/movix/docs/database.md) refleje exactamente los mismos campos y tipos.
