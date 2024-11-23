import { useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { useAuth } from '../../contexts/AuthContext'

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  const showSidebar = isAuthenticated && !isAuthPage

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0035] via-[#1a1a4d] to-[#006666] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0035] via-[#1a1a4d] to-[#006666] text-white">
      {!isAuthPage && <Navbar />}
      {/* {showSidebar && <Sidebar />} */}
      <main className={`flex-grow container mx-auto px-4 py-8 ${!isAuthPage ? 'mt-16' : ''} transition-all duration-300`}>
        {children || <Outlet />}
      </main>
      {!isAuthPage && <Footer />}
    </div>
  )
}
