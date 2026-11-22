import { createContext, useCallback, useContext, useRef, useState } from 'react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef();
  const show = useCallback((m) => {
    setMsg(m); setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), 2200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className={'toast' + (on ? ' on' : '')} role="status">{msg}</div>
    </Ctx.Provider>
  );
}
