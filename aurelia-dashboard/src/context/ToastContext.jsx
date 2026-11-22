import { createContext, useCallback, useContext, useRef, useState } from 'react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

// toast('Message') ou toast('Message', { label: 'Annuler', onClick })
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, action) => {
    setT({ msg, action }); clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), action ? 5000 : 2400);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && <div className="toast" role="status">{t.msg}{t.action && <button onClick={() => { t.action.onClick(); setT(null); }}>{t.action.label}</button>}</div>}
    </Ctx.Provider>
  );
}
