import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories } from '../layout/Sidebar';
import tools from '../../lib/toolRegistry';
import useHistoryStore, { getRecentToolObjects } from '../../stores/useHistoryStore';
import SearchBar from '../common/SearchBar';

const QUICK_ACTIONS = [
  { id: 'image-convert',    label: 'Convert Image',    emoji: '🔀' },
  { id: 'pdf-merge',        label: 'Merge PDF',        emoji: '🔗' },
  { id: 'image-compress',   label: 'Compress Image',   emoji: '🗜️' },
  { id: 'json-yaml-xml',    label: 'Format JSON',      emoji: '🧩' },
  { id: 'image-resize',     label: 'Resize Image',     emoji: '↔️' },
  { id: 'password-generator', label: 'Password',       emoji: '🔐' },
  { id: 'ai-detector',      label: 'Detect AI',        emoji: '🧠' },
  { id: 'text-utilities',   label: 'Text Tools',       emoji: '🔡' },
];

const CATEGORY_ACCENT = {
  image: '#f472b6', document: '#60a5fa', text: '#fbbf24',
  developer: '#34d399', media: '#a78bfa', finance: '#4ade80',
  ai: '#22d3ee', student: '#facc15', design: '#e879f9',
  security: '#f87171', seo: '#a3e635', utility: '#94a3b8',
  spreadsheet: '#4ade80',
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function useAnimatedCounter(target, duration = 1500) {
  const [count, setCount] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    let raf;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

function toolsForCategory(id) {
  return tools.filter((t) => t.category === id);
}

/* ─── Hero ─────────────────────────────────────────────────────────── */

function HeroSection() {
  const animatedCount = useAnimatedCounter(tools.length, 1400);
  const searchRef = useRef(null);
  const [searchSticky, setSearchSticky] = useState(false);

  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSearchSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sticky search — dark Raycast style */}
      <div
        className={`fixed top-14 left-0 right-0 z-30 py-3 px-4 transition-all duration-200 ${searchSticky ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
        style={{
          background: 'rgba(28,28,30,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-xl mx-auto">
          <SearchBar />
        </div>
      </div>

      <section className="relative text-center py-16 lg:py-24 overflow-hidden">
        {/* Orange glow orb */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,99,99,0.12), transparent 70%)' }}
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 mb-4"
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(255,99,99,0.12)', border: '1px solid rgba(255,99,99,0.25)', color: '#FF6363' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            {tools.length} tools · Free · No signup
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="text-surface-50">Supercharge your</span>
            <br />
            <span className="text-gradient">workflow.</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 mb-4"
        >
          <span className="text-7xl sm:text-8xl font-black text-gradient tabular-nums">
            {animatedCount}
          </span>
          <p className="text-surface-500 text-base font-medium mt-1">tools available</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="relative z-10 text-surface-400 text-base max-w-lg mx-auto leading-relaxed mb-8"
        >
          Images, PDFs, text, code, finance, media — everything in one place.
          <br className="hidden sm:block" />
          Privacy first. No account needed.
        </motion.p>

        <motion.div
          ref={searchRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="relative z-10 max-w-lg mx-auto"
        >
          <SearchBar />
        </motion.div>
      </section>
    </>
  );
}

/* ─── Quick Actions ─────────────────────────────────────────────────── */

function QuickActionsStrip() {
  const quickTools = QUICK_ACTIONS
    .map((qa) => ({ ...qa, tool: tools.find((t) => t.id === qa.id) }))
    .filter((qa) => qa.tool);

  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4 }}
      >
        <p className="section-label mb-3 text-center">Quick actions</p>
        <div className="flex gap-2 overflow-x-auto py-1 pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
          {quickTools.map((qa) => (
            <Link
              key={qa.id}
              to={qa.tool.path}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-50 transition-all duration-150 whitespace-nowrap shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,99,99,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,99,99,0.25)';
                e.currentTarget.style.color = '#f5f5f7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = '';
              }}
            >
              <span aria-hidden="true">{qa.emoji}</span>
              {qa.label}
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Category Showcase ─────────────────────────────────────────────── */

function CategoryShowcase() {
  return (
    <section>
      <SectionHeader title="Browse by Category" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4"
      >
        {categories.map((cat) => {
          const catTools = toolsForCategory(cat.id);
          const accent = CATEGORY_ACCENT[cat.id] || '#94a3b8';
          return (
            <motion.div key={cat.id} variants={fadeUp}>
              <Link
                to={cat.path}
                className="card-hover group relative block p-5 h-full"
                style={{ borderLeft: `2px solid ${accent}33` }}
                onMouseEnter={(e) => { e.currentTarget.style.borderLeftColor = `${accent}88`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderLeftColor = `${accent}33`; }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
                    {cat.icon}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}
                  >
                    {catTools.length}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-surface-100 mb-2 group-hover:text-primary-400 transition-colors">
                  {cat.name}
                </h3>
                <ul className="space-y-1" aria-label={`${cat.name} tools preview`}>
                  {catTools.slice(0, 3).map((tool) => (
                    <li key={tool.id} className="text-xs text-surface-500 truncate">
                      <span aria-hidden="true" className="mr-1">{tool.icon}</span>
                      {tool.name}
                    </li>
                  ))}
                  {catTools.length > 3 && (
                    <li className="text-xs text-surface-600 font-medium">+{catTools.length - 3} more</li>
                  )}
                </ul>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

/* ─── All Tools Grid ────────────────────────────────────────────────── */

function AllToolsGrid() {
  const [activeFilter, setActiveFilter] = useState(null);

  const filteredTools = useMemo(
    () => (activeFilter ? tools.filter((t) => t.category === activeFilter) : tools),
    [activeFilter],
  );

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        <h2 className="text-xl font-bold text-surface-100 shrink-0">All {tools.length} Tools</h2>
        <div className="flex-1 h-px hidden sm:block" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          type="button"
          onClick={() => setActiveFilter(null)}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
          style={!activeFilter
            ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)', color: '#fff' }
            : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8e8e93' }
          }
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={activeFilter === cat.id
              ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8e8e93' }
            }
          >
            <span aria-hidden="true">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Tools grid — CSS-only transitions, no Framer Motion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredTools.map((tool) => (
          <div key={tool.id}>
            <Link
              to={tool.path}
              className="card-hover group flex items-start gap-3 p-4 h-full"
            >
              <div className="icon-box w-9 h-9 text-lg shrink-0">
                <span aria-hidden="true">{tool.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-surface-100 truncate group-hover:text-primary-400 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-surface-500 line-clamp-2 mt-0.5 leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Recently Used ─────────────────────────────────────────────────── */

function RecentlyUsed() {
  const recentToolIds = useHistoryStore((s) => s.recentTools);
  const recentTools = useMemo(() => getRecentToolObjects(recentToolIds), [recentToolIds]);
  if (recentTools.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Recently Used" />
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {recentTools.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            className="shrink-0"
          >
            <Link
              to={tool.path}
              className="card-hover group flex items-center gap-3 p-4 w-56"
            >
              <div className="icon-box w-9 h-9 text-lg shrink-0">
                <span aria-hidden="true">{tool.icon}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-surface-100 truncate group-hover:text-primary-400 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-surface-500 truncate mt-0.5">{tool.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── Stats Bar ─────────────────────────────────────────────────────── */

function StatsBar() {
  const stats = [`${tools.length} Tools`, `${categories.length} Categories`, '100% Free', 'Privacy First'];
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
      className="py-6"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-surface-600 font-medium">
        {stats.map((s, i) => (
          <span key={s} className="flex items-center gap-4">
            {i > 0 && <span className="w-1 h-1 rounded-full bg-surface-700" aria-hidden="true" />}
            {s}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

/* ─── Section Header ────────────────────────────────────────────────── */

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h2 className="text-xl font-bold text-surface-100 shrink-0">{title}</h2>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} aria-hidden="true" />
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="space-y-14 lg:space-y-18 pb-12">
      <HeroSection />
      <QuickActionsStrip />
      <CategoryShowcase />
      <RecentlyUsed />
      <AllToolsGrid />
      <StatsBar />
    </div>
  );
}
