import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import './index.css'
import './App.css'
import './study/study.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { startCloud } from './cloud/cloud'

// Offline support. When a newer version was built, the page reloads itself once, so you never see an old copy.
registerSW({ immediate: true })
// Accounts + friends leaderboard (only when a Firebase project is set in src/cloud/config.ts)
startCloud()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
