# Index: `src/lib/media`

**Responsibility**: Utilidades perimetrales de procesamiento multimedia, compresión de imágenes en el cliente y normalización de evidencias fotográficas para almacenamiento en Cloudflare R2.
**Architectural Layer**: Infrastructure / Shared Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`image-compression.ts`](./image-compression.ts) | Pure Utility / Client Media Processor | `comprimirYNormalizarImagen`, `CompressionOptions`, `CompressionResult` | HTML5 Canvas, Blob API |

## Invariants & Directory Rules

- Prohibido el uso de bibliotecas externas pesadas; toda la compresión debe ejecutarse mediante las APIs nativas del navegador (`HTMLCanvasElement`, `Blob`, `FileReader`).
- Las imágenes procesadas para verificación pericial deben optimizarse para un peso menor a 400 KB manteniendo legibilidad tipográfica y OCR.

<!-- Reconciled by codebase-index -->
