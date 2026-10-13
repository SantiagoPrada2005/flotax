precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/**
 * @label Obsidian Core (#111827)
 * @color
 * @default #111827
 */
uniform vec3 u_bg;

/**
 * @label Deep Charcoal (#1F2937)
 * @color
 * @default #1F2937
 */
uniform vec3 u_graphite;

/**
 * @label Slate Mid (#4B5563)
 * @color
 * @default #4B5563
 */
uniform vec3 u_grayMid;

/**
 * @label Cool Gray (#9CA3AF)
 * @color
 * @default #9CA3AF
 */
uniform vec3 u_grayLight;

/**
 * @label Surface Light (#EDEDED)
 * @color
 * @default #EDEDED
 */
uniform vec3 u_surface;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 1.1;

  // Base Obsidian Dark (#111827) with subtle radial depth
  float dist = length(uv);
  vec3 col = mix(u_graphite * 0.85, u_bg, smoothstep(0.0, 0.65, dist));

  // 1. Subtle CAD dot matrix
  vec2 gridUv = fract(gl_FragCoord.xy / 18.0) - 0.5;
  float gridDot = smoothstep(0.12, 0.04, length(gridUv));
  col = mix(col, u_grayMid, gridDot * 0.22);

  // 2. +62.3 deg diagonal hatching inside signal shadow band
  float hatchPhase = fract((gl_FragCoord.x * 0.8854 - gl_FragCoord.y * 0.4648) / 8.5);
  float hatchLine = smoothstep(0.18, 0.05, abs(hatchPhase - 0.5));
  float bandMask = smoothstep(0.24, 0.02, abs(uv.y)) * smoothstep(0.12, 0.26, abs(uv.x));
  col = mix(col, u_graphite, hatchLine * bandMask * 0.65);

  // 3. Expanding Sonar Pulse Rings (Searching for Network Carrier)
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float pulsePhase = fract(t * 0.35 + fi * 0.3333);
    float radius = mix(0.08, 0.44, pulsePhase);
    float ring = smoothstep(0.0045, 0.0, abs(dist - radius));
    float fade = (1.0 - pulsePhase) * smoothstep(0.0, 0.15, pulsePhase);
    col = mix(col, u_grayLight, ring * fade * 0.65);
  }

  // 4. Interrupted Carrier Waveform on Left & Right of Center Gap
  float gapMask = smoothstep(0.13, 0.20, abs(uv.x));
  float carrierY = sin(uv.x * 22.0 - t * 2.0) * 0.045 * exp(-abs(uv.x) * 2.2) * gapMask;
  float waveDist = abs(uv.y - carrierY);
  float waveLine = smoothstep(0.004, 0.0, waveDist) * step(abs(uv.x), 0.46);
  col = mix(col, u_surface, waveLine * 0.75);

  // Flatline dashed carrier inside the dead-zone gap
  float deadZone = step(abs(uv.x), 0.13);
  float dashX = step(0.0, sin(uv.x * 90.0));
  float flatLine = smoothstep(0.003, 0.0, abs(uv.y)) * deadZone * dashX;
  col = mix(col, u_grayMid, flatLine * 0.85);

  // 5. +62.3 deg & -35.5 deg Construction Crosshairs
  float dAsc = abs(uv.x * 0.8854 + uv.y * 0.4648);
  float dDesc = abs(uv.x * 0.5807 - uv.y * 0.8141);
  float xMark = (smoothstep(0.0035, 0.0, dAsc) + smoothstep(0.0035, 0.0, dDesc)) * step(dist, 0.09);
  col = mix(col, u_grayLight, clamp(xMark, 0.0, 1.0) * 0.65);

  gl_FragColor = vec4(col, 1.0);
}
