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
    <mesh position={[0, 0.65, 0]}>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
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
        camera={{ position: [3.4, 1.45, 3.8], fov: 40 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full"
      >
        {/* Studio Ambient & Key Lighting */}
        <ambientLight intensity={0.45} />

        {/* Key Sunlight with Cast Shadow covering full enlarged vehicle length */}
        <directionalLight
          position={[7, 10, 6]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={25}
          shadow-camera-left={-5.5}
          shadow-camera-right={5.5}
          shadow-camera-top={5.5}
          shadow-camera-bottom={-5.5}
          shadow-bias={-0.0003}
        />

        {/* Rim & Fill Lights for automotive edge reflections */}
        <directionalLight position={[-7, 5, -4]} intensity={0.8} color="#94A3B8" />
        <directionalLight position={[0, 6, -6]} intensity={0.6} color="#38BDF8" />

        <Suspense fallback={<ThreeLoadingFallback />}>
          {/* Environment Studio Reflection Map */}
          <Environment preset="city" />

          {/* Actual Honda Taxi Model with Enlarged Hero Size */}
          <TaxiModel
            scale={1.32}
            headlightsOn={headlightsOn}
            isDriving={isDriving}
            wheelSpeed={wheelSpeed}
            underglow={underglow}
            accentColor={accentColor}
            onModelLoaded={onModelLoaded}
          />

          {/* Enhanced Ground Contact Shadows */}
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.82}
            scale={13}
            blur={2.2}
            far={4.0}
            color="#07090D"
          />

          {/* Interactive & Preset Camera Controls with Mobile Safe-Framing */}
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
