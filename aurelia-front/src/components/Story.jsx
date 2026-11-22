import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useReveal } from '../hooks/useReveal';

// Texte découpé en mots ; "*mot*" = italique. Les mots s'illuminent au fil du scroll.
function tokenize(text) {
  return text.split(/(\*[^*]+\*)/).filter(Boolean).flatMap((t) => {
    const italic = t.startsWith('*') && t.endsWith('*');
    return (italic ? t.slice(1, -1) : t).split(/(\s+)/).map((w) => ({ w, italic }));
  });
}

export default function Story() {
  const { story } = useStore().store;
  const ref = useRef(null);
  useReveal(ref);
  const tokens = useMemo(() => tokenize(story), [story]);

  useEffect(() => {
    const el = ref.current, words = el.querySelectorAll('.w');
    const on = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height * 0.75)));
      words.forEach((w, i) => { w.style.opacity = i / words.length < p ? 1 : 0.25; });
    };
    on(); addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, [tokens]);

  return (
    <section className="story rv" ref={ref}>
      <p>{tokens.map((t, i) => /^\s+$/.test(t.w) ? t.w : (t.italic ? <em key={i} className="w">{t.w}</em> : <span key={i} className="w">{t.w}</span>))}</p>
    </section>
  );
}
