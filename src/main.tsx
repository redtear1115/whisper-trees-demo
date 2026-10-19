import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
// 要在 App 之前載入：beforeinstallprompt 很早就會觸發，先接住才能在引導的最後一步用
import './features/onboarding/install'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
