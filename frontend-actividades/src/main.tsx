import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <Toaster
        theme="light"
        position="top-center"
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid #dce8cc',
            color: '#1a3320',
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
