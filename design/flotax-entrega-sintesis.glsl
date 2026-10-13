precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/**
 * @label Surface Light (#EDEDED)
 * @color
 * @default #EDEDED
 */
uniform vec3 u_surface;

/**
 * @label Light Gray (#9CA3AF)
 * @color
 * @default #9CA3AF
 */
uniform vec3 u_grayLight;

/**
 * @label Mid Gray (#4B5563)
 * @color
 * @default #4B5563
 */
uniform vec3 u_grayMid;

/**
 * @label Secondary Graphite (#1F2937)
 * @color
 * @default #1F2937
 */
uniform vec3 u_graphite;

/**
 * @label Deep Black (#111827)
 * @color
 * @default #111827
 */
uniform vec3 u_bg;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.8;

  // Base Obsidian / Graphite Synthesis Stage
  vec3 col = mix(u_bg, u_graphite, smoothstep(0.0, 0.85, st.y));

  // 1. Radial Telemetry Pulse Rings (92% -> 100% Synthesis Engine)
  float dist = length(uv);
  float pulseWave = fract(dist * 3.2 - t * 0.55);
  float ringGlow = smoothstep(0.18, 0.0, abs(pulseWave - 0.5)) * smoothstep(0.65, 0.08, dist);
  col = mix(col, u_grayMid, ringGlow * 0.42);

  // 2. +62.3 deg Specular Sweep & Technical Hatching
  float hatch = fract((gl_FragCoord.x * 0.8854 - gl_FragCoord.y * 0.4648) / 8.0);
  float hatchMask = smoothstep(0.20, 0.05, abs(hatch - 0.5));
  col = mix(col, u_grayLight, hatchMask * 0.14);

  // 3. Precision Calibration Ticks around perimeter
  float angle = atan(uv.y, uv.x);
  float tickRing = smoothstep(0.008, 0.0, abs(dist - 0.36));
  float ticks = step(0.45, sin(angle * 36.0 + t));
  col = mix(col, u_surface, tickRing * ticks * 0.65);

  // 4. Specular diagonal beam
  float beamPos = sin(t * 0.9) * 0.45;
  float beamDist = abs((uv.x * 0.8854 + uv.y * 0.4648) - beamPos);
  float beam = smoothstep(0.14, 0.0, beamDist);
  col = mix(col, u_surface, beam * 0.22);

  gl_FragColor = vec4(col, 1.0);
}
