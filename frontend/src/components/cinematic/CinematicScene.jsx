import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import TaxiModel from '../../three/TaxiModel';

const shots = [[5.8,2.6,6.6],[4.8,1.9,5.7],[7.5,2.6,0.2],[4.9,2.8,-6.2],[5.8,2.6,6.6]];
function Journey({director}) {
  const car = useRef(), road = useRef(), travel = useRef(0), progress = useRef(director.current);
  const {camera, size, invalidate} = useThree();
  const target = useMemo(()=>new THREE.Vector3(),[]);
  useEffect(() => { director.listeners.add(invalidate); invalidate(); return ()=>director.listeners.delete(invalidate); },[director,invalidate]);
  useFrame((_,delta)=>{
    progress.current = THREE.MathUtils.damp(progress.current,director.current,7,Math.min(delta,0.05));
    const p=progress.current, chapter=Math.min(3,Math.floor(p*4)), t=THREE.MathUtils.smoothstep(p*4-chapter,0,1);
    const a=shots[chapter],b=shots[chapter+1];
    const distance=size.width/size.height < 1.1 ? 1.3 : 1;
    target.set(THREE.MathUtils.lerp(a[0],b[0],t)*distance,THREE.MathUtils.lerp(a[1],b[1],t)*distance,THREE.MathUtils.lerp(a[2],b[2],t)*distance);
    camera.position.copy(target); camera.lookAt(0,0.55,0);
    // Smooth start and stop; scroll up reverses distance and wheel rotation.
    const driving=THREE.MathUtils.smoothstep(p,0.12,0.94);
    travel.current=driving*32;
    if(car.current) car.current.position.z=0.35*Math.sin(p*Math.PI);
    if(road.current) road.current.position.z=(travel.current%4);
    if(Math.abs(p-director.current)>0.00005) invalidate();
  },-1);
  return <>
    <hemisphereLight args={['#F2F3EF','#263B43',2.4]} />
    <directionalLight position={[3,7,5]} intensity={3.5} color="#F2F3EF" />
    <directionalLight position={[-5,3,-5]} intensity={2.5} color="#A8C5BF" />
    <directionalLight position={[0,1,-7]} intensity={1.2} />
    <group ref={car}><TaxiModel scale={1} accentColor="#A8C5BF" travel={travel}/></group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.035,0]}><planeGeometry args={[30,70]}/><meshStandardMaterial color="#263B43" transparent opacity={0.22} roughness={1}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,0]} scale={[1.1,2.2,1]}><circleGeometry args={[1,48]}/><meshBasicMaterial color="#081215" transparent opacity={0.28}/></mesh>
    <group ref={road}>{Array.from({length:15},(_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[-2.2,-0.02,i*4-30]}><planeGeometry args={[.045,1.8]}/><meshBasicMaterial color="#A8C5BF" transparent opacity={0.35}/></mesh>)}</group>
  </>;
}
export default function CinematicScene({director,onFailure}) {
  const [maxDpr] = useMemo(()=>[window.innerWidth<768?1:1.5],[]);
  return <Canvas frameloop="demand" dpr={[1,maxDpr]} camera={{position:shots[0],fov:39,near:0.1,far:100}}
    gl={{alpha:true,antialias:true,powerPreference:'low-power'}}
    onCreated={({gl})=>{ gl.setClearColor(0x000000,0); gl.domElement.addEventListener('webglcontextlost',onFailure,{once:true}); }}>
    <Suspense fallback={null}><Journey director={director}/></Suspense>
  </Canvas>;
}
