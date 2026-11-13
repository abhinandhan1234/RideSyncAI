import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import TaxiModel from './TaxiModel';
import TaxiCamera from './TaxiCamera';

/**
 * ThreeLoadingFallback: Minimal animated loader inside the canvas
 */
const ThreeLoadingFallback = () => {
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#F59E0B" wireframe />
    </mesh>
  );
};

/**
 * TaxiScene: Complete 3D automotive studio canvas containing the Honda Taxi model,
 * studio lighting, contact shadows, and orbit camera controller.
 */
export const TaxiScene = ({
  cameraPreset = 'cinematic',
  autoRotate = true,
  autoRotateSpeed = 1.0,
  headlightsOn = true,
  isDriving = false,
  wheelSpeed = 12,
  underglow = true,
  accentColor = '#F59E0B',
  onModelLoaded,
  className = '',
}) => {
  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]} // Balanced crispness and smartphone GPU performance
        camera={{ position: [3.8, 1.8, 4.2], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full"
      >
        {/* Studio Ambient & Key Lighting */}
        <ambientLight intensity={0.4} />

        {/* Key Light with Cast Shadow */}
        <directionalLight
          position={[6, 8, 5]}
          intensity={1.6}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={25}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
          shadow-bias={-0.0005}
        />

        {/* Rim & Fill Lights */}
        <directionalLight position={[-6, 4, -4]} intensity={0.7} color="#94A3B8" />
        <directionalLight position={[0, 6, -6]} intensity={0.5} color="#38BDF8" />

        <Suspense fallback={<ThreeLoadingFallback />}>
          {/* Environment Studio Reflection Map */}
          <Environment preset="city" />

          {/* Actual Honda Taxi Model */}
          <TaxiModel
            headlightsOn={headlightsOn}
            isDriving={isDriving}
            wheelSpeed={wheelSpeed}
            underglow={underglow}
            accentColor={accentColor}
            onModelLoaded={onModelLoaded}
          />

          {/* Contact Ground Shadows */}
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.75}
            scale={10}
            blur={2.4}
            far={3.5}
            color="#07090D"
          />

          {/* Interactive & Preset Camera Controls */}
          <TaxiCamera
            preset={cameraPreset}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default TaxiScene;
