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
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.95;

  // Editorial Light Base (#EDEDED)
  vec3 col = u_surface;

  // 1. Millimeter CAD blueprint sub-grid + primary module grid
  vec2 subGrid = fract(uv * 36.0 + 0.5) - 0.5;
  float subLine = min(abs(subGrid.x), abs(subGrid.y));
  float subMask = smoothstep(0.018, 0.0, subLine) * smoothstep(0.85, 0.10, length(uv));
  col = mix(col, u_grayLight, subMask * 0.22);

  vec2 mainGrid = fract(uv * 9.0 + 0.5) - 0.5;
  float mainLine = min(abs(mainGrid.x), abs(mainGrid.y));
  float mainMask = smoothstep(0.008, 0.0, mainLine) * smoothstep(0.88, 0.05, length(uv));
  col = mix(col, u_grayLight, mainMask * 0.48);

  // 2. Aerodynamic Wind-Tunnel Slipstream Streaks (horizontal laminar flow)
  float laneY = abs(fract(uv.y * 18.0 + 0.5) - 0.5);
  float laneLine = smoothstep(0.022, 0.0, laneY);
  float streamDash = fract(uv.x * 1.6 - t * 1.25 + floor(uv.y * 18.0) * 0.37);
  float streamEnvelope = smoothstep(0.0, 0.18, streamDash) * smoothstep(0.42, 0.18, streamDash);
  // Part slipstream around central logo zone
  float centerClearance = smoothstep(0.14, 0.34, length(uv * vec2(0.75, 1.15)));
  col = mix(col, u_grayMid, laneLine * streamEnvelope * centerClearance * 0.45);

  // 3. +62.3 deg & -35.5 deg CAD Construction Vectors
  float dAsc = abs(uv.x * 0.8854 + uv.y * 0.4648);
  float dDesc = abs(uv.x * 0.5807 - uv.y * 0.8141);
  float cadVectors = (smoothstep(0.0022, 0.0, dAsc) + smoothstep(0.0022, 0.0, dDesc))
                   * smoothstep(0.68, 0.16, length(uv));
  col = mix(col, u_grayLight, clamp(cadVectors, 0.0, 1.0) * 0.75);

  // 4. Rectangular CAD Bounding Frame around center stage
  vec2 boxDist = abs(uv) - vec2(0.32, 0.23);
  float boxEdge = max(boxDist.x, boxDist.y);
  float frameOutline = smoothstep(0.002, 0.0, abs(boxEdge));
  // Corner bracket mask
  float cornerMask = step(0.24, abs(uv.x)) * step(0.16, abs(uv.y));
  col = mix(col, u_graphite, frameOutline * cornerMask * 0.85);

  // 5. Sweeping +62.3 deg Laser Pericial Scanner Beam across center stage
  float scanCoord = uv.x + uv.y * 0.525;
  float scanPos = sin(t * 1.4) * 0.42;
  float scanDist = abs(scanCoord - scanPos);
  float scanWake = smoothstep(0.09, 0.0, scanDist) * step(abs(uv.y), 0.26) * step(abs(uv.x), 0.48);
  float scanLaser = smoothstep(0.0028, 0.0, scanDist) * step(abs(uv.y), 0.28) * step(abs(uv.x), 0.50);

  col = mix(col, u_grayLight, scanWake * 0.35);
  col = mix(col, u_bg, scanLaser * 0.85);

  gl_FragColor = vec4(col, 1.0);
}
