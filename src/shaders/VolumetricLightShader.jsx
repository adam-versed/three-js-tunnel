import { forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import { Effect, BlendFunction } from "postprocessing";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

// Import shader code as raw strings
const fragmentShader = `
uniform sampler2D inputBuffer;
uniform sampler2D blueNoiseTexture;
uniform sampler2D noiseTexture;
uniform mat4 projectionMatrixInverse;
uniform mat4 viewMatrixInverse;
uniform vec3 lightPosition;
uniform vec3 lightDirection;
uniform vec3 cameraPosition;
uniform float cameraFar;
uniform float cameraNear;
uniform float coneAngle;
uniform float uFrame;

varying vec2 vUv;

#define NUM_SAMPLES 100
#define DENSITY 0.975
#define LIGHT_ATTENUATION 5.0
#define MAX_DIST 100.0

// Credit: https://www.shadertoy.com/view/4djSRW
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

// Ray-cone intersection
float rayConeIntersect(vec3 rayOrigin, vec3 rayDir, vec3 coneOrigin, vec3 coneDir, float coneAngle) {
  rayOrigin -= coneOrigin;
  float a = dot(rayDir, coneDir) - cos(radians(coneAngle)) * length(rayDir);
  float b = dot(rayOrigin, coneDir) - cos(radians(coneAngle)) * length(rayOrigin);
  if (a >= 0.0 && b >= 0.0) return 0.0;
  if (a < 0.0 && b > 0.0) return -b / a;
  return MAX_DIST;
}

// Fragment depth from clip space depth
float getDepth(vec2 uv) {
  return texture2D(inputBuffer, uv).a;
}

// Convert screen space to world space
vec3 getWorldPos(vec2 uv, float depth) {
  float z = depth * 2.0 - 1.0;
  vec4 clipSpacePosition = vec4(uv * 2.0 - 1.0, z, 1.0);
  vec4 viewSpacePosition = projectionMatrixInverse * clipSpacePosition;
  
  viewSpacePosition /= viewSpacePosition.w;
  vec4 worldSpacePosition = viewMatrixInverse * viewSpacePosition;
  
  return worldSpacePosition.xyz;
}

// Light attenuation
float lightAttenuation(float dist) {
  return 1.0 / (1.0 + dist * dist * LIGHT_ATTENUATION);
}

// Noise lookup functions
float noise(vec3 pos, float frequency) {
  vec2 noiseUV = fract(pos.xz * frequency);
  return texture2D(noiseTexture, noiseUV).r;
}

// This function is required by PostProcessing
void mainUv(inout vec2 uv) {
  // UV coordinates remain unchanged
}

// This function is required by PostProcessing and is the main entry point
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 color = inputColor;
  float depth = getDepth(uv);
  
  // Reconstruct world position from depth
  vec3 worldPos = getWorldPos(uv, depth);
  
  // Ray origin (camera position) and direction
  vec3 rayOrigin = cameraPosition;
  vec3 rayDir = normalize(worldPos - rayOrigin);
  
  // Ray length from camera to the visible surface
  float rayLength = length(worldPos - rayOrigin);
  
  // Test if ray intersects light cone
  float intersect = rayConeIntersect(
    rayOrigin, rayDir, 
    lightPosition, normalize(lightDirection), 
    coneAngle
  );
  
  if (intersect > 0.0 && intersect < rayLength) {
    // Blue noise for randomization
    vec2 blueNoiseUV = fract(uv + vec2(uFrame * 0.001));
    float blueNoise = texture2D(blueNoiseTexture, blueNoiseUV).r;
    
    // Sample count and step size
    float stepSize = rayLength / float(NUM_SAMPLES);
    float randomOffset = blueNoise * stepSize;
    
    // Accumulate light along the ray
    float density = 0.0;
    
    for (int i = 0; i < NUM_SAMPLES; i++) {
      float t = randomOffset + float(i) * stepSize;
      if (t > rayLength) break;
      
      // Position along ray
      vec3 pos = rayOrigin + rayDir * t;
      
      // Distance from position to light
      float distToLight = length(pos - lightPosition);
      
      // Check if position is inside light cone
      vec3 toLight = normalize(lightPosition - pos);
      float dotLight = dot(toLight, normalize(-lightDirection));
      float coneCosine = cos(radians(coneAngle));
      
      if (dotLight > coneCosine) {
        // Add noise for volumetric effect
        float n = noise(pos, 0.1) * noise(pos * 2.0, 0.05);
        
        // Light attenuation based on distance
        float att = lightAttenuation(distToLight);
        
        // Stronger effect closer to light axis
        float axisWeight = (dotLight - coneCosine) / (1.0 - coneCosine);
        axisWeight = pow(axisWeight, 2.0);
        
        // Accumulate light contribution
        density += att * axisWeight * n * DENSITY * stepSize;
      }
    }
    
    // Add volumetric lighting to color
    vec3 lightColor = vec3(1.0, 1.0, 1.0);
    color.rgb += lightColor * density;
  }
  
  outputColor = color;
}
`;

const vertexShader = `
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
`;

// Create noise textures
const createNoiseTexture = (size = 256) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.random() * 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new Image();
  texture.src = canvas.toDataURL();
  return texture;
};

// Custom effect class for post-processing
class VolumetricLightEffect extends Effect {
  constructor() {
    super("VolumetricLightEffect", fragmentShader, {
      blendFunction: BlendFunction.ADD,
      vertexShader,
      uniforms: new Map([
        ["cameraFar", new THREE.Uniform(500)],
        ["cameraNear", new THREE.Uniform(0.01)],
        ["projectionMatrixInverse", new THREE.Uniform(new THREE.Matrix4())],
        ["viewMatrixInverse", new THREE.Uniform(new THREE.Matrix4())],
        ["lightDirection", new THREE.Uniform(new THREE.Vector3(0, 0, 1))],
        ["lightPosition", new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ["cameraPosition", new THREE.Uniform(new THREE.Vector3(0, 0, 0))],
        ["coneAngle", new THREE.Uniform(40)],
        ["blueNoiseTexture", new THREE.Uniform(null)],
        ["noiseTexture", new THREE.Uniform(null)],
        ["uFrame", new THREE.Uniform(0)],
      ]),
    });

    // Create and set up textures
    this.blueNoiseImg = createNoiseTexture(256);
    this.noiseImg = createNoiseTexture(512);

    this.blueNoiseImg.onload = () => {
      const texture = new THREE.Texture(this.blueNoiseImg);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
      this.uniforms.get("blueNoiseTexture").value = texture;
    };

    this.noiseImg.onload = () => {
      const texture = new THREE.Texture(this.noiseImg);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
      this.uniforms.get("noiseTexture").value = texture;
    };
  }

  update(renderer, inputBuffer, deltaTime) {
    // Update shader uniforms
    this.uniforms.get("uFrame").value += 1;
  }
}

// React component wrapper for the effect
const VolumetricLightShader = forwardRef(function VolumetricLightShader(
  props,
  ref
) {
  const effectRef = useRef();
  const { camera } = useThree();
  const effect = useMemo(() => new VolumetricLightEffect(), []);

  // Update effect every frame
  useFrame(() => {
    if (effect) {
      // Update camera uniforms
      effect.uniforms.get("cameraFar").value = camera.far;
      effect.uniforms.get("cameraNear").value = camera.near;
      effect.uniforms.get("projectionMatrixInverse").value =
        camera.projectionMatrixInverse;
      effect.uniforms.get("viewMatrixInverse").value = camera.matrixWorld;
      effect.uniforms.get("cameraPosition").value = camera.position;

      // Update light uniforms
      // These values would be properly linked to the scene lights in a full implementation
      const lightPos = new THREE.Vector3(-7, 12, 3);
      const lightTarget = new THREE.Vector3(0, 4, 7);
      const lightDir = new THREE.Vector3()
        .subVectors(lightTarget, lightPos)
        .normalize();

      effect.uniforms.get("lightDirection").value = lightDir;
      effect.uniforms.get("lightPosition").value = lightPos;
    }
  });

  // Expose the effect ref to parent components
  useImperativeHandle(ref, () => effect, [effect]);

  return <primitive ref={effectRef} object={effect} {...props} />;
});

export default VolumetricLightShader;
