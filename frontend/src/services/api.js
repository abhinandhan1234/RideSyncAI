const base = import.meta.env?.VITE_API_URL || '/api';
export async function apiRequest(path,{token,method='GET',body,signal}={},fetcher=fetch){
  let response;
  try { response=await fetcher(`${base}${path}`,{method,signal:signal||AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)}); }
  catch(error){if(error.name==='AbortError')throw error;throw new Error('Cannot reach the backend. Check the server connection and retry.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.message||`Request failed (${response.status}).`);error.status=response.status;throw error;}
  return data;
}
