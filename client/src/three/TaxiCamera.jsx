import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export const CAMERA_PRESETS = {
  cinematic: {
    position: [3.8, 1.8, 4.2],
    target: [0, 0.4, 0],
  },
  front: {
    position: [0, 1.2, 4.8],
    target: [0, 0.5, 0],
  },
  side: {
    position: [5.2, 1.0, 0],
    target: [0, 0.5, 0],
  },
  cockpit: {
    position: [0.35, 1.15, 0.2],
    target: [0.35, 1.0, 3.5],
  },
  top: {
    position: [0.1, 7.5, 0.1],
    target: [0, 0, 0],
  },
};

/**
 * TaxiCamera: Handles smooth camera transition animations between presets
 * while retaining interactive OrbitControls for touch/mouse manipulation.
 */
export const TaxiCamera = ({
  preset = 'cinematic',
  autoRotate = true,
  autoRotateSpeed = 1.2,
  enableControls = true,
}) => {
  const controlsRef = useRef();
  const { camera } = useThree();

  const targetPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.cinematic.position));
  const targetLook = useRef(new THREE.Vector3(...CAMERA_PRESETS.cinematic.target));
  const isTransitioning = useRef(true);

  useEffect(() => {
    const selected = CAMERA_PRESETS[preset] || CAMERA_PRESETS.cinematic;
    targetPos.current.set(...selected.position);
    targetLook.current.set(...selected.target);
    isTransitioning.current = true;
  }, [preset]);

  useFrame((_, delta) => {
    if (isTransitioning.current && controlsRef.current) {
      // Smooth lerp camera position
      camera.position.lerp(targetPos.current, 4 * delta);
      controlsRef.current.target.lerp(targetLook.current, 4 * delta);

      // Stop transition when close enough
      if (
        camera.position.distanceTo(targetPos.current) < 0.05 &&
        controlsRef.current.target.distanceTo(targetLook.current) < 0.05
      ) {
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={enableControls}
      autoRotate={autoRotate && !isTransitioning.current}
      autoRotateSpeed={autoRotateSpeed}
      enableDamping
      dampingFactor={0.06}
      minDistance={1.8}
      maxDistance={12}
      maxPolarAngle={Math.PI / 2 - 0.02} // Do not dip below ground
      minPolarAngle={0.1}
      makeDefault
    />
  );
};

export default TaxiCamera;
