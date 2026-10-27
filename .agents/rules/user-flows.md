# Rule: User Flow Alignment & Screen Governance (FlotaX)

**Código:** RUL-FLX-001  
**Documento Fuente de Verdad:** [`docs/user-flows.md`](file:///Users/santiago/proyectos/movix/docs/user-flows.md)  
**Ámbito:** Todas las páginas en `src/pages/**`, componentes de navegación, modales y flujos transaccionales.  

---

## 1. Mandato Absoluto de Consulta Previa

Cualquier agente de IA o desarrollador que vaya a:
1. Crear una nueva página o ruta en `src/pages/`.
2. Modificar la navegación, acciones de usuario, botones CTA o redirecciones en una página existente.
3. Crear o alterar componentes de flujo (embudo de alquiler, ficha técnica, catálogo, perfiles o paneles de staff).

**DEBE consultar de manera obligatoria y estricta el documento [`docs/user-flows.md`](file:///Users/santiago/proyectos/movix/docs/user-flows.md) antes de emitir cualquier línea de código o propuesta arquitectónica.**

---

## 2. Los Flujos Canónicos Inmutables

Toda pantalla debe pertenecer explícitamente y respetar la jerarquía de los flujos canónicos definidos en el sistema:

### Flujo 1: Onboarding y Acceso
- **Ruta Raíz / Inicio (`/`):** Dirige a `bienvenida`.
  - *Explorar como visitante:* Navega directo a `ver catálogo`.
  - *Iniciar sesión:* `correo y contraseña / OTP` → `ir al catálogo`.
  - *Registrarse:* `datos básicos` → `autorización de datos (Ley 1581)` → `verificar con código` → `ir al catálogo`.
  - *Regla de sesión:* Si ya existe sesión activa, salta la bienvenida y abre el catálogo. Cédula y licencia solo se piden en el primer alquiler.

### Flujo 2: Catálogo Exclusivo por Local y Perímetro Anti-Fuga Pasivo
- **Emisión en Patio:** El dueño/administrador emite enlace `/c/[slug]` y QR determinista 21x21 desde `/admin/flota` o Configuración.
- **Captación Pasiva:** Al ingresar por `/c/[slug]`, se fija la cookie pasiva `movix_local_captacion` (30 días). El catálogo prioriza por defecto las unidades de ese patio sin bloqueos impermisivos ni advertencias agresivas, permitiendo el uso normal de la app y la conmutación al catálogo general.
- **Persistencia en D1:** Asocia `user.localOrigenId` y registra en `clientes_local` para fidelización comercial y emisión posterior de notificaciones segmentadas.

### Flujo 3: Explorar y Analizar Unidades
- **Catálogo (`/catalogo` o `/c/[slug]`):** Búsqueda, filtrado, ordenamiento y conmutación de vista (lista o mosaico).
- **Ficha de la Unidad (`/vehiculos/:id`):** Galería fotográfica en R2, ficha técnica adaptada al tipo de unidad (carro, moto, patineta, náutico), disponibilidad en tiempo real, desglose de tarifa y CTA a `Alquilar`. Unidades con documentos vencidos se ocultan de la disponibilidad.

### Flujo 4: Embudo de Alquiler del Cliente
- Secuencia inmutable: `Ficha` → `Elegir fechas` → `Bifurcación de sesión` → `Resumen y costo total` → `Aceptar términos (Ley 1581)` → `Pagar o reportar abono` → `Solicitud enviada (Estado: pendiente)`. La reserva se imputa al `localId` del patio.

### Flujo 5: Operación de una Reserva (Personal / Administración)
- Ciclo de vida operativo completo en patio y oficina:
  - `Solicitud pendiente` → `Revisar solicitud` (disponibilidad y documentos).
  - Bifurcación `¿Confirmar reserva?`:
    - No: `Rechazar y notificar al cliente`.
    - Sí: `Reserva confirmada` (notifica al cliente).
  - `Entrega de la unidad` (revisión con plantilla por tipo, fotos R2 y firma del cliente; pasa a `en alquiler`).
  - `Devolución de la unidad` (comparativa pericial contra entrega, detección de novedades y cargos).
  - Bifurcación `¿Requiere mantenimiento?`:
    - Sí: `Enviar a mantenimiento`.
    - No: `Saldo y cierre del contrato`.
  - `Reserva cerrada` (unidad retorna a `disponible`).

### Flujo 6: Backoffice de Personal y Menú por Permisos
- `Acceso personal` (`/admin/login`) → `Iniciar sesión` → `Menú por permisos` (`/admin`).
- Módulos canónicos divididos en:
  1. *Operación diaria:* Panel (alertas/indicadores), Reservas y contratos, Entregas y recepciones (peritajes y actas PDF), Clientes, Flota (unidades, mantenimientos, share card).
  2. *Finanzas y configuración:* Finanzas (pagos, gastos, ganancia por unidad), Reportes (ocupación, daños, exportar), Configuración (plantillas por tipo, tarifas/políticas, catálogo público, roles y auditoría, cuenta y plan del propietario).

### Flujo 7: Crecimiento de Equipo y Matriz RBAC
- Estructura escalonada: 1 Persona (Propietario) → 2 Personas (Propietario + Admin) → 3+ Personas (Asesor + Encargado de Flota + Contador).
- Gobernanza estricta según la matriz de acceso por módulo y pantalla (✓ Completo, L Solo Lectura, R Limitado, — Sin Acceso).

---

## 3. Checklist Pre-Flight de Validación para Agentes

Antes de enviar cualquier modificación en páginas o componentes de interfaz, el agente debe validar:

- [ ] ¿Esta página o cambio coincide con una pantalla o subpantalla definida en [`docs/user-flows.md`](file:///Users/santiago/proyectos/movix/docs/user-flows.md)?
- [ ] ¿Los botones de acción (CTAs) apuntan a la siguiente pantalla del flujo canónico?
- [ ] Si es el flujo de alquiler: ¿Se respeta la validación de sesión previa al resumen, el consentimiento de Ley 1581 y el estado transitorio `pendiente` antes de `confirmada`?
- [ ] ¿Se respeta la separación entre pantallas principales (Tier 4 / URL canónico) y subfunciones/modales (Tier 2)?
- [ ] ¿Se mantiene el acceso del personal operativo (`/admin`) segregado del flujo de cliente?

---

## 4. Criterio de Rechazo Inmediato (Hard Veto)

Se rechazará inmediatamente cualquier código o PR si:
- Se permite confirmar una reserva sin pasar por la autorización de datos según la Ley 1581.
- Se asume confirmación automática e instantánea de la reserva sin considerar el estado `pendiente` y la validación requerida por el asesor humano.
- Se crean pantallas de formulario o pasos de reserva desalineados con la secuencia estipulada en [`docs/user-flows.md`](file:///Users/santiago/proyectos/movix/docs/user-flows.md).
