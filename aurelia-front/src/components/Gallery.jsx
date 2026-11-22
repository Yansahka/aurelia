import { useStore } from '../context/StoreContext';
import { tile } from '../lib/art';
import Marquee from './ui/Marquee';
import Reveal from './ui/Reveal';

export default function Gallery() {
  const { gallery } = useStore();
  if (!gallery.length) return null;
  return (
    <Reveal>
      <Marquee duration={50}>
        {gallery.map((g) => (
          <div className="gt" key={g.label} style={{ background: `url('${g.image || tile(g.colors)}') center/cover` }}><span>{g.label}</span></div>
        ))}
      </Marquee>
    </Reveal>
  );
}
