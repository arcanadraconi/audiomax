import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/layout/Layout'
import { IndexLogin } from './pages/indexLogin'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<IndexLogin />} />
              {/* Add other routes here */}
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
