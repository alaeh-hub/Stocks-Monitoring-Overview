import '@fontsource-variable/outfit';
import '@fontsource-variable/geist';
import '../css/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DashboardPage from './DashboardPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashboardPage />
  </StrictMode>,
);
