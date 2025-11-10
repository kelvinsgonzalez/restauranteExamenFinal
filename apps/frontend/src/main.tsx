import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import './styles/index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './providers/auth-provider';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);
