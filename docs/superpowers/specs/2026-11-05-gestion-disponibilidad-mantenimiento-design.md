# Especificación de Diseño: Gestión de Disponibilidad y Mantenimiento de Flota

**Fecha:** 2026-11-05  
**Estado:** Listo para Aprobación  
**Autor:** Antigravity & Equipo FlotaX  
**Ruta:** `docs/superpowers/specs/2026-11-05-gestion-disponibilidad-mantenimiento-design.md`

---

## 1. Intención y Propósito Estratégico (The Why)

FlotaX es el sistema operativo perimetral de patio para el alquiler y control de flotas de vehículos. Hasta ahora, la administración de vehículos en [`/admin/flota`](file:///Users/santiago/proyectos/movix/src/pages/admin/flota/index.astro) disponía únicamente de un menú selector plano que alteraba una columna estática de texto en `vehiculos.estado`, sin registrar causas, talleres, costos ni rangos de fechas. Además, el motor de cálculo de disponibilidad de la plataforma simulaba franjas de bloqueo con una función determinista matemática en lugar de consultar la base de datos real.

Este proyecto tiene como objetivo dotar al administrador de patio de control operativo total sobre la disponibilidad técnica y el ciclo de vida de mantenimiento de cada unidad:
- Programar mantenimientos preventivos, correctivos, alistamientos de patio y bloqueos operativos con trazabilidad técnica real.
- Gestionar la transición de estados técnicos en patio (`PROGRAMADO` → `EN_TALLER` → `COMPLETADO` / `CANCELADO`), sincronizando automáticamente la disponibilidad pública del vehículo.
- Inspeccionar la disponibilidad en un calendario editorial interactivo que reutiliza la estética y lógica de la plataforma.
- Ofrecer un flujo inmersivo móvil paso a paso (estilo Typeform) que elimina los modales comprimidos y aprovecha toda la pantalla del teléfono del operario en terreno.

---

## 2. Metas, No-Metas y Anti-Metas

### Metas (Goals)
1. **Página Dedicada de Disponibilidad y Taller**: Crear la ruta [`/admin/flota/[id]/disponibilidad`](file:///Users/santiago/proyectos/movix/src/pages/admin/flota/[id]/disponibilidad.astro) optimizada para mobile-first (pantalla completa, sin barras de navegación redundantes).
2. **Reutilización del Calendario Editorial**: Adaptar [`EditorialAvailabilityCalendar`](file:///Users/santiago/proyectos/movix/src/components/alquiler/EditorialAvailabilityCalendar.tsx) para visualizar en una sola vista mensual los días disponibles, reservas activas y bloqueos de taller de la unidad.
3. **Flujo de Registro Typeform**: Wizard interactivo en React 19 (1 paso por pantalla con animaciones de desplazamiento suave) para registrar nuevas órdenes de mantenimiento o bloqueos con los campos canónicos de `mantenimientos_vehiculo`.
4. **Ciclo de Vida de Órdenes Técnicas**: Capacidad de iniciar taller, registrar retorno de taller con odómetro y costo real, o cancelar una orden liberando las fechas.
5. **Disponibilidad Verídica en Base de Datos**: Conectar `src/lib/flota/disponibilidad.ts` directamente con las tablas `mantenimientos_vehiculo` y `reservas` en Cloudflare D1, erradicando los mocks.
6. **Eliminación del Selector Rápido Huérfano**: En [`FleetInventoryManager.tsx`](file:///Users/santiago/proyectos/movix/src/components/flota/FleetInventoryManager.tsx), suprimir el `<select>` plano de estados. El estado se transforma en un badge de solo lectura con un botón de acción principal **"Disponibilidad & Taller"**, obligando a registrar una orden formal para cualquier intervención técnica.

### No-Metas (Non-Goals)
- No incluye facturación electrónica ante la DIAN ni integración directa con software contable externo.
- No reemplaza la inspección pericial fotográfica R2 de entrega/devolución al cliente (pertenece al flujo de contratos y waybill).
- No altera el schema de base de datos en `src/db/schema/mantenimientos.ts` ya que las columnas requeridas ya existen y cumplen con la arquitectura.

### Anti-Metas (Anti-Goals)
- **Cero Modales Comprimidos en Móvil**: No encapsular formularios complejos de mantenimiento en modales o diálogos emergentes diminutos que perjudiquen la ergonomía táctil en pantalla de 430px.
- **Cero Manipulación Imperativa del DOM**: Toda interacción reactiva debe residir en componentes React 19 con estado predecible y Astro Actions tipadas.
- **Cero Código Obsoleto o Violaciones Zod 4**: Cumplimiento estricto con las 10 Reglas de Oro de FlotaX (`pnpm check` limpio con 0 errores y 0 warnings).

---

## 3. Restricciones y Reglas Arquitectónicas

1. **Stack Canónico**: Cloudflare D1 + Drizzle ORM + Astro 7+ + React 19 + Tailwind CSS v4 + Zod v4.
2. **Orquestador Delgado (<150 LOC)**: La página Astro [`/admin/flota/[id]/disponibilidad.astro`](file:///Users/santiago/proyectos/movix/src/pages/admin/flota/[id]/disponibilidad.astro) solo verificará la sesión y permisos RBAC (`FLOTA_ACTUALIZAR`), cargará los datos iniciales y montará la isla React.
3. **Paleta Canónica Movix**: Estricta adhesión a `#111827`, `#1F2937`, `#4B5563`, `#9CA3AF` y `#EDEDED`.
4. **Ergonomía Móvil (Regla de 16px)**: Todo input y select debe tener al menos `16px` (`text-base`) para prevenir zoom automático en Safari iOS.
5. **Navegación SPA**: Usar `navigate()` de `'astro:transitions/client'` para transiciones suaves de ruta.

---

## 4. Enfoques Considerados y Selección

- **Enfoque A (Modal/Sheet sobre Inventario)**: Descartado por saturación espacial en pantallas móviles.
- **Enfoque B (Formulario Tradicional Vertical)**: Descartado por requerir scroll extenso y no ofrecer foco paso a paso.
- **Enfoque C (Página Dedicada Inmersiva con Flujo Typeform - SELECCIONADO)**:
  - Navegación directa a `/admin/flota/[id]/disponibilidad`.
  - Modo 1: Tablero de disponibilidad mensual con calendario editorial reutilizado y órdenes activas.
  - Modo 2: Wizard Typeform a pantalla completa (1 paso por pantalla con `framer-motion`) para registrar órdenes de mantenimiento o bloqueos.

---

## 5. Reglas de Negocio Definidas (Resolución de Revisión)

### 5.1 Manejo de Conflictos con Reservas (Opción A - Permisivo con Alerta)
- Si un operario ingresa una orden de mantenimiento de emergencia o programa taller en fechas donde ya existen reservas en estado `CONFIRMADA` o `EN_CURSO`:
  - El sistema **permite** crear la orden y bloquear el calendario (la seguridad física y operativa de la unidad tiene precedencia en patio).
  - La Astro Action detecta las reservas afectadas y retorna en la respuesta una lista detallada de advertencia (`reservasAfectadas: Array<{ id, codigo, clienteNombre, fechaInicio, fechaFin }>`).
  - La UI muestra una notificación de advertencia en color ámbar/aviso informando al administrador que debe gestionar la reasignación de esas reservas a otro vehículo del patio.

### 5.2 Supresión del Selector Rápido en `FleetInventoryManager`
- Se elimina completamente el control `<select>` de estados de las tarjetas de inventario.
- Se sustituye por un chip badge de solo lectura que indica claramente el estado actual (`DISPONIBLE`, `CONTRATO ACTIVO`, `EN TALLER`, `FUERA DE SERVICIO`) acompañado de un botón de acción prioritario **"Disponibilidad & Taller"** que navega a la página dedicada.
- Queda prohibido alterar el estado a `MANTENIMIENTO` de manera huérfana sin una orden de trabajo.

### 5.3 Precarga SSR de Disponibilidad (Builder's Call)
- Para preservar el rendimiento sin latencias de red en cliente, la página Astro precarga los bloques reales de los próximos 120 días desde D1 (`reservas` + `mantenimientos_vehiculo`) y se los entrega a `EditorialAvailabilityCalendar` como props iniciales síncronas.
- El embudo público de reserva (`RentalWizardFlow`) y la vista administrativa consumen la misma fuente de verdad sin requerir reescrituras asíncronas pesadas.

### 5.4 Máquina de Estados Segura `resolverEstadoActualVehiculo` (Builder's Call)
- Al completar (`COMPLETADO`) o cancelar (`CANCELADO`) una orden de mantenimiento, el sistema verifica el contexto global de la unidad:
  - Si el vehículo está en `FUERA_SERVICIO` (dado de baja), se mantiene `FUERA_SERVICIO`.
  - Si hoy el vehículo tiene una reserva activa `EN_CURSO`, pasa a `RESERVADO`.
  - Si no tiene bloqueos vigentes en la fecha actual, pasa a `DISPONIBLE`.

### 5.5 Desacoplamiento de Salida de Taller y Caja (Builder's Call)
- Al registrar la salida de taller (`COMPLETADO`), se persiste el `costo_total` y el `kilometraje_registro` final directamente en `mantenimientos_vehiculo`.
- El campo `movimiento_caja_id` se mantiene opcional, evitando bloquear al operario de patio en horarios donde la sesión de caja esté cerrada.

---

## 6. Especificación de la Solución Técnica

### 6.1 Enrutamiento y Navegación
- **URL**: `/admin/flota/[id]/disponibilidad`
- **Layout**: `LayoutAdmin` con `hideNav={true}` y `hideBottomNav={true}`.
- **Acceso**: Botón con icono de calendario/taller en cada card de [`FleetInventoryManager.tsx`](file:///Users/santiago/proyectos/movix/src/components/flota/FleetInventoryManager.tsx).

### 6.2 Capa de Datos y Repositorio (`src/lib/mantenimientos/repositorio.ts`)
- `listarMantenimientosPorVehiculo(db, vehiculoId)`: Historial y órdenes activas ordenadas cronológicamente.
- `crearOrdenMantenimiento(db, localId, usuarioId, datos)`: Valida solapamientos, inserta orden y actualiza estado si la fecha aplica hoy.
- `actualizarEstadoOrdenMantenimiento(db, { id, nuevoEstado, kilometraje, costoReal })`: Ejecuta la transición de la orden y recalcula el estado del vehículo con `resolverEstadoActualVehiculo`.
- `obtenerBloquesNoDisponiblesD1(db, vehiculoId, hoyISO)`: Sustituye la función mock de `src/lib/flota/disponibilidad.ts` consultando las tablas `mantenimientos_vehiculo` (estados `PROGRAMADO`, `EN_TALLER`) y `reservas` (estados `CONFIRMADA`, `PENDIENTE_PAGO`, `EN_CURSO`).

### 6.3 Astro Actions (`src/actions/flota.ts` o `src/actions/mantenimientos.ts`)
- `crearMantenimientoAction`:
  - Input validado con Zod 4: `vehiculoId`, `tipo`, `etiqueta`, `descripcion`, `tallerProveedor`, `fechaInicio`, `fechaFin`, `kilometrajeRegistro`, `costoEstimado`.
  - Retorna `{ ok: true, orden, advertenciasReservas: [...] }`.
- `actualizarEstadoMantenimientoAction`:
  - Input: `id`, `estado` (`EN_TALLER`, `COMPLETADO`, `CANCELADO`), `kilometrajeFinal`, `costoFinal`.

### 6.4 Componentes UI (React 19)
- **Isla Contenedora**: `src/components/flota/disponibilidad/VehicleAvailabilityIsland.tsx`.
- **Estructura Modular**:
  - `AvailabilityHeader.tsx`: Placa, modelo, odómetro, estado actual y botón de retorno a `/admin/flota`.
  - `AvailabilityOverviewView.tsx`: Calendario editorial mensual reutilizado + lista de órdenes técnicas activas + botón *"Programar Mantenimiento / Bloqueo"*.
  - `MaintenanceWizardFlow.tsx`: Flujo Typeform de 5 pasos a pantalla completa:
    1. *Paso 1*: Selección de Tipo (Preventivo, Correctivo/Novedad, Alistamiento, Bloqueo Operativo).
    2. *Paso 2*: Selección de Rango de Fechas sobre el calendario editorial.
    3. *Paso 3*: Taller / Proveedor y Odómetro actual.
    4. *Paso 4*: Costo estimado y descripción técnica.
    5. *Paso 5*: Revisión final y confirmación.
  - `CompleteMaintenanceModalOrStep.tsx`: Flujo enfocado para dar salida de taller con costo real y odómetro de entrega.
