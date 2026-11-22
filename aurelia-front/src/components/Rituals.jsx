import { useStore } from '../context/StoreContext';
import { tile } from '../lib/art';
import Reveal from './ui/Reveal';

export default function Rituals({ onFamily }) {
  const { collections } = useStore();
  if (!collections.length) return null;
  return (
    <section className="sec" id="rituals">
      <Reveal className="sh"><h2>Explorez nos<br /><em>catégories</em></h2></Reveal>
      <div className="rt">
        {collections.map((c, i) => (
          <Reveal as="a" key={c.slug} className="rc" href="#shop" style={{ transitionDelay: i * 90 + 'ms' }} onClick={() => onFamily(c.slug)}>
            <div className="bg" style={{ background: c.image ? `url('${c.image}') center/cover` : `url('${tile(c.gradient)}') center/cover` }} />
            <span>Explorer</span><em>{c.name}</em><span className="btn">Voir →</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
