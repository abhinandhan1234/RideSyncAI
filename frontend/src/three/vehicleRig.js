import * as THREE from 'three';

/** Preserve all material primitives and world transforms from the original GLB. */
export function createVehicleRig(source, color = '#A8C5BF', headlights = true) {
  const root = source.clone(true);
  const materials = [];
  const wheels = [];
  let triangles = 0, vertices = 0;
  root.traverse(node => {
    if (!node.isMesh) return;
    vertices += node.geometry.attributes.position.count;
    triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
    node.castShadow = true;
    node.receiveShadow = true;
    node.material = node.material.clone();
    materials.push(node.material);
    const name = node.material.name.toLowerCase();
    if (name.includes('yellow')) { node.material.color.set(color); node.material.roughness = 0.32; node.material.metalness = 0.28; }
    if (name.includes('window')) { node.material.color.set('#263B43'); node.material.roughness = 0.18; node.material.metalness = 0.45; }
    if (name.includes('headlight')) { node.material.emissive.set('#F2F3EF'); node.material.emissiveIntensity = headlights ? 0.8 : 0; }
  });
  root.updateMatrixWorld(true);
  // Select whole GLTF groups, never individual material meshes.
  for (const node of [...root.children]) {
    if (!/Wheel/i.test(node.name)) continue;
    const center = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
    const pivot = new THREE.Group();
    pivot.name = `Axle_${node.name}`;
    pivot.position.copy(root.worldToLocal(center));
    root.add(pivot);
    pivot.updateMatrixWorld(true);
    pivot.attach(node); // preserves every child's original world-space transform
    wheels.push(pivot);
  }
  const bounds = new THREE.Box3().setFromObject(root);
  const dimensions = bounds.getSize(new THREE.Vector3());
  // Original up = +Y; headlights/front axle point +Z. Lowest tyre was -0.011m.
  root.position.y -= bounds.min.y;
  return { root, wheels, materials, triangles, vertices, dimensions };
}
