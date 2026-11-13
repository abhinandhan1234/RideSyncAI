import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export const CAMERA_PRESETS = {
  // Enhanced front 3/4 commercial hero perspective showcasing front grille, hood, taxi sign & rims
  cinematic: {
    position: [6.3, 3, 7.5],
    target: [0, 0.58, 0.15],
  },
  front: {
    position: [0, 2.1, 8],
    target: [0, 0.55, 0.2],
  },
  side: {
    position: [8.5, 2.1, 0],
    target: [0, 0.58, 0],
  },
  cockpit: {
    position: [0.36, 1.25, 0.35],
    target: [0.36, 1.05, 3.8],
  },
  top: {
    position: [0.1, 10, 0.1],
    target: [0, 0, 0],
  },
};

/**
 * TaxiCamera: Handles smooth camera transition animations between presets,
 * dynamic responsive mobile portrait framing, and interactive OrbitControls.
 */
export const TaxiCamera = ({
  preset = 'cinematic',
  autoRotate = true,
  autoRotateSpeed = 1.2,
  enableControls = true,
}) => {
  const controlsRef = useRef();
  const { camera, size } = useThree();

  const targetPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.cinematic.position));
  const targetLook = useRef(new THREE.Vector3(...CAMERA_PRESETS.cinematic.target));
  const isTransitioning = useRef(true);

  // Compute responsive mobile portrait scaling factor
  // On smartphones (aspect < 1), scale distance so the full car remains visible
  const aspect = size.width / Math.max(1, size.height);
  const mobileScaleFactor = aspect < 1 ? Math.min(1.45, Math.max(1.0, 0.95 / aspect)) : 1.0;

  useEffect(() => {
    const selected = CAMERA_PRESETS[preset] || CAMERA_PRESETS.cinematic;
    
    // Scale base position by mobile responsive factor for portrait screens
    targetPos.current.set(
      selected.position[0] * mobileScaleFactor,
      selected.position[1] * (aspect < 1 ? 1.08 : 1.0),
      selected.position[2] * mobileScaleFactor
    );
    targetLook.current.set(...selected.target);
    isTransitioning.current = true;
  }, [preset, mobileScaleFactor, aspect]);

  useFrame((_, delta) => {
    if (isTransitioning.current && controlsRef.current) {
      // Smooth lerp camera position
      camera.position.lerp(targetPos.current, 4.5 * delta);
      controlsRef.current.target.lerp(targetLook.current, 4.5 * delta);

      // Stop transition when close enough
      if (
        camera.position.distanceTo(targetPos.current) < 0.04 &&
        controlsRef.current.target.distanceTo(targetLook.current) < 0.04
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
      minDistance={2.0}
      maxDistance={14}
      maxPolarAngle={Math.PI / 2 - 0.02} // Do not dip below ground
      minPolarAngle={0.08}
      makeDefault
    />
  );
};

export default TaxiCamera;
