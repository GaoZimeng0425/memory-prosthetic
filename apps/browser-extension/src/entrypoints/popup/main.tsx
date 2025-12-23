import React from 'react'
import ReactDOM from 'react-dom/client'

import { QueryProvider } from '@memory-prosthetic/shared/request'
import { ThemeProvider } from '@memory-prosthetic/ui/hooks/use-theme'
import App from './App.tsx'
import 'wxt/utils/storage' // ThemeProvider storage 需要
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider defaultTheme="dark" storageKey="mp-theme">
        <App />
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>
)
