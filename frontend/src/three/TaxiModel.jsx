import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_PATH = '/models/honda-taxi.glb';

// Pre-computed mathematical wheel centers in original unmodified model coordinate space
const WHEEL_CENTERS = {
  back: new THREE.Vector3(0, 0.251, -1.143),
  frontRight: new THREE.Vector3(0.689, 0.251, 1.296), // Mesh name Taxi_FrontLeftWheel_Cube.013 (+X)
  frontLeft: new THREE.Vector3(-0.690, 0.251, 1.296),  // Mesh name Taxi_FrontRightWheel_Cube.014 (-X)
};

/**
 * TaxiModel: Renders the Honda Taxi GLB with high-end automotive materials,
 * non-destructive pivot groups for wheel rotation, and realistic lighting.
 */
export const TaxiModel = ({
  scale = 1.30,
  headlightsOn = true,
  isDriving = false,
  wheelSpeed = 10,
  accentColor = '#F59E0B',
  underglow = true,
  onModelLoaded,
  ...props
}) => {
  const groupRef = useRef();
  const backPivotRef = useRef();
  const frontLeftPivotRef = useRef();
  const frontRightPivotRef = useRef();

  // Load GLB model from public folder
  const gltf = useGLTF(MODEL_PATH);

  // Build automotive materials and non-destructive wheel pivot structure
  const { assembledScene, materialsList, nodeInfo } = useMemo(() => {
    // Clone GLTF scene graph without mutating the source asset
    const root = gltf.scene.clone(true);
    const foundMaterials = [];
    const foundNodes = [];

    let chassisMesh = null;
    let backWheelsMesh = null;
    let frontRightWheelMesh = null;
    let frontLeftWheelMesh = null;

    // Traverse and apply premium automotive materials
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        foundNodes.push(child.name);

        const mat = child.material;
        if (mat && !foundMaterials.includes(mat.name)) {
          foundMaterials.push(mat.name);
        }

        // Apply specialized automotive shader settings per material slot
        if (mat.name === 'Yellow' || mat.name.toLowerCase().includes('yellow')) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(accentColor),
            roughness: 0.24,
            metalness: 0.16,
            clearcoat: 0.85,
            clearcoatRoughness: 0.12,
            reflectivity: 0.7,
            envMapIntensity: 1.8,
          });
        } else if (mat.name === 'Windows' || mat.name.toLowerCase().includes('window')) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#0A1120'),
            roughness: 0.08,
            metalness: 0.15,
            transmission: 0.65,
            transparent: true,
            opacity: 0.88,
            ior: 1.52,
            envMapIntensity: 2.2,
          });
        } else if (mat.name === 'Headlights' || mat.name.toLowerCase().includes('headlight')) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#FFFBEB'),
            emissive: new THREE.Color(headlightsOn ? '#FEF08A' : '#1C1917'),
            emissiveIntensity: headlightsOn ? 2.8 : 0.0,
            roughness: 0.1,
            metalness: 0.2,
          });
        } else if (mat.name === 'TailLights' || mat.name.toLowerCase().includes('taillight')) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#DC2626'),
            emissive: new THREE.Color(headlightsOn ? '#EF4444' : '#450A0A'),
            emissiveIntensity: headlightsOn ? 2.2 : 0.3,
            roughness: 0.2,
          });
        } else if (mat.name === 'Black' || mat.name.toLowerCase().includes('black')) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#16181D'),
            roughness: 0.84,
            metalness: 0.06,
          });
        } else if (mat.name === 'Grey' || mat.name.toLowerCase().includes('grey')) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#CBD5E1'),
            roughness: 0.22,
            metalness: 0.85,
            envMapIntensity: 1.8,
          });
        }

        // Categorize meshes
        if (child.name.includes('BackWheels')) {
          backWheelsMesh = child;
        } else if (child.name.includes('FrontLeftWheel')) {
          frontRightWheelMesh = child; // +X mesh
        } else if (child.name.includes('FrontRightWheel')) {
          frontLeftWheelMesh = child; // -X mesh
        } else {
          chassisMesh = child;
        }
      }
    });

    // Construct non-destructive hierarchical wheel pivot groups
    // This allows wheels to rotate about their true axle center without displacing vertices
    const carContainer = new THREE.Group();
    carContainer.name = 'HondaTaxi_CarRig';

    if (chassisMesh) {
      carContainer.add(chassisMesh);
    }

    // Rear Wheels Pivot Group
    const backPivot = new THREE.Group();
    backPivot.name = 'Pivot_BackWheels';
    backPivot.position.copy(WHEEL_CENTERS.back);
    if (backWheelsMesh) {
      backWheelsMesh.position.copy(WHEEL_CENTERS.back.clone().negate());
      backPivot.add(backWheelsMesh);
    }
    carContainer.add(backPivot);

    // Front-Right Wheel Pivot Group (+X)
    const frontRightPivot = new THREE.Group();
    frontRightPivot.name = 'Pivot_FrontRightWheel';
    frontRightPivot.position.copy(WHEEL_CENTERS.frontRight);
    if (frontRightWheelMesh) {
      frontRightWheelMesh.position.copy(WHEEL_CENTERS.frontRight.clone().negate());
      frontRightPivot.add(frontRightWheelMesh);
    }
    carContainer.add(frontRightPivot);

    // Front-Left Wheel Pivot Group (-X)
    const frontLeftPivot = new THREE.Group();
    frontLeftPivot.name = 'Pivot_FrontLeftWheel';
    frontLeftPivot.position.copy(WHEEL_CENTERS.frontLeft);
    if (frontLeftWheelMesh) {
      frontLeftWheelMesh.position.copy(WHEEL_CENTERS.frontLeft.clone().negate());
      frontLeftPivot.add(frontLeftWheelMesh);
    }
    carContainer.add(frontLeftPivot);

    return {
      assembledScene: carContainer,
      materialsList: foundMaterials,
      nodeInfo: foundNodes,
      pivots: {
        back: backPivot,
        frontRight: frontRightPivot,
        frontLeft: frontLeftPivot,
      },
    };
  }, [gltf.scene, accentColor, headlightsOn]);

  // Hook references to the pivots
  useEffect(() => {
    backPivotRef.current = assembledScene.getObjectByName('Pivot_BackWheels');
    frontRightPivotRef.current = assembledScene.getObjectByName('Pivot_FrontRightWheel');
    frontLeftPivotRef.current = assembledScene.getObjectByName('Pivot_FrontLeftWheel');

    if (onModelLoaded) {
      onModelLoaded({
        nodes: nodeInfo,
        materials: materialsList,
        triangles: 3278,
        vertices: 6273,
        dimensions: { length: '4.22m', width: '1.80m', height: '1.31m' },
        artist: 'Quaternius (Stylized Low-Poly)',
      });
    }
  }, [assembledScene, onModelLoaded, nodeInfo, materialsList]);

  // Frame Loop: Smooth axle rotation when driving
  useFrame((_, delta) => {
    if (isDriving) {
      const rotStep = wheelSpeed * delta;
      if (backPivotRef.current) backPivotRef.current.rotation.x += rotStep;
      if (frontRightPivotRef.current) frontRightPivotRef.current.rotation.x += rotStep;
      if (frontLeftPivotRef.current) frontLeftPivotRef.current.rotation.x += rotStep;
    }
  });

  return (
    <group ref={groupRef} scale={scale} {...props} dispose={null}>
      {/* Assembled Vehicle Rig */}
      <primitive object={assembledScene} />

      {/* Headlight Projected Beams */}
      {headlightsOn && (
        <>
          <spotLight
            position={[-0.7, 0.62, 2.15]}
            target-position={[-0.7, 0.1, 7]}
            angle={0.42}
            penumbra={0.65}
            intensity={4.2}
            color="#FEF08A"
            distance={11}
          />
          <spotLight
            position={[0.7, 0.62, 2.15]}
            target-position={[0.7, 0.1, 7]}
            angle={0.42}
            penumbra={0.65}
            intensity={4.2}
            color="#FEF08A"
            distance={11}
          />
        </>
      )}

      {/* Subtle Taxi-Yellow Underglow */}
      {underglow && (
        <pointLight
          position={[0, 0.18, 0]}
          intensity={1.6}
          color="#F59E0B"
          distance={4.2}
        />
      )}
    </group>
  );
};

useGLTF.preload(MODEL_PATH);

export default TaxiModel;
