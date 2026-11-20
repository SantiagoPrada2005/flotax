# Operación, Seguridad y Control de Costos — Mapbox y Ubicación de Entrega (FlotaX)

> **Alcance:** Slide 3 (*Entrega · Mapa y ubicación*) del flujo progresivo en `/alquilar/[id]` y vista operativa de entregas a domicilio para asesores de flota en `/admin/reservas/[codigo]`.

---

## 1. Arquitectura de Tokens y Seguridad (Sin Claves Sin Restricción en Cliente)

FlotaX separa estrictamente el token público del navegador y el token de servidor en Cloudflare Workers:

| Variable | Dónde vive | Tipo | Restricción obligatoria |
| :--- | :--- | :--- | :--- |
| `MAPBOX_PUBLIC_TOKEN` | `.env` local / Cloudflare Worker var o secret | Token público (`pk.*`) | **URL restrictions** en Mapbox Studio: `https://flotax.innovaweb.pro/*`, `https://preview.flotax.innovaweb.pro/*`, `http://localhost:*/*`. Scopes mínimos: `styles:read`, `fonts:read`, `sprites:read`. |
| `MAPBOX_SECRET_TOKEN` | Solo Cloudflare Workers Secret (`wrangler secret put MAPBOX_SECRET_TOKEN`) | Token de servidor (`sk.*` o `pk.*` privado) | Nunca se envía al navegador. Se usa exclusivamente en `src/actions/ubicacion.ts` para Geocoding v6 (`forward` y `reverse`). |
| `MAPBOX_DAILY_GEOCODE_LIMIT` | Variable de entorno (opcional, default `2500`) | Entero | Tope diario de solicitudes de geocodificación/autocompletado aplicado en Cloudflare KV (`env.SESSION`). |

### Garantías en código
- `resolverTokenMapboxPublico(env)` en [`src/lib/ubicacion/mapbox.ts`](../src/lib/ubicacion/mapbox.ts) rechaza cualquier token que no comience por `pk.`, impidiendo fugas accidentales de un token secreto (`sk.*`) hacia el HTML o cliente.
- Las búsquedas de autocompletado (`actions.ubicacion.buscarDirecciones`) y la geocodificación inversa (`actions.ubicacion.geocodificarInversa`) pasan por Astro Server Actions en Cloudflare Workers, reenvían el `Referer` autorizado de la aplicación (`resolverRefererMapbox`) para cumplir las URL restrictions de Mapbox, y aplican tope diario en Cloudflare KV.

---

## 2. Control de Costos, Carga Diferida y Tope Diario

1. **Carga diferida por selección (Progressive Disclosure)**: `mapbox-gl` y su CSS se importan dinámicamente (`import('mapbox-gl')`) únicamente en cliente y **solo cuando el usuario elige** *Retiro en Patio Principal* o *Entrega en tu ubicación* en el Slide 3 (*Entrega*). Los slides previos descargan **0 KB** de Mapbox.
2. **Experiencia 100% nativa en Mapbox (sin redirecciones a Google Maps)**: Tanto el retiro en patio como la entrega a domicilio renderizan directamente el mapa interactivo de Mapbox GL JS con controles de zoom y recentrado dentro de FlotaX.
3. **Autocompletado exclusivo de domicilio**: En *Retiro en Patio Principal* el campo de búsqueda no existe en el DOM y la Server Action valida `modalidadEntrega: z.literal('DOMICILIO_MEDELLIN')`, bloqueando cualquier consumo de geocodificación en retiros en patio.
4. **Debounce y longitud mínima**: El buscador exige mínimo 3 caracteres y espera 350 ms antes de consultar.
5. **Tope diario en Cloudflare KV**: Cada llamada de geocodificación incrementa `flotax:mapbox:geocode:YYYY-MM-DD` (TTL 36 h). Al alcanzar `MAPBOX_DAILY_GEOCODE_LIMIT`, el sistema detiene las llamadas externas y permite continuar con pin manual y coordenadas sin bloquear reservas.
6. **Alertas y límites en cuenta Mapbox (checklist operativo)**:
   - Ir a **Mapbox Account → Billing / Usage Alerts** y configurar alertas de consumo al 50 %, 80 % y 100 % de la capa gratuita.
   - **Capas gratuitas vigentes de referencia en Mapbox** *(confirmar en `mapbox.com/pricing` antes de escalar volumen)*:
     - **Mapbox GL JS (Web)**: hasta **50.000 cargas de mapa/mes** sin costo.
     - **Temporary Geocoding API v6**: hasta **100.000 solicitudes/mes** sin costo.

---

## 3. Parametrización por Sede: Zona de Cobertura y Recargo por Distancia

Cuando negocio defina la zona de cobertura o el recargo definitivo por distancia, no se requiere despliegue de código; se ajusta directamente en Cloudflare D1:

### Coordenadas del patio (`locales_alquiler`)
- `latitud` (`REAL`) y `longitud` (`REAL`): pin fijo del patio principal y origen para calcular la distancia Haversine.

### Reglas de domicilio (`politicas_local`)
| Columna | Valor por defecto | Descripción |
| :--- | :--- | :--- |
| `domicilio_habilitado` | `true` | Permite habilitar o pausar domicilios por sede. |
| `radio_cobertura_km` | `15` | Radio máximo en km desde el patio. Toda dirección fuera de este radio se rechaza en frontend y backend. |
| `km_incluidos_domicilio` | `5` | Kilómetros incluidos antes de cobrar tarifa adicional por km. |
| `tarifa_domicilio_base` | `0` | Recargo base en COP para domicilios dentro de cobertura. |
| `tarifa_domicilio_por_km` | `0` | Recargo en COP por cada km entero adicional sobre `km_incluidos_domicilio`. |
| `zona_cobertura_etiqueta` | `'Medellín y Área Metropolitana'` | Etiqueta visible para el cliente. |

---

## 4. Arquitectura de Progressive Disclosure (Cero Saturación de Pantallas)

Para evitar la sobrecarga cognitiva de mostrar 4 o 5 cajas con información distinta en una misma vista móvil, todo el ciclo de vida del alquiler utiliza **Progressive Disclosure** (una sola caja o foco principal por slide, con campos secundarios bajo acordeones opcionales):

### 4.1 Flujo de Reserva del Cliente (`/alquilar/[id]` — 5 Slides)
1. **Slide 1 · Fechas:** Hero del vehículo y calendario de disponibilidad.
2. **Slide 2 · Conductor:** Solo los 3 datos esenciales (Nombre, Correo, Teléfono). Documento y licencia plegados en `+ Agregar documento y licencia ahora`.
3. **Slide 3 · Entrega y Mapa Mapbox:** Selector *Retiro en Patio Principal* vs *Entrega en tu ubicación*. Monta el mapa interactivo de Mapbox GL JS en ambas modalidades (cero redirecciones externas a Google Maps/Waze). Instrucciones de acceso plegadas en `+ Agregar apartamento, torre o indicaciones`.
4. **Slide 4 · Resumen:** Una única tarjeta consolidada con itinerario, punto de entrega, distancia/recargo, conductor y total.
5. **Slide 5 · Confirmar:** Selección de anticipo (30 % o 100 %), método de pago, autorización de Ley 1581 y control táctil *Slide-to-Confirm*.

### 4.2 Separación Estricta de Vista Cliente vs. Vista Administrador
- Al finalizar una reserva desde el flujo web de cliente (`origen: 'CLIENTE_WEB'`) y pulsar **"Ver mi reserva"** (`/reservas/[codigo]?token=...`), el sistema mantiene al usuario en la **Vista de Cliente** (`ReservaClienteDetalleView.tsx`), donde **no** existen botones administrativos de comprobación documental ni entrega de unidad.
- Las acciones operativas (`Confirmar reserva`, `Registrar / Comprobar datos del cliente`, `Iniciar entrega`, `Devolver y cerrar contrato`) están restringidas exclusivamente al panel administrativo (`/admin/reservas/[codigo]`).

### 4.3 Flujos Operativos del Administrador con Progressive Disclosure
- **Expediente de Reserva (`/admin/reservas/[codigo]`):**
  - `DeliveryPointCard.tsx`: Muestra dirección, referencia, distancia en km, recargo y botón de copiado de coordenadas; el mapa de Mapbox inicia plegado bajo el botón **"Ver en mapa"**.
  - `SemaforoDocumentalPanel.tsx`: Inicia plegado en una sola barra de estado (`Al día ✓ · Revisar +`).
- **Modal "Devolver y Cerrar Contrato" (`AlquilerCicloModals.tsx` — 4 Slides):**
  - *Paso 1 (Telemetría):* Fecha de devolución, Odómetro y Nivel de energía.
  - *Paso 2 (Ajustes):* Observaciones de cierre + acordeón opcional `+ Agregar sobrecosto o descuento del local`.
  - *Paso 3 (Liquidación):* Tarjeta única de Estado financiero final y cobro en caja.
  - *Paso 4 (Garantía):* Resolución del depósito de garantía y cierre del contrato.
- **Modal "Nueva Reserva Operativa" de Mostrador (`MisReservasHub.tsx` — 3 Slides):**
  - *1. Unidad* (Vehículo y fechas) ➔ *2. Conductor* (Nombre, Teléfono y acordeón opcional de documento) ➔ *3. Recaudo* (Modalidad y cuenta de caja).

---

## 5. Cumplimiento Ley 1581 de 2012 y Privacidad

- La dirección, coordenadas (`entrega_latitud`, `entrega_longitud`), referencia y distancia (`distancia_entrega_km`) **se persisten únicamente cuando `modalidad_entrega = 'DOMICILIO_MEDELLIN'`**; en `PATIO_PRINCIPAL` el servidor fuerza `NULL` y recargo `0`.
- El consentimiento obligatorio de **Ley 1581 de 2012** en el Slide 5 (*Confirmar*) incluye explícitamente el tratamiento de la dirección y coordenadas de entrega a domicilio con finalidad exclusiva de coordinación logística y formalización del contrato.

---

## 6. Despliegue de Migración y Secrets

```bash
# 1. Aplicar migración 0009 en D1 local y producción
pnpm db:migrate:local
pnpm db:migrate:prod

# 2. Configurar tokens restringidos de Mapbox en Cloudflare Workers
pnpm dlx wrangler secret put MAPBOX_PUBLIC_TOKEN
pnpm dlx wrangler secret put MAPBOX_SECRET_TOKEN
```
