# Rule: Mobile Ergonomics & Dedicated Flow Governance (FlotaX)

**Código:** RUL-FLX-007  
**Proyecto:** FlotaX — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Ámbito:** Arquitectura mobile-first, manejo de densidad en pantallas táctiles y navegación en patio.

---

## 1. El Reto de Densidad en Terreno (Mobile Operativo)

En pantallas móviles (≤430px), los operarios de flota en terreno realizan tareas intensivas:
- Inspección pericial del vehículo con fotografías.
- Verificación de inventario de accesorios y nivel de combustible.
- Creación rápida de reservas o prórroga de contratos.
- Check-in y check-out con firma digital del cliente.

**Principio de diseño:** Dividir flujos complejos en pasos secuenciales claros y ergonómicos para el pulgar, en lugar de amontonar modales densos o formularios gigantescos en una sola vista.

---

## 2. Los 4 Pilares del Mobile First en FlotaX

1. **Thumb Zone Prioritaria:**
   - Botones de acción clave (`Confirmar`, `Tomar Foto`, `Siguiente`, `Firmar`) ubicados en la mitad inferior de la pantalla o fijos en la zona segura (`safe-bottom`).
2. **Touch Targets de 44x44px Mínimos:**
   - Todo elemento cliqueable cumple con el estándar de accesibilidad táctil para evitar toques accidentales con manos enguantadas o en movimiento.
3. **Escudo WebKit iOS (16px Rule):**
   - Todos los inputs garantizan `16px` de tamaño de fuente computado en móvil para impedir el zoom involuntario de iOS Safari.
4. **Respeto a la Paleta Canónica:**
   - Paleta: `#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`.
   - Cero colores o estilos heredados de proyectos externos.
