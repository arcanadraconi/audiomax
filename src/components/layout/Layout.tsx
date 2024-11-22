import { useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { useAuth } from '../../contexts/AuthContext'

export function Layout() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  const showSidebar = isAuthenticated && location.pathname !== ''

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0035] to-[#40b4c7] dark:from-[#0f0035] dark:to-[#0e7584]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0035] to-[#40b4c7] dark:from-[#0f0035] dark:to-[#0e7584] text-white">
      <Navbar />
      {showSidebar && <Sidebar />}
      <main className="flex-grow container mx-auto px-4 py-8 mt-16 transition-all duration-300">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
