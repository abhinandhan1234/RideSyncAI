import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_PATH = '/models/honda-taxi.glb';

/**
 * TaxiModel: Renders the Honda Taxi GLB model with realistic automotive materials,
 * wheel spin rigging, headlight/taillight emissive controls, and ground alignment.
 */
export const TaxiModel = ({
  headlightsOn = true,
  isDriving = false,
  wheelSpeed = 10,
  accentColor = '#F59E0B',
  underglow = true,
  onModelLoaded,
  ...props
}) => {
  const groupRef = useRef();
  const backWheelsRef = useRef();
  const frontLeftWheelRef = useRef();
  const frontRightWheelRef = useRef();

  // Load GLB model from public folder
  const gltf = useGLTF(MODEL_PATH);

  // Clone scene so multiple instances don't share identical mutated state
  const scene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  // Inspect hierarchy, configure automotive materials and center wheel pivots
  const { wheelNodes, materialsList } = useMemo(() => {
    const wheels = {
      back: null,
      frontLeft: null,
      frontRight: null,
    };
    const foundMaterials = [];

    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material;
        if (mat) {
          if (!foundMaterials.includes(mat.name)) {
            foundMaterials.push(mat.name);
          }

          // Clone material to avoid mutating global cache
          const customMat = mat.clone();

          // Automotive Yellow Body Paint
          if (mat.name === 'Yellow' || mat.name.toLowerCase().includes('yellow')) {
            customMat.color = new THREE.Color(accentColor);
            customMat.roughness = 0.25;
            customMat.metalness = 0.35;
            customMat.envMapIntensity = 1.8;
          }
          // Tinted Automotive Glass
          else if (mat.name === 'Windows' || mat.name.toLowerCase().includes('window')) {
            customMat.color = new THREE.Color('#1E293B');
            customMat.transparent = true;
            customMat.opacity = 0.72;
            customMat.roughness = 0.1;
            customMat.metalness = 0.85;
            customMat.envMapIntensity = 2.2;
          }
          // Headlights
          else if (mat.name === 'Headlights' || mat.name.toLowerCase().includes('headlight')) {
            customMat.color = new THREE.Color(headlightsOn ? '#FFFBEB' : '#E2E8F0');
            customMat.emissive = new THREE.Color(headlightsOn ? '#FEF08A' : '#000000');
            customMat.emissiveIntensity = headlightsOn ? 3.0 : 0.0;
            customMat.roughness = 0.1;
          }
          // Taillights
          else if (mat.name === 'TailLights' || mat.name.toLowerCase().includes('taillight')) {
            customMat.color = new THREE.Color('#EF4444');
            customMat.emissive = new THREE.Color(headlightsOn ? '#DC2626' : '#450A0A');
            customMat.emissiveIntensity = headlightsOn ? 2.5 : 0.4;
          }
          // Tire Rubber
          else if (mat.name === 'Black' || mat.name.toLowerCase().includes('black')) {
            customMat.color = new THREE.Color('#111318');
            customMat.roughness = 0.85;
            customMat.metalness = 0.1;
          }
          // Metallic Rims / Trim
          else if (mat.name === 'Grey' || mat.name.toLowerCase().includes('grey')) {
            customMat.color = new THREE.Color('#94A3B8');
            customMat.roughness = 0.3;
            customMat.metalness = 0.8;
          }

          child.material = customMat;
        }

        // Identify wheel meshes
        if (child.name.includes('BackWheels')) {
          wheels.back = child;
        } else if (child.name.includes('FrontLeftWheel')) {
          wheels.frontLeft = child;
        } else if (child.name.includes('FrontRightWheel')) {
          wheels.frontRight = child;
        }
      }
    });

    return { wheelNodes: wheels, materialsList: foundMaterials };
  }, [scene, accentColor, headlightsOn]);

  useEffect(() => {
    if (onModelLoaded) {
      onModelLoaded({
        nodes: [
          'Taxi_Cube.009 (Body/Roof Sign)',
          'Taxi_BackWheels_Cube.010 (Rear Wheels)',
          'Taxi_FrontLeftWheel_Cube.013 (Front Left Wheel)',
          'Taxi_FrontRightWheel_Cube.014 (Front Right Wheel)',
        ],
        materials: materialsList,
        dimensions: { length: '4.22m', width: '1.80m', height: '1.31m' },
      });
    }
  }, [onModelLoaded, materialsList]);

  // Wheel pivots setup: center wheel meshes for in-place axle rotation
  useEffect(() => {
    // Back wheels center: (0, 0.25, -1.14)
    // Front Left center: (-0.74, 0.25, 1.30)
    // Front Right center: (0.74, 0.25, 1.30)
    if (wheelNodes.back && !wheelNodes.back.userData.centered) {
      const bGeom = wheelNodes.back.geometry;
      bGeom.computeBoundingBox();
      const center = new THREE.Vector3();
      bGeom.boundingBox.getCenter(center);
      bGeom.center();
      wheelNodes.back.position.copy(center);
      wheelNodes.back.userData.centered = true;
    }

    if (wheelNodes.frontLeft && !wheelNodes.frontLeft.userData.centered) {
      const flGeom = wheelNodes.frontLeft.geometry;
      flGeom.computeBoundingBox();
      const center = new THREE.Vector3();
      flGeom.boundingBox.getCenter(center);
      flGeom.center();
      wheelNodes.frontLeft.position.copy(center);
      wheelNodes.frontLeft.userData.centered = true;
    }

    if (wheelNodes.frontRight && !wheelNodes.frontRight.userData.centered) {
      const frGeom = wheelNodes.frontRight.geometry;
      frGeom.computeBoundingBox();
      const center = new THREE.Vector3();
      frGeom.boundingBox.getCenter(center);
      frGeom.center();
      wheelNodes.frontRight.position.copy(center);
      wheelNodes.frontRight.userData.centered = true;
    }
  }, [wheelNodes]);

  // Frame Loop: Smooth wheel rotation when driving
  useFrame((_, delta) => {
    if (isDriving) {
      const rotStep = wheelSpeed * delta;
      if (wheelNodes.back) wheelNodes.back.rotation.x += rotStep;
      if (wheelNodes.frontLeft) wheelNodes.frontLeft.rotation.x += rotStep;
      if (wheelNodes.frontRight) wheelNodes.frontRight.rotation.x += rotStep;
    }
  });

  return (
    <group ref={groupRef} {...props} dispose={null}>
      {/* 3D Model Instance centered */}
      <primitive object={scene} />

      {/* Headlight Beam Spotlights */}
      {headlightsOn && (
        <>
          <spotLight
            position={[-0.65, 0.6, 2.1]}
            target-position={[-0.65, 0.1, 7]}
            angle={0.45}
            penumbra={0.6}
            intensity={4}
            color="#FEF08A"
            distance={10}
          />
          <spotLight
            position={[0.65, 0.6, 2.1]}
            target-position={[0.65, 0.1, 7]}
            angle={0.45}
            penumbra={0.6}
            intensity={4}
            color="#FEF08A"
            distance={10}
          />
        </>
      )}

      {/* Subtle Taxi-Yellow Underglow */}
      {underglow && (
        <pointLight
          position={[0, 0.15, 0]}
          intensity={1.2}
          color="#F59E0B"
          distance={3}
        />
      )}
    </group>
  );
};

useGLTF.preload(MODEL_PATH);

export default TaxiModel;
