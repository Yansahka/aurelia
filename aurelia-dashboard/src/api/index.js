import { CONFIG } from '../config';
import { httpApi } from './http/api';
import { mockApi } from './mock/api';

// Le reste de l'application n'importe que `api` : changer VITE_USE_MOCK suffit pour basculer.
export const api = CONFIG.MOCK ? mockApi : httpApi;
