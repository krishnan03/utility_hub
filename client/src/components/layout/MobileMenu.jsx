import { useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { categories } from './Sidebar';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const panelVariants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 350, damping: 35 } },
  exit: { x: '-100%', transition: { duration: 0.2, ease: 'easeIn' } },
};

export default function MobileMenu({ isOpen, onClose }) {
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      if (isOpen) onClose();
    }
  }, [location.pathname, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    closeButtonRef.current?.focus();
    const panel = panelRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e) => { if (e.target === e.currentTarget) onClose(); },
    [onClose],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 flex flex-col w-72 max-w-[80vw] h-full bg-surface-900 shadow-2xl"
            style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 h-14"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-base font-bold text-surface-50">
                Tools<span
                  style={{
                    background: 'var(--tp-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >Pilot</span>
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-9 h-9 min-w-[44px] min-h-[44px] rounded-xl text-surface-400 hover:text-surface-100 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
                aria-label="Close navigation menu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category list */}
            <nav
              className="flex-1 overflow-y-auto p-3"
              role="navigation"
              aria-label="Mobile category navigation"
            >
              <p className="section-label mb-3 px-3">Categories</p>
              <ul className="flex flex-col gap-1">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <NavLink
                      to={cat.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-primary-400 bg-primary-500/10'
                            : 'text-surface-400 hover:text-surface-100 hover:bg-white/5'
                        }`
                      }
                    >
                      <span className="text-base" aria-hidden="true">{cat.icon}</span>
                      <span>{cat.name}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
