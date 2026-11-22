import { api } from '../api/client';
import { useStore } from '../context/StoreContext';
import { whatsappUrl } from '../lib/whatsapp';
import { ChatIcon } from './ui/Icons';

export default function WhatsAppButton() {
  const { store } = useStore();
  return (
    <a className="wa" target="_blank" rel="noopener noreferrer" aria-label="Discuter sur WhatsApp"
       href={whatsappUrl(store.whatsapp, `Bonjour ${store.name}, j’ai une question.`)} onClick={() => api.track('whatsapp_click')}>
      <ChatIcon />
    </a>
  );
}
