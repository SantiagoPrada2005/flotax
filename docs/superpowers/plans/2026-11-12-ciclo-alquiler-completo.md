# Ciclo Completo de Alquiler e Integridad de Caja — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar y reparar de extremo a extremo todas las transiciones, validaciones, permisos RBAC, registros de contrato/garantía y movimientos reales de caja/disponibilidad desde el inicio hasta el cierre o anulación de cada alquiler en FlotaX.

**Architecture:** Se introduce la tabla de bitácora `eventos_alquiler` y se centralizan las transiciones multi-tabla en el servicio de dominio `src/lib/flota/ciclo-alquiler.ts` ejecutando lotes atómicos `db.batch([...])` sobre Cloudflare D1. Se eliminan las mutaciones silenciosas en RAM (`cacheCartera`) y estados optimistas de UI, se habilitan reservas sin fricción documental con alertas informadas al patio, se separa evaluación cliente de cierre administrativo, y se aplican permisos granulares RBAC desde Astro SSR hasta las acciones e islas React 19.

**Tech Stack:** Astro 7 SSR (`@astrojs/cloudflare`), React 19, Cloudflare D1 + Drizzle ORM (`drizzle-orm/d1`), Zod 4, Better Auth, Tailwind CSS v4, Node native test runner (`pnpm test`), `pnpm check`, `pnpm build`.

**Spec:** [docs/superpowers/specs/2026-11-12-ciclo-alquiler-completo-design.md](file:///Users/santiago/proyectos/movix/docs/superpowers/specs/2026-11-12-ciclo-alquiler-completo-design.md)

## Global Constraints

- Gestor exclusivo `pnpm` (prohibido `npm`/`npx`/`yarn`/`bun`).
- Puerta final inviolable: `pnpm check` debe reportar `0 errors`, `0 warnings`, `0 hints`, seguido de `pnpm build` exitoso y `pnpm test` 100% en verde.
- Zod v4 estricto (`z.email({ error })`, `z.treeifyError(error)`, sin métodos `@deprecated` `TS6385`/`TS6387`).
- Bindings de Cloudflare exclusivamente vía `import { env } from 'cloudflare:workers'` (prohibido `Astro.locals.runtime`).
- Tipado estricto Drizzle `$inferSelect`/`$inferInsert` sin `as any`; consultas D1 respetando el límite de `<100` columnas vinculadas.
- Operaciones multi-tabla en D1 ejecutadas vía `db.batch([...])` sin depender de transacciones SQL `BEGIN/COMMIT`.
- Páginas `.astro` menores a `150 LOC`; interactividad cliente exclusivamente en islas React 19 (`.tsx`) sin manipulación imperativa del DOM.
- UI fiel a la paleta de 5 neutros Movix (`#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`), `<input>/<select>/<textarea>` con `text-base` (`>= 16px`) y botones táctiles `>= 44x44px`.
- Actualizar `docs/database.md` (y su diagrama Mermaid) y `docs/user-flows.md` en el mismo paso que las tablas/permisos.
- **Decisiones resueltas para el constructor:** (1) Los modales operativos de Pausa, Prórroga, Devolución/Cierre y Cancelación/Anulación se extraerán a subcomponentes React dedicados bajo `src/components/reservas/` para mantener `AlquilerDetalleView.tsx` modular; (2) Las pruebas automatizadas usarán el runner nativo existente (`node --import ./tests/register-loader.mjs --test`) con dobles deterministas de D1/Drizzle; (3) En `RentalWizardFlow`, un vehículo con `SOAT`/`TECNICO_MECANICA` explícitamente vencido bloqueará el avance del Paso 1 mostrando el badge `"En actualización de documentos"`.

## Review Focus

- **Pausa o prórroga con colisión de calendario:** Intentar pausar (`+1/+N` días) o prorrogar cuando `[fechaFin + 1 .. nuevaFechaFin]` choca con otra reserva (`PENDIENTE`/`CONFIRMADA`/`EN_CURSO`/`PAUSADA`) u orden de taller (`EN_TALLER`/`PROGRAMADO`) debe fallar con `CONFLICT` detallando fechas/código sin mutar filas *(cubierto en Task 5)*.
- **Devolución anticipada con excedente ya pagado:** Si `descuentoAjusteLocal` deja `totalLiquidado < totalPagado`, el cierre debe exigir resolución explícita con egreso `REEMBOLSO_ALQUILER` (solo con `CAJA_GASTOS_REGISTRAR`) o rechazar con `BAD_REQUEST` en lugar de producir saldos negativos opacos *(cubierto en Task 5)*.
- **Acceso invitado sin sesión y vinculación OTP insensible a mayúsculas:** Consultar o evaluar `/reservas/[codigo]` sin sesión ni `tokenAccesoPublico` válido debe rechazarse (`FORBIDDEN` / redirección a `/login`), mientras un inicio OTP posterior cuyo correo difiera solo en mayúsculas/espacios vincula todas sus reservas `clienteId = null` *(cubierto en Tasks 4 y 6)*.
- **Bypass RBAC directo por `ASESOR` en acciones de servidor:** Invocar pausa, prórroga `MISMO_PRECIO`/`PRECIO_PACTADO`, `sobrecostoLocal > 0`, `descuentoAjusteLocal > 0`, `CONTRATOS_ANULAR` o `anularMovimientoAction`/`REEMBOLSO_ALQUILER` con sesión `'ASESOR'` debe responder `FORBIDDEN` sin alterar D1; `'ADMIN'` sí puede ejecutar `CONTRATOS_ANULAR` *(cubierto en Tasks 1, 3 y 5)*.
- **Doble envío en entrega/cierre o fallo real de D1 en caja:** Llamar dos veces seguidas `entregarVehiculoConContratoD1` o `devolverYCerrarAlquilerD1`, o simular un fallo D1 en `registrarMovimientoRepo`/`anularMovimientoRepo`, debe abortar con error explícito sin caer en `cacheCartera` ni duplicar ingresos/estados *(cubierto en Tasks 3 y 4)*.

---

### Task 1: Esquema D1, Migración SQL, Documentación y Permisos RBAC

**Files:**
- Modify: `src/db/schema/vehiculos.ts:1-20`
- Modify: `src/db/schema/caja.ts:20-55`
- Modify: `src/db/schema/reservas.ts:1-126`
- Modify: `src/db/schema/contratos.ts:1-125`
- Create: `src/db/schema/eventos_alquiler.ts`
- Modify: `src/db/schema/index.ts:1-38`
- Modify: `src/lib/auth/permisos.ts:1-25`
- Modify: `src/lib/auth/rbac.ts:1-210`
- Modify: `docs/database.md`
- Modify: `docs/user-flows.md`
- Generate: `drizzle/*.sql` via `pnpm db:generate`
- Test: `tests/rbac_permisos_alquiler.test.ts`

**Interfaces:**
- Produces:
  - `estadosVehiculo` con `'NO_DISPONIBLE'`
  - `categoriasEgreso` con `'REEMBOLSO_ALQUILER'`
  - `estadosReserva` con `'PAUSADA'` y columnas nullable/ciclo en `reservas` (`tokenAccesoPublico`, `fechaFinOriginal`, `fechaDevolucionReal`, `autorizadoSinDocumentosPorId`, `notaAutorizacionDocumentos`, `motivoCancelacion`, `canceladoPorId`, `canceladoEn`)
  - `estadosContratoAlquiler` con `'PAUSADO'` y columnas nullable/cierre/anulación en `contratosAlquiler` (`clausulaEncargado`, `cargosOtrosLocal`, `detalleOtrosCargos`, `ajusteDescuentoLocal`, `autorizadoSinDocumentosPorId`, `motivoAnulacion`, `anuladoPorId`, `anuladoEn`)
  - `eventosAlquiler`, `tiposEventoAlquiler`, `modalidadesTarifaEvento`, `EventoAlquilerSelect`, `EventoAlquilerInsert` en `src/db/schema/eventos_alquiler.ts`
  - `PERMISOS.CONTRATOS_PAUSAR = 'contratos:pausar'`

- [ ] **Step 1: Escribir prueba fallida de permisos RBAC y enumeraciones del esquema**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISOS } from '../src/lib/auth/permisos.ts';
import { obtenerPermisosBasePorRol } from '../src/lib/auth/rbac.ts';
import {
  estadosVehiculo,
  estadosReserva,
  estadosContratoAlquiler,
  categoriasEgreso,
} from '../src/db/schema/index.ts';

describe('RBAC y Enums del Ciclo de Alquiler', () => {
  it('ADMIN posee CONTRATOS_ANULAR y CONTRATOS_PAUSAR; ASESOR no posee privilegios de pausa, ajuste, sobrecosto ni reembolso', () => {
    const permisosAdmin = obtenerPermisosBasePorRol('ADMIN');
    const permisosAsesor = obtenerPermisosBasePorRol('ASESOR');
    assert.equal(permisosAdmin.includes(PERMISOS.CONTRATOS_ANULAR), true);
    assert.equal(permisosAdmin.includes((PERMISOS as Record<string, string>).CONTRATOS_PAUSAR), true);

    assert.equal(permisosAsesor.includes((PERMISOS as Record<string, string>).CONTRATOS_PAUSAR), false);
    assert.equal(permisosAsesor.includes(PERMISOS.CONTRATOS_MODIFICAR_TARIFA), false);
    assert.equal(permisosAsesor.includes(PERMISOS.NOVEDADES_CARGOS_APROBAR), false);
    assert.equal(permisosAsesor.includes(PERMISOS.CONTRATOS_ANULAR), false);
    assert.equal(permisosAsesor.includes(PERMISOS.CAJA_GASTOS_REGISTRAR), false);
  });

  it('El esquema D1 expone NO_DISPONIBLE, PAUSADA, PAUSADO y REEMBOLSO_ALQUILER', () => {
    assert.ok(estadosVehiculo.includes('NO_DISPONIBLE' as never));
    assert.ok(estadosReserva.includes('PAUSADA' as never));
    assert.ok(estadosContratoAlquiler.includes('PAUSADO' as never));
    assert.ok(categoriasEgreso.includes('REEMBOLSO_ALQUILER' as never));
  });
});
```

- [ ] **Step 2: Ejecutar prueba para verificar que falla antes del cambio**

Run: `node --import ./tests/register-loader.mjs --test tests/rbac_permisos_alquiler.test.ts`
Expected: FAIL (`ADMIN` sin `CONTRATOS_ANULAR`, falta `CONTRATOS_PAUSAR` y estados en enums).

- [ ] **Step 3: Actualizar enums y columnas en `vehiculos.ts`, `caja.ts`, `reservas.ts` y `contratos.ts`**

- `src/db/schema/vehiculos.ts`: añadir `'NO_DISPONIBLE'` a `estadosVehiculo`.
- `src/db/schema/caja.ts`: añadir `'REEMBOLSO_ALQUILER'` a `categoriasEgreso`.
- `src/db/schema/reservas.ts`: añadir `'PAUSADA'` a `estadosReserva`; quitar `.notNull()` de `contactoTipoDocumento`, `contactoNumeroDocumento`, `contactoCategoriaLicencia`, `contactoCorreo`; agregar `tokenAccesoPublico`, `fechaFinOriginal`, `fechaDevolucionReal`, `autorizadoSinDocumentosPorId`, `notaAutorizacionDocumentos`, `motivoCancelacion`, `canceladoPorId`, `canceladoEn`.
- `src/db/schema/contratos.ts`: añadir `'PAUSADO'` a `estadosContratoAlquiler`; quitar `.notNull()` de `arrendatarioTipoDocumento`, `arrendatarioNumeroDocumento`, `arrendatarioLicenciaNumero`, `arrendatarioLicenciaCategoria`, `arrendatarioCorreo`; agregar `clausulaEncargado`, `cargosOtrosLocal`, `detalleOtrosCargos`, `ajusteDescuentoLocal`, `autorizadoSinDocumentosPorId`, `motivoAnulacion`, `anuladoPorId`, `anuladoEn`.

- [ ] **Step 4: Crear `src/db/schema/eventos_alquiler.ts` y re-exportar en `src/db/schema/index.ts`**

Definir `tiposEventoAlquiler = ['PAUSA', 'REANUDACION', 'PRORROGA', 'DEVOLUCION_ANTICIPADA', 'SOBRECOSTO_CLAUSULA', 'AUTORIZACION_SIN_DOCS', 'CANCELACION', 'ANULACION', 'REAPERTURA'] as const` y `modalidadesTarifaEvento = ['SIN_COSTO', 'MISMO_PRECIO', 'TARIFA_ESTANDAR', 'PRECIO_PACTADO'] as const`. Incluir columnas `id`, `localId` (FK cascade `localesAlquiler`), `reservaId` (FK cascade `reservas`), `contratoId` (nullable FK `contratosAlquiler`), `vehiculoId` (FK `vehiculos`), `tipoEvento`, `diasDelta` (default `0`), `fechaBloqueoInicio`, `fechaBloqueoFin`, `modalidadTarifa`, `montoDelta` (default `0`), `clausulaOTexto`, `actorId` (FK `user.id`), `activo` (`boolean`, default `true`), `creadoEn`. Exportar tipos `$inferSelect` y `$inferInsert` y re-exportar en `src/db/schema/index.ts`.

- [ ] **Step 5: Actualizar permisos RBAC en `src/lib/auth/permisos.ts` y `src/lib/auth/rbac.ts`**

En `src/lib/auth/permisos.ts` agregar `CONTRATOS_PAUSAR: 'contratos:pausar'`. En `src/lib/auth/rbac.ts`, añadir `PERMISOS.CONTRATOS_ANULAR` y `PERMISOS.CONTRATOS_PAUSAR` a `ADMIN` (y confirmar que `SUPER_ADMIN` y `DUENO` lo incluyen por extensión de `LISTA_PERMISOS_CANONICOS` / rol dueño, mientras `PERMISOS_ASESOR` mantiene excluidos `CONTRATOS_PAUSAR`, `CONTRATOS_MODIFICAR_TARIFA`, `NOVEDADES_CARGOS_APROBAR`, `CONTRATOS_ANULAR` y `CAJA_GASTOS_REGISTRAR`).

- [ ] **Step 6: Ejecutar pruebas, generar migración SQL y sincronizar `docs/database.md` y `docs/user-flows.md`**

- Ejecutar: `node --import ./tests/register-loader.mjs --test tests/rbac_permisos_alquiler.test.ts` (Expected: PASS).
- Ejecutar: `pnpm db:generate` y revisar el `.sql` generado bajo `drizzle/` (sin recreaciones destructivas inesperadas).
- Actualizar `docs/database.md` (nuevas columnas, enums, tabla `eventos_alquiler` y diagrama Mermaid `erDiagram`) y `docs/user-flows.md` (§13 matriz RBAC con `CONTRATOS_ANULAR` para `ADMIN` y límites de `ASESOR`, más flujo de evaluación cliente vs cierre administrativo).

- [ ] **Step 7: Commit**

```bash
git add src/db/schema src/lib/auth/permisos.ts src/lib/auth/rbac.ts drizzle docs/database.md docs/user-flows.md tests/rbac_permisos_alquiler.test.ts
git commit -m "feat(db,rbac): agregar eventos_alquiler, estados de pausa/no-disponible y fronteras RBAC"
```

---

### Task 2: Disponibilidad Vehicular, Bloqueos `NO_DISPONIBLE`, Documentación Legal y Estado Físico

**Files:**
- Modify: `src/lib/flota/types.ts:70-105`
- Modify: `src/lib/flota/disponibilidad.ts:150-240,470-647`
- Modify: `src/lib/mantenimientos/repositorio.ts:95-210`
- Modify: `src/lib/flota/repositorio.ts:130-210`
- Modify: `src/lib/dashboard/resumen-admin.ts:45-75`
- Modify: `src/components/flota/FleetInventoryManager.tsx:30-90`
- Modify: `src/components/flota/disponibilidad/AvailabilityHeader.tsx:30-60`
- Modify: `src/components/alquiler/EditorialAvailabilityCalendar.tsx:95-115,380-415`
- Test: `tests/disponibilidad_vehiculo.test.ts`

**Interfaces:**
- Consumes: `eventosAlquiler`, `documentosVehiculo`, `estadosVehiculo` (Task 1)
- Produces:
  - `EstadoDiaCalendario` y `MotivoBloqueoDisponibilidad` incluyendo `'NO_DISPONIBLE'`
  - `EstadoDocumentalVehiculo`: `{ tieneVencidos: boolean; faltantesSinCarga: Array<'SOAT' | 'TECNICO_MECANICA'>; vencidos: Array<{ tipo: string; fechaVencimiento: string }>; requiereRtm: boolean }`
  - `obtenerEstadoDocumentalVehiculoD1(db: AppDb, vehiculoId: string, categoria: string, fechaReferenciaISO: string): Promise<EstadoDocumentalVehiculo>`
  - `verificarDisponibilidadVehiculo(db, vehiculoId, fechaInicio, fechaFin, hoyISO, reservaExcluirId?)` (incluye `PAUSADA`, soporta excluir una reserva al confirmar/pausar/prorrogar, y expone `estadoDocumental` sin bloquear cuando faltan filas aún no cargadas)

- [ ] **Step 1: Agregar casos fallidos a `tests/disponibilidad_vehiculo.test.ts`**

Añadir 3 tests al `describe` existente cubriendo:
1. Reserva en estado `'PAUSADA'` en D1 genera `BloqueNoDisponible` con `motivo: 'NO_DISPONIBLE'` y el día en `construirCalendarioMes` toma estado `'NO_DISPONIBLE'` (no `'RESERVADO'` ni `'DISPONIBLE'`).
2. `resolverEstadoActualVehiculo` retorna `'NO_DISPONIBLE'` cuando hay una reserva `'PAUSADA'` vigente hoy (prioridad por debajo de `FUERA_SERVICIO` y `EN_TALLER`, y por encima de `'DISPONIBLE'`).
3. `obtenerEstadoDocumentalVehiculoD1`: bloquea (`tieneVencidos: true`) cuando `SOAT` o `TECNICO_MECANICA` está vencido o `vigente === false`, exceptúa `TECNICO_MECANICA` cuando `categoria === 'PATINETA'`, y marca `tieneVencidos: false` + `faltantesSinCarga` cuando la tabla no tiene filas todavía.

- [ ] **Step 2: Ejecutar prueba para verificar que falla**

Run: `node --import ./tests/register-loader.mjs --test tests/disponibilidad_vehiculo.test.ts`
Expected: FAIL (`obtenerEstadoDocumentalVehiculoD1` no existe / `PAUSADA` no mapea a `'NO_DISPONIBLE'`).

- [ ] **Step 3: Implementar cambios de disponibilidad, estado físico, documental y catálogos UI**

- `src/lib/flota/types.ts`: añadir `'NO_DISPONIBLE'` a `MotivoBloqueoDisponibilidad` y `EstadoDiaCalendario`.
- `src/lib/flota/disponibilidad.ts`:
  - Incluir `'PAUSADA'` en el conjunto ocupante junto a `PENDIENTE`, `CONFIRMADA`, `EN_CURSO`.
  - En `obtenerBloquesNoDisponiblesD1`, consultar también eventos activos `'PAUSA'` si aplica o mapear reservas `'PAUSADA'` (y cualquier día dentro de su rango de bloqueo) con `motivo: 'NO_DISPONIBLE'` y `etiqueta: 'Vehículo no disponible (alquiler en pausa)'`.
  - Implementar `obtenerEstadoDocumentalVehiculoD1` y añadir parámetro opcional `reservaExcluirId?: string` a `verificarDisponibilidadVehiculo` para validar colisiones al confirmar, pausar o prorrogar sin colisionar contra la propia reserva.
- `src/lib/mantenimientos/repositorio.ts`: en `resolverEstadoActualVehiculo`, devolver `'NO_DISPONIBLE'` si existe reserva `'PAUSADA'` activa hoy (respetando prioridad `FUERA_SERVICIO` → `MANTENIMIENTO` → `PAUSADA` (`NO_DISPONIBLE`) → `RESERVADO` → `DISPONIBLE`).
- Actualizar mapas exhaustivos de estado `'NO_DISPONIBLE'` en `resumen-admin.ts`, `repositorio.ts`, `FleetInventoryManager.tsx`, `AvailabilityHeader.tsx` y `EditorialAvailabilityCalendar.tsx` (en el calendario, un día `'NO_DISPONIBLE'` es bloqueado igual que `'RESERVADO'` y exhibe estilo neutral oscuro con etiqueta clara).

- [ ] **Step 4: Ejecutar pruebas y verificar que pasan**

Run: `node --import ./tests/register-loader.mjs --test tests/disponibilidad_vehiculo.test.ts`
Expected: PASS en todos los casos antiguos y nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flota/types.ts src/lib/flota/disponibilidad.ts src/lib/mantenimientos/repositorio.ts src/lib/flota/repositorio.ts src/lib/dashboard/resumen-admin.ts src/components/flota src/components/alquiler/EditorialAvailabilityCalendar.tsx tests/disponibilidad_vehiculo.test.ts
git commit -m "feat(disponibilidad): bloquear dias pausados como NO_DISPONIBLE y exponer estado documental"
```

---

### Task 3: Reconciliación Real de Caja, Eliminación de `cacheCartera` y Garantías en D1

**Files:**
- Modify: `src/lib/caja/calculos.ts:20-70`
- Modify: `src/lib/caja/repositorio.ts:1-560,845-995`
- Modify: `src/actions/caja.ts:1-310`
- Modify: `tests/calculos_financieros.test.ts`
- Create: `tests/caja_reconciliacion.test.ts`

**Interfaces:**
- Consumes: `categoriasEgreso` (`'REEMBOLSO_ALQUILER'`) de Task 1
- Produces:
  - `esGastoOperativo(categoria)` excluyendo `'REEMBOLSO_ALQUILER'` junto a `'REEMBOLSO_GARANTIA'`
  - `calcularTotalPagadoNetoContrato(movimientos)`: ingresos confirmados en `['ABONO_CONTRATO', 'PAGO_ALQUILER', 'EXTENSION_ALQUILER', 'SERVICIOS_ADICIONALES', 'COBRO_DANOS_MULTAS']` menos egresos confirmados `'REEMBOLSO_ALQUILER'`
  - `resolverCuentaPorMetodoPago(cuentas, metodoPago, cuentaIdSolicitada?)`: mapea `'efectivo' | 'EFECTIVO'` → `'CAJA_EFECTIVO'` y `'transferencia' | 'tarjeta' | ...` → `'BANCO' | 'BILLETERA_DIGITAL'` (o la cuenta elegida verificada del `localId`)
  - `reconciliarSaldosContratoYReservaD1(db, localId, contratoId, reservaId)`

- [ ] **Step 1: Escribir pruebas fallidas de cálculos y repositorio de caja**

- En `tests/calculos_financieros.test.ts`: verificar que `esGastoOperativo('REEMBOLSO_ALQUILER') === false` y que un egreso `REEMBOLSO_ALQUILER` no infla los gastos operativos ni deja positivo el neto pagado.
- En `tests/caja_reconciliacion.test.ts`: probar que:
  1. `anularMovimientoRepo` rechaza cuando `movimiento.localId !== localId` sin alterar D1.
  2. Ante error lanzado por `db` en `registrarMovimientoRepo` o `anularMovimientoRepo`, la función **lanza error explícito** (no cae silenciosamente en `cacheCartera`).
  3. Invocar `anularMovimientoAction` o emitir `'REEMBOLSO_ALQUILER'` como `'ASESOR'` queda bloqueado por falta de `CAJA_GASTOS_REGISTRAR`.
  4. `obtenerEstadoFinancieroCompleto` utiliza `montoEsperado` real de `vehiculos.depositoGarantia`/`contratos_alquiler` en vez de `1500000` cuando el vehículo define otra fianza.

- [ ] **Step 2: Ejecutar pruebas para confirmar que fallan**

Run: `node --import ./tests/register-loader.mjs --test tests/calculos_financieros.test.ts tests/caja_reconciliacion.test.ts`
Expected: FAIL (`esGastoOperativo('REEMBOLSO_ALQUILER')` da `true`, `cacheCartera` oculta fallo o falta validación `localId`).

- [ ] **Step 3: Refactorizar `src/lib/caja/calculos.ts`, `src/lib/caja/repositorio.ts` y `src/actions/caja.ts`**

- `src/lib/caja/calculos.ts`: excluir `'REEMBOLSO_ALQUILER'` de `esGastoOperativo`; agregar función pura `calcularTotalPagadoNetoContrato` para reutilizarla tanto en caja como en `ciclo-alquiler.ts`.
- `src/lib/caja/repositorio.ts`:
  - Cuando `db` existe, **no escribir ni leer `cacheCartera`** y **propagar errores de D1** en lugar de tragar excepciones en memoria.
  - Exigir `localId` y validar pertenencia (`eq(tabla.localId, localId)`) en `anularMovimientoRepo`, `registrarAbonoRepo` y `gestionarGarantiaRepo`.
  - Tras confirmar o anular movimientos ligados a `contratoId`/`reservaId`, recalcular `totalPagado` neto desde D1 con `calcularTotalPagadoNetoContrato` y sincronizar `contratos_alquiler.totalPagado`, `contratos_alquiler.saldoPendiente`, `contratos_alquiler.estadoPago` y `reservas.montoAbonoReportado` vía `db.batch()`, registrando `auditoria_financiera`.
  - En `obtenerEstadoFinancieroCompleto`, reemplazar fallback `1500000` por lectura de `vehiculo.depositoGarantia` / `contrato` o `0` si no aplica fianza.
- `src/actions/caja.ts`: validar `tienePermiso(usuario, ...)` explícitamente (`CAJA_GASTOS_REGISTRAR` para egresos, reembolsos `REEMBOLSO_ALQUILER`/`REEMBOLSO_GARANTIA` y `anularMovimientoAction`; `CAJA_ABONOS_REGISTRAR` para `registrarAbonoAction`; proscribir explícitamente a `ASESOR` de reembolsos y anulaciones).

- [ ] **Step 4: Ejecutar pruebas y verificar que pasan**

Run: `node --import ./tests/register-loader.mjs --test tests/calculos_financieros.test.ts tests/caja_reconciliacion.test.ts`
Expected: PASS en todas las pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/lib/caja/calculos.ts src/lib/caja/repositorio.ts src/actions/caja.ts tests/calculos_financieros.test.ts tests/caja_reconciliacion.test.ts
git commit -m "fix(caja): reconciliar abonos, reembolsos y garantias en D1 sin cache en memoria"
```

---

### Task 4: Servicio del Ciclo — Inicio sin Fricción, Vinculación OTP, Confirmación, Inspección R2 y Entrega

**Files:**
- Create: `src/lib/flota/ciclo-alquiler.ts` (Parte 1: tipos de resultado/errores, inicio, OTP linking, confirmación, KYC rápido, inspección R2 y entrega)
- Modify: `src/lib/auth/index.ts:125-176`
- Modify: `src/lib/flota/repositorio-reservas.ts:1-260,310-405`
- Test: `tests/ciclo_alquiler_inicio_entrega.test.ts`

**Interfaces:**
- Consumes: schemas de Task 1, `verificarDisponibilidadVehiculo` y `obtenerEstadoDocumentalVehiculoD1` (Task 2), `calcularTotalPagadoNetoContrato`, `resolverCuentaPorMetodoPago` y `reconciliarSaldosContratoYReservaD1` (Task 3)
- Produces (todos exportados desde `src/lib/flota/ciclo-alquiler.ts`):
  - `class ErrorCicloAlquiler extends Error { readonly code: 'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR'; readonly detalle?: Record<string, unknown>; }`
  - `crearReservaConValidaciones(db: AppDb, input: CrearReservaCicloInput, contexto: ContextoActorCiclo): Promise<{ reserva: ReservaClienteItem; tokenAccesoPublico: string | null; advertenciasDocumentales: AdvertenciaDocumentalCiclo }>`
  - `vincularReservasHuerfanasPorCorreoD1(db: AppDb, userId: string, correo: string): Promise<number>`
  - `confirmarReservaD1(db: AppDb, params: ConfirmarReservaParams): Promise<ResultadoConfirmacion>` (devuelve `{ requiereAutorizacionSinDocs: true; advertencias }` si faltan docs y `autorizarSinDocumentos !== true`, o `{ requiereAutorizacionSinDocs: false; reserva }` tras crear `contratos_alquiler` `'BORRADOR'` + `depositos_garantia` `'PENDIENTE_RECIBIR'`)
  - `guardarInspeccionR2D1(db: AppDb, params: GuardarInspeccionR2Params): Promise<{ inspeccionId: string }>`
  - `entregarVehiculoConContratoD1(db: AppDb, params: EntregarVehiculoParams): Promise<{ reserva: ReservaClienteItem; contratoId: string }>`
  - `registrarOActualizarDocumentosClienteRapidoD1(db: AppDb, params: DocsClienteRapidoParams): Promise<{ ok: true }>`

- [ ] **Step 1: Escribir pruebas fallidas para inicio, vinculación OTP, confirmación sin entrega y entrega R2**

Crear `tests/ciclo_alquiler_inicio_entrega.test.ts` verificando:
1. **`crearReservaConValidaciones` (web):** ignora `totalCotizado`/`precioDiaCotizado` manipulados del cliente y recalcula contra D1 (`vehiculos.precioDia` + `politicas_local.coberturaPericialPct`); permite reservar sin cédula/pasaporte/licencia emitiendo `tokenAccesoPublico`, con `estado = 'PENDIENTE'` y bloquea vehículos `FUERA_SERVICIO` o con `SOAT` vencido.
2. **`crearReservaConValidaciones` (mostrador):** con `clienteId = null`, nombre + teléfono (sin correo/docs ni strings falsos), y estado inicial `'CONFIRMADA'` respeta `'CONFIRMADA'` directo creando contrato `BORRADOR` y movimiento real si hubo pago confirmado; nunca asigna `clienteId` al empleado creador.
3. **`vincularReservasHuerfanasPorCorreoD1`:** al pasar `'Usuario@Correo.COM '`, actualiza reservas con `clienteId IS NULL` y correo equivalente en minúsculas (+ sus contratos y garantías asociadas) a `userId`.
4. **`confirmarReservaD1`:** si el cliente no tiene documentos/KYC aprobado y `autorizarSinDocumentos !== true`, devuelve `requiereAutorizacionSinDocs: true` sin mutar D1; con `autorizarSinDocumentos: true`, pasa a `'CONFIRMADA'` (**no** `'EN_CURSO'`), inserta evento `'AUTORIZACION_SIN_DOCS'` y crea `contratos_alquiler` `'BORRADOR'` + `depositos_garantia` `'PENDIENTE_RECIBIR'`.
5. **`entregarVehiculoConContratoD1`:** pasa `CONFIRMADA → EN_CURSO`, actualiza contrato a `'VIGENTE'` con `fechaHoraEntregaReal`, sella acta `ENTREGA`, opcionalmente asienta fianza `RECIBIDO_CUSTODIA` + `DEPOSITO_GARANTIA`, y rechaza con `CONFLICT` un segundo intento sobre reserva ya `'EN_CURSO'`.

- [ ] **Step 2: Ejecutar prueba para verificar que falla**

Run: `node --import ./tests/register-loader.mjs --test tests/ciclo_alquiler_inicio_entrega.test.ts`
Expected: FAIL (`Cannot find module '../src/lib/flota/ciclo-alquiler.ts'`).

- [ ] **Step 3: Implementar Parte 1 de `src/lib/flota/ciclo-alquiler.ts`, arreglar mapeo en `repositorio-reservas.ts` y conectar hook OTP en `src/lib/auth/index.ts`**

- Extraer funciones pequeñas y cohesivas (cotización servidor, construcción de advertencias documentales de cliente/vehículo, token público aleatorio con Web Crypto `crypto.getRandomValues`, lotes `db.batch()`).
- En `src/lib/flota/repositorio-reservas.ts`: corregir `mapRowToReservaItem` para mapear `'CANCELADA' → 'CANCELADA'` (nunca `'RECHAZADA'`), adjuntar estado real de `depositos_garantia` en la línea 194, `tokenAccesoPublico` opcional y eventos recientes; actualizar `registrarCobroWaybillD1` para usar `resolverCuentaPorMetodoPago`, insertar `auditoria_financiera` y ejecutar `reconciliarSaldosContratoYReservaD1` actualizando `contratos_alquiler` y `reservas.montoAbonoReportado`.
- En `src/lib/auth/index.ts`: añadir `databaseHooks: { session: { create: { after: async (session) => { ... } } } }` leyendo el `user` correspondiente e invocando `vincularReservasHuerfanasPorCorreoD1(db, session.userId, user.email)` envuelto en `try/catch` con `getLogger`.

- [ ] **Step 4: Ejecutar pruebas y verificar que pasan**

Run: `node --import ./tests/register-loader.mjs --test tests/ciclo_alquiler_inicio_entrega.test.ts`
Expected: PASS en los 5 escenarios.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flota/ciclo-alquiler.ts src/lib/flota/repositorio-reservas.ts src/lib/auth/index.ts tests/ciclo_alquiler_inicio_entrega.test.ts
git commit -m "feat(alquiler): servicio unificado de reserva, vinculacion OTP, confirmacion y entrega R2"
```

---

### Task 5: Servicio del Ciclo — Pausa, Reanudación, Prórroga, Devolución Anticipada, Evaluación Cliente, Cancelación y Anulación

**Files:**
- Modify: `src/lib/flota/ciclo-alquiler.ts` (Parte 2: agregar transiciones activas, cierre, evaluación cliente, cancelación, anulación y reapertura)
- Modify: `src/lib/flota/reservas-cliente.ts:1-100,1015-1150`
- Test: `tests/ciclo_alquiler_transiciones.test.ts`

**Interfaces:**
- Consumes: `ErrorCicloAlquiler`, `verificarDisponibilidadVehiculo`, `resolverEstadoActualVehiculo`, `calcularTotalPagadoNetoContrato`, `PERMISOS`
- Produces (exportados en `src/lib/flota/ciclo-alquiler.ts`):
  - `pausarAlquilerD1(db, params)` (`EN_CURSO → PAUSADA`, `diasPausa` default `1`, `CONTRATOS_PAUSAR` excluyendo `ASESOR`)
  - `reanudarAlquilerD1(db, params)` (`PAUSADA → EN_CURSO`, `CONTRATOS_PAUSAR`)
  - `prorrogarAlquilerD1(db, params)` (`TARIFA_ESTANDAR` con `CONTRATOS_CREAR`; `MISMO_PRECIO`/`PRECIO_PACTADO` exigen `CONTRATOS_MODIFICAR_TARIFA`)
  - `devolverYCerrarAlquilerD1(db, params)` (`EN_CURSO`/`PAUSADA → COMPLETADA`, normal o anticipada, `clausulaEncargado`, `sobrecostoLocal`, `descuentoAjusteLocal`, gestión fianza, orden real `mantenimientos_vehiculo`)
  - `registrarEvaluacionEntregaClienteD1(db, params)` (valida propiedad/token, inserta solo en `evaluaciones_entrega_cliente`, nunca cambia estado a `COMPLETADA`)
  - `rechazarReservaD1(db, params)`, `cancelarReservaD1(db, params)`, `anularAlquilerD1(db, params)`, `reabrirReservaD1(db, params)`

- [ ] **Step 1: Escribir pruebas fallidas para todas las transiciones activas, RBAC y edge cases del Review Focus**

Crear `tests/ciclo_alquiler_transiciones.test.ts` probando:
1. **Pausa y Reanudación:** `ADMIN` pausa `EN_CURSO` por defecto `+1` día (o `+3` días) → `reservas.estado = 'PAUSADA'`, `fechaFin` extendida `+dias`, `fechaFinOriginal` preservada, `totalCotizado` y `totalLiquidado` intactos (`$0` delta), `vehiculos.estado = 'NO_DISPONIBLE'`, evento `'PAUSA'` activo. Si colisiona con otra reserva o taller → `CONFLICT` sin mutar D1. Con rol `'ASESOR'` → `FORBIDDEN`. Al reanudar (`ADMIN`), vuelve a `'EN_CURSO'` y marca evento de pausa inactivo.
2. **Prórroga en 3 modalidades + RBAC:** `ASESOR` puede aplicar `'TARIFA_ESTANDAR'`, pero recibe `FORBIDDEN` en `'MISMO_PRECIO'` y `'PRECIO_PACTADO'`. `ADMIN` aplica cualquiera de las 3, recalcula `totalLiquidado`/`saldoPendiente`/`estadoPago` (`PAGADO → PARCIAL` si genera saldo) e inserta `'PRORROGA'`; colisión → `CONFLICT`.
3. **Devolución anticipada (día 2 de 3) con cláusula, sobrecosto, taller y excedente:** `devolverYCerrarAlquilerD1` acorta `fechaFin` a `fechaDevolucionReal` manteniendo `fechaFinOriginal`, crea `RECEPCION` y evento `DEVOLUCION_ANTICIPADA`/`SOBRECOSTO_CLAUSULA`. `ASESOR` recibe `FORBIDDEN` si envía `sobrecostoLocal > 0`, `descuentoAjusteLocal > 0` o reembolso de caja. Si `descuentoAjusteLocal` deja `totalLiquidado < totalPagado`, exige resolución con `'REEMBOLSO_ALQUILER'` (permitido a `ADMIN`, prohibido a `ASESOR`) y rechaza saldos negativos. Si `requiereMantenimiento === true`, inserta orden en `mantenimientos_vehiculo` dejando la unidad en `'MANTENIMIENTO'`.
4. **Evaluación cliente sin cierre:** `registrarEvaluacionEntregaClienteD1` guarda en `evaluaciones_entrega_cliente` validando `clienteId` o `tokenAccesoPublico`, y conserva `reservas.estado` y `vehiculos.estado` intactos.
5. **Cancelación, anulación `ADMIN` y reapertura:** Invitado con `tokenAccesoPublico` correcto cancela `PENDIENTE` sin pagos; token incorrecto → `FORBIDDEN`. `ASESOR` no puede cancelar reserva `CONFIRMADA` ni anular contrato (`FORBIDDEN`). `ADMIN` ejecuta `anularAlquilerD1` (`CONTRATOS_ANULAR`) con resolución financiera (`REEMBOLSAR_EGRESO` / `ANULAR_MOVIMIENTOS` / `RETENER_SALDO_LOCAL`) → contrato `'ANULADO'`, reserva `'CANCELADA'`. `reabrirReservaD1` verifica disponibilidad y bloquea si otra reserva tomó el rango.

- [ ] **Step 2: Ejecutar prueba para verificar que falla**

Run: `node --import ./tests/register-loader.mjs --test tests/ciclo_alquiler_transiciones.test.ts`
Expected: FAIL (`pausarAlquilerD1` y demás funciones aún no exportadas).

- [ ] **Step 3: Implementar Parte 2 de `src/lib/flota/ciclo-alquiler.ts` y actualizar `src/lib/flota/reservas-cliente.ts`**

- En `src/lib/flota/reservas-cliente.ts`, añadir `'PAUSADA'` y `'CANCELADA'` a `EstadoReservaCliente` y asegurar que el fallback local de `registrarEntregaClienteConEvaluacion` jamás cambie `estado` a `'COMPLETADA'`.
- Implementar `pausarAlquilerD1`, `reanudarAlquilerD1`, `prorrogarAlquilerD1`, `devolverYCerrarAlquilerD1`, `registrarEvaluacionEntregaClienteD1`, `rechazarReservaD1`, `cancelarReservaD1`, `anularAlquilerD1` y `reabrirReservaD1` sobre helpers de validación RBAC compartidos y `db.batch()`.
- Garantizar copia explícita en mensajes/eventos de cierre: `"Las condiciones, ajustes y sobrecostos de devolución los establece el local."`

- [ ] **Step 4: Ejecutar pruebas y verificar que pasan**

Run: `node --import ./tests/register-loader.mjs --test tests/ciclo_alquiler_transiciones.test.ts`
Expected: PASS en todos los escenarios.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flota/ciclo-alquiler.ts src/lib/flota/reservas-cliente.ts tests/ciclo_alquiler_transiciones.test.ts
git commit -m "feat(alquiler): pausa sin costo, prorrogas, cierre anticipado, evaluacion cliente y anulacion"
```

---

### Task 6: Dashboard En-Proceso, Astro Actions, Middleware Token Invitado y Páginas SSR

**Files:**
- Modify: `src/lib/dashboard/alquileres-proceso.ts:120-451`
- Modify: `src/actions/reservas.ts:1-383`
- Modify: `src/actions/index.ts:35-106`
- Modify: `src/middleware.ts:20-40,229-240`
- Modify: `src/pages/admin/reservas/[codigo].astro:1-43`
- Modify: `src/pages/reservas/[codigo].astro:1-43`
- Modify: `src/pages/reservas/[codigo]/entrega.astro:1-50`
- Create: `tests/dashboard_proceso_y_guest.test.ts`

**Interfaces:**
- Consumes: todas las funciones de `src/lib/flota/ciclo-alquiler.ts` (Tasks 4 y 5), `tienePermiso` y `PERMISOS` (Task 1)
- Produces:
  - `CapacidadesOperacionAlquiler` (interfaz compartida calculada en SSR y recibida por `AlquilerDetalleView`): `{ puedeConfirmarRechazar: boolean; puedeEntregar: boolean; puedeGuardarInspeccionR2: boolean; puedePausar: boolean; puedeProrrogarEstandar: boolean; puedeAjustarTarifasYCargos: boolean; puedeReembolsarYAnularCaja: boolean; puedeAnularContrato: boolean; puedeGestionarGarantias: boolean; puedeGestionarTaller: boolean }`
  - `validarAccesoReservaLectura(reserva, usuario, tokenQuery?): boolean` (puro y testeable)
  - Acciones en `server.reservas`: `crearReserva`, `confirmarReserva`, `rechazarReserva`, `guardarInspeccionR2`, `entregarVehiculo`, `pausarAlquiler`, `reanudarAlquiler`, `prorrogarAlquiler`, `devolverYCerrarAlquiler`, `cancelarReserva`, `anularContrato`, `reabrirReserva`, `registrarCobroWaybill`, `registrarEntregaEvaluacion`, `registrarOActualizarDocumentosRapido`, `buscarClientesLocal`, `cambiarEstado` (delegando al servicio nuevo con RBAC + `localId`)

- [ ] **Step 1: Escribir pruebas fallidas para mapeo Dashboard y validación de acceso de invitados**

Crear `tests/dashboard_proceso_y_guest.test.ts` cubriendo:
1. `mapearReservaAAlquilerEnProceso`: `'PAUSADA'` → tarjeta `'PAUSADO'` con motivo legible; `'CONFIRMADA'` → `'EN_PROCESO'`; `'COMPLETADA'` → `'COMPLETADO'` con `completadoEn` derivado de `fechaHoraDevolucionReal`.
2. `validarAccesoReservaLectura`: permite acceso al colaborador del mismo `localId`, al cliente dueño (`usuario.id === reserva.clienteId`), o al invitado sin sesión **solo** si `tokenQuery` coincide exactamente con `reserva.tokenAccesoPublico`; rechaza token vacío, token erróneo u otro cliente ajeno.
3. Helper `esRutaDetalleConTokenPublico(pathname, searchParams)`: permite `/reservas/FLX-123` y `/reservas/FLX-123/entrega` con `?token=abc`, pero sigue protegiendo `/reservas`, `/perfil`, `/admin/*` y `/reservas/FLX-123` sin token.

- [ ] **Step 2: Ejecutar prueba para confirmar fallo**

Run: `node --import ./tests/register-loader.mjs --test tests/dashboard_proceso_y_guest.test.ts`
Expected: FAIL (`validarAccesoReservaLectura` no existe y `'PAUSADA'` no mapea a `'PAUSADO'`).

- [ ] **Step 3: Actualizar `alquileres-proceso.ts`, `src/actions/reservas.ts`, `src/middleware.ts` y las 3 páginas `[codigo]*.astro`**

- En `src/lib/dashboard/alquileres-proceso.ts`: consultar también `'PAUSADA'` y `'COMPLETADA'` recientes, ajustar `mapearReservaAAlquilerEnProceso` con las 4 etapas reales (docs/autorización, abono/garantía real, R2 salida, contrato/entrega).
- En `src/actions/reservas.ts` y `src/actions/index.ts`: definir inputs Zod 4 estrictos (`z.email({ error })` cuando presente, fechas `YYYY-MM-DD`, montos enteros `>= 0`) y traducir `ErrorCicloAlquiler` a `ActionError({ code, message })`; exponer todas las acciones nuevas en `server.reservas`; validar `localId` y `PERMISOS` en cada handler sin omitir `cambiarEstadoReservaAction`.
- En `src/middleware.ts`: extraer `esRutaDetalleConTokenPublico` para no redirigir a `/login` en `/reservas/<codigo>` o `/reservas/<codigo>/entrega` cuando trae `?token=...` no vacío (sin abrir `/reservas` raíz ni `/admin`).
- En `/admin/reservas/[codigo].astro`, `/reservas/[codigo].astro` y `/reservas/[codigo]/entrega.astro` (`<150 LOC` cada una): validar acceso con `validarAccesoReservaLectura`, consultar lista de `cuentasFinancieras` activas del local para modales de caja en detalle admin, calcular `capacidades` vía `tienePermiso(...)` y pasarlas como props a React.

- [ ] **Step 4: Ejecutar pruebas y verificar que pasan**

Run: `node --import ./tests/register-loader.mjs --test tests/dashboard_proceso_y_guest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/alquileres-proceso.ts src/actions/reservas.ts src/actions/index.ts src/middleware.ts src/pages/admin/reservas/\[codigo\].astro src/pages/reservas/\[codigo\].astro src/pages/reservas/\[codigo\]/entrega.astro tests/dashboard_proceso_y_guest.test.ts
git commit -m "feat(actions,ssr): exponer acciones de ciclo, capacidades RBAC y rutas con token invitado"
```

---

### Task 7: Superficies UI React 19 y Página `/admin/operaciones`

**Files:**
- Modify: `src/components/alquiler/RentalWizardFlow.tsx`
- Modify: `src/components/reservas/MisReservasHub.tsx`
- Modify: `src/components/reservas/VehiculoEntregaWizard.tsx`
- Create: `src/components/reservas/SemaforoDocumentalPanel.tsx`
- Create: `src/components/reservas/AlquilerCicloModals.tsx`
- Modify: `src/components/reservas/AlquilerDetalleView.tsx`
- Modify: `src/components/dashboard/AlquilerEnProcesoCard.tsx`
- Modify: `src/pages/admin/operaciones/index.astro`

**Interfaces:**
- Consumes: `server.reservas.*`, `server.caja.*`, `CapacidadesOperacionAlquiler` (Task 6), tipos de `src/lib/flota` (Tasks 1–5)
- Produces: flujos cliente y admin completos con paridad real D1, feedback inline sin cierres prematuros ni actualizaciones optimistas engañosas, cumplimiento de paleta Movix (5 neutros), inputs `text-base` (`>= 16px`) y targets `>= 44px`.

- [ ] **Step 1: Actualizar `RentalWizardFlow.tsx` (flujo web sin fricción documental + token invitado)**

- En Paso 1, si el vehículo tiene documento legal vencido, mostrar badge `"En actualización de documentos"` y bloquear avance.
- En Paso 2, exigir nombre, teléfono y correo (`z.email` / HTML5), manteniendo tipo/número de documento y categoría de licencia **opcionales** con aviso claro de revisión en patio.
- En Paso 4, enviar `referenciaAbonoInicial` y `localId`/`sedeNombre` reales del local activo; al radicar como invitado sin sesión, incluir botón `"Ver mi reserva"` enlazando `/reservas/[codigo]?token=[tokenAccesoPublico]` usando `navigate(...)`.

- [ ] **Step 2: Actualizar `MisReservasHub.tsx` y `VehiculoEntregaWizard.tsx`**

- En `MisReservasHub.tsx`:
  - Eliminar fallback `FLOTA_CANONICA` mostrando estado vacío accionable hacia inventario.
  - Agregar pestaña/filtro real `CANCELADA` separada de `RECHAZADA`.
  - En modal de nueva reserva de mostrador: incluir buscador real de clientes del local (`actions.reservas.buscarClientesLocal` con badge KYC) + modo walk-in mínimo (solo nombre y teléfono obligatorios; correo y docs opcionales, nunca `'mostrador@flotax.co'`), conectar realmente `Confirmada directa` al parámetro de creación y mostrar error inline sin cerrar modal si falla.
- En `VehiculoEntregaWizard.tsx`:
  - En modo cliente: invocar `actions.reservas.registrarEntregaEvaluacion` (incluyendo `tokenAccesoPublico` cuando aplique), actualizar el copy final dejando explícito que su evaluación/chequeo previo fue enviado y que administración validará la recepción, caja y liberación de fianza (**sin** marcar `COMPLETADA`).
  - En modo operador: redirigir al flujo real de cierre/recepción administrativa en `/admin/reservas/[codigo]` (no ejecutar cierre prematuro cliente).

- [ ] **Step 3: Construir `SemaforoDocumentalPanel.tsx`, `AlquilerCicloModals.tsx` y actualizar `AlquilerDetalleView.tsx`**

- `SemaforoDocumentalPanel.tsx`: muestra alertas visibles de documentos/KYC faltantes del cliente y estado de `SOAT`/`TECNICO_MECANICA` del vehículo; permite **Registrar/Aprobar datos rápidos** (`registrarOActualizarDocumentosRapido`) o activar el check explícito **Autorizar bajo responsabilidad del local** al confirmar/entregar.
- `AlquilerCicloModals.tsx`: modales/bottom-sheets táctiles Movix para **Pausar** (`+1` día por defecto o `+2`/`+N`, costo `$0`, motivo), **Prorrogar** (`+1/+N` días; oculta `'MISMO_PRECIO'` y `'PRECIO_PACTADO'` cuando `!capacidades.puedeAjustarTarifasYCargos`), **Devolver y Cerrar** (fecha real editable para devolución anticipada, copia visible `"Las condiciones, ajustes y sobrecostos de devolución los establece el local"`, cláusula + `sobrecostoLocal`/`descuentoAjusteLocal` solo visibles con `puedeAjustarTarifasYCargos`, liquidación de saldo o `REEMBOLSO_ALQUILER` con `puedeReembolsarYAnularCaja`, resolución de garantía y toggle de mantenimiento real en taller) y **Cancelar / Anular** (`motivo` obligatorio + resolución financiera explícita si hay dinero/garantía).
- `AlquilerDetalleView.tsx`: eliminar errores tragados y estados optimistas previos a D1; habilitar botones exclusivamente según `capacidades` RBAC; persistir dictamen/edición de puntos R2 (`guardarInspeccionR2`) y estado de garantía (`gestionarGarantia`); agregar acciones **Confirmar Reserva**, **Entregar (Contrato `VIGENTE` + Fianza)**, **Pausar**, **Reanudar**, **Prorrogar**, **Devolver/Cerrar**, **Cancelar**, **Anular Contrato** y **Reabrir**.

- [ ] **Step 4: Actualizar `AlquilerEnProcesoCard.tsx` y `/admin/operaciones/index.astro`**

- `AlquilerEnProcesoCard.tsx`: renderizar motivo legible cuando está en `'PAUSADO'` (ej. `'Alquiler pausado por acuerdo'`) y fecha de cierre cuando está en `'COMPLETADO'`.
- `src/pages/admin/operaciones/index.astro` (`<150 LOC`): consultar de D1 reservas activas del local (`CONFIRMADA`, `EN_CURSO`, `PAUSADA`) e inspecciones R2 recientes y enlazar directamente a `/admin/reservas/[codigo]`, eliminando el cascarón estático y el enlace roto `/admin/operaciones/nueva`.

- [ ] **Step 5: Commit de UI y páginas**

```bash
git add src/components/alquiler/RentalWizardFlow.tsx src/components/reservas src/components/dashboard/AlquilerEnProcesoCard.tsx src/pages/admin/operaciones/index.astro
git commit -m "feat(ui): adaptar wizard cliente, mostrador, detalle R2, modales RBAC y operaciones"
```

---

### Task 8: Verificación Completa, Sincronización de Índices y Gates Finales

**Files:**
- Review/Update (si aplica): `**/INDEX.md` vía `pnpm index:sync`

- [ ] **Step 1: Sincronizar índices de directorio si corresponde**

Run: `pnpm index:sync`
Expected: Actualiza cualquier `INDEX.md` afectado por nuevos archivos (`eventos_alquiler.ts`, `ciclo-alquiler.ts`, `AlquilerCicloModals.tsx`, `SemaforoDocumentalPanel.tsx`, tests).

- [ ] **Step 2: Ejecutar suite completa de pruebas**

Run: `pnpm test`
Expected: `fail 0`, `cancelled 0`, `skipped 0`, todas las suites anteriores y las nuevas pasando.

- [ ] **Step 3: Ejecutar verificación estricta de tipos Astro + TypeScript (`pnpm check`)**

Run: `pnpm check`
Expected:
```text
Result (X files):
- 0 errors
- 0 warnings
- 0 hints
```
Si existe cualquier error/warning/hint (incluyendo `TS6385`/`TS6387` o campos faltantes por nuevos enums), corregir en origen antes de continuar.

- [ ] **Step 4: Ejecutar compilación SSR para Cloudflare (`pnpm build`) y auditoría de interacciones**

Run: `pnpm audit:interactions && pnpm build`
Expected: Ambos comandos finalizan con código `0` y bundle SSR generado sin errores.

- [ ] **Step 5: Commit final de verificación/índices**

```bash
git add -A
git commit -m "chore: sincronizar indices tras verificacion completa del ciclo de alquiler"
```
