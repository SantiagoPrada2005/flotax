# Gestión de Disponibilidad y Mantenimiento de Flota Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el sistema operativo de disponibilidad y mantenimiento de vehículos en el panel de administración de FlotaX mediante una página dedicada `/admin/flota/[id]/disponibilidad` con flujo paso a paso Typeform, calendario editorial reutilizado conectado a Cloudflare D1 y supresión del selector rápido de estados huérfanos en el inventario.

**Architecture:** Capa de datos en `src/lib/mantenimientos/repositorio.ts` sobre SQLite D1 (`mantenimientos_vehiculo` y `reservas`); cálculo de disponibilidad real en `src/lib/flota/disponibilidad.ts` con precarga SSR de 120 días; Astro Actions tipadas con Zod 4 y RBAC de local; orquestador delgado Astro (`<150 LOC`) y componentes de dominio Tier 2 en React 19 (`src/components/flota/disponibilidad/`) con transiciones suaves `framer-motion`.

**Tech Stack:** Astro 7+ (`@astrojs/cloudflare`), React 19, Cloudflare D1 + Drizzle ORM, Zod v4, Tailwind CSS v4, Framer Motion, Better Auth.

---

### File Structure Map

```text
src/
├── lib/
│   ├── mantenimientos/
│   │   ├── repositorio.ts       # Consultas y mutaciones D1 para mantenimientos y máquina de estados
│   │   └── types.ts             # Tipos inferidos Drizzle e interfaces de órdenes técnicas
│   └── flota/
│       └── disponibilidad.ts    # Extensión para consultar bloques reales de D1 (sin mocks)
├── actions/
│   └── mantenimientos.ts        # Astro Actions tipadas con Zod 4 para crear y cambiar estado de órdenes
├── components/
│   └── flota/
│       ├── FleetInventoryManager.tsx              # Eliminación del select plano y enlace a Disponibilidad
│       └── disponibilidad/
│           ├── AvailabilityHeader.tsx             # Placa, odómetro, chip de estado y botón volver
│           ├── AvailabilityOverviewView.tsx       # Calendario editorial reutilizado + órdenes activas
│           ├── MaintenanceWizardFlow.tsx          # Flujo Typeform de 5 pasos a pantalla completa
│           ├── CompleteMaintenanceModal.tsx       # Cierre de taller con odómetro y costo real
│           └── VehicleAvailabilityIsland.tsx      # Isla principal React 19 coordinadora
└── pages/
    └── admin/
        └── flota/
            └── [id]/
                └── disponibilidad.astro           # Orquestador Astro SSR delgado (<150 LOC)
```

---

### Task 1: Capa de Datos y Repositorio de Mantenimientos

**Files:**
- Create: `src/lib/mantenimientos/types.ts`
- Create: `src/lib/mantenimientos/repositorio.ts`
- Modify: `src/lib/INDEX.md`

- [ ] **Step 1: Crear archivo de tipos de mantenimiento**

Crear `src/lib/mantenimientos/types.ts` derivando tipos desde el schema Drizzle:

```typescript
import type { MantenimientoVehiculoSelect, MantenimientoVehiculoInsert } from '@/db/schema';
import type { TipoMantenimientoVehiculo, EstadoMantenimientoVehiculo } from '@/db/schema';

export type {
  MantenimientoVehiculoSelect,
  MantenimientoVehiculoInsert,
  TipoMantenimientoVehiculo,
  EstadoMantenimientoVehiculo,
};

export interface CrearMantenimientoParams {
  vehiculoId: string;
  localId: string;
  creadoPorId: string;
  tipo: TipoMantenimientoVehiculo;
  etiqueta: string;
  descripcion?: string | undefined;
  tallerProveedor?: string | undefined;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  kilometrajeRegistro?: number | undefined;
  costoTotal?: number | undefined;
}

export interface ActualizarEstadoMantenimientoParams {
  id: string;
  localId: string;
  nuevoEstado: EstadoMantenimientoVehiculo;
  kilometrajeFinal?: number | undefined;
  costoFinal?: number | undefined;
  hoyISO?: string | undefined;
}

export interface AdvertenciaReservaSolapada {
  id: string;
  codigo: string;
  clienteNombre: string;
  fechaInicio: string;
  fechaFin: string;
}
```

- [ ] **Step 2: Crear el repositorio de base de datos**

Crear `src/lib/mantenimientos/repositorio.ts`:
- Implementar `listarMantenimientosPorVehiculo(db, vehiculoId)` ordenando por `fechaInicio DESC`.
- Implementar `detectarReservasSolapadas(db, vehiculoId, fechaInicio, fechaFin)`.
- Implementar `crearOrdenMantenimiento(db, params)`. Si `fechaInicio <= hoy <= fechaFin` y la orden queda activa, transicionar `vehiculos.estado = 'MANTENIMIENTO'`.
- Implementar `resolverEstadoActualVehiculo(db, vehiculoId, hoyISO)` evaluando estado `FUERA_SERVICIO`, reservas vigentes y mantenimientos `EN_TALLER`.
- Implementar `actualizarEstadoOrdenMantenimiento(db, params)` que aplica la transición de la orden y ejecuta `resolverEstadoActualVehiculo`.

- [ ] **Step 3: Verificar compilación TypeScript**

Run: `pnpm check`
Expected: 0 errors en los nuevos archivos de `src/lib/mantenimientos/`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mantenimientos/
git commit -m "feat(mantenimiento): agregar tipos y repositorio D1 de ordenes tecnicas"
```

---

### Task 2: Integración Real de Disponibilidad en D1 (Erradicación de Mocks)

**Files:**
- Modify: `src/lib/flota/disponibilidad.ts:97-150`
- Modify: `src/lib/flota/disponibilidad.ts:161-235`

- [ ] **Step 1: Extender `obtenerBloquesNoDisponibles` y `construirCalendarioMes`**

En `src/lib/flota/disponibilidad.ts`:
- Crear la función asíncrona `obtenerBloquesNoDisponiblesD1(db: DrizzleD1Database, vehiculoId: string, hoyISO: string, horizonteDias: number = 120): Promise<BloqueNoDisponible[]>`.
- Debe consultar las reservas del vehículo en D1 con estados (`CONFIRMADA`, `PENDIENTE_PAGO`, `EN_CURSO`) y los mantenimientos con estados (`PROGRAMADO`, `EN_TALLER`).
- Mapear cada registro al tipo `BloqueNoDisponible`:
  - Reservas: `motivo = 'RESERVADO'`, `etiqueta = 'Reserva confirmada en patio'`.
  - Mantenimientos: `motivo = 'MANTENIMIENTO'`, `etiqueta = mantenimiento.etiqueta`.
- Modificar `construirCalendarioMes` para aceptar un parámetro opcional `bloquesPrecalculados?: BloqueNoDisponible[]`. Si se proveen, se utilizan directamente; si no se proveen, recurre a `obtenerBloquesNoDisponibles(vehiculoId, hoyISO)` para retrocompatibilidad síncrona.

- [ ] **Step 2: Verificar compilación con `pnpm check`**

Run: `pnpm check`
Expected: 0 errors en `src/lib/flota/disponibilidad.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/flota/disponibilidad.ts
git commit -m "feat(disponibilidad): conectar consulta de bloques reales desde D1"
```

---

### Task 3: Astro Actions para Mantenimiento de Flota

**Files:**
- Create: `src/actions/mantenimientos.ts`
- Modify: `src/actions/index.ts`

- [ ] **Step 1: Crear las Astro Actions en `src/actions/mantenimientos.ts`**

Implementar usando Zod 4 estricto y RBAC con `requireLocalAuth(context, PERMISOS.FLOTA_ACTUALIZAR)`:
- `crearMantenimiento`:
  - Input: `vehiculoId` (string), `tipo` (enum `tiposMantenimientoVehiculo`), `etiqueta` (string min 1), `descripcion` (string opcional), `tallerProveedor` (string opcional), `fechaInicio` (string regex YYYY-MM-DD), `fechaFin` (string regex YYYY-MM-DD), `kilometrajeRegistro` (number opcional), `costoTotal` (number opcional).
  - Handler: Obtiene `env.DB`, valida permisos, llama a `crearOrdenMantenimiento`, detecta si hay `advertenciasReservas` y retorna `{ ok: true, orden, advertenciasReservas }`.
- `cambiarEstadoMantenimiento`:
  - Input: `id` (string), `nuevoEstado` (enum `estadosMantenimientoVehiculo`), `kilometrajeFinal` (number opcional), `costoFinal` (number opcional).
  - Handler: Llama a `actualizarEstadoOrdenMantenimiento` y devuelve `{ ok: true, nuevoEstadoVehiculo }`.

- [ ] **Step 2: Re-exportar en `src/actions/index.ts`**

Exportar las actions de mantenimiento dentro del namespace `mantenimientos`.

- [ ] **Step 3: Verificar compilación con `pnpm check`**

Run: `pnpm check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/actions/mantenimientos.ts src/actions/index.ts
git commit -m "feat(actions): agregar actions tipadas para crear y gestionar mantenimientos"
```

---

### Task 4: Componentes de Cabecera y Tablero de Disponibilidad

**Files:**
- Create: `src/components/flota/disponibilidad/AvailabilityHeader.tsx`
- Create: `src/components/flota/disponibilidad/ActiveMaintenanceCard.tsx`
- Create: `src/components/flota/disponibilidad/AvailabilityOverviewView.tsx`

- [ ] **Step 1: Crear `AvailabilityHeader.tsx`**

Componente React 19 que muestra:
- Botón táctil "← Flota" que navega mediante `navigate('/admin/flota')`.
- Placa con formato de matrícula física (`bg-[#EDEDED]`, tipografía mono).
- Marca y modelo del vehículo (`font-display font-bold text-lg sm:text-xl text-[#111827]`).
- Chip badge con el estado operativo actual (`DISPONIBLE`, `MANTENIMIENTO`, `RESERVADO`, `FUERA_SERVICIO`).
- Odómetro actual en kilómetros.

- [ ] **Step 2: Crear `ActiveMaintenanceCard.tsx`**

Componente React 19 para mostrar la orden de trabajo en curso (si el vehículo está en taller):
- Fechas de ingreso y fecha estimada de entrega.
- Taller asignado y descripción del trabajo.
- Botón de acción prioritario **"Registrar salida de taller"** que activa el modal/flujo de cierre.

- [ ] **Step 3: Crear `AvailabilityOverviewView.tsx`**

Componente React 19 que integra:
- Reutilización de [`EditorialAvailabilityCalendar`](file:///Users/santiago/proyectos/movix/src/components/alquiler/EditorialAvailabilityCalendar.tsx) configurado con los bloques precargados desde D1.
- Leyenda visual clara: *Disponible* (verde/neutro), *En Alquiler* (gris oscuro `#111827`), *En Taller / Bloqueado* (ámbar).
- Si hay orden activa, renderiza `ActiveMaintenanceCard`.
- Botón táctil destacado (mínimo 44px de alto) **"Programar Mantenimiento / Bloqueo"** para abrir el Wizard Typeform.

- [ ] **Step 4: Verificar compilación con `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/flota/disponibilidad/
git commit -m "feat(ui): crear cabecera y vista de resumen de disponibilidad con calendario"
```

---

### Task 5: Wizard Typeform de Registro de Mantenimiento

**Files:**
- Create: `src/components/flota/disponibilidad/MaintenanceWizardFlow.tsx`
- Create: `src/components/flota/disponibilidad/CompleteMaintenanceModal.tsx`

- [ ] **Step 1: Crear `MaintenanceWizardFlow.tsx`**

Componente React 19 de pantalla completa con `framer-motion`:
- **Paso 1: Tipo de Intervención**
  - Selector con tarjetas táctiles (Preventivo, Correctivo/Novedad, Alistamiento de Patio, Bloqueo Operativo).
- **Paso 2: Selección de Fechas**
  - Integra [`EditorialAvailabilityCalendar`](file:///Users/santiago/proyectos/movix/src/components/alquiler/EditorialAvailabilityCalendar.tsx) ocupando el centro de la pantalla para seleccionar fecha de inicio y fin con un solo toque.
- **Paso 3: Taller y Odómetro**
  - Inputs con fuente >= 16px (`text-base`) para Taller Proveedor y Odómetro actual de registro.
- **Paso 4: Costo y Concepto Técnico**
  - Campo numérico para Costo Estimado (COP) y Etiqueta corta/Descripción técnica del trabajo.
- **Paso 5: Revisión, Advertencias y Confirmación**
  - Si las fechas seleccionadas se cruzan con reservas activas, muestra una alerta ámbar detallada con los códigos y clientes de las reservas afectadas.
  - Botón de confirmación que llama a `actions.mantenimientos.crearMantenimiento`.
- Botones de navegación "Atrás" y "Continuar" flotantes en la parte inferior de fácil alcance con el pulgar.

- [ ] **Step 2: Crear `CompleteMaintenanceModal.tsx`**

Componente React 19 enfocado para registrar la salida de taller:
- Muestra el taller y las fechas de la orden actual.
- Pide el kilometraje final y el costo real liquidado.
- Botón "Confirmar Salida de Taller" que ejecuta `actions.mantenimientos.cambiarEstadoMantenimiento` con `COMPLETADO` y actualiza el estado del vehículo en pantalla.

- [ ] **Step 3: Verificar compilación con `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/flota/disponibilidad/
git commit -m "feat(ui): implementar wizard typeform de mantenimiento y salida de taller"
```

---

### Task 6: Isla Coordinadora React 19 y Página Astro SSR

**Files:**
- Create: `src/components/flota/disponibilidad/VehicleAvailabilityIsland.tsx`
- Create: `src/pages/admin/flota/[id]/disponibilidad.astro`
- Create: `src/components/flota/disponibilidad/INDEX.md`

- [ ] **Step 1: Crear `VehicleAvailabilityIsland.tsx`**

Componente React 19 que administra el estado de la vista:
- Estados: `modo: 'TABLERO' | 'WIZARD'` y `ordenSeleccionadaParaCierre: MantenimientoVehiculoSelect | null`.
- Conecta las mutaciones de Astro Actions y actualiza optimistamente la lista de órdenes y los bloques de disponibilidad en pantalla.
- Toast feedback para avisos de éxito o advertencias de reservas solapadas.

- [ ] **Step 2: Crear la página `src/pages/admin/flota/[id]/disponibilidad.astro`**

Orquestador delgado (<150 LOC):
- Importa `LayoutAdmin` con `hideNav={true}` y `hideBottomNav={true}`.
- Verifica permisos con `requireLocalAuth(Astro, PERMISOS.FLOTA_ACTUALIZAR)`.
- Obtiene el ID del vehículo desde `Astro.params`.
- Consulta el vehículo y precarga los bloques reales de 120 días con `obtenerBloquesNoDisponiblesD1(db, vehiculo.id, hoyISO)`.
- Consulta el historial de órdenes con `listarMantenimientosPorVehiculo(db, vehiculo.id)`.
- Renderiza `<VehicleAvailabilityIsland client:load vehiculo={vehiculo} hoyISO={hoyISO} bloquesIniciales={bloques} ordenesIniciales={ordenes} />`.

- [ ] **Step 3: Documentar el módulo con `INDEX.md`**

Crear `src/components/flota/disponibilidad/INDEX.md` documentando la responsabilidad del módulo, exportaciones principales y dependencias.

- [ ] **Step 4: Verificar compilación con `pnpm check`**

Run: `pnpm check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/flota/disponibilidad/ src/pages/admin/flota/
git commit -m "feat(flota): orquestador y pagina dedicada /admin/flota/[id]/disponibilidad"
```

---

### Task 7: Actualización de `FleetInventoryManager.tsx`

**Files:**
- Modify: `src/components/flota/FleetInventoryManager.tsx`

- [ ] **Step 1: Suprimir el selector rápido plano**

En `src/components/flota/FleetInventoryManager.tsx`:
- Eliminar el elemento `<select>` con `cambiarEstadoRapido` en las vistas de cuadrícula y lista.
- En su lugar, renderizar un indicador de estado elegante y de solo lectura:
  - Punto de color (`dotColor`) + Nombre del estado en mayúsculas pequeñas mono (`font-mono text-xs font-bold`).
- Agregar en cada tarjeta un botón de acción principal prioritario:
  ```tsx
  <a
    href={`/admin/flota/${vehiculo.id}/disponibilidad`}
    className="ios-press-bounce min-h-[44px] px-4 flex items-center justify-center gap-2 rounded-full border border-[#9CA3AF]/40 bg-white hover:bg-[#EDEDED] text-[#111827] text-xs font-bold transition cursor-pointer"
  >
    <svg ...calendario-taller-icon... className="h-4 w-4" />
    <span>Disponibilidad & Taller</span>
  </a>
  ```
- Si `vehiculo.estado === 'MANTENIMIENTO'`, mostrar en la tarjeta un distintivo especial "EN TALLER" con acceso directo a la salida de taller.

- [ ] **Step 2: Verificar compilación con `pnpm check`**

Run: `pnpm check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/flota/FleetInventoryManager.tsx
git commit -m "refactor(flota): suprimir select huerfano y agregar acceso a disponibilidad y taller"
```

---

### Task 8: Verificación Global de Calidad y Cierre

**Files:**
- Modify: `docs/database.md` (si aplica)
- Modify: `INDEX.md` (actualización de índice maestro con codebase-index)

- [ ] **Step 1: Ejecutar verificación de calidad estricta**

Run: `pnpm check`
Expected:
```text
Result (X files):
- 0 errors
- 0 warnings
- 0 hints
```

- [ ] **Step 2: Ejecutar empaquetado SSR para Cloudflare**

Run: `pnpm build`
Expected: Compilación exitosa para Cloudflare Pages / Workers sin errores de Vite.

- [ ] **Step 3: Actualizar `INDEX.md` de la raíz**

Actualizar el índice maestro de archivos del proyecto reflejando los nuevos módulos y rutas.

- [ ] **Step 4: Commit final**

```bash
git add docs/ INDEX.md
git commit -m "chore: actualizar documentacion e indices maestros de flota"
```
