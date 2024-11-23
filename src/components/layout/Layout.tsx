import { useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0035] via-[#1a1a4d] to-[#006666] text-white">
      {!isAuthPage && <Navbar />}
      <main className="flex-grow container mx-auto px-4 py-8 mt-16 transition-all duration-300">
        {children || <Outlet />}
      </main>
      {!isAuthPage && <Footer />}
    </div>
  )
}
