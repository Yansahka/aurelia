import { useStore } from '../context/StoreContext';
import Marquee from './ui/Marquee';
import Reveal from './ui/Reveal';

export default function Reviews() {
  const { reviews, store } = useStore();
  if (!reviews.count) return null;
  return (
    <Reveal className="rb">
      <div>
        <div className="big">{reviews.rating.toFixed(1)}<small> /5</small></div>
        <p>Basé sur {new Intl.NumberFormat(store.locale).format(reviews.count)} avis clients</p>
      </div>
      <Marquee duration={60}>
        {reviews.items.map((r) => (
          <div className="rv-c" key={r.author}><i>“</i><p>{r.text}</p><hr /><b>{r.author}</b><small>{r.role}</small></div>
        ))}
      </Marquee>
    </Reveal>
  );
}
