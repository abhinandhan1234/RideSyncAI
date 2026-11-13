import Arrow from '../components/cinematic/Arrow';
import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '../components/cinematic/PublicNav';
import TaxiIllustration from '../components/cinematic/TaxiIllustration';
import { useReducedMotion, useScrollDirector } from '../components/cinematic/ScrollDirector';
import '../components/cinematic/cinematic.css';
const Scene = lazy(()=>import('../components/cinematic/CinematicScene'));
class SceneBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){ return {failed:true}; }
  render(){ return this.state.failed ? <TaxiIllustration/> : this.props.children; }
}
const chapters=['The arrival','Every kilometre matters','The smarter route','The city moves with you','Your journey starts here'];
function webglAvailable(){try{const canvas=document.createElement('canvas');const gl=canvas.getContext('webgl2');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
export default function CinematicLanding(){
  const root=useRef(); const {director,chapter}=useScrollDirector(root); const reduced=useReducedMotion();
  const [webgl,setWebgl]=useState(false),[visible,setVisible]=useState(true),[failed,setFailed]=useState(false);
  const [route,setRoute]=useState('Eco');
  useEffect(()=>{setWebgl(webglAvailable());const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  return <div className="cinematic" ref={root} data-chapter="0">
    <a className="cinema-skip" href="#arrival">Skip to journey options</a>
    <PublicNav/>
    <div className="cinema-stage" aria-hidden="true">
      <span className="stage-orbit"/>
      <SceneBoundary>{webgl&&!reduced&&!failed&&visible ? <Suspense fallback={<TaxiIllustration/>}><Scene director={director} onFailure={()=>setFailed(true)}/></Suspense> : <TaxiIllustration/>}</SceneBoundary>
      <span className="stage-caption">INTELLIMARG / CITY EDITION <i>01</i></span>
    </div>
    <main>
      <section className="cinema-chapter cinema-hero" id="explore" aria-labelledby="hero-title">
        <div className="hero-location"><span className="status-dot"/> BELAGAVI, KARNATAKA <span>15.8497° N / 74.4977° E</span></div>
        <div className="chapter-copy">
          <p className="cinema-eyebrow">A better way to move.</p>
          <h1 id="hero-title">Your City.<br/>Your Ride.<br/><em>Reimagined.</em></h1>
          <p className="cinema-description">Smarter journeys across Belagavi.<br/>Built around efficiency, fairness<br className="desktop-break"/> and better mobility.</p>
          <a className="cinema-text-link" href="#arrival">Find your way <span aria-hidden="true"><Arrow/></span></a>
        </div>
        <div className="hero-bottom"><a href="#dispatch"><span className="scroll-line"/> Scroll to explore</a><p>INTELLIGENCE IN MOTION.<br/><span>DESIGNED AROUND YOU.</span></p><span className="hero-number">01—05</span></div>
      </section>
      <section className="cinema-chapter" id="dispatch" aria-labelledby="dispatch-title"><div className="chapter-copy">
        <p className="cinema-eyebrow">01 / EcoDispatch</p><h2 id="dispatch-title">Less wasted<br/>distance.<br/><em>Better journeys.</em></h2>
        <p className="cinema-description">Intelligent driver allocation considers pickup time, distance and estimated fuel consumption.</p>
        <div className="editorial-rule"><span>Closer pickups</span><span>Thoughtful allocation</span><span>More purposeful miles</span></div>
        <p className="cinema-note">Fuel-aware allocation is a product concept. The current demo ranks distance, availability, acceptance and idle time.</p>
      </div></section>
      <section className="cinema-chapter" id="routes" aria-labelledby="route-title"><div className="chapter-copy">
        <p className="cinema-eyebrow">02 / The smarter route</p><h2 id="route-title">The right route.<br/><em>For your rhythm.</em></h2>
        <p className="cinema-description">Every journey has a different priority.<br/>Choose what matters to you.</p>
        <div className="route-selector" aria-label="Illustrative route priorities">{['Fastest','Shortest','Eco'].map(name=><button key={name} onClick={()=>setRoute(name)} aria-pressed={route===name}>{name}<span>{name===route?<Arrow/>:'—'}</span></button>)}</div>
        <p className="route-explanation" aria-live="polite">{{Fastest:'Prioritise estimated arrival time.',Shortest:'Prioritise a shorter travel distance.',Eco:'Explore an estimated fuel-aware journey.'}[route]}</p>
        <svg className="route-sketch" viewBox="0 0 340 80" aria-hidden="true"><path d="M8 65H80L140 15H240L330 60"/><path className="eco-line" d={route==='Eco'?'M8 65Q120 70 160 40T330 60':route==='Fastest'?'M8 65 330 60':'M8 65 160 40 330 60'}/><circle cx="8" cy="65" r="4"/><circle cx="330" cy="60" r="4"/></svg>
        <p className="cinema-note">Illustrative route choices. No live routing or measured fuel savings.</p>
      </div></section>
      <section className="cinema-chapter" id="city" aria-labelledby="city-title"><div className="chapter-copy">
        <p className="cinema-eyebrow">03 / Connected Belagavi</p><h2 id="city-title">A city that moves<br/><em>intelligently.</em></h2>
        <p className="cinema-description">From the first morning pickup to the last ride home. A more considered connection between people, Sarathis and places.</p>
        <div className="city-zones"><span><i/>Nehru Nagar</span><span><i/>Central Bus Terminus</span><span><i/>Tilakwadi</span></div>
        <ul className="city-principles"><li>Anticipate demand <span>01</span></li><li>Reposition with purpose <span>02</span></li><li>Match more fairly <span>03</span></li></ul>
        <p className="cinema-note">Demand forecasts use simulated Belagavi data.</p>
      </div></section>
      <section className="cinema-chapter cinema-arrival" id="arrival" aria-labelledby="arrival-title"><div className="chapter-copy">
        <p className="cinema-eyebrow">04 / Your journey starts here</p><h2 id="arrival-title">Where are we<br/><em>taking you?</em></h2><p className="cinema-description">One city. Two ways to move.</p>
        <div className="role-options">
          <Link to="/login/passenger" className="role-option"><span className="role-label">YATRI / 01</span><h3>Ride with IntelliMarg</h3><p>Book smarter journeys with transparent routes, intelligent matching and estimated fuel-aware choices.</p><span className="role-cta">Continue as Yatri <span aria-hidden="true"><Arrow/></span></span></Link>
          <Link to="/login/captain" className="role-option"><span className="role-label">SARATHI / 02</span><h3>Drive with IntelliMarg</h3><p>Find suitable rides, spend less time idle and make better decisions with demand intelligence.</p><span className="role-cta">Continue as Sarathi <span aria-hidden="true"><Arrow/></span></span></Link>
        </div>
      </div><footer className="cinema-footer"><span>IntelliMarg — Belagavi</span><Link to="/book">Book Your Ride <Arrow/></Link><span>Smarter Routes. Better Rides.</span></footer></section>
    </main>
    <aside className="chapter-indicator" aria-label="Story chapters"><span>0{chapter+1}</span><div>{chapters.map((name,i)=><a href={`#${['explore','dispatch','routes','city','arrival'][i]}`} key={name} className={i===chapter?'active':''} aria-label={name} aria-current={i===chapter?'step':undefined}/>)}</div><span>05</span></aside>
  </div>;
}
