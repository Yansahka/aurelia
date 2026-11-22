import { useStore } from '../context/StoreContext';
import Reveal from './ui/Reveal';
import RichText from './ui/RichText';

const PILLS = [['#c9a27a', '#5a7a4a'], ['#d98a98', '#8a4a16']];

// "{0}" / "{1}" dans le texte = pastille colorée en ligne.
export default function Commitment() {
  const { commitment } = useStore().store;
  return (
    <section className="sec" id="about">
      <Reveal as="p" className="cm">
        {commitment.split(/\{(\d)\}/).map((t, i) => i % 2
          ? <i key={i} className="pl" style={{ background: `linear-gradient(135deg,${PILLS[+t % 2][0]},${PILLS[+t % 2][1]})` }} />
          : <RichText key={i} text={t} />)}
      </Reveal>
    </section>
  );
}
