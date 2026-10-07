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

## 2. Los Tres Flujos Canónicos Inmutables

Toda pantalla debe pertenecer explícitamente y respetar la jerarquía de uno de los 3 flujos canónicos definidos en el sistema:

### Flujo 1: Mapa General del Cliente
- **Ruta Raíz / Inicio (`/`):** Dirige la bienvenida hacia 4 macro-rutas de cliente y 1 de staff:
  - Catálogo (`/catalogo`)
  - Alquilar (`/alquilar` o `/vehiculos/:id/alquilar`)
  - Mis Reservas (`/reservas`)
  - Perfil (`/perfil`)
  - Acceso Personal / Staff (`/admin/login` / `/admin`)
- **Prohibición:** No inventar rutas de primer nivel desconectadas del mapa general sin justificación documentada.

### Flujo 2: Explorar y Analizar Vehículos
- **Catálogo (`/catalogo`):** Debe proporcionar búsqueda, filtrado, ordenamiento y conmutación de vista (lista o mosaico).
- **Ficha del Vehículo (`/vehiculos/:id`):** Debe contener obligatoriamente:
  - Galería de fotos.
  - Ficha técnica.
  - Estado y calendario de disponibilidad en tiempo real.
  - Tarifa detallada y requisitos.
  - Herramienta de comparar vehículos.
  - CTA directo e inconfundible hacia **Alquilar**.

### Flujo 3: Embudo de Alquiler y Estados de Transacción
El embudo de alquiler es secuencial y no puede saltarse pasos críticos de negocio ni legales:
1. `Ficha del Vehículo` → `Elegir fechas de alquiler` (validación de disponibilidad inmediata).
2. `Bifurcación de Sesión`:
   - Si no está autenticado: `Iniciar sesión o registrarse` (preservando el vehículo y fechas elegidas).
   - Si está autenticado: Pasar directamente a `Resumen y costo total`.
3. `Resumen y costo total` (desglose transparente de días, tarifa base, depósito y valor del abono).
4. `Aceptar términos y datos`: **Obligatorio** consentimiento expreso de **Ley 1581 (Protección de Datos Personales de Colombia)** antes de pagar.
5. `Pagar o reportar abono`: Pasarela o comprobante de abono.
6. `Solicitud enviada (Estado: pendiente)`.
7. `El asesor confirma (Acción de Personal)`: El cliente no pasa a confirmado directamente; el asesor valida en panel operativo.
8. `Reserva confirmada (Estado: confirmada)`.

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
