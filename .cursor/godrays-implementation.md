# Plan: Implement God Rays using Three.js Example Shader

## Goal

To implement a God Rays / Volumetric Light post-processing effect in the existing React Three Fiber project, basing the implementation on the shader logic found in the official Three.js example `webgl_postprocessing_godrays.html` (specifically the shader code typically located in `examples/jsm/shaders/GodRaysShader.js`).

## Background & Current State

- The project uses React Three Fiber (`@react-three/fiber`) and the `postprocessing` library (via `@react-three/postprocessing`).
- The main scene is defined in `src/Scene.jsx`, containing `TunnelParticles` components and a `spotLight` whose parameters are controlled by the Leva GUI library. A small sphere mesh visualizes the spotlight's position.
- A custom post-processing effect component exists at `src/shaders/VolumetricLightShader.jsx`. Previous attempts involved adapting a Shadertoy raymarching shader, which led to difficulties replicating volumetric shadows and encountered various compilation/runtime issues.
- The current state of `src/shaders/VolumetricLightShader.jsx` (as of the end of the previous session) is a minimal baseline "tint" effect used for debugging the integration itself.

## Target Approach Analysis (`GodRaysShader.js`)

The target shader from the Three.js examples operates differently from full volumetric raymarching:

1.  **Screen-Space:** It works entirely in screen space.
2.  **Input Sampling:** It samples the main scene's rendered color buffer (`tInput`).
3.  **Light Position:** It requires the light source's position projected into screen-space coordinates (ranging from -1 to +1).
4.  **Ray Simulation:** It simulates rays by stepping from each pixel's screen coordinate towards the light's screen coordinate, sampling `tInput` at each step.
5.  **Accumulation:** It accumulates the sampled colors, weighted by parameters like `density`, `decay`, and `weight`. Brighter pixels in the input scene contribute more strongly to the rays.
6.  **No Volumetric Density/Shadows:** It does not calculate density based on world position or noise, nor does it calculate shadows within the volume. Occlusion only happens if objects block bright areas in the initial scene render.

## Detailed Implementation Steps

### Step 1: Update Fragment Shader GLSL

- **File:** `src/shaders/VolumetricLightShader.jsx`
- **Action:** Replace the entire content of the `const fragmentShader = \`...\`;`string variable with the GLSL code found within the`fragmentShader`property of the`GodRaysShader`object in the Three.js file`examples/jsm/shaders/GodRaysShader.js`.
- **Reference:** [three.js/examples/jsm/shaders/GodRaysShader.js](https://github.com/mrdoob/three.js/blob/master/examples/jsm/shaders/GodRaysShader.js)

### Step 2: Update `VolumetricLightEffect` Class Definition

- **File:** `src/shaders/VolumetricLightShader.jsx`
- **Action 1:** Modify the `super()` call within the `constructor`:
  - Ensure the first argument (effect name) is appropriate, e.g., `"GodRaysEffect"`.
  - Ensure the second argument uses the newly defined `fragmentShader` const.
  - Remove the `attributes: EffectAttribute.DEPTH` line (it's not needed).
  - Set the `blendFunction`. `BlendFunction.Screen` or `BlendFunction.ADD` are common choices for light rays. Start with `BlendFunction.Screen`.
- **Action 2:** Update the `uniforms: new Map([...])` definition within the `constructor` to include only the uniforms required by the _new_ `fragmentShader`:
  - `fExposure` (float, e.g., default `0.6`)
  - `fDecay` (float, e.g., default `0.9`)
  - `fDensity` (float, e.g., default `0.96`)
  - `fWeight` (float, e.g., default `0.4`)
  - `lightPosition` (vec2, screen-space -1 to 1, e.g., default `new THREE.Vector2(0.0, 0.0)`)
  - `uSamples` (int, e.g., default `60`) - _Note: Name this `uSamples` to avoid conflict if the shader uses internal constants like `NUM_SAMPLES_INT`. Ensure the shader uses this uniform for its loop._
- **Action 3:** Remove the `update` method from the class (the necessary `iResolution` is likely handled automatically or not needed by this specific shader; confirm by checking the GLSL). If the shader _does_ need `iResolution`, the `update` method setting it should be kept.

### Step 3: Update `VolumetricLightShader` React Component

- **File:** `src/shaders/VolumetricLightShader.jsx`
- **Action 1:** Update or create the Leva `useControls` section (e.g., panel named "God Rays Params") to control the parameters corresponding to the new uniforms:
  - `exposure` (maps to `fExposure`)
  - `decay` (maps to `fDecay`)
  - `density` (maps to `fDensity`)
  - `weight` (maps to `fWeight`)
  - `samples` (maps to `uSamples`)
- **Action 2:** Modify the `useFrame` hook:
  - Keep the check `if (effect && props.light && props.light.current)`. The `target` prop might not be strictly necessary if only the light's position is needed.
  - Get the light's 3D world position: `const worldPos = new THREE.Vector3(); light.getWorldPosition(worldPos);`
  - Project the world position to screen space: Create a temporary Vector3 `screenPos = worldPos.clone(); screenPos.project(camera);`. The `screenPos.x` and `screenPos.y` values (ranging -1 to 1) are what the `lightPosition` uniform needs.
  - Update the effect's uniforms:
    - `effect.uniforms.get("lightPosition").value.set(screenPos.x, screenPos.y);`
    - `effect.uniforms.get("fExposure").value = shaderControls.exposure;`
    - `effect.uniforms.get("fDecay").value = shaderControls.decay;`
    - `effect.uniforms.get("fDensity").value = shaderControls.density;`
    - `effect.uniforms.get("fWeight").value = shaderControls.weight;`
    - `effect.uniforms.get("uSamples").value = shaderControls.samples;`
  - Remove updates for any old/unused uniforms (like `iTime`, `cameraPosition`, `projectionMatrixInverse`, `uLightDir`, `uConeAngle`, etc., unless the new shader specifically requires them).
- **Action 3:** Remove any leftover `useEffect` hooks related to previous shader attempts (like setting `tintColor`).

### Step 4: Testing and Refinement

- Run the application. Check the browser console for any shader compilation or runtime errors.
- Verify that light rays appear to emanate from the screen position corresponding to the 3D spotlight.
- Move the spotlight (using Leva "Spotlight Controls") and confirm the ray source position updates correctly.
- Move the camera and confirm the rays update perspective correctly.
- Use the new "God Rays Params" Leva controls (`exposure`, `decay`, `density`, `weight`, `samples`) to tune the appearance of the rays, aiming to match the visual style of `source.png`. Pay attention to the `density`, `decay`, and `weight` parameters for controlling the falloff and intensity.

## Notes for Next Session

- This plan focuses on implementing the screen-space god ray technique from the official Three.js example.
- The visual result will differ from the Shadertoy example because it lacks true volumetric density and shadowing based on scene geometry.
- Care must be taken when calculating the light's screen-space position in `useFrame`.
- The GLSL code from `GodRaysShader.js` might need minor adjustments (e.g., ensuring it uses the `uSamples` uniform correctly for the loop iterations).
- Start with `BlendFunction.Screen` for the effect, but `BlendFunction.ADD` could also be tested.
