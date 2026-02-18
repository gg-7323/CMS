import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { setTheme } from './lib/theme'

const rootEl = document.getElementById('root')!
// Always start in light mode; dark can be enabled via the "Mode" toggle.
setTheme('light')
createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// Register Service Worker for PWA + update notifications (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      function notifyUpdate(sw: ServiceWorker) {
        window.dispatchEvent(new CustomEvent('sw:update-available', { detail: { reg, sw } }))
      }
      if (reg.waiting) {
        notifyUpdate(reg.waiting)
      }
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW installed and waiting
            notifyUpdate(sw)
          }
        })
      })
    }).catch(()=>{})
  })
}
