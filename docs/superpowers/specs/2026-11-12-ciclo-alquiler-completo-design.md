# Diseño: Auditoría y Refactorización Integral del Ciclo de Alquiler en FlotaX

**Fecha:** 2026-11-12  
**Estado:** Listo para revisión y aprobación del usuario  
**Tamaño del trabajo:** Proyecto completo (esquema D1 + capa de servicio + caja/disponibilidad + acciones + 6 superficies UI)  
**Enfoque elegido:** Enfoque B — Servicio unificado del ciclo de alquiler + bitácora auditable de eventos/ajustes + persistencia atómica con `db.batch()`

---

## 1. Propósito y Por Qué

Al auditar cada botón y función desde que se inicia un alquiler hasta que concluye (incluyendo confirmación, pausa, extensión, inspección, devolución, liquidación de caja/fianza, cancelación y anulación), el código actual presenta quiebres graves entre lo que la interfaz promete y lo que realmente ocurre en Cloudflare D1:

1. **Contratos y garantías nunca se crean en D1:** `crearContratoAlquilerD1` y `crearDepositoGarantiaD1` existen en `src/lib/flota/repositorio-reservas.ts` sin llamadores. No se crea registro en `contratos_alquiler` ni en `depositos_garantia` al confirmar ni al entregar.
2. **Inicio de alquiler desconectado del cliente real y de validaciones:** `MisReservasHub.tsx` ignora el selector `Confirmada directa` (siempre guarda `PENDIENTE`), inyecta datos ficticios (`'Cliente Presencial Patio'`, `'mostrador@flotax.co'`) y asigna `clienteId` al operador autenticado. `crearReservaAction` confía en precios calculados en cliente y no valida `vehiculos.activo`, estado `FUERA_SERVICIO` ni documentos vencidos (`documentos_vehiculo`). `RentalWizardFlow.tsx` no permite reservar sin cédula/licencia ni captura correo para invitados, y descarta `referenciaComprobante`.
3. **Inspección R2 y garantías simuladas en React:** En `AlquilerDetalleView.tsx`, los botones de dictamen R2, edición de dictamen, ajustes de odómetro/carga y estado de garantía (`En custodia`, `Liberar`, `Retener`) mutan solo estado local en React.
4. **Devolución y máquina de estados rotas:** El botón de entrega enlaza a `VehiculoEntregaWizard.tsx`, que cierra cualquier reserva como `COMPLETADA` desde cualquier estado previo; `Registrar devolución y cerrar contrato` optimísticamente fuerza `montoReportado = totalAlquiler`; `cambiarEstadoReservaD1` no cierra `contratos_alquiler`, coloca el vehículo en `MANTENIMIENTO` sin crear orden en `mantenimientos_vehiculo` (lo cual `resolverEstadoActualVehiculo` sobreescribe luego a `DISPONIBLE`), y `cambiarEstadoReservaAction` no valida permisos ni `localId`.
5. **Caja y cartera desincronizadas:** `registrarCobroWaybillD1` inserta un ingreso sin actualizar `reservas.montoAbonoReportado` ni `contratos_alquiler`. En `src/lib/caja/repositorio.ts`, `registrarMovimientoRepo` y `anularMovimientoRepo` actualizan únicamente `cacheCartera` en RAM, tragan fallos de D1 y no validan pertenencia al `localId`.
6. **Capacidades de negocio faltantes:** No existen acciones reales para pausar/reanudar alquileres (`PAUSADA` / bloqueo de calendario sin costo), prorrogar días (3 modalidades de precio), devolver anticipadamente con cláusula/sobrecosto definido por el local, cancelar reserva (`CANCELADA`) ni anular contrato (`ANULADO`), y `/admin/operaciones/nueva` es una ruta inexistente.

El objetivo es que **cada botón y acción** en ambos portales (cliente y administración) valide las reglas reales del negocio, ejecute transiciones atómicas en D1 y mantenga coherentes **reserva, contrato, caja, depósito de garantía, historial de eventos, estado de tarjeta en dashboard y disponibilidad vehicular**.

---

## 2. Metas, No-Metas y Anti-Metas

### Metas
- **Reserva sin fricción para el cliente:** Permitir crear solicitudes `PENDIENTE` incluso si el cliente aún no tiene cédula, pasaporte o licencia registrados, con pago inicial opcional antes de recoger el vehículo.
- **Decisión informada del local/flota:** Exponer de forma visible en mostrador y detalle la situación documental del cliente (KYC, documentos faltantes, categoría de licencia) y del vehículo (`SOAT`, `TECNICO_MECANICA`), bloqueando conflictos reales de disponibilidad física pero dejando en manos de administración/flota la decisión de aprobar/entregar (con registro explícito del responsable si autoriza sin KYC completo).
- **Confirmación separada de entrega:** Permitir confirmar una reserva (`CONFIRMADA`) tras atención presencial o remota sin pasar aún a `EN_CURSO`, manteniendo los abonos previos trazados en caja.
- **Ciclo activo completo:** Soportar **entrega R2 + contrato `VIGENTE` + fianza (`EN_CURSO`)**, **pausa por acuerdo (`PAUSADA`)** con `+1` día por defecto (`+2`/`+N` elegibles) de bloqueo como vehículo `NO_DISPONIBLE` sin costo adicional, **reanudación**, **prórroga** (`+1`/`+N` días al mismo precio, tarifa estándar o precio pactado), y **devolución normal o anticipada (`COMPLETADA`)** con cláusula y sobrecosto/ajuste definidos libremente por el local.
- **Reconciliación financiera y cancelación/anulación seguras:** Mantener `movimientos_caja`, `depositos_garantia` y saldos de `contratos_alquiler`/`reservas` 100% sincronizados en D1; exigir decisión explícita en caja cuando se cancele o anule un alquiler que ya tuvo ingresos o fianza.

### No-Metas
- Pasarela de pagos automática en línea (webhooks PSE/Nequi); se registra la referencia reportada y administración concilia/confirma el recaudo en caja.
- Facturación electrónica tributaria (DIAN) o generación automática de PDF legales complejos fuera de los registros existentes.
- Recargos, multas o penalidades automáticas calculadas/impuestas por la aplicación ante devoluciones anticipadas o pausas: todas las condiciones y sobrecostos los fija el local.

### Anti-Metas
- Mutar estado de UI de forma optimista ignorando errores del servidor (`res.error`) o asumiendo `totalPagado = totalAlquiler` sin ingreso real.
- Confiar en totales, precios diarios o descuentos enviados por el navegador en lugar de recalcularlos/validarlos en servidor contra D1 y las reglas del local.
- Usar `cacheCartera` en memoria o `FLOTA_CANONICA` como fallback que oculte fallos o vacíos reales de D1.
- Bloquear al administrador para que no pueda atender un cliente sin documentos registrados cuando el local decida autorizar el alquiler bajo su responsabilidad.

---

## 3. Restricciones del Proyecto

- **Stack canónico:** Astro 7 SSR (`@astrojs/cloudflare`), React 19 islands (`.tsx`), Tailwind CSS v4 (`@tailwindcss/vite`), Cloudflare D1 + Drizzle ORM (`drizzle-orm/d1`), Zod v4 (`z.email()`, `{ error: ... }`), `cloudflare:workers` (`env.DB`, `env.BUCKET_MULTIMEDIA`).
- **Atomicidad en D1:** Cloudflare D1 no soporta transacciones SQL interactivas `BEGIN/COMMIT`, por lo que las mutaciones multi-tabla críticas deben ejecutarse mediante **`db.batch([...])`** validando precondiciones antes del lote y verificando inconsistencias.
- **Límites SQLite/D1:** Evitar consultas o `SELECT` que excedan 100 columnas vinculadas; mantener proyecciones explícitas como en `src/lib/caja/repositorio.ts`.
- **Gobernanza del repo:** Páginas `.astro` `<150 LOC`, tipado estricto E2E Drizzle `$inferSelect`/`$inferInsert` sin `as any`, paleta Movix exclusivamente de 5 neutros (`#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`), inputs móviles `>= 16px` (`text-base`), objetivos táctiles `>= 44x44px`, actualización obligatoria de `docs/database.md` y diagrama Mermaid ante cambios de esquema, y validación final con `pnpm check` (0 errores, 0 warnings, 0 hints) + `pnpm build`.

---

## 4. Enfoques Considerados

1. **Enfoque A — Extensión directa sobre `reservas` y `contratos_alquiler`:** Agregar `'PAUSADA'` y columnas mínimas a esas dos tablas sin tabla histórica. Descartado porque sobrescribir fechas/totales en una sola fila impide auditar múltiples pausas/prórrogas/ajustes combinados y dificulta distinguir días de pausa no disponible frente a días de reserva en el calendario.
2. **Enfoque B (Elegido) — Servicio unificado del ciclo de alquiler + tabla de eventos/ajustes + `db.batch()`:** Centraliza todas las transiciones, validaciones y cálculos financieros en `src/lib/flota/ciclo-alquiler.ts`, registra cada evento operativo (pausa con rango de bloqueo, prórroga con modalidad, sobrecosto/cláusula del local, autorización sin documentos, cancelación/anulación) en una tabla `eventos_alquiler`, elimina el caché en memoria de caja en D1 y ejecuta los cambios atómicamente con `db.batch()`. Elegido por balance óptimo entre auditabilidad real para el local, integridad financiera y simplicidad operativa.
3. **Enfoque C — Bloqueos polimórficos genéricos y adendas contractuales separadas:** Crear documentos/adendas inmutables independientes y tabla polimórfica de bloqueos. Descartado por duplicar fuentes de verdad frente a `reservas`, `contratos_alquiler` y `mantenimientos_vehiculo` ya existentes.

---

## 5. Diseño Detallado

### 5.1 Máquina de Estados Completa e Invariantes

#### A. Estados de Reserva (`reservas.estado`)
Se extiende el enum en `src/db/schema/reservas.ts` y `EstadoReservaCliente` en `src/lib/flota/reservas-cliente.ts`:
- `PENDIENTE`: Solicitud radicada (cliente u operador). Permite pago inicial opcional (`PENDIENTE` en caja hasta verificación o `CONFIRMADO` si recaudó en mostrador) y cliente sin documentos cargados. Bloquea calendario.
- `CONFIRMADA`: Validada comercialmente por el local (presencial o remoto) sin entregar todavía la unidad. Puede tener pago parcial o 100%, y puede haberse creado contrato `BORRADOR` con o sin KYC completo. Sigue bloqueando calendario.
- `EN_CURSO`: Vehículo entregado físicamente tras inspección de salida (`ENTREGA`), contrato `VIGENTE` creado/firmado y hora real de entrega registrada (`fechaHoraEntregaReal`).
- `PAUSADA`: Alquiler detenido temporalmente por acuerdo entre cliente y local. Vehículo marcado `NO_DISPONIBLE`, **no puede alquilarse** y suma bloqueo de calendario (`+1` día por defecto, o `+N` días elegidos) con `$0` de costo adicional.
- `COMPLETADA`: Vehículo devuelto (en fecha pactada o de forma anticipada), acta de recepción/cierre registrada, contrato cerrado (`CERRADO_PAZ_Y_SALVO` si `saldoPendiente === 0` o `CERRADO_CON_SALDO` si queda saldo/acuerdo), fianza resuelta o dejada explícitamente en custodia/revisión, y días futuros desde el día siguiente a la devolución real liberados (o unidad en taller si se creó orden en `mantenimientos_vehiculo`).
- `CANCELADA`: Cancelación formal antes de finalizar el contrato (`PENDIENTE`, `CONFIRMADA`; también tras resolución de dinero si ya había pagos). Libera inmediatamente todas las fechas en calendario y pasa `contratos_alquiler` (si existía en borrador) a `ANULADO`. Se elimina el mapeo incorrecto `CANCELADA → RECHAZADA`.
- `RECHAZADA`: Solicitud `PENDIENTE` denegada por el local con motivo obligatorio. Libera fechas en calendario.

#### B. Estados de Contrato (`contratos_alquiler.estadoContrato`)
Se extiende en `src/db/schema/contratos.ts` agregando `'PAUSADO'`:
`BORRADOR` (opcional al confirmar/preparar cobro previo) → `VIGENTE` (al entregar `EN_CURSO`) ↔ `PAUSADO` (al pausar/reanudar) → `CERRADO_PAZ_Y_SALVO` / `CERRADO_CON_SALDO` / `INCUMPLIMIENTO_PENAL` (al devolver/liquidar) | `ANULADO` (al anular contrato).

#### C. Estados de Vehículo (`vehiculos.estado`) y Calendario (`BloqueNoDisponible`)
- Se extiende `estadosVehiculo` en `src/db/schema/vehiculos.ts`: `['DISPONIBLE', 'RESERVADO', 'NO_DISPONIBLE', 'MANTENIMIENTO', 'FUERA_SERVICIO']`.
- Invariante en `resolverEstadoActualVehiculo` (`src/lib/mantenimientos/repositorio.ts`):
  1. `FUERA_SERVICIO` se respeta siempre.
  2. Si existe orden activa hoy (`EN_TALLER` o `PROGRAMADO` cubriendo `hoyISO`) en `mantenimientos_vehiculo` → `'MANTENIMIENTO'`.
  3. Si existe reserva en `'PAUSADA'` cubriendo hoy o `EN_CURSO`/`PAUSADA` activa pendiente de devolución → si la más prioritaria hoy está `'PAUSADA'`, estado físico = **`'NO_DISPONIBLE'`** ("No disponible · En pausa", nunca `'DISPONIBLE'` ni mostrado como nueva reserva); si está `'EN_CURSO'`, `'CONFIRMADA'` o `'PENDIENTE'` vigente hoy → `'RESERVADO'`.
  4. En cualquier otro caso → `'DISPONIBLE'`.
- Invariante en `obtenerBloquesNoDisponiblesD1` y `verificarDisponibilidadVehiculo` (`src/lib/flota/disponibilidad.ts`):
  - Reservas consideradas ocupantes: `['PENDIENTE', 'CONFIRMADA', 'EN_CURSO', 'PAUSADA']`.
  - Si `reserva.estado === 'PAUSADA'` o un día cae dentro de un evento activo tipo `'PAUSA'`, el bloque de calendario lleva `motivo: 'NO_DISPONIBLE'` y etiqueta `'Vehículo no disponible (alquiler en pausa)'` en lugar de `'Reserva confirmada'`.

#### D. Estados en Tarjeta Dashboard (`AlquilerEnProcesoCard.tsx` y `alquileres-proceso.ts`)
- Se incluyen en la consulta `listarAlquileresEnProcesoD1` reservas activas y recién cerradas del local (`PENDIENTE`, `CONFIRMADA`, `EN_CURSO`, `PAUSADA`, y `COMPLETADA` reciente dentro de la ventana de visibilidad `ocultarCompletadoHoras`).
- Mapeo explícito y consistente:
  - `'PAUSADO'`: cuando `reserva.estado === 'PAUSADA'`, o cuando `verificacion.estado === 'RECHAZADO'`, o `contrato.estadoContrato === 'ANULADO'`, o si supera `pausadoSinRespuestaHoras` esperando acción. Muestra motivo claro (ej. `'Alquiler pausado por acuerdo'`).
  - `'EN_PROCESO'`: cuando está en `PENDIENTE`, `CONFIRMADA` o `EN_CURSO` ejecutándose. Sus 4 etapas muestran el avance real: 1) Documentos/autorización admin, 2) Abono y garantía real en caja/depósito, 3) Inspección R2 de salida, 4) Firma/contrato y entrega física (`EN_CURSO`).
  - `'COMPLETADO'`: cuando el alquiler terminó (`reserva.estado === 'COMPLETADA'`) con fecha real de cierre (`completadoEn` = `fechaHoraDevolucionReal ?? reserva.actualizadoEn`), permitiendo ver el cierre recién completado antes de archivarse automáticamente.

---

### 5.2 Cambios de Esquema D1 y Documentación

1. **`src/db/schema/vehiculos.ts`:**
   - Añadir `'NO_DISPONIBLE'` a `estadosVehiculo`.
2. **`src/db/schema/caja.ts`:**
   - Añadir `'REEMBOLSO_ALQUILER'` a `categoriasEgreso` (excluido de gastos operativos en `src/lib/caja/calculos.ts` igual que `'REEMBOLSO_GARANTIA'`, pero reflejando el egreso real de caja y descontando el total neto pagado en contrato/reserva).
3. **`src/db/schema/reservas.ts`:**
   - Añadir `'PAUSADA'` a `estadosReserva`.
   - Hacer nullable `contactoTipoDocumento`, `contactoNumeroDocumento`, `contactoCategoriaLicencia` y `contactoCorreo` para permitir tanto reservas web de clientes sin documentos como clientes presenciales en mostrador sin cuenta ni correo electrónico (manteniendo obligatoriedad de `contactoCorreo` mediante Zod únicamente en el wizard web `/alquilar/[id]`).
   - Añadir columnas de control de ciclo y seguridad de invitados:
     - `tokenAccesoPublico: text('token_acceso_publico')` (token firmado/opaco para consultar o cancelar reservas web creadas sin sesión).
     - `fechaFinOriginal: text('fecha_fin_original')` (YYYY-MM-DD, inicializada igual a `fechaFin` al crear).
     - `fechaDevolucionReal: text('fecha_devolucion_real')` (YYYY-MM-DD al cerrar anticipada o normalmente).
     - `autorizadoSinDocumentosPorId: text('autorizado_sin_documentos_por_id').references(() => user.id)`
     - `notaAutorizacionDocumentos: text('nota_autorizacion_documentos')`
     - `motivoCancelacion: text('motivo_cancelacion')`
     - `canceladoPorId: text('cancelado_por_id').references(() => user.id)`
     - `canceladoEn: integer('cancelado_en', { mode: 'timestamp' })`
4. **`src/db/schema/contratos.ts`:**
   - Añadir `'PAUSADO'` a `estadosContratoAlquiler`.
   - Hacer nullable `arrendatarioTipoDocumento`, `arrendatarioNumeroDocumento`, `arrendatarioLicenciaNumero`, `arrendatarioLicenciaCategoria` y `arrendatarioCorreo`.
   - Añadir campos del local/autorización:
     - `clausulaEncargado: text('clausula_encargado')`
     - `cargosOtrosLocal: integer('cargos_otros_local').notNull().default(0)`
     - `detalleOtrosCargos: text('detalle_otros_cargos')`
     - `ajusteDescuentoLocal: integer('ajuste_descuento_local').notNull().default(0)`
     - `autorizadoSinDocumentosPorId: text('autorizado_sin_documentos_por_id').references(() => user.id)`
     - `motivoAnulacion: text('motivo_anulacion')`
     - `anuladoPorId: text('anulado_por_id').references(() => user.id)`
     - `anuladoEn: integer('anulado_en', { mode: 'timestamp' })`
5. **Nueva tabla `src/db/schema/eventos_alquiler.ts`** (re-exportada en `src/db/schema/index.ts`):
   - `eventosAlquiler` (`eventos_alquiler`):
     - `id`, `localId` (FK `locales_alquiler`), `reservaId` (FK `reservas`), `contratoId` (nullable FK `contratos_alquiler`), `vehiculoId` (FK `vehiculos`).
     - `tipoEvento`: `'PAUSA' | 'REANUDACION' | 'PRORROGA' | 'DEVOLUCION_ANTICIPADA' | 'SOBRECOSTO_CLAUSULA' | 'AUTORIZACION_SIN_DOCS' | 'CANCELACION' | 'ANULACION' | 'REAPERTURA'`.
     - `diasDelta: integer` (default `0`; `+1/+N` en pausa o prórroga, negativo/días liberados al devolver antes).
     - `fechaBloqueoInicio: text`, `fechaBloqueoFin: text` (YYYY-MM-DD para reflejar exactamente los días añadidos en pausa).
     - `modalidadTarifa: text` (`'SIN_COSTO' | 'MISMO_PRECIO' | 'TARIFA_ESTANDAR' | 'PRECIO_PACTADO'`, nullable).
     - `montoDelta: integer` (default `0`, en COP; positivo para cargo/prórroga pagada, negativo para ajuste/descuento).
     - `clausulaOTexto: text` (texto libre de cláusula, motivo de pausa, motivo de sobrecosto o nota del local).
     - `actorId: text` (FK `user.id`), `activo: boolean` (default `true`), `creadoEn: timestamp`.
6. **Permisos RBAC (`src/lib/auth/permisos.ts` y `src/lib/auth/rbac.ts`):**
   - Otorgar `PERMISOS.CONTRATOS_ANULAR` también al rol `'ADMIN'` (además de `'DUENO'` y `'SUPER_ADMIN'`), habilitando al administrador para anular contratos.
   - Incorporar `PERMISOS.CONTRATOS_PAUSAR` asignado exclusivamente a `'SUPER_ADMIN'`, `'DUENO'` y `'ADMIN'` (**prohibido** para `'ASESOR'`).
   - Restringir expresamente al rol `'ASESOR'`: no puede aplicar pausas (`CONTRATOS_PAUSAR`), ni prórrogas con ajuste de tarifa (`'MISMO_PRECIO'` o `'PRECIO_PACTADO'`, gobernadas por `CONTRATOS_MODIFICAR_TARIFA`), ni descuentos o sobrecostos de cierre (`CONTRATOS_MODIFICAR_TARIFA` / `NOVEDADES_CARGOS_APROBAR`), ni reembolsos o anulaciones en caja (`CAJA_GASTOS_REGISTRAR`). El asesor conserva confirmación, entrega/contrato estándar, inspección R2, prórroga estricta a `'TARIFA_ESTANDAR'`, abonos y cierre normal sin sobrecostos, descuentos ni reembolsos.
7. **Migración y documentación:** Generar migración SQL con `pnpm db:generate` y actualizar `docs/database.md` y diagrama Mermaid en el mismo paso (junto con la matriz RBAC y flujos de `docs/user-flows.md` para reflejar los permisos de `ADMIN`/`ASESOR` y el wizard de evaluación del cliente).

---

### 5.3 Servicio Unificado (`src/lib/flota/ciclo-alquiler.ts`) y Caja (`src/lib/caja/repositorio.ts`)

Todas las operaciones del ciclo se centralizan en `src/lib/flota/ciclo-alquiler.ts` (y `repositorio-reservas.ts` delega o se reestructura limpio con funciones pequeñas de única responsabilidad):

1. **`crearReservaConValidaciones(db, input, contexto)`**:
   - **Recálculo estricto en servidor:** Lee `vehiculos` (por `vehiculoId` y verifica `vehiculo.localId === localId` cuando viene de mostrador/local) y `politicas_local`. Calcula `diasAlquiler`, `subtotalTarifaCotizado = dias * precioDia`, `coberturaPericialCotizada = Math.round(subtotal * (politica.coberturaPericialPct / 100))`, `totalCotizado`. Nunca confía en el total enviado por el cliente.
   - **Validación de fechas:** Valida formato `YYYY-MM-DD`, `fechaInicio <= fechaFin`, y para flujo cliente `fechaInicio >= hoyISO`.
   - **Validación de disponibilidad física y documental del vehículo:** Invoca `verificarDisponibilidadVehiculo` (que verifica `activo`, `estado !== 'FUERA_SERVICIO'`, `mantenimientos_vehiculo` y `reservas` incluyendo `'PAUSADA'`). Además consulta `documentos_vehiculo` (`SOAT`, `TECNICO_MECANICA`):
     - En portal **cliente**, bloquea la reserva en línea únicamente si existe un documento registrado (`SOAT`, o `TECNICO_MECANICA` cuando no sea `PATINETA`) marcado como `vigente === false` o vencido (`fechaVencimiento < fechaInicio` o `< hoyISO`). *Decisión técnica tomada:* los vehículos sin filas registradas aún en `documentos_vehiculo` no se bloquean automáticamente en web mientras exista inventario sin carga documental completa, pero sí muestran alerta explícita en administración.
     - En **mostrador (admin)**, si `disponibilidad.ocupado` o `FUERA_SERVICIO`/inactivo → bloquea (`CONFLICT`); si tiene documentos del vehículo vencidos o sin registrar, expone alerta visible para que flota/admin decida.
   - **Identidad real de `clienteId`, acceso seguro de invitados y estado inicial:**
     - Si viene del flujo cliente (`/alquilar/[id]`): exige `contactoCorreo` válido, genera `tokenAccesoPublico`, asigna `clienteId = usuario?.id ?? null`, `creadoPorId = usuario?.id ?? null`, y **`estado = 'PENDIENTE'`** siempre. Si un usuario inicia sesión después vía OTP con el mismo `contactoCorreo`, sus reservas web previas con `clienteId = null` se vinculan automáticamente a su `usuario.id`.
     - Si viene del mostrador (`/admin/reservas`): acepta `clienteId` seleccionado del buscador de clientes del local (`clientes_local` + `user` + `verificaciones_identidad`), o registra al cliente presencial directamente sobre la reserva/contrato con nombre y teléfono (`clienteId = null`, permitiendo omitir correo y documentos si aún no los tiene), sin inventar correos ficticios ni atribuir `clienteId` al operador. Si `clienteId` apunta a una cuenta existente, se actualiza/crea el registro en `clientes_local` y opcionalmente `verificaciones_identidad`; si es walk-in sin cuenta (`clienteId = null`), la validación rápida de documentos se registra en los campos de autorización de `reservas` / `contratos_alquiler` y `eventos_alquiler`.
     - **Pago inicial en reserva:** Si el operador en mostrador recibe un pago confirmado inmediato (`CONFIRMADO` con método efectivo/tarjeta/transferencia/caja), opcionalmente crea de forma atómica el `movimiento_caja` (`INGRESO`, `ABONO_CONTRATO` o `PAGO_ALQUILER`, `cuentaId` acorde al método y a `politicas/cuentas` del local) + `contratos_alquiler` en estado `'BORRADOR'` (o `'VIGENTE'` si también entrega) + `depositos_garantia` si se recibió o espera fianza. Si la reserva entra por flujo cliente (`PENDIENTE` por transferencia/Nequi sin validar en patio), registra `montoAbonoReportado` y referencia como reportado, **sin asentar ingreso confirmado en caja hasta que administración confirme el pago en patio**.
   - Notifica al personal del local.

2. **`confirmarReservaD1(db, params)` (`PENDIENTE → CONFIRMADA`)**:
   - Exige `PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR` y pertenencia a `localId`.
   - Verifica que la reserva esté en `PENDIENTE`, revalida colisiones de calendario excluyendo la propia reserva y lee el estado actual de `verificaciones_identidad` del cliente + documentos del vehículo.
   - Si faltan documentos del cliente (sin KYC aprobado, falta cédula/pasaporte o falta licencia/categoría acorde) y `autorizarSinDocumentos !== true`, devuelve respuesta estructurada de advertencia para que UI muestre el resumen exacto y pida confirmar la decisión administrativa (o registrar/aprobar documentos inline); cuando confirma con `autorizarSinDocumentos: true` (y motivo opcional), graba `autorizadoSinDocumentosPorId` + evento `AUTORIZACION_SIN_DOCS`.
   - Crea (si no existe) el registro `contratos_alquiler` en estado **`BORRADOR`** y el registro `depositos_garantia` en `PENDIENTE_RECIBIR` (con `montoEsperado = vehiculo.depositoGarantia`) vía `db.batch()`, dejando trazado el saldo pendiente real. **No entrega el vehículo ni pasa a `EN_CURSO`.**

3. **`guardarInspeccionR2D1(db, params)` (Persistencia real de Inspección Pericial)**:
   - Exige `PERMISOS.INSPECCIONES_REGISTRAR` y `localId`.
   - Persiste en `puntos_inspeccion_r2` (cada punto con `estado`, `etiqueta`, `dictamen`, `costoEstimado`, `generaCargoCliente`), actualiza o crea el acta en `inspecciones_periciales` (`tipoActo: 'ENTREGA' | 'RECEPCION'`, `medidorUso`, `nivelEnergiaPct`, `estadoGeneral`, `inspectorId`, soporte multimedia R2 cuando aplique) y actualiza odómetro/energía en `vehiculos.kilometraje` / `contratos_alquiler` según tipo de acto.

4. **`entregarVehiculoConContratoD1(db, params)` (`CONFIRMADA → EN_CURSO`)**:
   - Exige `PERMISOS.CONTRATOS_CREAR` y `INSPECCIONES_REGISTRAR` (o rol operativo equivalente) y pertenencia a `localId`.
   - Muestra advertencia y requiere autorización explícita si el cliente no tiene KYC/licencia completa (`autorizarSinDocumentos`) o si falta algún documento del vehículo.
   - Si no existía `contratos_alquiler` / `depositos_garantia`, los crea; si el contrato estaba en `BORRADOR`, lo actualiza a **`VIGENTE`** con `fechaHoraEntregaReal = ahora`, `medidorUsoEntrega`, `nivelEnergiaEntregaPct`, `firmaArrendadorR2Key`/`firmaArrendatarioR2Key` (si capturadas) o constancia de entrega en patio. Si se recibe la fianza en el acto, ejecuta el ingreso en `depositos_garantia` (`RECIBIDO_CUSTODIA`) + `movimientos_caja` (`DEPOSITO_GARANTIA`).
   - Sella la inspección de salida (`ENTREGA`) y actualiza `reservas.estado = 'EN_CURSO'` + `resolverEstadoActualVehiculo` (`RESERVADO`).

5. **`pausarAlquilerD1(db, params)` (`EN_CURSO → PAUSADA`) y `reanudarAlquilerD1(db, params)` (`PAUSADA → EN_CURSO`)**:
   - Exige `PERMISOS.CONTRATOS_PAUSAR` (exclusivo de `'ADMIN'`, `'DUENO'` y `'SUPER_ADMIN'`; prohibido para `'ASESOR'`) y `localId`.
   - *Decisión técnica tomada:* la pausa aplica exclusivamente a alquileres activos ya entregados (**`EN_CURSO ↔ PAUSADA`**) y al reanudar vuelve siempre a `EN_CURSO` manteniendo el `fechaFin` acordado hasta la devolución efectiva (donde una devolución anticipada liberará los días sobrantes).
   - Recibe `diasPausa: number` (entero `>= 1`, default **`1`**) y `motivo: string` opcional.
   - Calcula `fechaBloqueoInicio = sumarDiasISO(reserva.fechaFin, 1)` y `fechaBloqueoFin = sumarDiasISO(reserva.fechaFin, diasPausa)`.
   - **Valida colisiones** en el rango `[fechaBloqueoInicio, fechaBloqueoFin]` contra otras reservas activas (`id != reserva.id`) y mantenimientos programados del vehículo. Si colisiona, retorna error `CONFLICT` claro con fechas/código en conflicto.
   - Ejecuta `db.batch()`:
     - `reservas`: `estado = 'PAUSADA'`, `fechaFin = fechaBloqueoFin` (manteniendo `fechaFinOriginal` intacta), **sin sumar costo (`totalCotizado` intacto)**.
     - `contratos_alquiler` (si existe): `estadoContrato = 'PAUSADO'`, `fechaHoraDevolucionPactada = fechaFinTarde(fechaBloqueoFin)`, **`totalLiquidado` y `saldoPendiente` intactos (`$0` adicional)**.
     - `eventos_alquiler`: inserta `'PAUSA'` con `diasDelta: diasPausa`, `fechaBloqueoInicio`, `fechaBloqueoFin`, `modalidadTarifa: 'SIN_COSTO'`, `montoDelta: 0`, `clausulaOTexto: motivo`, `activo: true`.
     - `vehiculos`: actualiza estado a **`'NO_DISPONIBLE'`** (respetando `FUERA_SERVICIO` / `MANTENIMIENTO` si aplicara).
   - Al **Reanudar (`PAUSADA → EN_CURSO`)**: cierra eventos de pausa activos (`activo = false`), inserta `'REANUDACION'`, pasa `reservas.estado = 'EN_CURSO'`, `contratos_alquiler.estadoContrato = 'VIGENTE'`, y llama `resolverEstadoActualVehiculo`.

6. **`prorrogarAlquilerD1(db, params)` (Extensión de días en `CONFIRMADA`, `EN_CURSO` o `PAUSADA`)**:
   - Exige `localId`; la modalidad `'TARIFA_ESTANDAR'` (sin ajuste discrecional de precio) requiere `PERMISOS.CONTRATOS_CREAR` (`ASESOR`, `ADMIN`, `DUENO`, `SUPER_ADMIN`), mientras que `'MISMO_PRECIO'` y `'PRECIO_PACTADO'` exigen adicionalmente `PERMISOS.CONTRATOS_MODIFICAR_TARIFA` (exclusivo de `'ADMIN'`, `'DUENO'` y `'SUPER_ADMIN'`; prohibido para `'ASESOR'`).
   - Recibe `diasExtra` (`>= 1`), `modalidadTarifa`:
     - `'MISMO_PRECIO'` (solo `ADMIN`/`DUENO`): `montoDelta = 0` (agrega `diasExtra` manteniendo el valor total actual).
     - `'TARIFA_ESTANDAR'`: `montoDelta = diasExtra * contrato_o_vehiculo.precioDia` (opcionalmente incluyendo cobertura según política del local o configurable en UI).
     - `'PRECIO_PACTADO'` (solo `ADMIN`/`DUENO`): `montoDelta = input.montoAcordado` (`>= 0`, ingresado por el encargado según acuerdo del local).
   - Opcional `clausulaAcuerdo` (nota del acuerdo).
   - Calcula `nuevaFechaFin = sumarDiasISO(reserva.fechaFin, diasExtra)` y **valida colisiones** en `[sumarDiasISO(reserva.fechaFin, 1), nuevaFechaFin]` contra otras reservas y mantenimientos.
   - En `db.batch()`: actualiza `reservas.fechaFin`, `reservas.diasAlquiler += diasExtra`, `reservas.totalCotizado += montoDelta`; si existe `contratos_alquiler`, actualiza `subtotalCanon` / `cargosOtrosLocal` o campo de prórroga, `totalLiquidado`, recalcula `saldoPendiente = Math.max(0, totalLiquidado - totalPagado)` y `estadoPago` (`PAGADO` → `PARCIAL` si quedó nuevo saldo), e inserta evento `'PRORROGA'` en `eventos_alquiler`.

7. **`devolverYCerrarAlquilerD1(db, params)` (`EN_CURSO` o `PAUSADA` → `COMPLETADA`)**:
   - Soporta tanto devolución en fecha como **devolución anticipada** (`fechaDevolucionReal < reserva.fechaFin`, ej. día 2 de 3). Copy explícito en UI y respuesta: *"Las condiciones, ajustes y sobrecostos de devolución los establece el local."*
   - Inputs auditados del encargado:
     - `fechaDevolucionReal` (default `hoyISO`), `medidorUsoRetorno`, `nivelEnergiaRetornoPct`.
     - **Cláusula y sobrecostos del local:** `clausulaEncargado` (texto opcional), `sobrecostoLocal` (`>= 0`, default `0`, exige `PERMISOS.NOVEDADES_CARGOS_APROBAR` exclusivo de `ADMIN`/`DUENO`), `motivoSobrecosto` (obligatorio si `sobrecostoLocal > 0`), `descuentoAjusteLocal` (`>= 0`, default `0` para devolución anticipada si el local decide rebajar días no usados, exige `PERMISOS.CONTRATOS_MODIFICAR_TARIFA` exclusivo de `ADMIN`/`DUENO`). Cualquier reembolso en caja por saldo a favor (`REEMBOLSO_ALQUILER` o `REEMBOLSO_GARANTIA`) exige `PERMISOS.CAJA_GASTOS_REGISTRAR` (prohibido para `ASESOR`). El asesor queda restringido a cierres estándar sin sobrecostos, descuentos ni reembolsos de caja.
     - **Liquidación final en caja y fianza (atómica, explícita):**
       - Si tras sumar `sobrecostoLocal` y restar `descuentoAjusteLocal` existe `saldoPendiente > 0`, permite: (a) **Cobrar saldo ahora** (método + cuenta → crea `movimientos_caja` `PAGO_ALQUILER` y lleva `totalPagado` a paz y salvo), o (b) **Cerrar con saldo pendiente / acuerdo** → contrato queda en **`CERRADO_CON_SALDO`** (no fuerza falsamente 100% pagado).
       - *Decisión técnica tomada:* si el cliente ya había pagado de más respecto al total ajustado (`totalLiquidado < totalPagado` por un descuento en devolución anticipada), el encargado elige emitir un egreso de caja bajo **`REEMBOLSO_ALQUILER`** (cuenta de origen + `CAJA_GASTOS_REGISTRAR`) para devolver el excedente, o ajustar `descuentoAjusteLocal` hasta el tope del saldo pagado.
       - Si existe fianza en `RECIBIDO_CUSTODIA`, permite en el mismo cierre: **Devolver total/parcial**, **Aplicar a cargos/sobrecosto (`RETENER_CARGOS`)** o **Dejar pendiente en revisión**.
     - **Estado post-retorno de la unidad:** toggle `requiereMantenimiento` (`tipoMantenimiento`, `etiqueta`, `fechaFinEstimada`):
       - Si `requiereMantenimiento === false`: guarda `fechaDevolucionReal = hoyISO` y acorta `reservas.fechaFin = max(fechaInicio, hoyISO)` cuando la devolución sea anticipada (manteniendo `fechaFinOriginal` para trazabilidad), de modo que `obtenerBloquesNoDisponiblesD1` libera inmediatamente los días posteriores (ej. el día 3 ya aparece libre en catálogo) y `resolverEstadoActualVehiculo` deja la unidad `DISPONIBLE` si no hay otra reserva hoy.
       - Si `requiereMantenimiento === true`: inserta una orden real en **`mantenimientos_vehiculo`** (`estado: 'EN_TALLER'`, `tipo: 'CORRECTIVO_NOVEDAD'`, `reservaOrigenId: reserva.id`, `fechaInicio: hoyISO`, `fechaFin: fechaFinTaller`), garantizando que `resolverEstadoActualVehiculo` mantenga el vehículo en `'MANTENIMIENTO'` de forma persistente y bloquee esas fechas en calendario.
   - Registra acta `RECEPCION` en `inspecciones_periciales` + evento `'DEVOLUCION_ANTICIPADA'` / `'SOBRECOSTO_CLAUSULA'` si aplica.

8. **`cancelarReservaD1` / `rechazarReservaD1` / `anularAlquilerD1`**:
   - **`RECHAZADA`**: Solo desde `PENDIENTE`, con `motivoRechazo` obligatorio (`RESERVAS_CONFIRMAR_RECHAZAR`). Si había pagos reportados sin confirmar, quedan marcados; si hubo recaudo confirmado, exige resolución en caja (`ADMIN` / `DUENO`).
   - **`CANCELADA`**:
     - Si la cancelación es sobre una **solicitud `PENDIENTE` sin contrato creado** y sin dinero confirmado: puede ejecutarla el local (`RESERVAS_CONFIRMAR_RECHAZAR`) o el cliente dueño (validado por `usuario.id === reserva.clienteId` o `tokenAccesoPublico` en URL/solicitud).
     - Si la reserva ya está **`CONFIRMADA` o tiene `contratos_alquiler` creado**: **solo `DUENO` o `ADMIN`** (`CONTRATOS_ANULAR`) pueden cancelarla/anularla (`CONTRATOS_ANULAR` se otorga a `ADMIN`, `DUENO` y `SUPER_ADMIN`).
     - Libera fechas en calendario y llama `resolverEstadoActualVehiculo`. Si existen `movimientos_caja` confirmados vinculados (`totalPagado > 0`) o fianza en custodia, exige `resolucionFinanciera` (requiere `CAJA_GASTOS_REGISTRAR`): `'REEMBOLSAR_EGRESO'` (crea egreso confirmado bajo categoría **`REEMBOLSO_ALQUILER`**), `'ANULAR_MOVIMIENTOS'` (anula movimientos con motivo obligatorio y auditoría), o `'RETENER_SALDO_LOCAL'` (con cláusula/motivo del local y pone `contratos_alquiler.saldoPendiente = 0`).
   - **`ANULADO` (Anular contrato/alquiler):** Exclusivo de **`DUENO`, `ADMIN` y `SUPER_ADMIN`** (`PERMISOS.CONTRATOS_ANULAR`) con `motivoAnulacion` (`>= 5` caracteres). Pasa `contratos_alquiler.estadoContrato = 'ANULADO'`, `contratos_alquiler.saldoPendiente = 0` (si retiene/cierra sin cobro pendiente), `reservas.estado = 'CANCELADA'` (conservando `motivoAnulacion` en contrato y evento `'ANULACION'`), exige la misma resolución financiera si hay caja/garantía involucrada, y libera el vehículo mediante `resolverEstadoActualVehiculo` (creando mantenimiento si la anulación ocurrió con vehículo en taller).
   - **Botón `Reabrir` en `AlquilerDetalleView`:** Solo visible con permiso administrativo (`ADMIN` / `DUENO`), y al ejecutarse valida nuevamente disponibilidad completa del vehículo en el rango original antes de reabrir a `PENDIENTE` (si el rango ya lo tomó otra reserva o taller, bloquea con `CONFLICT` claro) y registra evento `'REAPERTURA'`.

9. **Sincronización real en `src/lib/caja/repositorio.ts`:**
   - Eliminar mutaciones sobre `cacheCartera` cuando `db` está presente.
   - Toda creación de abono (`registrarAbonoAction`), cobro Waybill (`registrarCobroWaybillAction`), anulación de movimiento (`anularMovimientoAction`, gobernada por `CAJA_GASTOS_REGISTRAR` y prohibida para `ASESOR`) o gestión de garantía (`gestionarGarantiaAction`, con reembolso de caja restringido a roles autorizados por `CAJA_GASTOS_REGISTRAR`, nunca `ASESOR`) **verifica pertenencia al `localId`**, **falla explícitamente si D1 falla** (nunca silenciosamente en memoria), y recalcula desde D1 el total neto pagado: `SUM(movimientos_caja.monto WHERE tipo = 'INGRESO' AND estado = 'CONFIRMADO' AND categoria IN ('ABONO_CONTRATO', 'PAGO_ALQUILER', 'EXTENSION_ALQUILER', 'SERVICIOS_ADICIONALES', 'COBRO_DANOS_MULTAS')) - SUM(movimientos_caja.monto WHERE tipo = 'EGRESO' AND estado = 'CONFIRMADO' AND categoria = 'REEMBOLSO_ALQUILER')` para actualizar `contratos_alquiler.totalPagado`, `contratos_alquiler.saldoPendiente`, `contratos_alquiler.estadoPago` y `reservas.montoAbonoReportado` dentro de `db.batch()`.
   - Además, `obtenerEstadoFinancieroCompleto` usa el `montoEsperado` real del vehículo/contrato en lugar del fallback hardcoded `1500000`, `esGastoOperativo` en `src/lib/caja/calculos.ts` excluye `'REEMBOLSO_ALQUILER'` junto a `'REEMBOLSO_GARANTIA'`, y `registrarCobroWaybillD1` mapea `'efectivo' | 'transferencia' | 'tarjeta'` a la cuenta activa correspondiente (`CAJA_EFECTIVO` vs `BANCO`/`BILLETERA_DIGITAL` o cuenta elegida) + inserta registro en `auditoria_financiera`.

---

### 5.4 Documentación del Cliente y Vehículo (UX Informada sin Fricción)

1. **Cliente reservando online (`/alquilar/[id]` — `RentalWizardFlow.tsx`):**
   - Paso 2 solicita nombre, correo (visible tanto para sesión iniciada como para invitados), teléfono y bloque **opcional** de documento (`CC`/`CE`/`PASAPORTE` + número) y categoría de licencia (`A1`/`A2`/`B1`/`B2`/`C1`), con nota clara: *"Si aún no tienes tus documentos o licencia registrados, puedes enviar tu reserva igual; el local revisará tu documentación antes de confirmar o entregar el vehículo."*
   - Paso 4 pasa `referenciaAbonoInicial` y el `sedeNombre` / `localId` reales del local en D1 (`context.locals.localCaptacion`), no strings quemados.
2. **Mostrador (`MisReservasHub.tsx`) y Detalle (`AlquilerDetalleView.tsx`):**
   - **Buscador / selector de cliente del local:** Permite buscar clientes existentes de `clientes_local` / `user` por nombre, correo o documento (mostrando al instante un badge de su estado KYC en `verificaciones_identidad`: `KYC Aprobado`, `En revisión`, `Rechazado` o `Sin documentos`), o registrar un cliente presencial nuevo con fricción mínima (solo nombre y teléfono obligatorios; correo y documentos opcionales, `clienteId = null`), sin inventar correos ficticios ni atribuir `clienteId` al empleado.
   - **Panel de Semáforo Documental (Admin/Flota):** En el detalle de la reserva (`AlquilerDetalleView.tsx`) y en la hoja de confirmación/entrega, se muestran alertas explícitas cuando:
     - El cliente no tiene `verificaciones_identidad` aprobada, le falta número de documento o licencia, o la categoría de licencia no corresponde al vehículo (ej. moto con `B1`).
     - El vehículo tiene `SOAT` o `TECNICO_MECANICA` vencidos o sin registrar en `documentos_vehiculo`.
   - Desde la misma vista, el administrador tiene **dos acciones rápidas**:
     1. **Registrar/aprobar datos o verificación rápida del cliente** (si presenta documentos físicos en mostrador), o
     2. **Confirmar / entregar bajo autorización del local** marcando confirmación expresa, lo cual queda auditado con usuario y fecha en `eventos_alquiler`.

---

### 5.5 Flujo y Limpieza de Rutas/UI Existentes

- **`VehiculoEntregaWizard.tsx` (`/reservas/[codigo]/entrega`):**
  - **En modo cliente:** **únicamente registra la evaluación del servicio y el chequeo previo de retorno** en `evaluaciones_entrega_cliente` y notifica al equipo del local (solicitando validar acceso por sesión o `tokenAccesoPublico` cuando no hay sesión). **Nunca** cambia `reservas.estado` a `COMPLETADA`, **nunca** altera `vehiculos.estado` ni libera la garantía ni las fechas del calendario; la pantalla final informa al cliente que su envío fue recibido y que el local validará la recepción, caja y liberación de garantía.
  - **En modo admin (`/admin/reservas/[codigo]` / retorno):** solo opera si el alquiler está `EN_CURSO` o `PAUSADA` y abre o redirige al cierre administrativo real (`devolverYCerrarAlquilerD1`) con inspección de recepción R2, cláusula/sobrecostos del local, toggle de mantenimiento real en `mantenimientos_vehiculo`, liquidación en caja y gestión explícita de garantía.
- **`/reservas/[codigo].astro` y cancelación cliente:** valida propiedad de la reserva (`usuario.id === reserva.clienteId`, o colaborador del `localId` en `/admin`, o `tokenAccesoPublico` válido para invitados), evitando acceso o mutación por código suelto.
- **`AlquilerDetalleView.tsx`:**
  - Elimina `try/catch` que tragaban errores y quita actualizaciones optimistas antes de respuesta del servidor; cada botón muestra estado `loading` real y solo actualiza UI/toast tras éxito confirmado en D1.
  - Recibe desde Astro SSR capacidades RBAC granulares calculadas con `tienePermiso(...)` (`puedePausar`, `puedeProrrogarEstandar`, `puedeAjustarTarifasYCargos`, `puedeReembolsarYAnularCaja`, `puedeAnularContrato`, `puedeGestionarTaller`) para renderizar y habilitar botones sin depender de un booleano genérico `esAdmin`: `ASESOR` ve confirmar/entregar/inspección R2/prórroga estándar/abonos/cierre normal sin descuentos, sobrecostos ni reembolsos; `ADMIN`/`DUENO` desbloquean además pausas, prórrogas con ajuste de precio, descuentos/sobrecostos de cierre, cancelación/anulación de contrato y reembolsos/anulaciones de caja; `ENCARGADO_FLOTA` accede a inspecciones R2, alertas documentales y órdenes de taller.
  - Añade controles reales persistidos para: **Editar / Guardar Inspección R2**, **Confirmar Reserva**, **Entregar Vehículo (Inspección + Contrato `VIGENTE` + Fianza)**, **Pausar (+1/+2/+N días $0)**, **Reanudar**, **Prorrogar (+1/+N días con 3 tarifas)**, **Devolver (normal o anticipado + cláusula + sobrecosto + taller + liquidación caja/fianza)**, **Cancelar Reserva**, **Anular Contrato** y **Gestionar Garantía (`gestionarGarantiaAction`)**.
- **`MisReservasHub.tsx`:**
  - Elimina fallback silencioso a `FLOTA_CANONICA` cuando el local no tiene vehículos disponibles; muestra estado vacío accionable con enlace a inventario.
  - Agrega pestaña/etiqueta real para `Cancelada` (`CANCELADA`) separada de `Rechazada`, permite cancelación rápida en reservas cancelables y filtra/muestra el selector `Confirmada directa` enviando realmente el estado inicial deseado con todas las validaciones de servidor (y si falla, muestra error inline sin cerrar el modal).
- **`/admin/operaciones/index.astro`:**
  - Reemplaza el cascarón estático y el enlace roto `/admin/operaciones/nueva` por enlaces reales hacia reservas pendientes de entrega/devolución (`CONFIRMADA` / `EN_CURSO` / `PAUSADA`) e inspecciones R2 activas de D1.

---

## 6. Decisiones que Quedan Abiertas para el Constructor

- Distribución visual exacta de los modales/bottom-sheets de **Pausa**, **Prórroga**, **Devolución con cláusula/sobrecosto** y **Resolución financiera al cancelar/anular** dentro de `AlquilerDetalleView.tsx`, respetando la paleta de 5 colores Movix, `text-base` (>=16px) en inputs y zonas táctiles `>=44px` (`AGENTS.md`).
- Estrategia de prueba unitaria/integración contra D1 local o mock de Drizzle para cubrir las transiciones y cálculos de `ciclo-alquiler.ts` y `caja/repositorio.ts` (debe quedar documentada en el plan de implementación).
- Decisión menor de si los botones del wizard cliente `RentalWizardFlow` cuando un vehículo tiene documentos legales vencidos (`SOAT`/`RTM`) ocultan solo los rangos/muestran badge "En actualización de documentos" o deshabilitan el paso 1 con mensaje claro.

---

## 7. Criterios de Verificación

1. **Estático y build:** `pnpm check` debe resultar en `0 errors, 0 warnings, 0 hints` y `pnpm build` debe completar sin fallos tras el último cambio.
2. **Pruebas funcionales en D1 y caja:**
   - Cliente sin documentos reserva en `/alquilar/[id]` → queda `PENDIENTE`, calendario bloquea rango, abono reportado no altera caja confirmada hasta conciliación.
   - Admin intenta crear reserva sobre vehículo `FUERA_SERVICIO`, inactivo o con fechas solapadas → servidor rechaza con `CONFLICT` / `BAD_REQUEST`.
   - Admin confirma reserva sin KYC → recibe alerta documental y al autorizar queda `CONFIRMADA` + evento `AUTORIZACION_SIN_DOCS` + contrato `BORRADOR` + depósito `PENDIENTE_RECIBIR`, manteniendo vehículo pendiente de entrega física (no `EN_CURSO`).
   - Admin entrega vehículo → inspección R2 guardada en D1, contrato `VIGENTE` con `fechaHoraEntregaReal`, garantía recibida si aplica, reserva `EN_CURSO`, vehículo `RESERVADO`.
   - Admin pausa por `+1` (o `+N`) días → reserva `PAUSADA`, contrato `PAUSADO`, vehículo `NO_DISPONIBLE`, calendario añade `+N` días bloqueados como `NO_DISPONIBLE` sin sumar costo en contrato ni caja.
   - Admin prorroga `+2` días en las 3 modalidades (`MISMO_PRECIO`, `TARIFA_ESTANDAR`, `PRECIO_PACTADO`) → colisiones bloqueadas, `totalLiquidado`/`saldoPendiente`/`estadoPago` y calendario actualizados exactamente.
   - Devolución anticipada (día 2 de 3) con cláusula y sobrecosto del local → contrato cerrado (`CERRADO_PAZ_Y_SALVO` o `CERRADO_CON_SALDO`), movimientos reales en caja, garantía devuelta/retenida en `depositos_garantia`, días posteriores liberados en calendario (o unidad en `MANTENIMIENTO` con orden real en `mantenimientos_vehiculo`).
   - Cancelación y anulación con pagos previos → caja/garantía reflejan reembolso o anulación auditada, contrato `ANULADO` / reserva `CANCELADA`, disponibilidad liberada.
   - Cliente envía evaluación en `/reservas/[codigo]/entrega` → queda guardada en `evaluaciones_entrega_cliente` y notifica al local, manteniendo `reservas.estado` y `vehiculos.estado` intactos hasta el cierre real en administración.
   - Matriz RBAC en servidor y UI → `ASESOR` bloqueado (`FORBIDDEN`) al intentar pausar, prorrogar con `MISMO_PRECIO`/`PRECIO_PACTADO`, aplicar `descuentoAjusteLocal`/`sobrecostoLocal` o emitir reembolsos/anulaciones en caja; `ADMIN` ejecuta anulación de contrato (`CONTRATOS_ANULAR`) exitosamente.
