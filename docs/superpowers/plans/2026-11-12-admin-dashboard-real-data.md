# Admin Dashboard Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the admin main page (`src/pages/admin/index.astro`) and its live polling endpoint (`/api/alquileres/en-proceso`) exclusively to real Cloudflare D1 data, eliminating all hardcoded metrics and mock fallbacks.

**Architecture:** Extract pure metric/mapping functions and targeted D1 queries into dedicated domain modules under `src/lib/dashboard/`, keeping `src/pages/admin/index.astro` as a thin SSR orchestrator (<150 LOC). Avoid `obtenerEstadoFinancieroCompleto` because it falls back to in-memory seed arrays when D1 tables are empty; query `sesionesCaja` and `movimientosCaja` directly instead so empty locals accurately report `CERRADA` and `$ 0`.

**Tech Stack:** Astro 7+ (`@astrojs/cloudflare`), React 19, Drizzle ORM (`drizzle-orm/d1`), Cloudflare D1 (`cloudflare:workers`), TypeScript (`strictest`), Node built-in test runner (`node --test`).

**Spec:** User request `/writing-plans conecta la pagina principal de admin con datos reales` + `AGENTS.md` governance rules.

## Global Constraints

- Package manager: `pnpm` only (`pnpm test`, `pnpm check`, `pnpm build`).
- Bindings: `import { env } from 'cloudflare:workers';` (never `Astro.locals.runtime.env`).
- Typing: Strict Drizzle E2E inference (`$inferSelect`), zero `as` type assertions, zero `@deprecated` APIs.
- No `utils.ts` junk drawer: place dashboard domain logic in `src/lib/dashboard/`.
- `src/pages/admin/index.astro` must remain under 150 lines of code.
- Final gate: `pnpm test`, `pnpm check` (0 errors, 0 warnings, 0 hints), and `pnpm build`.

## Review Focus

- Empty D1 database (new local with 0 vehicles, 0 cash sessions, 0 movements, 0 reservations) must display `0%`, `0 de 0 Activas`, `$ 0`, `Cerrado`, and `Sin alquileres en proceso` without falling back to `FLOTA_CANONICA` or `MOCK_ALQUILERES_EN_PROCESO`.
- Cash movements from previous days, `ANULADO` movements, or `DEPOSITO_GARANTIA` movements must NOT be counted in today's `Caja Turno` revenue (`totalValorDia`).
- Vehicles in `MANTENIMIENTO` or `FUERA_SERVICIO` must NOT be counted as `DISPONIBLE` or `activasCount` (`RESERVADO`), while `totalUnits` reflects active fleet units (`vehiculos.activo = true`).
- Unauthenticated requests to `GET /api/alquileres/en-proceso` must return HTTP `401` JSON rather than leaking data or falling back to mock arrays.
- Reservations with missing `clienteId` (walk-in/anonymous) or missing `contrato` / `inspeccion` rows must still map cleanly to `AlquilerEnProcesoItem` without null-pointer errors.

---

### Task 1: Fleet & Shift Cash Summary Logic + D1 Query

**Files:**
- Create: `src/lib/dashboard/resumen-admin.ts`
- Test: `tests/admin_dashboard_real_data.test.ts`

**Interfaces:**
- Consumes: `VehiculoItem['estado']`, `SesionCajaSelect`, `MovimientoCajaSelect`, `EstadoSesionCaja` (`@/db/schema`), `esIngresoOperativo`, `formatearMonedaCOP` (`@/lib/caja/calculos`), `toClientISODate`, `DEFAULT_TIMEZONE` (`@/lib/time/client-time`), `AppDb` (`@/lib/db`).
- Produces:
  - `MetricasFlotaAdmin` interface (`totalUnits`, `disponiblesCount`, `activasCount`, `mantenimientoCount`, `fueraServicioCount`, `occupancyPercentage`)
  - `ResumenCajaTurnoAdmin` interface (`shiftStatus: EstadoSesionCaja`, `totalValorDia: number`, `revenueFormatted: string`)
  - `calcularMetricasFlotaAdmin(vehiculos: readonly Pick<VehiculoItem, 'estado'>[]): MetricasFlotaAdmin`
  - `calcularResumenCajaTurnoHoy(params: { sesiones: readonly Pick<SesionCajaSelect, 'estado'>[]; movimientos: readonly MovimientoCajaSelect[]; hoyISO: string; timezone?: string }): ResumenCajaTurnoAdmin`
  - `obtenerResumenCajaTurnoD1(db: AppDb | undefined, localId: string, hoyISO: string, timezone?: string): Promise<ResumenCajaTurnoAdmin>`

- [ ] **Step 1: Write the failing tests for fleet metrics and today's cash shift summary**

Create `tests/admin_dashboard_real_data.test.ts`:
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularMetricasFlotaAdmin,
  calcularResumenCajaTurnoHoy,
} from '../src/lib/dashboard/resumen-admin.ts';
import type { MovimientoCajaSelect } from '../src/db/schema/caja.ts';

function crearMovimientoBase(
  overrides: Partial<MovimientoCajaSelect>
): MovimientoCajaSelect {
  const ahora = new Date('2026-11-12T14:00:00-05:00');
  return {
    id: 'mov-1',
    localId: 'local-1',
    cuentaId: 'cta-1',
    sesionCajaId: 'ses-1',
    vehiculoId: null,
    contratoCodigo: null,
    tipo: 'INGRESO',
    categoria: 'PAGO_ALQUILER',
    monto: 200_000,
    metodoPago: 'transferencia',
    concepto: 'Pago canon',
    referenciaExterna: null,
    estado: 'CONFIRMADO',
    responsableId: 'usr-1',
    fechaMovimiento: ahora,
    creadoEn: ahora,
    actualizadoEn: ahora,
    ...overrides,
  };
}

describe('Resumen Admin - Métricas de Flota y Caja Turno', () => {
  it('1. Flota vacía retorna todos los contadores en 0 y 0% de ocupación', () => {
    const res = calcularMetricasFlotaAdmin([]);
    assert.deepEqual(res, {
      totalUnits: 0,
      disponiblesCount: 0,
      activasCount: 0,
      mantenimientoCount: 0,
      fueraServicioCount: 0,
      occupancyPercentage: 0,
    });
  });

  it('2. Calcula contadores reales por estado y porcentaje de ocupación', () => {
    const res = calcularMetricasFlotaAdmin([
      { estado: 'DISPONIBLE' },
      { estado: 'DISPONIBLE' },
      { estado: 'RESERVADO' },
      { estado: 'MANTENIMIENTO' },
      { estado: 'FUERA_SERVICIO' },
    ]);
    assert.equal(res.totalUnits, 5);
    assert.equal(res.disponiblesCount, 2);
    assert.equal(res.activasCount, 1);
    assert.equal(res.mantenimientoCount, 1);
    assert.equal(res.fueraServicioCount, 1);
    assert.equal(res.occupancyPercentage, 20);
  });

  it('3. Caja sin sesión abierta ni movimientos retorna CERRADA y $ 0', () => {
    const res = calcularResumenCajaTurnoHoy({
      sesiones: [{ estado: 'CERRADA' }],
      movimientos: [],
      hoyISO: '2026-11-12',
    });
    assert.equal(res.shiftStatus, 'CERRADA');
    assert.equal(res.totalValorDia, 0);
  });

  it('4. Caja suma solo ingresos operativos CONFIRMADOS de hoy (excluye depósitos, anulados y días previos)', () => {
    const hoy = new Date('2026-11-12T10:30:00-05:00');
    const ayer = new Date('2026-11-11T18:00:00-05:00');

    const res = calcularResumenCajaTurnoHoy({
      sesiones: [{ estado: 'ABIERTA' }],
      movimientos: [
        crearMovimientoBase({ id: '1', monto: 350_000, fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '2', monto: 150_000, categoria: 'ABONO_CONTRATO', fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '3', monto: 1_000_000, categoria: 'DEPOSITO_GARANTIA', fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '4', monto: 500_000, estado: 'ANULADO', fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '5', monto: 250_000, tipo: 'EGRESO', categoria: 'COMBUSTIBLE_OPERACION', fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '6', monto: 400_000, fechaMovimiento: ayer }),
      ],
      hoyISO: '2026-11-12',
    });

    assert.equal(res.shiftStatus, 'ABIERTA');
    assert.equal(res.totalValorDia, 500_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL with module not found `../src/lib/dashboard/resumen-admin.ts`.

- [ ] **Step 3: Implement `src/lib/dashboard/resumen-admin.ts`**

Implement `calcularMetricasFlotaAdmin`, `calcularResumenCajaTurnoHoy`, and `obtenerResumenCajaTurnoD1`:
- `calcularMetricasFlotaAdmin`: counts each `estado` in a single pass and computes `occupancyPercentage = totalUnits > 0 ? Math.round((activasCount / totalUnits) * 100) : 0`.
- `calcularResumenCajaTurnoHoy`: checks `sesiones.some((s) => s.estado === 'ABIERTA') ? 'ABIERTA' : 'CERRADA'`, sums `mov.monto` for movements where `mov.estado === 'CONFIRMADO' && esIngresoOperativo(mov) && toClientISODate(new Date(mov.fechaMovimiento), timezone) === hoyISO`, and formats with `formatearMonedaCOP(totalValorDia)`.
- `obtenerResumenCajaTurnoD1`: when `!db`, returns `{ shiftStatus: 'CERRADA', totalValorDia: 0, revenueFormatted: formatearMonedaCOP(0) }`. When `db` is present, queries `sesionesCaja` (`localId` and `estado = 'ABIERTA'`) and `movimientosCaja` (`localId`, `tipo = 'INGRESO'`, `estado = 'CONFIRMADO'`) in `Promise.all`, then delegates to `calcularResumenCajaTurnoHoy`. Wrap in `try/catch` returning zeroed fallback on DB error and logging via `logFalloD1`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all existing 40 tests + 4 new tests = 44 passing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/resumen-admin.ts tests/admin_dashboard_real_data.test.ts
git commit -m "feat(dashboard): add real fleet and daily cash shift summary helpers"
```

---

### Task 2: Real "Alquileres en Proceso" Mapping & D1 Query

**Files:**
- Create: `src/lib/dashboard/alquileres-proceso.ts`
- Modify: `tests/admin_dashboard_real_data.test.ts`

**Interfaces:**
- Consumes: `ReservaSelect`, `VehiculoSelect`, `ContratoAlquilerSelect`, `InspeccionPericialSelect`, `VerificacionIdentidad` (`@/db/schema`), `AlquilerEnProcesoItem`, `PasoProcesoContrato`, `resolverYOrdenarAlquileres` (`@/components/dashboard/AlquilerEnProcesoCard`), `AppDb` (`@/lib/db`).
- Produces:
  - `mapearReservaAAlquilerEnProceso(params: { reserva: ReservaSelect; vehiculo: Pick<VehiculoSelect, 'placa' | 'imagenUrl'> | null; contrato: Pick<ContratoAlquilerSelect, 'numeroContrato' | 'estadoContrato' | 'totalPagado' | 'firmaArrendatarioR2Key' | 'fechaHoraEntregaReal' | 'actualizadoEn'> | null; inspeccionEntrega: Pick<InspeccionPericialSelect, 'iniciadaEn' | 'finalizadaEn'> | null; verificacion: Pick<VerificacionIdentidad, 'estado'> | null; }): AlquilerEnProcesoItem`
  - `listarAlquileresEnProcesoD1(db: AppDb | undefined, localId: string): Promise<AlquilerEnProcesoItem[]>`

- [ ] **Step 1: Add failing tests for `mapearReservaAAlquilerEnProceso` in `tests/admin_dashboard_real_data.test.ts`**

Add tests verifying:
1. `PENDIENTE` reservation with no contract, no inspection, and no verification maps to `estado: 'EN_PROCESO'`, `kyc: 'PENDIENTE'`, `abono: 'PENDIENTE'`, `peritaje: 'PENDIENTE'`, `firma: 'PENDIENTE'`.
2. `CONFIRMADA` reservation with `montoAbonoReportado > 0` and `inspeccionEntrega` having `iniciadaEn` (but `finalizadaEn: null`) maps to `abono: 'COMPLETADO'`, `peritaje: 'EN_PROCESO'`, `estado: 'EN_PROCESO'`.
3. `EN_CURSO` reservation with `contrato` having `estadoContrato: 'VIGENTE'`, `totalPagado > 0`, `fechaHoraEntregaReal` set, and `inspeccionEntrega.finalizadaEn` set maps to `estado: 'COMPLETADO'` with `completadoEn` equal to `fechaHoraEntregaReal.toISOString()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL with module not found `../src/lib/dashboard/alquileres-proceso.ts`.

- [ ] **Step 3: Implement `src/lib/dashboard/alquileres-proceso.ts`**

Implement `mapearReservaAAlquilerEnProceso` and `listarAlquileresEnProcesoD1`:
- `listarAlquileresEnProcesoD1(db, localId)`:
  - If `!db`, return `[]`.
  - Query `reservas` where `localId` matches and `estado` is in `['PENDIENTE', 'CONFIRMADA', 'EN_CURSO']`, left-joining `vehiculos` and `contratosAlquiler` (selecting only needed columns).
  - If no reservations found, return `[]`.
  - In parallel, query `inspeccionesPericiales` (`inArray(reservaId, reservaIds)` and `eq(tipoActo, 'ENTREGA')`) and `verificacionesIdentidad` (for non-null `clienteId`s via `inArray(usuarioId, clienteIds)`).
  - Map each row using `mapearReservaAAlquilerEnProceso` and return `resolverYOrdenarAlquileres(items)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests passing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/alquileres-proceso.ts tests/admin_dashboard_real_data.test.ts
git commit -m "feat(dashboard): map active D1 reservations to in-process rentals"
```

---

### Task 3: Connect `/api/alquileres/en-proceso` and `AlquilerEnProcesoCard` to Real Data

**Files:**
- Modify: `src/pages/api/alquileres/en-proceso.ts:1-82`
- Modify: `src/components/dashboard/AlquilerEnProcesoCard.tsx:285-291`

**Interfaces:**
- Consumes: `listarAlquileresEnProcesoD1` (`@/lib/dashboard/alquileres-proceso`), `LOCAL_CANONICO_DEFECTO` (`@/lib/flota`), `env` (`cloudflare:workers`), `getDb` (`@/lib/db`).
- Produces: Authenticated `GET /api/alquileres/en-proceso` backed by D1, and `AlquilerEnProcesoCard` defaulting `initialAlquileres = []`.

- [ ] **Step 1: Update `src/pages/api/alquileres/en-proceso.ts`**

Replace the in-memory `simuladorAlquileres` and `POST` simulator with:
- Check `locals.usuario`; if missing, return `401` JSON `{ ok: false, error: 'No autenticado' }` with `Cache-Control: no-store`.
- Resolve `localId = locals.usuario.localActivo?.id ?? LOCAL_CANONICO_DEFECTO.id`.
- Get `db = env.DB ? getDb(env.DB) : undefined`.
- Call `const alquileres = await listarAlquileresEnProcesoD1(db, localId);`.
- Return `200` JSON `AlquilerEnProcesoResponse` (`{ ok: true, alquileres, tiemposConfig: DEFAULT_TIEMPOS_ALQUILER_PROCESO, actualizadoEn: new Date().toISOString() }`) with `Cache-Control: no-store`.

- [ ] **Step 2: Update `AlquilerEnProcesoCard.tsx` default prop**

In `src/components/dashboard/AlquilerEnProcesoCard.tsx:286`, change `initialAlquileres = MOCK_ALQUILERES_EN_PROCESO` to `initialAlquileres = []` so the component never renders fake rentals when D1 has 0 active rentals.

- [ ] **Step 3: Run `pnpm check`**

Run: `pnpm check`
Expected: `0 errors, 0 warnings, 0 hints`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/alquileres/en-proceso.ts src/components/dashboard/AlquilerEnProcesoCard.tsx
git commit -m "feat(api): connect /api/alquileres/en-proceso to D1 and remove mock defaults"
```

---

### Task 4: Wire `src/pages/admin/index.astro` to Real D1 Data & Final Verification

**Files:**
- Modify: `src/pages/admin/index.astro:1-105`

**Interfaces:**
- Consumes: `listarVehiculos` (`@/lib/flota`), `calcularMetricasFlotaAdmin`, `obtenerResumenCajaTurnoD1` (`@/lib/dashboard/resumen-admin`), `listarAlquileresEnProcesoD1` (`@/lib/dashboard/alquileres-proceso`).

- [ ] **Step 1: Update `src/pages/admin/index.astro`**

- Remove `import { FLOTA_CANONICA } from "@/lib/flota/mock-vehiculos";` and the `FLOTA_CANONICA` fallback.
- Call in parallel (`Promise.all`):
  - `listarVehiculos(db, { localId: localContexto.id, hoyISO: timeContext.dateString })`
  - `obtenerResumenCajaTurnoD1(db, localContexto.id, timeContext.dateString, timeContext.timezone)`
  - `listarAlquileresEnProcesoD1(db, localContexto.id)`
- Compute fleet metrics with `calcularMetricasFlotaAdmin(vehiculosDb)`.
- Pass real values to `BentoHeroCard`, `BentoMetricsGrid` (`shiftStatus={resumenCaja.shiftStatus}`, `revenueAmount={resumenCaja.revenueFormatted}`, `revenueTrend={resumenCaja.totalValorDia > 0 ? "Ingresos hoy" : "Sin ingresos hoy"}`), `LocalCatalogShareCard` (`unidadesCount={metricasFlota.totalUnits}`), and `AlquilerEnProcesoCard` (`initialAlquileres={alquileresEnProceso}`).
- Confirm `src/pages/admin/index.astro` stays under 150 lines.

- [ ] **Step 2: Run full verification suite (`pnpm test`, `pnpm check`, `pnpm build`)**

Run:
```bash
pnpm test && pnpm check && pnpm build
```
Expected:
- `pnpm test`: all tests pass, 0 failures.
- `pnpm check`: `0 errors`, `0 warnings`, `0 hints`.
- `pnpm build`: exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/index.astro
git commit -m "feat(admin): connect main dashboard page to real D1 data"
```
