import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const local = fileURLToPath(new URL('../../../../ai-engine/validation/.venv/bin/python',import.meta.url));
const script = fileURLToPath(new URL('./worker.py',import.meta.url));
let worker;
function start() {
  const child = spawn(process.env.PS2_PYTHON || (existsSync(local) ? local : 'python3'), ['-B',script],
    {stdio:['pipe','pipe','inherit'],env:{...process.env,OMP_NUM_THREADS:'1'}});
  const queue = [];
  const state = {child,queue};
  const fail = () => {
    if(worker===state) worker=undefined;
    clearTimeout(state.timer);
    for(const item of queue.splice(0)) item.reject(Object.assign(new Error('AI worker unavailable'),{status:503}));
  };
  child.once('error',fail);
  child.once('exit',fail);
  child.stdin.on('error',fail);
  createInterface({input:child.stdout}).on('line',line=>{
    const item=queue.shift();
    if(!item) return;
    try {
      const result=JSON.parse(line);
      if(result.error) throw Object.assign(new Error(result.error),{status:400});
      item.resolve(result.value);
    } catch(error) { item.reject(error); }
    if(!queue.length) state.timer=setTimeout(()=>{if(worker===state) worker=undefined;child.stdin.end();},3000);
  });
  return state;
}
export function ai(op,input) {
  worker ||= start();
  clearTimeout(worker.timer);
  return new Promise((resolve,reject)=>{
    worker.queue.push({resolve,reject});
    worker.child.stdin.write(JSON.stringify({op,...input})+'\n');
  });
}
