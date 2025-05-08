import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

export default function TunnelParticles({
  count = 2500,
  boxSize = 10,
  boxDepth = 30,
  boxThickness = 2,
}) {
  const meshRef = useRef();
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  // Generate instance matrices
  const matrices = useMemo(() => {
    const matrices = [];
    const halfBoxSize = boxSize / 2;
    const halfBoxThickness = boxThickness / 2;

    for (let i = 0; i < count; i++) {
      // Choose a random face (top, bottom, left, right)
      const face = Math.floor(Math.random() * 4);
      const sign = Math.random() > 0.5 ? -1 : 1;

      let x, y, z;

      // Position based on the selected face
      if (face === 0) {
        // Top face
        x = THREE.MathUtils.randFloatSpread(boxSize);
        y =
          halfBoxSize +
          THREE.MathUtils.randFloat(-halfBoxThickness, halfBoxThickness);
      } else if (face === 1) {
        // Bottom face
        x = THREE.MathUtils.randFloatSpread(boxSize);
        y =
          -halfBoxSize +
          THREE.MathUtils.randFloat(-halfBoxThickness, halfBoxThickness);
      } else if (face === 2) {
        // Left face
        x =
          -halfBoxSize +
          THREE.MathUtils.randFloat(-halfBoxThickness, halfBoxThickness);
        y = THREE.MathUtils.randFloatSpread(boxSize);
      } else {
        // Right face
        x =
          halfBoxSize +
          THREE.MathUtils.randFloat(-halfBoxThickness, halfBoxThickness);
        y = THREE.MathUtils.randFloatSpread(boxSize);
      }

      // Random z-position throughout the tunnel depth
      z = THREE.MathUtils.randFloatSpread(boxDepth);

      // Create position vector and add some variation
      const position = new THREE.Vector3(x, y, z);
      const normal = position.clone().normalize();
      position.addScaledVector(normal, 1);

      // Set the matrix for this instance
      tempObject.position.copy(position);
      const scale = THREE.MathUtils.randFloat(0.2, 0.5);
      tempObject.scale.set(scale, scale, scale);
      tempObject.rotation.set(
        THREE.MathUtils.randFloat(0, Math.PI * 2),
        THREE.MathUtils.randFloat(0, Math.PI * 2),
        THREE.MathUtils.randFloat(0, Math.PI * 2)
      );
      tempObject.updateMatrix();
      matrices.push({ matrix: tempObject.matrix.clone() });
    }

    return matrices;
  }, [count, boxSize, boxDepth, boxThickness, tempObject]);

  // Update instance matrices
  useEffect(() => {
    if (meshRef.current) {
      matrices.forEach((matrix, i) => {
        meshRef.current.setMatrixAt(i, matrix.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrices]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, count]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="white" roughness={1} metalness={0} />
    </instancedMesh>
  );
}
