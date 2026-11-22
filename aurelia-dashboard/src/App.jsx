import Shell from './components/Shell';
import { ToastProvider } from './context/ToastContext';
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return <AuthProvider><ToastProvider><UIProvider><Shell /></UIProvider></ToastProvider></AuthProvider>;
}
