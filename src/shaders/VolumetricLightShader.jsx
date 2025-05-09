import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useEffect,
} from "react";
import { Effect, BlendFunction, EffectAttribute } from "postprocessing";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva"; // Re-enable Leva

// Minimal Fragment Shader (Green Tint with Forced Alpha)
// const minimalFragmentShader = `...`; // Old minimal shader

// New GodRays fragment shader
const fragmentShader = `
// varying vec2 vUv; // REMOVED: Provided by postprocessing library

uniform sampler2D tInput;
uniform vec2 lightPosition; // Screen-space light position (-1 to 1)
uniform float fExposure;
uniform float fDecay;
uniform float fDensity;
uniform float fWeight;
uniform int uSamples;     // Number of samples
uniform bool uBlur;       // New uniform for toggling blur

const int MAX_SAMPLES = 120; // Max samples to avoid hardware limits in loop

// Replaced main() with mainImage to conform to postprocessing Effect requirements
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 texCoord = uv; // UPDATED: Use uv from mainImage arguments (screen UVs)
    vec2 deltaTexCoord = (texCoord - lightPosition);
    deltaTexCoord *= 1.0 / float(uSamples) * fDensity; // Adjust step based on density & samples
    float illuminationDecay = 1.0;
    vec4 FragColor = vec4(0.0);

    for (int i = 0; i < min(uSamples, MAX_SAMPLES); i++) {
        texCoord -= deltaTexCoord;
        vec4 currentSampleColor;

        if (uBlur) {
            // 5-tap blur (center weighted)
            vec4 s = texture2D(tInput, texCoord) * 0.4; // Center sample
            s += texture2D(tInput, texCoord + vec2(texelSize.x, 0.0)) * 0.15;  // Right
            s += texture2D(tInput, texCoord - vec2(texelSize.x, 0.0)) * 0.15;  // Left
            s += texture2D(tInput, texCoord + vec2(0.0, texelSize.y)) * 0.15;  // Up
            s += texture2D(tInput, texCoord - vec2(0.0, texelSize.y)) * 0.15;  // Down
            currentSampleColor = s;
        } else {
            currentSampleColor = texture2D(tInput, texCoord);
        }

        currentSampleColor *= illuminationDecay * fWeight; // Apply weight and decay
        FragColor += currentSampleColor;
        illuminationDecay *= fDecay; // Decay for next sample
    }
    FragColor *= fExposure; // Apply exposure
    outputColor = FragColor;
}
`;

// Effect Class Structure (now being fleshed out)
class VolumetricLightEffect extends Effect {
  constructor() {
    super("GodRaysEffect", fragmentShader, {
      // Updated effect name
      blendFunction: BlendFunction.SCREEN, // Changed to SCREEN as per plan
      // attributes: EffectAttribute.DEPTH, // REMOVED: Not needed for this screen-space shader
      uniforms: new Map([
        ["fExposure", new THREE.Uniform(0.6)],
        ["fDecay", new THREE.Uniform(0.92)],
        ["fDensity", new THREE.Uniform(0.5)],
        ["fWeight", new THREE.Uniform(0.3)],
        ["lightPosition", new THREE.Uniform(new THREE.Vector2(0.0, 0.0))],
        ["uSamples", new THREE.Uniform(100)],
        ["uBlur", new THREE.Uniform(false)], // Added uBlur uniform
      ]),
    });
  }

  // REMOVED update method: iResolution and iTime are not directly used by the new shader
  // or are handled by the postprocessing library.
}

// React Component Structure (now being fleshed out)
const VolumetricLightShader = forwardRef(function VolumetricLightShader(
  props,
  ref
) {
  const effectRef = useRef();
  const { camera } = useThree(); // Removed clock as iTime is not used
  const effect = useMemo(() => new VolumetricLightEffect(), []);

  // Leva controls for new God Rays parameters
  const shaderControls = useControls("God Rays Params", {
    exposure: { value: 0.6, min: 0.0, max: 2.0, step: 0.01 },
    decay: { value: 0.9, min: 0.0, max: 1.0, step: 0.01 }, // Adjusted from 0.92
    density: { value: 0.6, min: 0.0, max: 2.0, step: 0.01 }, // Adjusted from 0.5
    weight: { value: 0.2, min: 0.0, max: 1.0, step: 0.01 }, // Adjusted from 0.3
    samples: { value: 120, min: 10, max: 120, step: 1 }, // Adjusted from 100, max also 120
    blur: { value: false, label: "Blur" },
  });

  useImperativeHandle(ref, () => effect, [effect]);

  // Update uniforms in useFrame
  useFrame(() => {
    if (effect && props.light && props.light.current) {
      const light = props.light.current;
      const worldPos = new THREE.Vector3();
      light.getWorldPosition(worldPos); // Get light's world position

      const screenPos = worldPos.clone().project(camera); // Project to screen space (-1 to 1)

      // Convert screenPos from [-1, 1] to [0, 1] for UV space
      screenPos.x = (screenPos.x + 1.0) * 0.5;
      screenPos.y = (screenPos.y + 1.0) * 0.5;

      effect.uniforms.get("lightPosition").value.set(screenPos.x, screenPos.y);
      effect.uniforms.get("fExposure").value = shaderControls.exposure;
      effect.uniforms.get("fDecay").value = shaderControls.decay;
      effect.uniforms.get("fDensity").value = shaderControls.density;
      effect.uniforms.get("fWeight").value = shaderControls.weight;
      effect.uniforms.get("uSamples").value = shaderControls.samples;
      effect.uniforms.get("uBlur").value = shaderControls.blur; // Update uBlur uniform

      // Remove old uniform updates (iTime, cameraPosition, projectionMatrixInverse, etc.)
    }
  });

  // Removed old useEffect for tintColor as it's no longer used

  return <primitive ref={effectRef} object={effect} />;
});

export default VolumetricLightShader;
