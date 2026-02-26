import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Navbar({ onToggleMobileMenu }) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(28, 28, 30, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between h-14 px-4 lg:px-6 max-w-screen-xl mx-auto">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-surface-400 hover:text-surface-100 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            aria-label="Toggle navigation menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link to="/" className="flex items-center gap-2.5 group" aria-label="ToolPilot home">
            {/* TP logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shadow-lg"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)', boxShadow: '0 2px 12px rgba(255,99,99,0.4)' }}
            >
              TP
            </motion.div>
            <span className="text-base font-bold tracking-tight text-surface-50">
              Tool<span className="text-gradient">Pilot</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1 ml-4">
            {[['/', 'Home'], ['/blog', 'Blog']].map(([path, label]) => (
              <Link
                key={path}
                to={path}
                className="px-3 py-1.5 rounded-lg text-sm text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-all duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side spacer */}
        <div className="w-9" />
      </div>
    </header>
  );
}
