import { Fragment } from 'react';

// "Parfums *botaniques*" -> mot en italique (accent typographique). React échappe tout le reste.
export default function RichText({ text = '' }) {
  return text.split(/(\*[^*]+\*)/).filter(Boolean).map((t, i) =>
    t.startsWith('*') && t.endsWith('*') ? <em key={i}>{t.slice(1, -1)}</em> : <Fragment key={i}>{t}</Fragment>);
}
