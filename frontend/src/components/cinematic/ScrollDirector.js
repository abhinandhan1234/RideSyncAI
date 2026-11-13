import { useEffect, useState } from 'react';

// Track the visible chapter in the landing page's scroll story.
export function useScrollDirector(container) {
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (!container.current) return;
      const rect = container.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height-window.innerHeight)));
      const next = Math.min(4, Math.round(progress*4));
      setChapter(next);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    window.addEventListener('scroll', schedule, {passive:true});
    window.addEventListener('resize', schedule);
    measure();
    return () => { window.removeEventListener('scroll',schedule); window.removeEventListener('resize',schedule); cancelAnimationFrame(raf); };
  }, [container]);
  return {chapter};
}
