import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { createVehicleRig } from './vehicleRig';

export default function TaxiModel({ scale = 1.3, headlightsOn = true, isDriving = false,
  wheelSpeed = 10, accentColor = '#A8C5BF', onModelLoaded, travel, underglow: _underglow, ...props }) {
  const { scene } = useGLTF('/models/honda-taxi.glb');
  const rig = useMemo(() => createVehicleRig(scene, accentColor, headlightsOn), [scene, accentColor, headlightsOn]);
  useEffect(() => {
    onModelLoaded?.({ nodes: rig.root.children.map(n => n.name), materials: [...new Set(rig.materials.map(m => m.name))],
      triangles: rig.triangles, vertices: rig.vertices,
      dimensions: { length: `${rig.dimensions.z.toFixed(2)}m`, width: `${rig.dimensions.x.toFixed(2)}m`, height: `${rig.dimensions.y.toFixed(2)}m` },
      artist: 'Existing project GLB · original hierarchy preserved' });
  }, [rig, onModelLoaded]);
  useEffect(() => () => rig.materials.forEach(m => m.dispose()), [rig]);
  useFrame((_, delta) => {
    for (const wheel of rig.wheels) {
      if (travel) wheel.rotation.x = travel.current / 0.262;
      else if (isDriving) wheel.rotation.x += wheelSpeed * delta;
    }
  });
  return <group scale={scale} {...props}><primitive object={rig.root} dispose={null} /></group>;
}
