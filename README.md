# Volumetric Tunnel Animation

A Three.js and React Three Fiber implementation of a volumetric light beam in a particle tunnel, inspired by the image of light rays streaming through a fragmented space.

## Features

- Volumetric light beams using custom shaders
- Particle tunnel with instanced geometry for performance
- Continuous tunnel movement creating an infinite effect
- Post-processing effects (bloom, noise) for visual enhancement

## Technologies Used

- React 18
- Three.js
- React Three Fiber
- Custom GLSL shaders
- Vite for fast development

## Running the Project

1. Install dependencies:

   ```
   npm install
   ```

2. Start the development server:

   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

## Implementation Details

### Tunnel Structure

The tunnel is created using two sections of instanced particles that move continuously to create an infinite tunnel effect. The walls, ceiling, and floor are simple geometry that form the tunnel structure.

### Volumetric Light

The volumetric light beam is implemented using a custom shader that performs ray marching through a light cone. The shader calculates the light scattering and uses noise textures to create the visible light rays.

### Animation

The animation loop moves the tunnel sections along the z-axis, resetting their positions when they go out of view to create a seamless infinite tunnel effect.

### Post-Processing

The scene uses post-processing effects including:

- Custom volumetric light shader
- Bloom for light glow
- Noise for atmospheric detail
