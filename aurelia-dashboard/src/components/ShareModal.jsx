import { api } from '../api';
import { useUI } from '../context/UIContext';
import { useQuery } from '../hooks/useQuery';
import Modal from './ui/Modal';
import SharePanel from './SharePanel';

export default function ShareModal() {
  const { shareOpen, closeShare } = useUI();
  const { data: store } = useQuery('store', api.store.get);
  if (!shareOpen || !store) return null;
  return <Modal title="Partager ma boutique" onClose={closeShare}><SharePanel store={store} /></Modal>;
}
