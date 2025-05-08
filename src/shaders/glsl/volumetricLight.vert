varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying vec4 vClipPosition;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  
  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -modelViewPosition.xyz;
  
  gl_Position = projectionMatrix * modelViewPosition;
  vClipPosition = gl_Position;
} 