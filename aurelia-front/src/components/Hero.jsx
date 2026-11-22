import { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { makeLeaves } from '../lib/art';
import RichText from './ui/RichText';

function HeroArt() {
  const leaves = useMemo(() => makeLeaves(), []);
  return (
    <svg className="art" viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="w" x1="0" x2="1"><stop offset="0" stopColor="#cfc8c2" /><stop offset="1" stopColor="#eee9e4" /></linearGradient></defs>
      <rect x="150" width="450" height="700" fill="url(#w)" opacity=".92" />
      <rect x="560" width="14" height="700" fill="#9aa4ad" opacity=".6" />
      <path d="M330 640C335 520 305 470 330 380S300 290 330 250" stroke="#2a1a14" strokeWidth="9" fill="none" strokeLinecap="round" />
      {leaves.map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} transform={`rotate(${l.rot} ${l.x} ${l.y})`} fill={l.fill} opacity=".92" />)}
      <rect x="270" y="610" width="120" height="70" rx="8" fill="#1d1416" />
      <ellipse cx="330" cy="612" rx="62" ry="8" fill="#2c2124" />
    </svg>
  );
}

export default function Hero() {
  const { hero } = useStore().store;
  return (
    <section className="hero">
      <HeroArt /><div className="shade" />
      <div className="tx">
        <h1>{hero.title.split('|').map((l, i) => <span key={i}><i style={{ animationDelay: i * 0.12 + 's' }}><RichText text={l} /></i></span>)}</h1>
        <p>{hero.subtitle}</p>
        <a className="btn" href="#shop">{hero.cta}</a>
      </div>
      <div className="glass">{hero.statLabel}<b>{hero.statValue}</b></div>
    </section>
  );
}
