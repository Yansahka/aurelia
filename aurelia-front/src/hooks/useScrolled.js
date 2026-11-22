import { useEffect, useState } from 'react';

export function useScrolled(offset = 60) {
  const [s, setS] = useState(false);
  useEffect(() => {
    const on = () => setS(window.scrollY > offset);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [offset]);
  return s;
}
