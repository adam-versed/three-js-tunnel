import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import TunnelParticles from "./components/TunnelParticles";

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

  // Set up scene
  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.position.set(0, 4, 10);
    }
  }, []);

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

      {/* Tunnel walls */}
      <mesh receiveShadow position={[7, 0, 0]}>
        <boxGeometry args={[1, 14, 26]} />
        <meshStandardMaterial color="#101010" />
      </mesh>
      <mesh receiveShadow position={[-7, 0, 0]}>
        <boxGeometry args={[1, 14, 26]} />
        <meshStandardMaterial color="#101010" />
      </mesh>

      {/* Ceiling pieces */}
      <mesh castShadow receiveShadow position={[0, 7, -5]}>
        <boxGeometry args={[16, 1, 10]} />
        <meshBasicMaterial color="#080808" />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 7, -10]}>
        <boxGeometry args={[12, 1, 20]} />
        <meshBasicMaterial color="#080808" />
      </mesh>

      {/* Floor */}
      <mesh receiveShadow castShadow position={[0, -5.5, -14]}>
        <boxGeometry args={[14, 1, 14]} />
        <meshStandardMaterial color="#303030" roughness={1} metalness={0} />
      </mesh>

      {/* Light source */}
      <spotLight
        ref={lightRef}
        castShadow
        intensity={250}
        position={[-7, 12, 3]}
        target={targetRef.current}
        angle={0.3}
        penumbra={0.2}
        distance={50}
      />

      {/* Light mesh (visual representation) */}
      <mesh position={[-7, 12, 3]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={new THREE.Color(1, 1, 1).multiplyScalar(5)} />
      </mesh>

      {/* Object targeted by light */}
      <primitive object={targetRef.current} />

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
