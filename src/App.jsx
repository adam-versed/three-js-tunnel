import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./Scene";

export default function App() {
  return (
    <div id="canvas-container">
      <Canvas shadows gl={{ alpha: true }} dpr={[1, 1.5]}>
        <color attach="background" args={["#010101"]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
