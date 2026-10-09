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
  - *Iniciar sesión:* `correo y código otp` → `ir al catálogo`.
  - *Registrarse:* `datos básicos` → `autorización de datos (Ley 1581)` → `verificar con código` → `ir al catálogo`.
  - *Regla de sesión:* Si ya existe sesión activa, salta la bienvenida y abre el catálogo. Cédula y licencia solo se piden en el primer alquiler.

### Flujo 2: Explorar y Analizar Vehículos
- **Catálogo (`/catalogo`):** Búsqueda, filtrado, ordenamiento y conmutación de vista (lista o mosaico).
- **Ficha del Vehículo (`/vehiculos/:id`):** Galería fotográfica en R2, ficha técnica, disponibilidad en tiempo real, desglose de tarifa y CTA a `Alquilar`.

### Flujo 3: Embudo de Alquiler del Cliente
- Secuencia inmutable: `Ficha` → `Elegir fechas` → `Bifurcación de sesión` → `Resumen y costo total` → `Aceptar términos (Ley 1581)` → `Pagar o reportar abono` → `Solicitud enviada (Estado: pendiente)`.

### Flujo 4: Operación de una Reserva (Personal / Administración)
- Ciclo de vida operativo completo en patio y oficina:
  - `Solicitud pendiente` → `Revisar solicitud` (disponibilidad y documentos).
  - Bifurcación `¿Confirmar reserva?`:
    - No: `Rechazar y notificar al cliente`.
    - Sí: `Reserva confirmada` (notifica al cliente).
  - `Entrega del vehículo` (vehículo pasa a `en alquiler`).
  - `Devolución del vehículo` (inspección de retorno y kilometraje).
  - Bifurcación `¿Requiere mantenimiento?`:
    - Sí: `Enviar a mantenimiento`.
    - No: `Saldo y cierre del contrato`.
  - `Reserva cerrada` (vehículo retorna a `disponible`).

### Flujo 5: Backoffice de Personal y Menú por Permisos
- `Acceso personal` (`/admin/login`) → `Iniciar sesión` → `Menú por permisos` (`/admin`).
- 6 macro-módulos canónicos:
  1. *Reservas y contratos:* Solicitudes y calendario, contratos, entrega y devolución.
  2. *Clientes:* Lista y documentos, historial de alquileres.
  3. *Flota:* Vehículos, estado y mantenimiento, documentos y alertas.
  4. *Pagos y gastos:* Pagos y abonos, gastos por vehículo.
  5. *Reportes:* Ingresos y ocupación, exportar.
  6. *Administración:* Usuarios y roles, tarifas y configuración, auditoría.

### Flujo 6: Crecimiento de Equipo y Matriz RBAC
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
