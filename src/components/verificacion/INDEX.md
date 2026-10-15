# Index: `src/components/verificacion`

**Responsibility**: Componentes interactivos y presentación para el flujo multi-paso de verificación pericial KYC de identidad y licencias de conducir con integración directa a Cloudflare R2 y D1.
**Architectural Layer**: Presentation Layer (React 19 Interactive Island)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`VerificacionAssets.tsx`](./VerificacionAssets.tsx) | Bespoke Vector SVG Illustrations & Lanyard Badge Hero | `FlotaXEmblemSvg`, `DocFrontSvg`, `DocBackSvg`, `LicenseGraphicSvg`, `LanyardBadgeHero`, `CameraIconSvg`, `CheckCircleSvg`, `ShieldLockSvg`, `RefreshIconSvg` | React |
| [`VerificacionCameraModal.tsx`](./VerificacionCameraModal.tsx) | Live WebRTC Camera Viewfinder with ID-1 Framing Mask & Auto Compression | `VerificacionCameraModal`, `VerificacionCameraModalProps` | React, HTML5 Canvas, MediaDevices API |
| [`VerificacionMultistepIsland.tsx`](./VerificacionMultistepIsland.tsx) | Fullscreen React 19 Interactive Island / Fintech Multi-step Wizard | `default VerificacionMultistepIsland` | `astro:transitions/client`, `astro:actions`, `@cloudflare/workers-types` |

## Invariants & Directory Rules

- Diseñado para ejecución a pantalla completa (`100dvh`) con estética institucional Fintech y tokens canónicos de FlotaX (`#111827`, `#1F2937`, `#4B5563`, `#9CA3AF`, `#EDEDED`).
- Ergonomía móvil estricta (inputs $\ge$ 16px / `text-base` para prevención de zoom en WebKit iOS).
- Cero manipulación imperativa del DOM; gestión reactiva de estado con React 19.
- Subida directa de evidencias fotográficas en base64 hacia Cloudflare R2 (`BUCKET_MULTIMEDIA`) a través de `actions.verificacion.subirFoto`.

<!-- Reconciled by codebase-index -->
