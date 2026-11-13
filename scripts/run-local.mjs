import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';
const root = fileURLToPath(new URL('../', import.meta.url));
const frontendPort = Number(process.env.FRONTEND_PORT || 5173);
const backendPort = Number(process.env.PORT || 5002);
for (const port of [frontendPort, backendPort]) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Ports must be integers between 1024 and 65535');
  await new Promise((resolve,reject) => {
    const probe=net.createServer();
    probe.once('error',()=>reject(new Error(`Port ${port} is already occupied. Stop that server or choose another port.`)));
    probe.listen(port,'127.0.0.1',()=>probe.close(resolve));
  });
}
if(frontendPort===backendPort) throw new Error('Frontend and backend need different ports');
const env = {...process.env,PORT:String(backendPort),CLIENT_ORIGIN:`http://localhost:${frontendPort}`,VITE_API_PROXY:`http://127.0.0.1:${backendPort}`};
const children=[];
let stopping=false;
function stop(code=0){
  if(stopping)return;
  stopping=true; process.exitCode=code;
  for(const child of children) if(child.exitCode===null) child.kill('SIGTERM');
}
for(const [folder,args] of [
  ['backend',[process.argv.includes('--persistent')?'src/server.js':'scripts/demo.js']],
  ['frontend',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(frontendPort),'--strictPort']],
]) {
  const child=spawn(process.execPath,args,{cwd:path.join(root,folder),env,stdio:'inherit'});
  children.push(child);
  child.on('error',error=>{console.error(`Could not start ${folder}: ${error.message}`);stop(1);});
  child.on('exit',code=>{if(!stopping)stop(code||0);});
}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
console.log(`\nStarting RideSync locally. Wait for both readiness messages.\nFrontend: http://localhost:${frontendPort}\nBackend: http://localhost:${backendPort}/api/health\nCtrl+C stops the project.\n`);
