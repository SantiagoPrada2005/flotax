precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/**
 * @label Base Background (#111827)
 * @color
 * @default #111827
 */
uniform vec3 u_bg;

/**
 * @label Secondary Graphite (#1F2937)
 * @color
 * @default #1F2937
 */
uniform vec3 u_graphite;

/**
 * @label Mid Gray (#4B5563)
 * @color
 * @default #4B5563
 */
uniform vec3 u_grayMid;

/**
 * @label Light Gray (#9CA3AF)
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
  float t = u_time * 1.15;

  vec3 col = u_bg;

  // 1. Subtle architectural grid aligned with the center of the viewport
  vec2 gridUv = fract(uv * 14.0 + 0.5) - 0.5;
  float gridLine = min(abs(gridUv.x), abs(gridUv.y));
  float gridMask = smoothstep(0.012, 0.0, gridLine) * smoothstep(0.75, 0.12, length(uv));
  col = mix(col, u_graphite, gridMask * 0.55);

  // 2. Kinetic +62.3 deg ascending & -35.5 deg X-axis structural laser guides through center
  // +62.3 deg vector normal: (0.885, 0.465)
  float dAsc = abs(uv.x * 0.8854 + uv.y * 0.4648);
  // -35.5 deg vector normal: (0.5807, -0.8141)
  float dDesc = abs(uv.x * 0.5807 - uv.y * 0.8141);

  float axisGlow = (smoothstep(0.0035, 0.0, dAsc) + smoothstep(0.0035, 0.0, dDesc))
                 * smoothstep(0.58, 0.14, length(uv));
  col = mix(col, u_graphite, clamp(axisGlow, 0.0, 1.0) * 0.85);

  // 3. Expanding kinetic radar rings from the central X-core
  float r = length(uv);
  float ring1 = abs(r - 0.24);
  float ring2 = abs(r - 0.36);
  float baseRings = (smoothstep(0.0025, 0.0, ring1) + smoothstep(0.002, 0.0, ring2) * 0.6);
  col = mix(col, u_graphite, clamp(baseRings, 0.0, 1.0));

  // Animated sweeping arc along the inner orbital ring (r = 0.24)
  float angle = atan(uv.y, uv.x);
  float sweep = fract((angle / 6.2831853) - t * 0.35);
  float arcHighlight = smoothstep(0.0035, 0.0005, ring1) * smoothstep(0.0, 0.28, sweep) * smoothstep(0.32, 0.26, sweep);
  col = mix(col, u_grayMid, arcHighlight);

  // 4. Outward sonar pulse wave synchronized with logo assembly
  float pulseRadius = fract(t * 0.32) * 0.52;
  float pulseWave = smoothstep(0.018, 0.0, abs(r - pulseRadius)) * (1.0 - pulseRadius / 0.52);
  col = mix(col, u_graphite, pulseWave * 0.75);

  gl_FragColor = vec4(col, 1.0);
}
