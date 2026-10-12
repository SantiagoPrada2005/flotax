precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @content */
uniform sampler2D u_content;

/** @time */
uniform float u_time;

/**
 * @label Base Surface (#EDEDED)
 * @color
 * @default #EDEDED
 */
uniform vec3 u_surface;

/**
 * @label Mid Accent (#9CA3AF)
 * @color
 * @default #9CA3AF
 */
uniform vec3 u_grayLight;

/**
 * @label Deep Accent (#4B5563)
 * @color
 * @default #4B5563
 */
uniform vec3 u_grayMid;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 src = texture2D(u_content, uv);

  if (src.a <= 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Unpremultiply source color
  vec3 baseCol = src.rgb / src.a;

  // +62.3 deg kinetic sheen sweeping across the 3 geometric masses
  float diagCoord = uv.x * 0.885 - uv.y * 0.465;
  float sweepPos = mod(u_time * 0.85 + 0.45, 2.2) - 0.6;
  float dist = abs(diagCoord - sweepPos);

  float sheenBand = smoothstep(0.22, 0.0, dist);
  float coreBand = smoothstep(0.06, 0.0, dist);

  vec3 animatedCol = mix(baseCol, u_grayLight, sheenBand * 0.45);
  animatedCol = mix(animatedCol, u_surface, coreBand * 0.85);

  gl_FragColor = vec4(animatedCol * src.a, src.a);
}
