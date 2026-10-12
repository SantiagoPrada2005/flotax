precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/**
 * @label Obsidian Background (#111827)
 * @color
 * @default #111827
 */
uniform vec3 u_bg;

/**
 * @label Deep Charcoal (#1F2937)
 * @color
 * @default #1F2937
 */
uniform vec3 u_charcoal;

/**
 * @label Slate Grid & Hatch (#4B5563)
 * @color
 * @default #4B5563
 */
uniform vec3 u_slate;

/**
 * @label Cool Gray Accent (#9CA3AF)
 * @color
 * @default #9CA3AF
 */
uniform vec3 u_gray;

/**
 * @label Curve Crisp White (#EDEDED)
 * @color
 * @default #EDEDED
 */
uniform vec3 u_curve;

float splineHeight(float x) {
  // Smooth multi-peak telemetry curve inspired by Reference 1 & Reference 5
  float base = 0.25 + 0.38 * smoothstep(0.05, 0.85, x);
  float w1 = sin(x * 16.5 - 1.2) * 0.14;
  float w2 = cos(x * 8.2 + 0.5) * 0.09;
  float dip = -0.12 * exp(-pow((x - 0.18) * 9.0, 2.0));
  float peak = 0.16 * exp(-pow((x - 0.66) * 8.5, 2.0));
  return clamp(base + w1 + w2 + dip + peak, 0.14, 0.84);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  // Flip Y so 0 is bottom, 1 is top matching chart coordinates
  float y = 1.0 - uv.y;
  float x = uv.x;

  vec3 col = mix(u_bg, u_charcoal * 0.75, y * 0.35);

  // Horizontal subtle guide lines (3 levels: 25%, 50%, 75%)
  float hGrid = min(min(abs(y - 0.28), abs(y - 0.52)), abs(y - 0.76));
  float gridLine = smoothstep(0.006, 0.0, hGrid);
  col = mix(col, u_charcoal, gridLine * 0.65);

  float curveY = splineHeight(x);

  // Area under the spline: Diagonal architectural hatching (+62.3 deg, Ref 5 Top-Left)
  if (y < curveY) {
    float hatchCoord = fract((gl_FragCoord.x * 0.885 - gl_FragCoord.y * 0.465) / 8.5);
    float hatchStripe = smoothstep(0.16, 0.04, abs(hatchCoord - 0.5));
    float verticalFade = smoothstep(0.05, curveY, y);
    vec3 areaCol = mix(u_bg, u_slate, hatchStripe * 0.58 * verticalFade);
    col = mix(col, areaCol, 0.9);
  }

  // Smooth cubic curve stroke with anti-aliasing via derivative approximation
  float dx = 1.0 / u_resolution.x;
  float dy = (splineHeight(x + dx) - curveY) / dx;
  float dist = abs(y - curveY) / sqrt(1.0 + dy * dy);
  float stroke = smoothstep(0.018, 0.006, dist);
  col = mix(col, u_curve, stroke);

  // Plotted interactive node at x = 0.76 (matching Reference 1 "$409" node)
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 nodePos = vec2(0.76, splineHeight(0.76));
  float dNode = length((vec2(x, y) - nodePos) * aspect);

  // Vertical dashed cursor guide under active node
  if (abs(x - nodePos.x) < 0.004 && y < nodePos.y) {
    float dash = step(0.5, fract(y * 28.0));
    col = mix(col, u_gray, dash * 0.45);
  }

  // Node pulse ring + inner core
  float pulse = 0.5 + 0.5 * sin(u_time * 3.2);
  float outerHalo = smoothstep(0.055 + pulse * 0.015, 0.025, dNode);
  float ring = smoothstep(0.032, 0.024, dNode);
  float inner = smoothstep(0.016, 0.010, dNode);

  col = mix(col, u_gray, outerHalo * 0.28);
  col = mix(col, u_curve, ring);
  col = mix(col, u_bg, inner);

  gl_FragColor = vec4(col, 1.0);
}
