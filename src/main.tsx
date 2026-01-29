import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Remove pre-hydration splash if present (run before React mounts)
try {
  const splash = document.getElementById('preload-splash');
  if (splash && splash.parentNode) {
    // Remove immediately to avoid duplicate splash visuals
    splash.parentNode.removeChild(splash);
  }
} catch {
  // ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register PWA Service Worker
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.info('App ready to work offline')
  },
})
