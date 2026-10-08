---
trigger: always_on
---

# Rule: FlotaX Strategic Purpose & Product Alignment Governance

**Código:** RUL-FLX-004  
**Proyecto:** FlotaX — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Directorio Fuente de Verdad:** [`design/`](file:///Users/santiago/proyectos/movix/design), [`src/`](file:///Users/santiago/proyectos/movix/src)  
**Ámbito:** Todas las decisiones de arquitectura de producto, flujos de usuario, diseño de interfaces y endpoints.

---

## 1. El Propósito Fundamental de FlotaX

FlotaX es una plataforma integral, moderna y móvil de gestión perimetral para el alquiler y control operativo de flotas de vehículos (automóviles, motocicletas, monopatines/patinetas eléctricas y utilitarios).

### FlotaX NO es:
- Una aplicación de notas o productividad personal.
- Un CRM genérico o ERP pesado de escritorio tradicional.
- Una tienda de comercio electrónico tradicional.

### FlotaX ES:
- Un **sistema operativo móvil y ágil para administradores de patio, recepcionistas y clientes**:
  - Catálogo y disponibilidad en tiempo real de unidades.
  - Gestión integral del ciclo de alquiler (reserva, check-in, entrega con inspección, prórroga, devolución y cobro).
  - Inspección pericial fotográfica con evidencia en Cloudflare R2.
  - Liquidación de tarifas, depósitos de garantía y cobro con pasarela de pagos.
  - Autenticación segura y sin contraseñas (Email OTP y Google OAuth) con Better Auth sobre Cloudflare D1.

---

## 2. Los Pilares de Experiencia de Usuario

1. **Mobile First Operativo:**
   - Todo flujo crítico (crear reserva, inspeccionar vehículo, verificar credenciales) debe ser completable desde un teléfono en terreno con una sola mano.
2. **Claridad de Estados & Disponibilidad:**
   - Los vehículos deben exhibir inequívocamente su estado: Disponible, Reservado, En Mantenimiento, Fuera de Servicio.
3. **Identidad Cromática Canónica Rigurosa:**
   - La paleta se compone estrictamente de: `#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`.
   - Prohibido reintroducir identidades de otros proyectos.
