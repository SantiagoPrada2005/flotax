# Conexión de `admin/metricas` a Datos Reales de D1 por Local Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar `/admin/metricas` exclusivamente a datos reales de Cloudflare D1 filtrados por el `localActivo` del administrador, eliminando todos los datos ficticios/semilla y corrigiendo los cálculos de ingresos, ocupación mensual, flota alquilada y movimientos diarios.

**Architecture:** Se separa la obtención de datos D1 en un repositorio dedicado (`src/lib/metricas/repositorio.ts`) con aislamiento estricto por `localId`, se corrige el fallback a semillas en `obtenerEstadoFinancieroCompleto` (`src/lib/caja/repositorio.ts`), se reescribe `getYardMetricsSnapshot` (`src/lib/metricas/telemetry-provider.ts`) como función pura determinista sobre datos reales sin respaldos mock, y se actualiza `src/pages/admin/metricas/index.astro` para exigir `localActivo` y pasar el contexto real del local.

**Tech Stack:** Astro 7+ SSR (`cloudflare:workers`), Drizzle ORM (`drizzle-orm/d1`), TypeScript estricto, React 19, `node --test`.

**Spec:** Solicitud de usuario: conectar `admin/metricas` con datos reales de la base de datos y consultas correctas filtradas únicamente por el local o alquiler asociado del administrador.

## Global Constraints

- `pnpm` es el único gestor de paquetes permitido.
- Bindings de Cloudflare siempre vía `import { env } from 'cloudflare:workers'` (prohibido `locals.runtime.env`).
- Cero aserciones de tipo inseguras (`as`, `as any`); usar `$inferSelect` de Drizzle.
- Páginas en `src/pages/**` deben mantenerse por debajo de 150 LOC.
- Todo texto visible al usuario en español humano sin tecnicismos (`RUL-FLX-006`).
- Verificación final obligatoria: `pnpm test`, `pnpm check` (0 errors, 0 warnings, 0 hints) y `pnpm build`.

## Review Focus

- **Administrador sin `localActivo` en sesión:** Nunca debe consultar vehículos, reservas ni movimientos sin filtro `localId` (fuga cross-tenant); debe redirigir a `/admin` o `/admin/onboarding`.
- **Local nuevo o sin movimientos/vehículos:** Debe mostrar `0` en ingresos, `0%` en ocupación y listas vacías sin inyectar `FLOTA_CANONICA`, `semillas.ts` ni `clientesRespaldo`.
- **Diferencia de zona horaria UTC vs local (`America/Bogota`):** Un movimiento a las `2026-11-12T23:30:00-05:00` (`2026-11-13T04:30:00Z`) debe agruparse en `2026-11-12`, no en `2026-11-13`.
- **Depósitos de garantía y movimientos anulados:** Los depósitos en custodia/reembolsos y movimientos con `estado !== 'CONFIRMADO'` no deben sumarse como ingresos operativos del día o del mes.
- **Unión correcta vehículo-contrato-reserva:** La lista de automóviles alquilados debe cruzar por `vehiculoId` / `reservaId` real del local, nunca por índice de arreglo (`contratosActivos[idx]`).

---

### Task 1: Eliminar fuga de semillas en `obtenerEstadoFinancieroCompleto` cuando `db` está conectado

**Files:**
- Modify: `src/lib/caja/repositorio.ts:113-244` y `274-276`
- Test: `tests/metricas_reales_local.test.ts`

**Interfaces:**
- Consumes: `AppDb` (`@/lib/db`), `cuentasFinancieras`, `movimientosCaja`, `sesionesCaja`, `depositosGarantia`, `contratosAlquiler` (`@/db/schema`)
- Produces: `obtenerEstadoFinancieroCompleto(params)` garantizando que con `db` conectado y `localId` vacío retorna listas vacías, y con `localId` válido retorna exactamente las filas de D1 (incluso si son `[]`) sin mezclar `semillas.ts`.

- [ ] **Step 1: Escribir el test que verifica el aislamiento cuando `db` retorna listas vacías**

Crear `tests/metricas_reales_local.test.ts` con un caso inicial que importe `obtenerEstadoFinancieroCompleto` y pase un mock mínimo de `db` que retorna `[]` en todas sus consultas para `localId: 'local-vacio'`, afirmando que `indicadores.ingresosPeriodo === 0`, `todosMovimientos.length === 0`, `carteraContratos.length === 0` y `alertas.length === 0`. También probar que con `db` definido y `localId: undefined` retorna listas vacías.

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `pnpm test`
Expected: FAIL porque `obtenerEstadoFinancieroCompleto` retorna `MOVIMIENTOS_CANONICOS_SEMILLA`, `CARTERA_CONTRATOS_SEMILLA` y `ALERTAS_FINANCIERAS_SEMILLA` cuando D1 retorna `[]`.

- [ ] **Step 3: Corregir `obtenerEstadoFinancieroCompleto` en `src/lib/caja/repositorio.ts`**

En `src/lib/caja/repositorio.ts`:
- Cuando `db` está definido:
  - Si `!params.localId`, inicializar `cuentasList = []`, `movimientosList = []`, `sesionesList = []`, `garantiasList = []`, `carteraList = []` y omitir las consultas sin filtro para evitar fugas cross-tenant.
  - Si `params.localId` existe, asignar directamente `cuentasList = dbCuentas`, `movimientosList = dbMovimientos`, `sesionesList = dbSesiones`, `garantiasList = dbGarantias` y `carteraList = ...` (sin condicionar a `.length > 0`).
  - Inicializar `const alertas: AlertaFinanciera[] = db ? [] : [...ALERTAS_FINANCIERAS_SEMILLA];`.

- [ ] **Step 4: Ejecutar `pnpm test` para verificar que pasa**

Run: `pnpm test`
Expected: PASS en todos los tests existentes y el nuevo test de aislamiento.

- [ ] **Step 5: Commit**

```bash
git add src/lib/caja/repositorio.ts tests/metricas_reales_local.test.ts
git commit -m "fix(caja): evitar fallback a semillas cuando D1 esta conectado"
```

---

### Task 2: Crear repositorio de consultas D1 para métricas por local (`src/lib/metricas/repositorio.ts`)

**Files:**
- Create: `src/lib/metricas/repositorio.ts`
- Modify: `src/lib/metricas/index.ts:1-2`
- Test: `tests/metricas_reales_local.test.ts`

**Interfaces:**
- Consumes: `AppDb` (`@/lib/db`), `reservas`, `contratosAlquiler`, `movimientosCaja` (`@/db/schema`), `toClientISODate` (`@/lib/time/client-time`)
- Produces:
  - `export interface DatosMetricasLocalD1 { readonly reservas: readonly ReservaSelect[]; readonly contratosVigentes: readonly ContratoAlquilerSelect[]; readonly movimientosConfirmados: readonly MovimientoCajaSelect[]; }`
  - `export async function obtenerDatosMetricasLocalD1(db: AppDb | undefined, localId: string, hoyISO: string, timezone?: string): Promise<DatosMetricasLocalD1>`

- [ ] **Step 1: Escribir el test de contrato para `obtenerDatosMetricasLocalD1`**

En `tests/metricas_reales_local.test.ts`, agregar tests para `obtenerDatosMetricasLocalD1`:
- Sin `db` o con `localId === ''` retorna `{ reservas: [], contratosVigentes: [], movimientosConfirmados: [] }`.
- Con `db` simulado verifica que ejecuta las 3 consultas filtradas por `localId` y retorna los registros entregados por D1.

- [ ] **Step 2: Ejecutar `pnpm test` para verificar que falla**

Run: `pnpm test`
Expected: FAIL porque `src/lib/metricas/repositorio.ts` no existe.

- [ ] **Step 3: Implementar `obtenerDatosMetricasLocalD1` en `src/lib/metricas/repositorio.ts` y re-exportar en `src/lib/metricas/index.ts`**

Detalles de consulta en `obtenerDatosMetricasLocalD1`:
- Calcular `haceSeisMesesISO` (primer día del mes hace 5 meses en `YYYY-MM-DD`) y `haceSeisMesesDate` (`Date` en UTC para el inicio de esa ventana).
- Consultar en paralelo con `Promise.all`:
  1. `reservas`: `where(and(eq(reservas.localId, localId), gte(reservas.fechaFin, haceSeisMesesISO), ne(reservas.estado, 'CANCELADA'), ne(reservas.estado, 'RECHAZADA')))`.
  2. `contratosAlquiler`: `where(and(eq(contratosAlquiler.localId, localId), eq(contratosAlquiler.estadoContrato, 'VIGENTE')))`.
  3. `movimientosCaja`: `where(and(eq(movimientosCaja.localId, localId), eq(movimientosCaja.estado, 'CONFIRMADO'), gte(movimientosCaja.fechaMovimiento, haceSeisMesesDate)))` ordenados descendente por `fechaMovimiento`.
- Capturar errores con `logFalloD1('metricas.datosLocal.select', error, { localId })` y retornar arreglos vacíos en caso de fallo.

- [ ] **Step 4: Ejecutar `pnpm test` para verificar que pasa**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/metricas/repositorio.ts src/lib/metricas/index.ts tests/metricas_reales_local.test.ts
git commit -m "feat(metricas): agregar repositorio D1 filtrado por localId"
```

---

### Task 3: Reescribir `telemetry-provider.ts` con cálculos reales y cero datos ficticios

**Files:**
- Modify: `src/lib/metricas/telemetry-provider.ts` (completo)
- Test: `tests/metricas_reales_local.test.ts`

**Interfaces:**
- Consumes: `VehiculoItem` (`@/lib/flota`), `esIngresoOperativo`, `formatearMonedaCOP`, `formatearMonedaCompactaCOP` (`@/lib/caja`), `toClientISODate`, `DEFAULT_TIMEZONE` (`@/lib/time/client-time`), `DatosMetricasLocalD1` (`./repositorio`)
- Produces: `BuildMetricsInput` (con `hoyISO: string`, `vehiculos: readonly VehiculoItem[]`, `datosD1: DatosMetricasLocalD1`) y `getYardMetricsSnapshot(input: BuildMetricsInput): YardMetricsSnapshot`

- [ ] **Step 1: Escribir tests unitarios exhaustivos en `tests/metricas_reales_local.test.ts`**

Agregar tests que cubran los 5 escenarios del Review Focus:
1. **Local vacío** (`vehiculos: []`, `datosD1` vacío): `todayEarnings === 0`, `rentedAutomobilesCount === 0`, `automobilesOccupancyPct === 0`, `currentOccupancyPct === 0`, `items.length === 0`, `rentedAutomobiles.length === 0`, `curvePoints` con 5 días en `0`, `months` con 6 meses en `0`.
2. **Flota alquilada real cruzada por `vehiculoId`**: 2 automóviles (`SEDAN`/`SUV`) y 1 moto (`MOTO`), 1 sedán con reserva `EN_CURSO` + contrato `VIGENTE` y 1 sedán `DISPONIBLE`. Verificar `rentedAutomobilesCount === 1`, `totalAutomobilesCount === 2`, `automobilesOccupancyPct === 50`, `availableAutomobilesCount === 1`, `otherRentedUnitsCount === 0`, y que `rentedAutomobiles[0]` tenga el `clientName` y `contractCode` del contrato/reserva real (sin `clientesRespaldo`).
3. **Zona horaria y filtro de movimientos de hoy + depósitos excluidos**: movimiento `INGRESO` (`PAGO_ALQUILER`) a las `2026-11-12T23:30:00-05:00`, movimiento `DEPOSITO_GARANTIA` hoy (excluido de ganancia operativa), y movimiento de ayer. Verificar `todayEarnings` igual solo al ingreso operativo de hoy, `timeLabel` en hora local (`23:30`), y ganancia diaria por categoría basada en el `vehiculoId` del movimiento.
4. **Ocupación mensual de 6 meses**: reservas reales distribuidas en el mes actual y mes anterior; verificar `reservationsCount`, `earnings`, y `occupancyPct` calculado con días reales sobre capacidad de flota.

- [ ] **Step 2: Ejecutar `pnpm test` para verificar que fallan**

Run: `pnpm test`
Expected: FAIL contra la implementación actual con mocks.

- [ ] **Step 3: Implementar cálculos reales en `src/lib/metricas/telemetry-provider.ts`**

Reglas exactas de implementación:
- Eliminar `FLOTA_CANONICA`, `clientesRespaldo`, `mov-sem-*`, `baseDias`, `1_320_000`, `0.72/0.19/0.09`, `pesosHorarios` y `perfilSeisMeses`.
- `construirFlotaAlquilada`:
  - Separar `automoviles` (`SEDAN` | `SUV`) y `otrasUnidades`.
  - Cruzar cada vehículo con `contratosVigentes` (por `vehiculoId`) y `reservas` activas en `hoyISO` (`estado` en `['EN_CURSO', 'CONFIRMADA', 'PENDIENTE']` con `fechaInicio <= hoyISO && fechaFin >= hoyISO`).
  - Construir `RentedAutomobileItem` solo para automóviles con estado `RESERVADO` o contrato/reserva activa hoy. Calcular `daysActive` real desde `fechaInicio` hasta `hoyISO` (mínimo 1).
- `construirMovimientosDiarios`:
  - Filtrar `movimientosConfirmados` donde `tipo === 'INGRESO' || tipo === 'EGRESO'` y `toClientISODate(fechaMovimiento, timezone) === hoyISO`.
  - Formatear `timeLabel` en `timezone` con `Intl.DateTimeFormat('es-CO', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false })`.
  - Construir `curvePoints` para los últimos 5 días terminando en `hoyISO` (agrupando ingresos operativos y egresos por `toClientISODate(..., timezone)`).
- `construirGananciaDiariaVehiculos`:
  - `todayEarnings`: suma de `mov.monto` de hoy donde `esIngresoOperativo(mov)`.
  - `dailyAverage`: promedio de ingreso operativo diario en los últimos 30 días (excluyendo días futuros, dividido entre los días con operación o `30` si hay historial; `0` si no hay movimientos en 30 días).
  - `byCategory`: agrupar ingresos operativos de hoy por categoría del vehículo (`vehiculoId` -> `SEDAN`/`SUV`/`MOTO`/etc.; si no tiene `vehiculoId`, agrupar en `'Otros ingresos operativos'`). Omitir categorías en `0` o devolver lista vacía si `todayEarnings === 0`.
  - `hourlySlots`: agrupar ingresos operativos de hoy en franjas horarias reales (`06h-09h`, `09h-12h`, `12h-15h`, `15h-18h`, `18h-22h`) usando la hora local en `timezone`.
- `construirOcupacionMensual`:
  - Para cada uno de los últimos 6 meses (`offset: -5..0` respecto a `hoyISO`):
    - Contar `reservasCount` con `fechaInicio` en ese mes (o solapadas con ese mes).
    - Sumar `earnings` de `movimientosConfirmados` donde `esIngresoOperativo(m)` y su fecha en `timezone` cae en ese `YYYY-MM`.
    - Calcular `occupancyPct`: sumar días de reserva solapados dentro del mes, dividir por `(Math.max(1, flota.length) * diasDelMes)` si `flota.length > 0` (si `flota.length === 0`, `0%`), acotado a `[0, 100]`.

- [ ] **Step 4: Ejecutar `pnpm test` para verificar que pasan todos los tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/metricas/telemetry-provider.ts tests/metricas_reales_local.test.ts
git commit -m "feat(metricas): reemplazar datos simulados por calculos reales de D1"
```

---

### Task 4: Conectar `src/pages/admin/metricas/index.astro` con guardia de local activo y pulir estados vacíos en UI

**Files:**
- Modify: `src/pages/admin/metricas/index.astro:1-58`
- Modify: `src/components/dashboard/TelemetryBentoGrid.tsx:1037-1044`, `1243-1288`, `1398-1448`

**Interfaces:**
- Consumes: `obtenerLocalPorSlugOId`, `listarVehiculos` (`@/lib/flota`), `obtenerDatosMetricasLocalD1`, `getYardMetricsSnapshot` (`@/lib/metricas`)
- Produces: Página SSR `< 150` LOC estrictamente acotada a `usuario.localActivo.id` y UI con estados vacíos claros cuando no hay vehículos alquilados o movimientos hoy.

- [ ] **Step 1: Actualizar `src/pages/admin/metricas/index.astro`**

- Verificar `const localActivo = usuario?.localActivo;` — si `!localActivo?.id`, retornar `Astro.redirect('/admin')` (evita cualquier consulta sin `localId`).
- Resolver `localContexto` con `obtenerLocalPorSlugOId(localActivo.id, db)` (con fallback tipado al propio `localActivo` si `db` no estuviera disponible).
- Consultar en paralelo:
  - `listarVehiculos(db, { localId: localContexto.id, hoyISO: timeContext.dateString })`
  - `obtenerDatosMetricasLocalD1(db, localContexto.id, timeContext.dateString, timeContext.timezone)`
- Pasar `yardName: localContexto.nombre`, `cityLabel: localContexto.ciudad`, `operatorName`, `timezone: timeContext.timezone`, `dateLabel: timeContext.dateString`, `hoyISO: timeContext.dateString`, `vehiculos`, `datosD1` a `getYardMetricsSnapshot(...)`.

- [ ] **Step 2: Agregar estados vacíos limpios en `src/components/dashboard/TelemetryBentoGrid.tsx`**

- En el gráfico Donut de categorías (`~1039`): mostrar `{activeCategory?.sharePct ?? 0}%` cuando `dailyEarnings.byCategory.length === 0`, y un texto breve `"Sin ingresos registrados hoy para desglosar."` debajo si está vacío.
- En la lista de automóviles alquilados (`~1248`): si `rentedFleet.rentedAutomobiles.length === 0`, mostrar una tarjeta de estado vacío `"No hay automóviles alquilados en este momento."`.
- En la lista de movimientos diarios (`~1398`): si `filteredMovements.length === 0`, mostrar `"Sin movimientos registrados hoy con este filtro."`.

- [ ] **Step 3: Ejecutar verificación completa (`pnpm test`, `pnpm check`, `pnpm build`)**

Run: `pnpm test && pnpm check && pnpm build`
Expected:
- `pnpm test`: 0 failed.
- `pnpm check`: `0 errors`, `0 warnings`, `0 hints`.
- `pnpm build`: Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/metricas/index.astro src/components/dashboard/TelemetryBentoGrid.tsx
git commit -m "feat(admin/metricas): conectar pagina al local activo y estados vacios reales"
```
