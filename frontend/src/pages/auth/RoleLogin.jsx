import Arrow from '../../components/cinematic/Arrow';
import { Link } from 'react-router-dom';
import PublicNav from '../../components/cinematic/PublicNav';
import TaxiIllustration from '../../components/cinematic/TaxiIllustration';
import '../../components/cinematic/cinematic.css';

export default function RoleLogin({role}) {
  const captain=role==='captain';
  return <div className="cinematic login-page"><PublicNav/><main className="login-layout">
    <div className="login-intro"><p className="cinema-eyebrow">{captain?'CAPTAIN':'PASSENGER'} / RIDESYNC AI</p><h1>{captain?'Your city.':'Your next ride.'}<br/><em>{captain?'Your next chapter.':'A better beginning.'}</em></h1><TaxiIllustration/></div>
    <section className="login-panel" aria-labelledby="login-title"><p className="cinema-eyebrow">WELCOME TO RIDESYNC</p><h2 id="login-title">{captain?'Captain':'Passenger'} login</h2>
      <p className="login-pending" role="status">Authentication integration pending. Account sign-in is not available in this demo.</p>
      <form aria-describedby="auth-note" onSubmit={event=>event.preventDefault()}>
        <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" disabled/>
        <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Your password" disabled/>
        <button type="submit" disabled>Sign in — coming soon <span><Arrow/></span></button>
      </form>
      <p id="auth-note" className="cinema-note">{captain?'A captain dashboard and driver authentication are not yet connected.':'Passenger authentication is not yet connected.'} No credentials are collected or stored.</p>
      {!captain&&<Link className="cinema-text-link" to="/book">Explore booking demo <span><Arrow/></span></Link>}
      <Link className="login-switch" to={captain?'/login/passenger':'/login/captain'}>{captain?'Looking for a ride? Passenger login':'Driving with us? Captain login'} <Arrow/></Link>
      <Link className="login-switch" to="/">Back to the journey</Link>
    </section>
  </main></div>;
}
