import { useEffect } from 'react';

// Ajoute la classe "in" quand l'élément entre dans l'écran (animation d'apparition).
export function useReveal(ref) {
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}
