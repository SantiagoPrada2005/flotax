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
  float t = u_time * 0.65;

  // 1. Volumetric Horizon Gradient (Inspired by Ref 1 & Ref 3)
  float wave1 = 0.045 * sin(uv.x * 4.2 + t * 1.4) + 0.025 * cos(uv.x * 7.5 - t * 0.9);
  float horizon = smoothstep(0.72, 0.05, st.y + wave1);

  vec3 col = mix(vec3(1.0), u_surface, smoothstep(0.88, 0.42, st.y));
  col = mix(col, u_grayLight, pow(horizon, 1.35) * 0.65);
  col = mix(col, u_graphite, pow(horizon, 2.5) * 0.82);
  col = mix(col, u_bg, pow(horizon, 3.8) * 0.94);

  // 2. +62.3 deg Architectural Hatching inside the lower volumetric glow
  float hatchPhase = fract((gl_FragCoord.x * 0.8854 - gl_FragCoord.y * 0.4648) / 7.5);
  float hatchLine = smoothstep(0.22, 0.04, abs(hatchPhase - 0.5));
  float hatchMask = smoothstep(0.55, 0.15, st.y) * smoothstep(0.02, 0.28, st.y);
  col = mix(col, u_surface, hatchLine * hatchMask * 0.18);

  // 3. Concentric Telemetry Arcs anchored at bottom center (Kinetic Ring Stage)
  vec2 ringCenter = vec2(0.0, -0.32);
  float dRing = length(uv - ringCenter);
  float arc1 = smoothstep(0.004, 0.0, abs(dRing - 0.16));
  float arc2 = smoothstep(0.0035, 0.0, abs(dRing - 0.28));
  float arc3 = smoothstep(0.003, 0.0, abs(dRing - 0.42));

  float ang = atan(uv.y - ringCenter.y, uv.x - ringCenter.x);
  float dash = step(0.0, sin(ang * 18.0 - t * 2.2));
  col = mix(col, u_surface, (arc1 * 0.55 + arc2 * dash * 0.35));
  col = mix(col, u_grayMid, arc3 * 0.28);

  // 4. Subtle CAD Millimeter Grid in upper editorial area
  vec2 cadGrid = fract(uv * 12.0 + 0.5) - 0.5;
  float gridLine = min(abs(cadGrid.x), abs(cadGrid.y));
  float gridMask = smoothstep(0.012, 0.0, gridLine) * smoothstep(0.35, 0.78, st.y);
  col = mix(col, u_grayLight, gridMask * 0.22);

  gl_FragColor = vec4(col, 1.0);
}
