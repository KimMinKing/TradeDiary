// [파일 용도] React 앱 루트 마운트

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/terminal-light.css'
import './styles/settings-clean.css'
import './styles/trade-plan-clean.css'
import App from './App.jsx'
import { LocaleProvider } from './i18n/LocaleProvider.jsx'

// Chart.js Add
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider><App /></LocaleProvider>
  </StrictMode>,
)
