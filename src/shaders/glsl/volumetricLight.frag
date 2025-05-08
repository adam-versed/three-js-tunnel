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

void main() {
  vec4 color = texture2D(inputBuffer, vUv);
  float depth = getDepth(vUv);
  
  // Reconstruct world position from depth
  vec3 worldPos = getWorldPos(vUv, depth);
  
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
    vec2 blueNoiseUV = fract(vUv + vec2(uFrame * 0.001));
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
  
  gl_FragColor = color;
} 