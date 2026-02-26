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
    <div className="flex flex-col min-h-screen bg-surface-900 text-surface-50">
      {/* Subtle top gradient glow */}
      <div
        className="fixed top-0 left-0 right-0 h-px z-50 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,99,99,0.6), rgba(255,159,67,0.6), transparent)' }}
        aria-hidden="true"
      />

      <Navbar onToggleMobileMenu={handleToggleMobileMenu} />
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="flex-1" role="main" aria-label="Main content">
        {/* Simple fade-in on route change only — no exit animation to prevent flicker */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="p-4 sm:p-6 lg:p-8 max-w-screen-xl mx-auto"
        >
          {children}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
