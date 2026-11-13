import { useEffect, useState } from 'react';
import { LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { apiRequest } from '../../services/api';

export default function LocationAutocomplete({label,placeholder,value,onChange,disabled=false}) {
  const [query,setQuery]=useState(value?.name||''),[suggestions,setSuggestions]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{if(value?.name)setQuery(value.name);},[value?.name]);
  useEffect(()=>{
    const text=query.trim();
    if(text.length<3||text===value?.name){setSuggestions([]);setLoading(false);setError('');return;}
    const controller=new AbortController();setLoading(true);setError('');
    const timer=setTimeout(async()=>{
      try{const data=await apiRequest(`/locations/search?q=${encodeURIComponent(text)}`,{signal:controller.signal});if(!controller.signal.aborted)setSuggestions(data.suggestions||[]);}
      catch(e){if(!controller.signal.aborted){setSuggestions([]);setError(e.message);}}
      finally{if(!controller.signal.aborted)setLoading(false);}
    },450);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,value?.name]);
  function edit(next){setQuery(next);setSuggestions([]);setError('');if(value)onChange(null);}
  function choose(place){const point={name:place.name,address:place.address,lat:place.latitude,lng:place.longitude};setQuery(place.name);setSuggestions([]);setError('');onChange(point);}
  return <div className="place-field"><label htmlFor={`place-${label}`}>{label}</label><div className="place-input-wrap"><MapPin size={16} aria-hidden="true"/><input id={`place-${label}`} value={query} disabled={disabled} placeholder={placeholder} autoComplete="off" onChange={e=>edit(e.target.value)} onFocus={()=>{if(query.trim().length>=3&&query!==value?.name)setSuggestions(s=>s);}} aria-autocomplete="list" aria-expanded={suggestions.length>0}/>{loading?<LoaderCircle className="place-spinner" size={16} aria-label="Searching"/>:query?<button className="place-clear" type="button" aria-label={`Clear ${label}`} disabled={disabled} onClick={()=>edit('')}><X size={15}/></button>:<Search size={15} aria-hidden="true"/>}</div>
    {loading&&<p className="place-hint" role="status">Searching places…</p>}{error&&<p role="alert" className="place-hint place-error">{error}</p>}
    {suggestions.length>0&&<ul className="place-suggestions" role="listbox">{suggestions.map((place,i)=><li key={`${place.latitude},${place.longitude},${i}`}><button type="button" role="option" onClick={()=>choose(place)}><strong>{place.name}</strong><span>{place.address}</span></button></li>)}</ul>}
    <p className="place-attribution">Place results © OpenStreetMap contributors</p>
  </div>;
}
