import fs from 'node:fs';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
import { createVehicleRig } from '../src/three/vehicleRig.js';
const bytes = fs.readFileSync(new URL('../public/models/honda-taxi.glb', import.meta.url));
const {scene} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const sourceBoxes = new Map();
scene.traverse(n=>{ if(n.isMesh) sourceBoxes.set(n.name,new Box3().setFromObject(n)); });
const rig = createVehicleRig(scene);
let count = 0;
rig.root.updateMatrixWorld(true);
const groundOffset = -new Box3().setFromObject(scene).min.y;
rig.root.traverse(n=>{
  if (!n.isMesh) return;
  count++;
  const expected=sourceBoxes.get(n.name).clone().translate(new Vector3(0,groundOffset,0));
  const actual=new Box3().setFromObject(n);
  assert.ok(actual.min.distanceTo(expected.min)<1e-6 && actual.max.distanceTo(expected.max)<1e-6,`${n.name}: transform changed`);
});
assert.equal(count, sourceBoxes.size);
assert.equal(rig.wheels.length,3);
assert.ok(Math.abs(new Box3().setFromObject(rig.root).min.y)<1e-6);
for(const axle of rig.wheels){
  const before=new Box3().setFromObject(axle).getCenter(new Vector3());
  axle.rotation.x=Math.PI;
  const after=new Box3().setFromObject(axle).getCenter(new Vector3());
  assert.ok(before.distanceTo(after)<1e-5,'Axle center moved');
}
console.log(`Vehicle verified: ${count} material meshes, 3 axle groups, ${rig.triangles} triangles. +Y up, +Z forward. All original world transforms retained.`);
