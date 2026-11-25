# Evaluación Técnica: Fotografía de Catálogo y Soporte de Transparencia (PNG / WebP)

**Proyecto:** FlotaX  
**Alcance:** Análisis de viabilidad técnica y operativa para incorporar fotografías con fondo transparente (PNG / WebP) y estandarizar la captura visual del catálogo de vehículos, sin modificar el flujo actual de subida.  
**Estado:** Documento de evaluación y arquitectura futura (Fase 1 visual completada sin cambios en subida).

---

## 1. Diagnóstico del Pipeline Actual

La revisión del flujo vigente de carga, almacenamiento y entrega de fotografías del catálogo revela las siguientes características técnicas:

1. **Captura en el asistente de vehículos (`src/components/flota/wizard/Step6Fotografia.tsx`)**:
   - El selector de archivos acepta `accept="image/*"` y procesa la imagen seleccionada en el navegador mediante `FileReader.readAsDataURL(file)`, asignando el Data URL resultante directamente a `imagenUrl`.
   - En esta pantalla no se ejecuta aún normalización a `16:9` ni subida binaria directa a Cloudflare R2; `guardarVehiculoAction` (`src/actions/flota.ts`) valida `imagenUrl` como `z.string().min(1)` y la persiste en D1.

2. **Normalizador de imágenes en cliente (`src/lib/media/image-compression.ts`)**:
   - La función `comprimirYNormalizarImagen` crea un contexto 2D con `{ alpha: false }`, rellena explícitamente el lienzo con blanco sólido (`ctx.fillStyle = '#FFFFFF'`) para evitar artefactos por transparencia y exporta el resultado exclusivamente como `'image/jpeg'` (`canvas.toBlob(..., 'image/jpeg', quality)`).
   - **Implicación directa:** Si un flujo reutilizara `comprimirYNormalizarImagen` tal como está implementado hoy, cualquier archivo PNG o WebP con canal alfa perdería su transparencia y quedaría con fondo blanco opaco.

3. **Almacenamiento en Cloudflare R2 y entrega perimetral (`src/db/schema/multimedia_vehiculo.ts`, `src/lib/media/r2-vehiculo-keys.ts`, `src/pages/api/multimedia/[...key].ts`)**:
   - El esquema `multimediaVehiculo` soporta `mimeType` genérico (como `'image/webp'` o `'image/png'`), `anchoPx`, `altoPx`, `esPortadaCatalogo` y `anguloEstudio`.
   - El constructor `construirClaveR2MultimediaVehiculo` ya admite extensiones `'webp' | 'jpg' | 'png'` bajo la ruta canónica `locales/{localId}/vehiculos/{vehiculoId}/catalogo/{angulo}_{ts}.{ext}`.
   - El endpoint `GET /api/multimedia/[...key]` entrega el objeto desde `env.BUCKET_MULTIMEDIA` preservando el `content-type` almacenado en `object.httpMetadata?.contentType`.
   - En `src/styles/tokens.css`, la regla para `html.dark img.mix-blend-multiply` fuerza `mix-blend-mode: normal !important` para evitar que imágenes de vehículos se oscurezcan o fundan indebidamente en modo oscuro.

---

## 2. Viabilidad de Soporte PNG y WebP con Transparencia

**Conclusión de viabilidad:** El soporte para renderizar y servir imágenes PNG y WebP con canal alfa es **técnicamente viable y de bajo impacto** sobre la infraestructura actual de R2 y Astro, siempre que se contemplen tres consideraciones de presentación:

1. **Entrega y compatibilidad del navegador:** Todos los navegadores modernos (Chrome, Safari/WebKit iOS, Firefox, Edge) soportan WebP con canal alfa (menor peso que PNG manteniendo transparencia de 8 bits) y PNG transparente.
2. **Integración visual en la tarjeta:** Al haberse eliminado la caja interior del contenedor de fotografía (usando proporción `16:9` de borde a borde), una imagen con fondo transparente mostrará detrás la superficie base de la tarjeta (`#FFFFFF` en modo claro y `#1F2937` en modo oscuro), evitando el efecto de doble caja.
3. **Diferencia de encuadre entre foto completa y recorte transparente (*cutout*):**
   - Las fotografías escénicas completas en `16:9` funcionan óptimamente con `object-cover object-center`.
   - Los *cutouts* con transparencia suelen llegar recortados al ras del vehículo (`tight bounding box`). Si se aplicara `object-cover` a un *cutout* sin márgenes, podrían recortarse llantas o paragolpes; en cambio, con un *padding* transparente controlado en el archivo generado (`16:9` con 10%–15% de margen) o un modo de renderizado específico por metadato, se garantiza una integración limpia sin deformar las tarjetas existentes.

---

## 3. Evaluación de Alternativas

### Alternativa A – Eliminación Automática del Fondo

**Concepto operativo:** Cuando el operador sube una fotografía de catálogo, el sistema conserva la imagen original sin alterar y genera de forma paralela (o asíncrona) una versión optimizada en WebP con fondo transparente (`alpha`).

#### Flujo Propuesto con Preservación del Original
1. **Subida del original:** Almacenar el archivo original (o normalizado sin recorte de silueta) en Cloudflare R2 como respaldo pericial/histórico, por ejemplo con sufijo `-original`:
   - `locales/{localId}/vehiculos/{vehiculoId}/catalogo/{angulo}_{ts}-original.webp`
2. **Generación del derivado transparente:** Ejecutar la segmentación de primer plano (*foreground segmentation*) y guardar el resultado optimizado con canal alfa en WebP (`quality: 0.85–0.90`, relación `16:9` centrada con margen de seguridad):
   - `locales/{localId}/vehiculos/{vehiculoId}/catalogo/{angulo}_{ts}-cutout.webp`
3. **Fallback seguro:** Si la segmentación falla, tarda más del presupuesto o el operador desactiva el recorte automático, el catálogo muestra el archivo original sin bloquear el alta ni la edición de la unidad.

#### Comparativa de Servicios y Herramientas de Procesamiento

| Opción Tecnológica | Rendimiento / Latencia | Costo Estimado | Ventajas para FlotaX | Riesgos / Limitaciones |
| :--- | :--- | :--- | :--- | :--- |
| **1. Cloudflare Images (`segment=foreground`)** | Transformación en el edge en ~300–900 ms con caché CDN automática en peticiones siguientes. | Por uso de Cloudflare Images (almacenamiento + transformaciones únicas facturadas por volumen). | Cero infraestructura externa; integración nativa con Cloudflare Workers y URLs firmadas/transformadas; no requiere mantener modelos ni colas complejas. | Menor control sobre sombras de suelo bajo las llantas; requiere activar el producto Cloudflare Images en la cuenta. |
| **2. Cloudflare Workers AI (`@cf/bria/rmbg-1.4`)** | Inferencia GPU edge (~1–3 s por imagen); recomendable ejecutar en segundo plano o bajo demanda. | Cuota gratuita diaria (Neurons) y costo muy bajo por cada 1.000 ejecuciones adicionales. | Permanece 100% dentro del ecosistema Cloudflare sin transferir datos a terceros. | La generación de la máscara alfa y el re-codificado a WebP transparente en Workers V8 requiere módulo WASM de imagen (ej. `@cf-wasm/photon`), ya que Workers no incluye Canvas DOM nativo. |
| **3. Procesamiento en cliente (WASM / WebGPU)** | 2–8 s según CPU/GPU del dispositivo; requiere descargar pesos del modelo (~40–100 MB la primera vez). | \$0 USD en servidor. | Sin costos por volumen ni llamadas a APIs externas. | **No recomendado como vía única para FlotaX:** el uso Mobile-First en patio con datos móviles 4G y teléfonos de gama media sufre demoras, alto consumo de RAM/batería y cierres de pestaña en WebKit iOS. |
| **4. APIs externas automotrices (remove.bg, Photoroom, Clipdrop)** | 1–3 s vía HTTPS desde Worker o backend. | ~\$0.02 a \$0.20 USD por imagen según plan y resolución. | Máxima calidad visual en vidrios, reflejos metálicos, rines y generación opcional de sombra de estudio realista bajo el vehículo. | Dependencia de proveedor externo, latencia adicional, gestión de secretos/cuotas y costo lineal creciente por cada foto subida. |

#### Cambios Técnicos Futuros Necesarios en el Código Base
- **`src/lib/media/image-compression.ts`**: agregar opciones `preserveAlpha?: boolean` y `outputFormat?: 'image/jpeg' | 'image/webp'`. Cuando `preserveAlpha` sea `true`, inicializar `canvas.getContext('2d', { alpha: true })`, omitir `ctx.fillRect('#FFFFFF')` y exportar como `'image/webp'`.
- **`src/db/schema/multimedia_vehiculo.ts`**: añadir columna opcional `originalR2Key` (o usar una convención de variantes vinculadas) para distinguir el respaldo original del derivado con transparencia.
- **Asincronía:** evitar ejecutar la eliminación de fondo de forma bloqueante dentro del submit principal; emplear un paso asíncrono con estado *«Procesando recorte»* y fallback inmediato al archivo original.

---

### Alternativa B – Guía Fotográfica para Operadores

**Concepto operativo:** Estandarizar la toma fotográfica en patio mediante una guía simple y visual dirigida al personal operativo, logrando uniformidad comercial sin añadir dependencias de IA, costos por imagen ni complejidad técnica.

#### Lineamientos Prácticos para Operadores de Flota

1. **Iluminación**
   - Fotografiar en **luz natural difusa** (día nublado, sombra abierta homogénea o bajo cubierta bien iluminada).
   - Evitar sol directo de mediodía (genera sombras duras debajo del chasis y reflejos quemados en el capó) y evitar espacios oscuros con bombillos puntuales.
   - Colocar la fuente principal de luz detrás o ligeramente al costado del operador; nunca fotografiar a contraluz.

2. **Encuadre y Proporción (16:9)**
   - Tomar la fotografía **siempre en horizontal (16:9)** para coincidir exactamente con la proporción de las tarjetas del catálogo.
   - Centrar el vehículo horizontal y verticalmente, dejando entre un **10% y un 15% de aire libre** alrededor de todos los bordes (parachoques delantero, trasero, techo y llantas) para que el recorte `object-cover` nunca corte partes del vehículo.

3. **Ángulo Estándar de Catálogo**
   - **Portada principal:** ángulo **3/4 delantero (35° a 45°)** mostrando simultáneamente la parrilla frontal, un faro completo y todo el lateral del vehículo.
   - **Altura de la cámara:** a la altura del faro o línea media de la puerta (~1.1 a 1.3 metros), agachando ligeramente la postura respecto a la toma de pie; evitar ángulos picados desde arriba.

4. **Distancia y Lente**
   - Mantener una distancia de **4 a 5 metros** (para automóviles/SUV) o **2.5 a 3.5 metros** (para motocicletas y monopatines).
   - Usar únicamente el lente principal **1x** del teléfono (o **2x** retrocediendo unos pasos). **Prohibido usar ultra gran angular (0.5x)** porque distorsiona las ruedas y alarga artificialmente el frente.

5. **Fondo y Entorno**
   - Seleccionar un fondo neutro, continuo y despejado (muro claro/gris liso, pavimento uniforme o zona abierta del patio sin otros carros detrás).
   - Verificar que no aparezcan personas, conos, mangueras, canecas ni letreros llamativos atravesando la silueta del techo.
   - Evitar encerrar el vehículo en zonas negras o subexponer el fondo: el entorno debe integrarse limpiamente con la tarjeta.

6. **Preparación Comercial de la Unidad**
   - Vehículo limpio, seco y con vidrios completamente cerrados.
   - Ruedas alineadas rectas (o con un leve giro de 10° mostrando el diseño del rin hacia la cámara).
   - Encender únicamente luces diurnas (DRL) si el vehículo dispone de ellas y retirar objetos del parabrisas o tablero antes de disparar.

---

## 4. Recomendación de Implementación por Fases

1. **Corto plazo (Inmediato, costo \$0):** Adoptar la **Alternativa B** entregando la guía resumida a los operadores en el flujo de alta (como ayuda contextual en el Paso 6 en futuras iteraciones) para unificar todas las fotos nuevas en `16:9` horizontal con encuadre 3/4 y aire lateral.
2. **Mediano plazo (Soporte nativo alfa):** Extender `comprimirYNormalizarImagen` para respetar el canal alfa en archivos `PNG` y `WebP` existentes, generando salidas `image/webp` con transparencia cuando el origen ya venga recortado.
3. **Largo plazo (Automatización opcional - Alternativa A):** Si el volumen de flota crece y se requiere homogeneidad de estudio automática sobre fotos tomadas en patios heterogéneos, implementar **Cloudflare Images (`segment=foreground`)** o una API especializada de recorte automotriz en un proceso asíncrono, preservando siempre el archivo original en `BUCKET_MULTIMEDIA` y generando el derivado `-cutout.webp` en formato `16:9` con márgenes del 12%.
