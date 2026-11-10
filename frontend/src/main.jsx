import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ProjectPortal from './ProjectPortal.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProjectPortal />
  </StrictMode>,
)
