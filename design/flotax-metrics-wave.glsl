precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/**
 * @label Fill Level (0..1)
 * @default 0.78
 * @range 0.0, 1.0
 */
uniform float u_level;

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
uniform vec3 u_waveBack;

/**
 * @label Slate Mid (#4B5563)
 * @color
 * @default #4B5563
 */
uniform vec3 u_waveFront;

/**
 * @label Cool Gray Crest (#9CA3AF)
 * @color
 * @default #9CA3AF
 */
uniform vec3 u_crest;

/**
 * @label Surface Light (#EDEDED)
 * @color
 * @default #EDEDED
 */
uniform vec3 u_surface;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Base obsidian canvas with subtle vertical depth
  vec3 col = mix(u_bg, u_waveBack * 0.65, (1.0 - uv.y) * 0.35);

  // Subtle background CAD grid dots
  vec2 gridUv = fract(gl_FragCoord.xy / 18.0) - 0.5;
  float gridDot = smoothstep(0.12, 0.04, length(gridUv));
  col = mix(col, u_waveFront, gridDot * 0.14);

  // Dual harmonic liquid wave equations (Bessonov Charging UI style)
  float t = u_time * 1.45;
  float wave1 = sin(uv.x * 5.2 + t) * 0.032 + cos(uv.x * 9.5 - t * 0.7) * 0.012;
  float wave2 = sin(uv.x * 4.6 - t * 1.15 + 1.4) * 0.036 + sin(uv.x * 8.2 + t * 0.8) * 0.014;

  float levelBack = u_level + 0.035 + wave2;
  float levelFront = u_level + wave1;

  // Diagonal architectural hatching (+62.3 deg, matching FlotaX isotype & Ref 5)
  float hatchPhase = fract((gl_FragCoord.x * 0.885 - gl_FragCoord.y * 0.465) / 9.0);
  float hatchLine = smoothstep(0.18, 0.06, abs(hatchPhase - 0.5));

  // Back wave layer (Deep Charcoal + Diagonal Hatching)
  float maskBack = smoothstep(levelBack + 0.008, levelBack - 0.008, uv.y);
  vec3 backFill = mix(u_waveBack, u_waveFront, hatchLine * 0.42);
  col = mix(col, backFill, maskBack);

  // Front wave layer (Slate / Graphite gradient + Meniscus specular crest)
  float maskFront = smoothstep(levelFront + 0.007, levelFront - 0.007, uv.y);
  float depthFactor = clamp((levelFront - uv.y) / max(levelFront, 0.001), 0.0, 1.0);
  vec3 frontFill = mix(u_waveFront, u_waveBack, depthFactor * 0.55);
  frontFill = mix(frontFill, u_crest, hatchLine * 0.18);

  // Specular meniscus line at the liquid surface
  float meniscus = smoothstep(0.014, 0.0, abs(uv.y - levelFront));
  col = mix(col, frontFill, maskFront);
  col = mix(col, mix(u_crest, u_surface, 0.45), meniscus * 0.65);

  gl_FragColor = vec4(col, 1.0);
}
