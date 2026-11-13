import Arrow from './Arrow';
import { Link } from 'react-router-dom';
import { useState } from 'react';
export default function PublicNav() {
  const [open,setOpen]=useState(false);
  return <header className={`cinema-nav${open?' is-menu-open':''}`}>
    <Link className="cinema-wordmark" to="/" aria-label="IntelliMarg home"><span className="brand-road" aria-hidden="true"><Arrow/></span>IntelliMarg</Link>
    <button type="button" className="nav-menu-button" aria-expanded={open} aria-controls="public-nav-links" aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpen(value=>!value)}><span/><span/><span/></button>
    <nav id="public-nav-links" aria-label="Main navigation" onClick={()=>setOpen(false)}>
      <a className="nav-explore" href="/#explore">Explore</a>
      <a className="nav-explore" href="/#dispatch">How it works</a>
      <Link to="/login/passenger">Passenger <span aria-hidden="true"><Arrow/></span></Link>
      <Link className="nav-admin" to="/login/admin">Admin <span aria-hidden="true"><Arrow/></span></Link>
      <Link to="/sarathi/login">Sarathi Login</Link>
      <Link className="nav-captain" to="/sarathi/register">Register as Sarathi <span aria-hidden="true"><Arrow/></span></Link>
    </nav>
  </header>;
}
