export function Footer() {
  return (
    <footer className="bg-[#0f0035]/50 backdrop-blur-sm border-t border-white/10 py-6">
      <div className="container mx-auto px-4 text-center">
        <p className="text-white/60">
          © {new Date().getFullYear()} AUDIOMAX. All rights reserved.
        </p>
      </div>
    </footer>
  )
}