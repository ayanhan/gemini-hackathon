import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Landing from './Landing.tsx'

function Root() {
  const [entered, setEntered] = useState(false)

  return entered ? <App /> : <Landing onEnter={() => setEntered(true)} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
