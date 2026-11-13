import { Driver } from '../../models/index.js';
import { ai } from './client.js';
export const bad = message=>Object.assign(new Error(message),{status:400});
export function hour(value) {
  if(value!==undefined && (typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(value))) throw bad('Expected ISO timestamp with offset');
  const ms=value===undefined?Date.now():Date.parse(value);
  if(!Number.isFinite(ms)) throw bad('Invalid timestamp');
  return new Date(Math.floor((ms+19800000)/3600000)*3600000-19800000).toISOString();
}
export async function intelligence(at,filter={}) {
  const counts=await Driver.aggregate([{$match:{zoneCode:/^Z0[1-8]$/,status:'AVAILABLE',activeRideId:null,...filter}},
    {$group:{_id:'$zoneCode',count:{$sum:1}}}]);
  return ai('zones',{hour:at,supply:Object.fromEntries(counts.map(r=>[r._id,r.count]))});
}
export const vehicleName=v=>String(v).toLowerCase()==='car'?'cab':String(v).toLowerCase();
