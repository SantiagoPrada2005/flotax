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

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
