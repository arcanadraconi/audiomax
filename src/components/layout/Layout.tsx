import { Footer } from './Footer';

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0035] via-[#1a1a4d] to-[#006666] text-white">
      <main className="flex-grow container mx-auto px-4 py-8 transition-all duration-300">
        {children}
      </main>
      <Footer />
    </div>
  );
}
