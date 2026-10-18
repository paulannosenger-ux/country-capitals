import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import './index.css'
import './App.css'
import './study/study.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Offline support. When a newer version was built, the page reloads itself once, so you never see an old copy.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
