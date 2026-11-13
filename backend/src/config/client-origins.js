const configured=(process.env.CLIENT_ORIGINS||process.env.CLIENT_ORIGIN||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value=>value.trim()).filter(Boolean);

function privateLanHost(host){
  if(host==='localhost'||host==='127.0.0.1'||host==='::1'||host.endsWith('.local'))return true;
  const parts=host.split('.').map(Number);if(parts.length!==4||parts.some(value=>!Number.isInteger(value)||value<0||value>255))return false;
  return parts[0]===10||parts[0]===192&&parts[1]===168||parts[0]===172&&parts[1]>=16&&parts[1]<=31;
}

export function isAllowedClientOrigin(origin){
  if(!origin)return true;
  if(configured.includes(origin))return true;
  if(process.env.NODE_ENV==='production')return false;
  try{const url=new URL(origin);return ['http:','https:'].includes(url.protocol)&&privateLanHost(url.hostname);}catch{return false;}
}

export function corsOrigin(origin,callback){callback(null,isAllowedClientOrigin(origin));}
