precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @content */
uniform sampler2D u_content;

/** @time */
uniform float u_time;

/**
 * @label Deep Black (#111827)
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
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 src = texture2D(u_content, uv);

  if (src.a <= 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 baseCol = src.rgb / src.a;

  // Sample neighbors for crisp CAD wireframe contour detection
  vec2 px = 2.0 / u_resolution;
  float aL = texture2D(u_content, uv - vec2(px.x, 0.0)).a;
  float aR = texture2D(u_content, uv + vec2(px.x, 0.0)).a;
  float aU = texture2D(u_content, uv - vec2(0.0, px.y)).a;
  float aD = texture2D(u_content, uv + vec2(0.0, px.y)).a;
  float minNeighborAlpha = min(min(aL, aR), min(aU, aD));
  float edgeMask = clamp((src.a - minNeighborAlpha) * 2.5, 0.0, 1.0);

  // Diagonal CAD hatch inside wireframe zone (+62.3 deg)
  float hatch = abs(fract((uv.x * 0.885 - uv.y * 0.465) * 28.0) - 0.5);
  float hatchLine = smoothstep(0.12, 0.0, hatch);
  vec3 wireframeCol = mix(u_surface, u_grayLight, 0.35 + hatchLine * 0.45);
  wireframeCol = mix(wireframeCol, u_bg, edgeMask);

  // Synchronized +62.3 deg scanner transition between CAD Wireframe and Solid Obsidian
  float scanCoord = (uv.x - 0.5) + (uv.y - 0.5) * 0.45;
  float scanPos = sin(u_time * 1.33) * 0.65;
  float solidTransition = smoothstep(scanPos - 0.04, scanPos + 0.04, scanCoord);
  float laserBeam = smoothstep(0.045, 0.0, abs(scanCoord - scanPos));

  vec3 finalCol = mix( baseCol, wireframeCol, solidTransition );
  finalCol = mix( finalCol, u_grayMid, laserBeam * 0.75 );

  gl_FragColor = vec4(finalCol * src.a, src.a);
}
