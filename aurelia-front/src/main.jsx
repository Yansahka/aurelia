import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/navbar.css';
import './styles/hero.css';
import './styles/carousel.css';
import './styles/story.css';
import './styles/rituals.css';
import './styles/bestsellers.css';
import './styles/gallery.css';
import './styles/footer.css';
import './styles/overlays.css';
import './styles/responsive.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
