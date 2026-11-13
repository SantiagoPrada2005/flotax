# Index: `src/lib/media`

**Responsibility**: Utilidades perimetrales de procesamiento multimedia, compresión de imágenes en el cliente, construcción determinista de claves jerárquicas y streaming con soporte HTTP Range para fotos y videos en Cloudflare R2 (`BUCKET_MULTIMEDIA`).
**Architectural Layer**: Infrastructure / Shared Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`image-compression.ts`](./image-compression.ts) | Pure Utility / Client Media Processor | `comprimirYNormalizarImagen`, `CompressionOptions`, `CompressionResult` | HTML5 Canvas, Blob API |
| [`r2-vehiculo-keys.ts`](./r2-vehiculo-keys.ts) | R2 Hierarchical Key Builder & URL Resolver | `construirClaveR2MultimediaVehiculo`, `construirClaveR2DocumentoVehiculo`, `resolverUrlMultimediaR2`, `MIME_TYPES_IMAGEN_VEHICULO`, `MIME_TYPES_VIDEO_VEHICULO` | `@/db/schema/multimedia_vehiculo` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
