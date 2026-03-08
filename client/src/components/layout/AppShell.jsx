import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import MobileMenu from './MobileMenu';
import Footer from './Footer';
import useThemeStore from '../../stores/useThemeStore.js';

export default function AppShell({ children }) {
  const location = useLocation();
  const isDark = useThemeStore((s) => s.isDark);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Always force dark mode for Raycast theme
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, [isDark]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const handleToggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--tp-bg)', color: 'var(--tp-text)' }}>
      {/* Fixed gradient mesh for glassmorphism — gives cards something to blur */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,45,120,0.08), transparent 70%)' }} />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,230,0,0.05), transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[700px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,91,255,0.06), transparent 70%)' }} />
      </div>
      {/* Subtle top gradient glow */}
      <div
        className="fixed top-0 left-0 right-0 h-px z-50 pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, var(--tp-accent), var(--tp-accent2), transparent)` }}
        aria-hidden="true"
      />

      <Navbar onToggleMobileMenu={handleToggleMobileMenu} />
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="flex-1 relative z-10" role="main" aria-label="Main content">
        {/* Simple fade-in on route change only — no exit animation to prevent flicker */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="p-5 sm:p-8 lg:p-10 max-w-screen-xl mx-auto"
        >
          {children}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
