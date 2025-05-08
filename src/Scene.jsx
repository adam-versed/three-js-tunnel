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
    intensity: { value: 250, min: 0, max: 1000, step: 10 },
    distance: { value: 46, min: 0, max: 200, step: 1 },
    angle: { value: 0.57, min: 0, max: Math.PI / 2, step: 0.01 },
    penumbra: { value: 0.17, min: 0, max: 1, step: 0.01 },
    decay: { value: 2, min: 0, max: 5, step: 0.01 },
    lightX: { value: -7, min: -50, max: 50, step: 0.5 },
    lightY: { value: 12, min: -50, max: 50, step: 0.5 },
    lightZ: { value: 3, min: -50, max: 50, step: 0.5 },
    targetX: { value: 0, min: -50, max: 50, step: 0.5 },
    targetY: { value: 2.5, min: -50, max: 50, step: 0.5 },
    targetZ: { value: 1.5, min: -50, max: 50, step: 0.5 },
    castShadowVal: true,
    showHelper: true,
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
    tunnelVisible: true,
    tunnelColor: "#1f1f1f", // Slightly dark grey
    tunnelWireframe: false,
    tunnelWidth: { value: 12.5, min: 1, max: 50, step: 0.5 },
    tunnelHeight: { value: 13, min: 1, max: 50, step: 0.5 },
    tunnelDepth: { value: 45, min: 10, max: 300, step: 1 },
    tunnelYPosition: { value: 0.2, min: -20, max: 20, step: 0.25 },
    tunnelZPosition: { value: 10, min: -50, max: 50, step: 1 },
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
        position={[-4, -1, -20]}
        fov={45}
        near={0.1}
        far={200}
      />

      {/* Tunnel structure */}
      <group ref={groupRef}>
        <group ref={section1Ref} position={[0, 0, 0]}>
          <TunnelParticles
            count={2500}
            boxSize={10}
            boxDepth={30}
            boxThickness={2}
          />
        </group>
        <group ref={section2Ref} position={[0, 0, -29]}>
          <TunnelParticles
            count={2500}
            boxSize={10}
            boxDepth={30}
            boxThickness={2}
          />
        </group>
      </group>

      {/* Unified Tunnel Box */}
      {tunnelVisible && (
        <mesh
          position={[0, tunnelYPosition, tunnelZPosition]}
          receiveShadow // Allow the tunnel to receive shadows from particles if they cast them
        >
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
