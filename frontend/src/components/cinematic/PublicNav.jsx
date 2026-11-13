import Arrow from './Arrow';
import { Link } from 'react-router-dom';
export default function PublicNav() {
  return <header className="cinema-nav">
    <Link className="cinema-wordmark" to="/" aria-label="RideSync AI home"><span className="brand-road" aria-hidden="true"><Arrow/></span>RideSync<span className="brand-ai">AI</span></Link>
    <nav aria-label="Main navigation"><a className="nav-explore" href="/#explore">Explore</a><a className="nav-explore" href="/#dispatch">How it works</a><Link to="/login/passenger">Passenger <span aria-hidden="true"><Arrow/></span></Link><Link className="nav-captain" to="/login/captain">Captain <span aria-hidden="true"><Arrow/></span></Link><Link className="nav-admin" to="/login/admin">Admin <span aria-hidden="true"><Arrow/></span></Link></nav>
  </header>;
}
