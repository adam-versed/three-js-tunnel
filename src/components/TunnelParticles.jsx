import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

export default function TunnelParticles({
  count = 2500,
  boxSize = 10,
  boxDepth = 30,
  boxThickness = 2,
  visible = true,
  baseSize = 0.35,
  sizeRandomness = 0.5,
  baseColor = "#ffffff",
  colorRandomness = 0.3,
  baseRotationX = 0,
  baseRotationY = 0,
  baseRotationZ = 0,
  rotationRandomnessX = 1.0,
  rotationRandomnessY = 1.0,
  rotationRandomnessZ = 1.0,
}) {
  const meshRef = useRef();
  const geomRef = useRef();
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const particleData = useMemo(() => {
    const matrices = [];
    const colors = [];
    const halfBoxSize = boxSize / 2;
    const halfBoxThickness = boxThickness / 2;

    const initialColor = new THREE.Color(baseColor);

    for (let i = 0; i < count; i++) {
      const face = Math.floor(Math.random() * 4);
      let x, y, z;

      if (face === 0) {
        x = THREE.MathUtils.randFloatSpread(boxSize);
        y =
          halfBoxSize +
          THREE.MathUtils.randFloat(-halfBoxThickness, halfBoxThickness);
      } else if (face === 1) {
        x = THREE.MathUtils.randFloatSpread(boxSize);
        y =
          -halfBoxSize +
          THREE.MathUtils.randFloat(-halfBoxThickness, halfBoxThickness);
      } else if (face === 2) {
        x =
          -halfBoxSize +
          THREE.MathUtils.randFloat(-halfBoxThickness, halfBoxThickness);
        y = THREE.MathUtils.randFloatSpread(boxSize);
      } else {
        x =
          halfBoxSize +
          THREE.MathUtils.randFloat(-halfBoxThickness, halfBoxThickness);
        y = THREE.MathUtils.randFloatSpread(boxSize);
      }
      z = THREE.MathUtils.randFloatSpread(boxDepth);

      tempObject.position.set(x, y, z);

      const scaleFactor =
        1 - sizeRandomness + Math.random() * 2 * sizeRandomness;
      tempObject.scale.set(scaleFactor, scaleFactor, scaleFactor);

      tempObject.rotation.set(
        baseRotationX +
          (Math.random() - 0.5) * 2 * rotationRandomnessX * Math.PI,
        baseRotationY +
          (Math.random() - 0.5) * 2 * rotationRandomnessY * Math.PI,
        baseRotationZ +
          (Math.random() - 0.5) * 2 * rotationRandomnessZ * Math.PI
      );
      tempObject.updateMatrix();
      matrices.push(tempObject.matrix.clone());

      tempColor.copy(initialColor);
      if (colorRandomness > 0) {
        const randomFactor = (Math.random() - 0.5) * 2 * colorRandomness;
        tempColor.offsetHSL(
          randomFactor * 0.3,
          randomFactor * 0.3,
          randomFactor * 0.3
        );
      }
      colors.push(tempColor.r, tempColor.g, tempColor.b);
    }
    return { matrices, colors };
  }, [
    count,
    boxSize,
    boxDepth,
    boxThickness,
    baseSize,
    sizeRandomness,
    baseColor,
    colorRandomness,
    baseRotationX,
    baseRotationY,
    baseRotationZ,
    rotationRandomnessX,
    rotationRandomnessY,
    rotationRandomnessZ,
    tempObject,
    tempColor,
  ]);

  useEffect(() => {
    if (!meshRef.current || !geomRef.current) return;

    for (let i = 0; i < particleData.matrices.length; i++) {
      meshRef.current.setMatrixAt(i, particleData.matrices[i]);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    const colorAttribute = geomRef.current.getAttribute("color");
    if (colorAttribute) {
      for (let i = 0; i < particleData.colors.length / 3; i++) {
        tempColor.fromArray(particleData.colors, i * 3);
        colorAttribute.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
      }
      colorAttribute.needsUpdate = true;
    }

    meshRef.current.count = particleData.matrices.length;
  }, [particleData, tempColor]);

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(baseSize, baseSize, baseSize);
    const colorsArray = new Float32Array(count * 3);
    const colorAttrib = new THREE.InstancedBufferAttribute(colorsArray, 3);
    geo.setAttribute("color", colorAttrib);
    return geo;
  }, [baseSize, count]);

  if (!visible) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, count]}
      castShadow
      receiveShadow
    >
      <primitive object={particleGeometry} attach="geometry" ref={geomRef} />
      <meshStandardMaterial roughness={1} metalness={0} vertexColors={true} />
    </instancedMesh>
  );
}
