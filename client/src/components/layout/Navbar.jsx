import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemePicker from '../common/ThemePicker';

export default function Navbar({ onToggleMobileMenu }) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40"
      style={{
        background: 'color-mix(in srgb, var(--tp-bg) 85%, transparent)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--tp-border)',
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

          <Link to="/" className="flex items-center gap-2.5 group" aria-label="ToolsPilot home">
            {/* TP logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shadow-lg"
              style={{ background: 'var(--tp-gradient)', boxShadow: `0 2px 12px var(--tp-glow)` }}
            >
              TP
            </motion.div>
            <span className="text-base font-bold tracking-tight text-surface-50">
              Tools<span className="text-gradient">Pilot</span>
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

        {/* Right: theme picker + GitHub */}
        <div className="flex items-center gap-2">
          <ThemePicker />
          <a
            href="https://github.com/krishnan03/utility_hub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
            style={{ color: 'var(--tp-muted)', background: 'rgba(255,255,255,0.05)' }}
            aria-label="View source on GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
