# Rule: Pen.dev Design Fidelity & Visual Signature Governance

## 1. Mandatory Pen.dev Pre-Implementation Inspection
Before writing or modifying any UI component, screen, card, modal, or layout in Phoenix, you **MUST inspect `design/design.pen`** (and `design/exports/sistema.html`).

1. **Locate the Canonical Frame**: Search `design/design.pen` for the corresponding screen or widget (e.g., `1. Rayos & Foco`, `2. Órbitas & Partículas`, `App Shell · Foco`, `Hero · Foco A-1`, `Card · Trazo propio`).
2. **Extract Exact Geometry**: Do NOT guess or approximate SVG paths or visual effects. Use the exact vector paths (`BurstA`, `BurstB`, `DashRing sIG1j`, `Espiral G19WW`, `Aros 144..560`, `Rayo lMlPI`, `Partícula T1sIy`).
3. **Zero Generic Fallback Policy**: Replacing signature Pen geometry with flat CSS boxes, generic circular spinners, or standard off-the-shelf icon sets is strictly prohibited. Components MUST embody the visual signature and tactile warmth of FocalPoint OS.

---

## 2. Core Visual Signature Component Contracts

### A. Frame `1. Rayos & Foco` (`MgaYA`)
- **Timer & Solar Radiation**:
  - Main hero timer cards MUST compose `TimerCard.astro` and `SolarRayBurst.astro`.
  - Solar bursts must feature all three angular radiating layers: `BurstA` (`#FF5F1FA6`), `BurstB` (`#FFA25E7A`), and `BurstC` (`#FFC531AE`), anchored with the dashed elliptical orbit (55×26), satellites, and concentric luminous core.
- **Acoustic Resonance in Focus Mode**:
  - Full-screen immersion views (such as `tunnel.astro`) MUST compose `FocusRings.astro`.
  - Must include the concentric acoustic resonance aros (144px, 216px, 296px, 360px, 440px, 560px), ambient amber/gold glow, and the 4 asymmetrically rotated corner rays (`NE: 24°`, `SE: -18°`, `SW: 32°`, `NW: -15°`).
- **A-1 Priority Frog Anchors**:
  - Must feature the watermark geometry and signature floating corner rays (`Rayo ts`, `Rayo td`, `Rayo bi`) and ring (`Anillo bd`) from `Hero · Foco A-1`.

### B. Frame `2. Órbitas & Partículas` (`K6Wtw`)
- **Canonical Orbit System**:
  - When rendering orbits, satellites, or constellations, use `OrbitSystem.astro` mapped to the 8 canonical Muestras:
    1. `halo`: Concentric diffuse rings with thermal gradient and satellites.
    2. `concentric`: Concentric calibration circles with axis tick marks.
    3. `satellite`: Tilted elliptical orbit with segmented `DashRing` (`sIG1j`) and orbiting satellites.
    4. `dual`: Crossed dual elliptical orbits with ±28° angular offset.
    5. `constellation`: Geometric nodal star network with connecting vector links.
    6. `corona`: Particle corona with perimetral `DashRing` (`K1y1G`) and 12+ star satellites.
    7. `spiral`: Continuous logarithmic spiral (`G19WW`) with orbital particles along the curve.
    8. `dotgrid`: Luminescent particle matrix with quarter focal arc.
- **Spatial Depth Layering (`Demo · Tras una card` & `Demo · Arcos tras timer`)**:
  - Cards and dominant blocks MUST project spatial depth by placing `CardBackdropOrbit.astro` behind surfaces, allowing concentric rings and satellite dots to peek out with subtle thermal warmth.

### C. Global Ambient Atmosphere (`SpTrT` & `jM1ZT`)
- Every page rendered inside `AppShell.astro` MUST inherit `AmbientBackground.astro`:
  - Peach (`$peach`) and yellow (`$yellow`) blurred thermal atmospheres.
  - Large background structural orbits: 780px, 440px, 380px on desktop; 360px, 280px on mobile.
  - Floating corner rays rotated at authentic Pen angles (-24°, 18°, 32°, -15°).
  - Floating signature particles (`T1sIy`) and color-accent microdots.

### D. Custom SVG Glyphs (`Card · Trazo propio` · `mSCIX`)
- For brand moments, status pills, and signature buttons, prefer the 12 bespoke hand-drawn glyphs in `Icon.astro`:
  - `ray`, `orbit`, `particle`, `wave`, `trajectory`, `focus`, `ring`, `brand-mark`, `close-glyph`, `plus-glyph`, `menu-glyph`, `arrow-glyph`.

---

## 3. Review & Verification Checklist
Before completing any UI task:
1. [ ] **Pen Verification**: Does the component reflect the corresponding frame in `design/design.pen`?
2. [ ] **Spatial Presence**: Does the screen feature the ambient background orbits, rays, and particles?
3. [ ] **Motion & Polish**: Are animations aligned with the motion system (subtle, continuous, reduced-motion compliant)?
4. [ ] **Motion Audit Page**: Can the component be audited visually in `/motion`?
5. [ ] **Build Check**: Does `pnpm build` pass with zero errors?
