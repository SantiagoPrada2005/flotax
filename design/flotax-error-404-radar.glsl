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
  float t = u_time * 0.85;

  // Base Editorial Surface (#EDEDED)
  vec3 col = u_surface;

  // 1. Millimeter CAD blueprint sub-grid + primary grid
  vec2 subGrid = fract(uv * 28.0 + 0.5) - 0.5;
  float subLine = min(abs(subGrid.x), abs(subGrid.y));
  float subMask = smoothstep(0.022, 0.0, subLine) * smoothstep(0.95, 0.12, length(uv));
  col = mix(col, u_grayLight, subMask * 0.28);

  vec2 mainGrid = fract(uv * 7.0 + 0.5) - 0.5;
  float mainLine = min(abs(mainGrid.x), abs(mainGrid.y));
  float mainMask = smoothstep(0.010, 0.0, mainLine) * smoothstep(0.98, 0.08, length(uv));
  col = mix(col, u_grayLight, mainMask * 0.52);

  // 2. +62.3 deg diagonal architectural hatching inside central radar zone
  float dist = length(uv);
  float hatchPhase = fract((gl_FragCoord.x * 0.8854 - gl_FragCoord.y * 0.4648) / 8.0);
  float hatchLine = smoothstep(0.20, 0.05, abs(hatchPhase - 0.5));
  float zoneMask = smoothstep(0.38, 0.36, dist) * smoothstep(0.14, 0.16, dist);
  col = mix(col, u_grayLight, hatchLine * zoneMask * 0.36);

  // 3. Concentric Perimeter Radar Rings (404 Out-of-Bounds Search)
  float r1 = smoothstep(0.004, 0.0, abs(dist - 0.16));
  float r2 = smoothstep(0.004, 0.0, abs(dist - 0.27));
  float r3 = smoothstep(0.004, 0.0, abs(dist - 0.38));
  float angle = atan(uv.y, uv.x);
  float dashPattern = step(0.0, sin(angle * 16.0 + t * 1.5));
  col = mix(col, u_grayMid, (r1 + r3 * dashPattern) * 0.65);
  col = mix(col, u_graphite, r2 * 0.80);

  // 4. +62.3 deg & -35.5 deg CAD Construction Vectors with center gap
  float dAsc = abs(uv.x * 0.8854 + uv.y * 0.4648);
  float dDesc = abs(uv.x * 0.5807 - uv.y * 0.8141);
  float crossLines = (smoothstep(0.003, 0.0, dAsc) + smoothstep(0.003, 0.0, dDesc))
                   * smoothstep(0.08, 0.15, dist) * smoothstep(0.46, 0.36, dist);
  col = mix(col, u_graphite, clamp(crossLines, 0.0, 1.0) * 0.70);

  // 5. Rotating Radar Sweep Sector searching for missing coordinate
  float sweepAngle = mod(angle - t * 1.4 + 6.28318, 6.28318);
  float sectorWake = smoothstep(1.35, 0.0, sweepAngle) * step(dist, 0.38) * smoothstep(0.06, 0.12, dist);
  col = mix(col, u_grayMid, sectorWake * 0.28);

  // 6. Corner calibration brackets
  vec2 boxDist = abs(uv) - vec2(0.42, 0.34);
  float boxEdge = max(boxDist.x, boxDist.y);
  float frameOutline = smoothstep(0.0035, 0.0, abs(boxEdge));
  float cornerMask = step(0.32, abs(uv.x)) * step(0.24, abs(uv.y));
  col = mix(col, u_bg, frameOutline * cornerMask * 0.90);

  gl_FragColor = vec4(col, 1.0);
}
