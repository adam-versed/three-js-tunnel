import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useHelper } from "@react-three/drei";
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { SpotLightHelper } from "three";
import TunnelParticles from "./components/TunnelParticles";
import { useControls } from "leva";

export default function Scene() {
  // References for animated objects
  const groupRef = useRef();
  const section1Ref = useRef();
  const section2Ref = useRef();
  const targetRef = useRef(new THREE.Object3D());
  const lightRef = useRef();

  // Animation values
  const section1Position = useRef(0);
  const section2Position = useRef(-30);

  // Control spotlight properties with leva
  const {
    lightColor,
    intensity,
    distance,
    angle,
    penumbra,
    decay,
    lightX,
    lightY,
    lightZ,
    targetX,
    targetY,
    targetZ,
    castShadowVal,
    helperColor,
    showHelper,
  } = useControls("Spotlight Controls", {
    lightColor: "#ffffff",
    intensity: { value: 850, min: 0, max: 1000, step: 10 },
    distance: { value: 37, min: 0, max: 200, step: 1 },
    angle: { value: 0.7, min: 0, max: Math.PI / 2, step: 0.01 },
    penumbra: { value: 0.31, min: 0, max: 1, step: 0.01 },
    decay: { value: 1, min: 0, max: 5, step: 0.01 },
    lightX: { value: -3.5, min: -50, max: 50, step: 0.5 },
    lightY: { value: 15.5, min: -50, max: 50, step: 0.5 },
    lightZ: { value: 6, min: -50, max: 50, step: 0.5 },
    targetX: { value: -1.0, min: -50, max: 50, step: 0.5 },
    targetY: { value: -2.0, min: -50, max: 50, step: 0.5 },
    targetZ: { value: 3.5, min: -50, max: 50, step: 0.5 },
    castShadowVal: true,
    showHelper: false,
    helperColor: "#ff0000",
  });

  // New Leva controls for the unified tunnel
  const {
    tunnelVisible,
    tunnelColor,
    tunnelWireframe,
    tunnelWidth,
    tunnelHeight,
    tunnelDepth,
    tunnelYPosition,
    tunnelZPosition,
  } = useControls("Tunnel Controls", {
    tunnelVisible: false,
    tunnelColor: "#1f1f1f", // Slightly dark grey
    tunnelWireframe: false,
    tunnelWidth: { value: 12.5, min: 1, max: 50, step: 0.5 },
    tunnelHeight: { value: 13, min: 1, max: 50, step: 0.5 },
    tunnelDepth: { value: 65, min: 10, max: 300, step: 1 },
    tunnelYPosition: { value: 0.2, min: -20, max: 20, step: 0.25 },
    tunnelZPosition: { value: -31, min: -50, max: 50, step: 1 },
  });

  // Leva controls for TunnelParticles
  const particleControls = useControls("Particle Controls", {
    particlesVisible: true,
    baseCount: { value: 3000, min: 100, max: 10000, step: 100 },
    densityFactor: { value: 1.6, min: 0.1, max: 3.0, step: 0.1 },
    particleBoxSize: {
      value: 8.5,
      min: 1,
      max: 30,
      step: 0.5,
      label: "Box Size (XY)",
    },
    particleBoxDepth: {
      value: 33,
      min: 5,
      max: 100,
      step: 1,
      label: "Box Depth (Z)",
    },
    particleBoxThickness: {
      value: 0.83,
      min: 0.01,
      max: 10,
      step: 0.01,
      label: "Box Thickness",
    },
    baseSize: { value: 0.38, min: 0.05, max: 1.0, step: 0.01 },
    sizeRandomness: { value: 0.15, min: 0, max: 1, step: 0.05 }, // 0 = no random, 1 = full random spread
    baseColor: "#000000",
    colorRandomness: { value: 0.15, min: 0, max: 1, step: 0.05 },
    // Base rotation (in radians for simplicity, can convert from degrees in leva if preferred)
    baseRotationX: { value: 0, min: 0, max: Math.PI * 2, step: 0.01 },
    baseRotationY: { value: 0, min: 0, max: Math.PI * 2, step: 0.01 },
    baseRotationZ: { value: 0, min: 0, max: Math.PI * 2, step: 0.01 },
    // Rotation randomness (factor)
    rotationRandomnessX: { value: 0, min: 0, max: 1, step: 0.05 }, // 1 = full random like current
    rotationRandomnessY: { value: 0, min: 0, max: 1, step: 0.05 },
    rotationRandomnessZ: { value: 0, min: 0, max: 1, step: 0.05 },
    // Noise Controls
    useParticleNoise: { value: true, label: "Use Noise" },
    particleNoiseScale: {
      value: 0.2,
      min: 0.01,
      max: 1.0,
      step: 0.01,
      label: "Noise Scale",
    },
    particleNoiseThreshold: {
      value: -0.1,
      min: -1.0,
      max: 1.0,
      step: 0.05,
      label: "Noise Threshold",
    },
  });

  // Leva controls for Camera
  const cameraControls = useControls("Camera Controls", {
    cameraX: { value: -3.2, min: -50, max: 50, step: 0.1 },
    cameraY: { value: -2.7, min: -50, max: 50, step: 0.1 },
    cameraZ: { value: -9.1, min: -50, max: 50, step: 0.1 },
    fov: { value: 60, min: 10, max: 120, step: 1 },
    // Optional: Add lookAt controls later if needed
    // lookAtX: { value: 0, min: -20, max: 20, step: 0.1 },
    // lookAtY: { value: 0.3, min: -20, max: 20, step: 0.1 },
    // lookAtZ: { value: 0, min: -20, max: 20, step: 0.1 },
  });

  // Set up scene and update light/target positions based on controls
  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.position.set(targetX, targetY, targetZ);
    }
    if (lightRef.current) {
      lightRef.current.position.set(lightX, lightY, lightZ);
      // The target object itself needs to be updated if its position changes via controls
      // and it's a distinct object in the scene (which it is, via <primitive />)
      if (lightRef.current.target) {
        lightRef.current.target.position.set(targetX, targetY, targetZ);
      }
    }
  }, [lightX, lightY, lightZ, targetX, targetY, targetZ]); // Only re-run if these specific positions change

  // Add SpotLightHelper using useHelper from drei
  // It will be added/removed based on the 'showHelper' control
  // The helper uses the lightRef and updates automatically when the light's properties change.
  useHelper(showHelper && lightRef, SpotLightHelper, helperColor);

  // Animation loop
  useFrame((state, delta) => {
    // Update tunnel section positions for continuous movement
    section1Position.current += 2 * delta;
    section2Position.current += 2 * delta;

    if (section1Ref.current && section2Ref.current) {
      section1Ref.current.position.z = section1Position.current;
      section2Ref.current.position.z = section2Position.current;

      // Reset positions when they go out of view for looping effect
      if (section1Position.current >= 30) section1Position.current = -30;
      if (section2Position.current >= 30) section2Position.current = -30;
    }

    // Update camera target
    state.camera.lookAt(0, 0.3, 0);

    // Ensure the spotlight's target's world matrix is updated for the helper
    if (lightRef.current && lightRef.current.target) {
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      {/* Main camera */}
      <PerspectiveCamera
        makeDefault
        position={[
          cameraControls.cameraX,
          cameraControls.cameraY,
          cameraControls.cameraZ,
        ]}
        fov={cameraControls.fov}
        near={0.1}
        far={200}
      />

      {/* Tunnel structure */}
      <group ref={groupRef}>
        <group ref={section1Ref} position={[0, 0, 0]}>
          <TunnelParticles
            count={Math.floor(
              particleControls.baseCount * particleControls.densityFactor
            )} // Dynamic count
            boxSize={particleControls.particleBoxSize}
            boxDepth={particleControls.particleBoxDepth}
            boxThickness={particleControls.particleBoxThickness}
            // Pass new particle props
            visible={particleControls.particlesVisible}
            baseSize={particleControls.baseSize}
            sizeRandomness={particleControls.sizeRandomness}
            baseColor={particleControls.baseColor}
            colorRandomness={particleControls.colorRandomness}
            baseRotationX={particleControls.baseRotationX}
            baseRotationY={particleControls.baseRotationY}
            baseRotationZ={particleControls.baseRotationZ}
            rotationRandomnessX={particleControls.rotationRandomnessX}
            rotationRandomnessY={particleControls.rotationRandomnessY}
            rotationRandomnessZ={particleControls.rotationRandomnessZ}
            // Noise props
            useParticleNoise={particleControls.useParticleNoise}
            particleNoiseScale={particleControls.particleNoiseScale}
            particleNoiseThreshold={particleControls.particleNoiseThreshold}
          />
        </group>
        <group ref={section2Ref} position={[0, 0, -29]}>
          <TunnelParticles
            count={Math.floor(
              particleControls.baseCount * particleControls.densityFactor
            )} // Dynamic count
            boxSize={particleControls.particleBoxSize}
            boxDepth={particleControls.particleBoxDepth}
            boxThickness={particleControls.particleBoxThickness}
            // Pass new particle props
            visible={particleControls.particlesVisible}
            baseSize={particleControls.baseSize}
            sizeRandomness={particleControls.sizeRandomness}
            baseColor={particleControls.baseColor}
            colorRandomness={particleControls.colorRandomness}
            baseRotationX={particleControls.baseRotationX}
            baseRotationY={particleControls.baseRotationY}
            baseRotationZ={particleControls.baseRotationZ}
            rotationRandomnessX={particleControls.rotationRandomnessX}
            rotationRandomnessY={particleControls.rotationRandomnessY}
            rotationRandomnessZ={particleControls.rotationRandomnessZ}
            // Noise props
            useParticleNoise={particleControls.useParticleNoise}
            particleNoiseScale={particleControls.particleNoiseScale}
            particleNoiseThreshold={particleControls.particleNoiseThreshold}
          />
        </group>
      </group>

      {/* Unified Tunnel Box */}
      {tunnelVisible && (
        <mesh position={[0, tunnelYPosition, tunnelZPosition]}>
          <boxGeometry args={[tunnelWidth, tunnelHeight, tunnelDepth]} />
          <meshStandardMaterial
            color={tunnelColor}
            wireframe={tunnelWireframe}
            side={THREE.BackSide} // Render the inside of the box
          />
        </mesh>
      )}

      {/* Light source controlled by Leva */}
      <spotLight
        ref={lightRef}
        castShadow={castShadowVal}
        color={lightColor}
        intensity={intensity}
        target={targetRef.current}
        angle={angle}
        penumbra={penumbra}
        distance={distance}
        decay={decay}
      />

      {/* Light mesh (visual representation), position updated with light's actual position */}
      {/* Its color also reflects the controlled light color */}
      <mesh
        position={lightRef.current ? [lightX, lightY, lightZ] : [-7, 12, 3]}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(lightColor).multiplyScalar(intensity / 250)}
        />
      </mesh>

      {/* Object targeted by light, its position is also controlled by Leva */}
      {/* Ensure this primitive is correctly positioned based on targetX, targetY, targetZ */}
      <primitive
        object={targetRef.current}
        position={[targetX, targetY, targetZ]}
      />

      {/* Ambient light for basic visibility */}
      <ambientLight intensity={0.05} />

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={2.5}
          kernelSize={3}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
        <Noise opacity={0.025} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
}
