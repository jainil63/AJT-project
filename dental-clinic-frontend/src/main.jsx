import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ConfirmProvider } from './context/ConfirmContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'


createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ConfirmProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ConfirmProvider>
  </BrowserRouter>
)