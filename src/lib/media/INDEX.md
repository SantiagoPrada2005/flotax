# Index: `src/lib/media`

**Responsibility**: Utilidades perimetrales de procesamiento multimedia, compresión de imágenes en el cliente, construcción determinista de claves jerárquicas y streaming con soporte HTTP Range para fotos y videos en Cloudflare R2 (`BUCKET_MULTIMEDIA`).
**Architectural Layer**: Infrastructure / Shared Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`image-compression.ts`](./image-compression.ts) | Pure Utility / Client Media Processor | `comprimirYNormalizarImagen`, `CompressionOptions`, `CompressionResult` | HTML5 Canvas, Blob API |
| [`r2-vehiculo-keys.ts`](./r2-vehiculo-keys.ts) | R2 Hierarchical Key Builder & URL Resolver | `construirClaveR2MultimediaVehiculo`, `construirClaveR2DocumentoVehiculo`, `resolverUrlMultimediaR2`, `MIME_TYPES_IMAGEN_VEHICULO`, `MIME_TYPES_VIDEO_VEHICULO` | `@/db/schema/multimedia_vehiculo` |

## Invariants & Directory Rules

- Prohibido el uso de bibliotecas externas pesadas; toda la compresión debe ejecutarse mediante las APIs nativas del navegador (`HTMLCanvasElement`, `Blob`, `FileReader`).
- Las imágenes procesadas para verificación pericial deben optimizarse para un peso menor a 400 KB manteniendo legibilidad tipográfica y OCR.
- Todo objeto de historial de vehículo en R2 debe seguir la convención jerárquica de `r2-vehiculo-keys.ts`.

<!-- Reconciled by codebase-index -->
