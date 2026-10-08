# Rule: FlotaX UX & Product Interaction Standards (Action-First Governance)

**Código:** RUL-FLX-005  
**Proyecto:** FlotaX — Gestión de Flota y Alquiler de Vehículos  
**Ámbito:** Principios de diseño interactivo, ergonomía móvil y redacción de interfaces.

---

## 1. El Software es un Instrumento Operativo, NO un Manual

Los operarios de patio, mecánicos, recepcionistas y clientes abren FlotaX para **ejecutar operaciones en tiempo real** (verificar un vehículo, registrar una entrega, realizar una inspección de daños, procesar un cobro), no para leer explicaciones extensas.

- **Directo al Grano:** Formularios limpios, botones claros y feedback inmediato.
- **Microcopy Claro y Preciso:** Sin tecnicismos ni jerga robótica. Términos concretos del dominio: Placa, Modelo, Nivel de Combustible / Batería, Kilometraje, Tarifa Diaria, Depósito, Inspección de Salida / Retorno.

---

## 2. Ergonomía Mobile-First para Trabajo en Terreno

1. **Operación con Pulgar (Thumb-Zone Optimization):**
   - Los botones de confirmación, entrega o escaneo deben estar ubicados en la parte inferior accesible de la pantalla.
2. **Respeto a la Paleta Canónica Obligatoria:**
   - Colores: `#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`.
   - Textos de alto contraste sobre canvas `#EDEDED` y tarjetas `#FFFFFF` o `#EDEDED`.
3. **Escudo WebKit iOS (16px Rule):**
   - Todos los inputs respetan 16px de fuente mínima en móvil para evitar el zoom forzado de Safari.
4. **Touch Target 44x44px Mínimo:**
   - Ningún botón ni control interactivo debe tener un área táctil menor a 44x44px.
