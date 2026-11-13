import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import TaxiModel from './TaxiModel';
import TaxiCamera from './TaxiCamera';
import TaxiIllustration from '../components/cinematic/TaxiIllustration';

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
 * StudioPlatform: Automotive showroom circular turntable floor
 * with subtle rim reflection and metallic absorption.
 */
const StudioPlatform = () => {
  return (
    <group position={[0, -0.025, 0]}>
      {/* Dark Circular Turntable Disc */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[5.2, 5.4, 0.05, 64]} />
        <meshStandardMaterial
          color="#080B11"
          roughness={0.4}
          metalness={0.65}
          envMapIntensity={0.6}
        />
      </mesh>

      {/* Outer Metallic Accent Rim */}
      <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.18, 5.24, 64]} />
        <meshBasicMaterial color="#334155" opacity={0.6} transparent />
      </mesh>
    </group>
  );
};

/**
 * TaxiScene: Complete 3D automotive studio canvas containing the Honda Taxi model,
 * studio lighting, circular platform, contact shadows, and orbit camera controller.
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
        fallback={<TaxiIllustration />}
        shadows
        dpr={[1, 2]} // Balanced crispness and smartphone GPU performance
        camera={{ position: [6.3, 3, 7.5], fov: 40 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full"
      >
        {/* Studio Ambient & Key Lighting */}
        <ambientLight intensity={0.4} />

        {/* Primary Overhead Softbox Directional Light with Cast Shadow */}
        <directionalLight
          position={[6, 10, 5]}
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

        {/* Front Grille Fill Light for front badges and headlights */}
        <directionalLight position={[0, 2.5, 6]} intensity={0.65} color="#F8FAFC" />

        {/* Cool Rim Light for crisp vehicle silhouettes */}
        <directionalLight position={[-6, 4.5, -4]} intensity={0.9} color="#94A3B8" />

        <Suspense fallback={<ThreeLoadingFallback />}>
          {/* Environment Studio Reflection Map */}
          <hemisphereLight args={['#F2F3EF', '#263B43', 1.2]} />

          {/* Showroom Platform */}
          <StudioPlatform />

          {/* Actual Honda Taxi Model with Non-Destructive Rig */}
          <TaxiModel
            scale={1.30}
            headlightsOn={headlightsOn}
            isDriving={isDriving}
            wheelSpeed={wheelSpeed}
            underglow={underglow}
            accentColor={accentColor}
            onModelLoaded={onModelLoaded}
          />

          {/* Realistic Ground Contact Shadows */}
          <ContactShadows
            position={[0, 0.005, 0]}
            opacity={0.88}
            scale={12}
            blur={2.0}
            far={3.0}
            color="#020305"
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
