import { useEffect, useMemo, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

// One normalized scroll signal shared by the stage, camera, wheels and chapter indicator.
export function useScrollDirector(container) {
  const director = useMemo(() => ({ current: 0, listeners: new Set() }), []);
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (!container.current) return;
      const rect = container.current.getBoundingClientRect();
      director.current = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height-window.innerHeight)));
      const next = Math.min(4, Math.round(director.current*4));
      container.current.dataset.chapter = next;
      setChapter(next);
      director.listeners.forEach(fn=>fn());
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    window.addEventListener('scroll', schedule, {passive:true});
    window.addEventListener('resize', schedule);
    measure();
    return () => { window.removeEventListener('scroll',schedule); window.removeEventListener('resize',schedule); cancelAnimationFrame(raf); };
  }, [container,director]);
  return {director,chapter};
}
