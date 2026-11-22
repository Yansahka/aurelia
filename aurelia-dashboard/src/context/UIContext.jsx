import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const Ctx = createContext(null);
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productForm, setProductForm] = useState(null);   // null | { id? }
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { const on = () => setMobileOpen(false); addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);

  const value = {
    theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    collapsed, toggleCollapsed: () => setCollapsed((c) => !c),
    mobileOpen, openMobile: () => setMobileOpen(true), closeMobile: () => setMobileOpen(false),
    productForm, openProductForm: useCallback((id) => setProductForm({ id }), []), closeProductForm: () => setProductForm(null),
    shareOpen, openShare: () => setShareOpen(true), closeShare: () => setShareOpen(false),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
