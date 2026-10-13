# Index: `design`

**Responsibility**: Diseños visuales vectoriales (Pencil / .pen), assets gráficos exportados y especificaciones UI/UX.
**Architectural Layer**: Design System / Visual Assets

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`landing-assets/`](./landing-assets/) | Directory `landing-assets` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`design-export.html`](./design-export.html) | Module / Utility | - | - |
| [`design.pen`](./design.pen) | Archivo Fuente Pencil | Sistema de diseño de interfaces, tokens y mockups completos | Pencil App |
| [`flotax-error-404-radar.glsl`](./flotax-error-404-radar.glsl) | Shader Fragment WebGL 1.0 | Lámina 05: Escáner CAD de perímetro 404 con retícula milimétrica, barrido sectorial y achurado $+62.3^\circ$ | `logo.pen` |
| [`flotax-error-offline-sonar.glsl`](./flotax-error-offline-sonar.glsl) | Shader Fragment WebGL 1.0 | Lámina 05: Sonar orbital de portadora interrumpida y modo autónomo offline con achurado $+62.3^\circ$ | `logo.pen` |
| [`flotax-loader-bg.glsl`](./flotax-loader-bg.glsl) | Shader Fragment WebGL 1.0 | Animación 01: Fondo de telemetría perimetral, retícula orbital y guías láser ($+62.3^\circ$ / $-35.5^\circ$) | `logo.pen` |
| [`flotax-loader-cad.glsl`](./flotax-loader-cad.glsl) | Shader Fragment WebGL 1.0 | Animación 02: Retícula milimétrica CAD, estelas de túnel de viento laminar y haz láser pericial | `logo.pen` |
| [`flotax-logo-pulse.glsl`](./flotax-logo-pulse.glsl) | Shader Fragment WebGL 1.0 | Animación 01: Barrido especular cinético $+62.3^\circ$ sobre las 3 masas del isotipo FlotaX | `logo.pen` |
| [`flotax-logo-scan.glsl`](./flotax-logo-scan.glsl) | Shader Fragment WebGL 1.0 | Animación 02: Transición Wireframe-to-Solid con achurado técnico $+62.3^\circ$ sobre el isotipo | `logo.pen` |
| [`flotax-metrics-spline.glsl`](./flotax-metrics-spline.glsl) | Shader Fragment WebGL 1.0 | Telemetría iOS: Curva spline cúbica con relleno achurado $+62.3^\circ$ y pulso de nodo activo | `logo.pen` |
| [`flotax-metrics-wave.glsl`](./flotax-metrics-wave.glsl) | Shader Fragment WebGL 1.0 | Telemetría iOS: Doble onda líquida animada (estilo Bessonov) con achurado técnico $+62.3^\circ$ | `logo.pen` |
| [`landing-export.html`](./landing-export.html) | Module / Utility | - | - |
| [`landing.pen`](./landing.pen) | Module / Utility | - | - |
| [`logo.pen`](./logo.pen) | Archivo Fuente Pencil | Identidad visual FlotaX y Láminas 01–05 (Carga Orbital, Escáner CAD, Métricas iOS, Admin Reservas y Contingencia 404/Offline/500) | Pencil App, [`flotax-loader-bg.glsl`](./flotax-loader-bg.glsl), [`flotax-error-404-radar.glsl`](./flotax-error-404-radar.glsl), [`flotax-error-offline-sonar.glsl`](./flotax-error-offline-sonar.glsl) |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
