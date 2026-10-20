# Index: `src/components/flota/wizard`

**Responsibility**: Experiencia inmersiva de pantalla completa («Una pantalla, una tarea», máx. 4 entradas) inspirada en Apple/iOS para el registro y edición de unidades vehiculares en FlotaX.
**Architectural Layer**: Presentation / React 19 Islands

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`types.ts`](./types.ts) | Domain & UI Types | `WizardStepId`, `WizardStepInfo`, `VehiculoWizardData`, `PresetImagen` | `@/lib/flota/types` |
| [`StepIndicator.tsx`](./StepIndicator.tsx) | HUD Superior Discreto | `StepIndicator`, `StepIndicatorProps` | `./types` |
| [`Step1TipoVehiculo.tsx`](./Step1TipoVehiculo.tsx) | Pantalla 1: Segmento Operativo (1 entrada) | `Step1TipoVehiculo`, `Step1TipoVehiculoProps` | `./types`, `@/lib/flota/types` |
| [`Step2Identificacion.tsx`](./Step2Identificacion.tsx) | Pantalla 2: Identificación Legal (2 entradas) | `Step2Identificacion`, `Step2IdentificacionProps` | `./types` |
| [`Step3InfoBasica.tsx`](./Step3InfoBasica.tsx) | Pantalla 3: Fabricante y Modelo (2 entradas) | `Step3InfoBasica`, `Step3InfoBasicaProps` | `./types` |
| [`Step4Caracteristicas.tsx`](./Step4Caracteristicas.tsx) | Pantalla 4: Características Técnicas (máx. 4 entradas) | `Step4Caracteristicas`, `Step4CaracteristicasProps` | `./types` |
| [`Step5Tarifas.tsx`](./Step5Tarifas.tsx) | Pantalla 5: Tarifas y Liquidación (2 entradas) | `Step5Tarifas`, `Step5TarifasProps` | `./types` |
| [`Step6Fotografia.tsx`](./Step6Fotografia.tsx) | Pantalla 6: Carga Fotográfica (1 entrada) | `Step6Fotografia`, `Step6FotografiaProps` | `./types` |
| [`Step7Patio.tsx`](./Step7Patio.tsx) | Pantalla 7: Documentación y Patio (3 entradas) | `Step7Patio`, `Step7PatioProps` | `./types`, `@/lib/flota/types` |
| [`Step8Revision.tsx`](./Step8Revision.tsx) | Pantalla 8: Revisión Final y Bento | `Step8Revision`, `Step8RevisionProps` | `./types` |
| [`VehicleWizardIsland.tsx`](./VehicleWizardIsland.tsx) | Orquestador de Pantalla Completa | `VehicleWizardIsland`, `VehicleWizardIslandProps` | `astro:actions`, `astro:transitions/client`, `./StepIndicator`, `./Step1`..`Step8` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Strict limit of maximum 4 input fields per screen.
- Zero tolerance for emojis in titles, badges, labels, and notifications.
- All `<input>`, `<select>`, `<textarea>` must use computed font size >= 16px to prevent iOS Safari auto-zoom.
- Mobile-first full-screen layout with touch targets >= 44x44px.
