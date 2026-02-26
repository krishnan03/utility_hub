import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { categories } from '../layout/Sidebar';
import tools from '../../lib/toolRegistry';
import useHistoryStore, { getRecentToolObjects } from '../../stores/useHistoryStore';
import CommandBar from '../common/CommandBar';

const QUICK_ACTIONS = [
  { id: 'excel-editor',       label: 'Excel Editor',   emoji: '📊' },
  { id: 'word-editor',        label: 'Word Editor',    emoji: '📝' },
  { id: 'pdf-editor',         label: 'PDF Editor',     emoji: '📄' },
  { id: 'pdf-merge',          label: 'Merge PDF',      emoji: '🔗' },
  { id: 'image-compress',     label: 'Compress Image', emoji: '🗜️' },
  { id: 'json-yaml-xml',      label: 'Format JSON',    emoji: '🧩' },
  { id: 'password-generator', label: 'Password',       emoji: '🔐' },
  { id: 'ai-detector',        label: 'Detect AI',      emoji: '🧠' },
];

const FLAGSHIP_EDITORS = [
  {
    icon: '📊',
    title: 'Online Excel Editor',
    description: 'Full spreadsheet editing with formulas, formatting, and XLSX import/export',
    features: ['Formulas', 'Multi-sheet', 'XLSX Import/Export', 'Auto-save'],
    link: '/tools/spreadsheet/excel-editor',
    accentColor: '#10B981',
  },
  {
    icon: '📝',
    title: 'Online Word Editor',
    description: 'Rich document editing with tables, images, and DOCX import/export',
    features: ['Rich Text', 'Tables', 'Images', 'DOCX Import/Export'],
    link: '/tools/document/word-editor',
    accentColor: '#3B82F6',
  },
  {
    icon: '📄',
    title: 'Online PDF Editor',
    description: 'Edit PDFs directly — add text, images, annotations, and more',
    features: ['Add Text', 'Images', 'Annotations', 'E-Signature'],
    link: '/tools/document/pdf-editor',
    accentColor: '#FF6363',
  },
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

/* ─── Flagship Card ─────────────────────────────────────────────────── */

function FlagshipCard({ icon, title, description, features, link, accentColor }) {
  return (
    <Link to={link} className="block">
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="relative group rounded-3xl p-6 sm:p-8 overflow-hidden transition-all duration-300 h-full"
        style={{
          background: 'rgba(44,44,46,0.6)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${accentColor}22`,
        }}
      >
        {/* Gradient glow on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${accentColor}15, transparent 70%)` }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl block">{icon}</span>
          </div>
          <h3 className="text-xl font-bold text-surface-50 mb-2">{title}</h3>
          <p className="text-sm text-surface-400 mb-4 leading-relaxed">{description}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {features.map((f) => (
              <span
                key={f}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: `${accentColor}15`, color: accentColor }}
              >
                {f}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: accentColor }}>
            Open Editor
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </motion.div>
    </Link>
  );
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
          <CommandBar />
        </div>
      </div>

      <section className="relative text-center pt-6 pb-16 lg:pt-8 lg:pb-24 overflow-hidden">
        {/* Animated gradient mesh background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 20% 50%, rgba(255,99,99,0.08), transparent 50%), ' +
              'radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.08), transparent 50%), ' +
              'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06), transparent 50%)',
          }}
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 mb-6"
        >
          {/* Animated tool count badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(255,99,99,0.12)', border: '1px solid rgba(255,99,99,0.25)', color: '#FF6363' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span className="tabular-nums">{animatedCount}</span>+ free tools
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            <span className="text-surface-50">Free Online Tools</span>
            <br />
            <span className="text-gradient">Built for Everyone</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="relative z-10 text-surface-400 text-base max-w-xl mx-auto leading-relaxed mb-8"
        >
          PDF, Excel & Word editors. Image converters. Dev tools. Finance calculators.
          <br className="hidden sm:block" />
          {tools.length}+ tools, zero signup, 100% free.
        </motion.p>

        <motion.div
          ref={searchRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="relative z-10 max-w-lg mx-auto mb-8"
        >
          <CommandBar />
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="relative z-10 flex items-center justify-center gap-4 sm:gap-6 text-xs text-surface-500 font-medium"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-sm" aria-hidden="true">🔓</span>
            No Signup Required
          </span>
          <span className="w-1 h-1 rounded-full bg-surface-700" aria-hidden="true" />
          <span className="flex items-center gap-1.5">
            <span className="text-sm" aria-hidden="true">✨</span>
            100% Free
          </span>
          <span className="w-1 h-1 rounded-full bg-surface-700" aria-hidden="true" />
          <span className="flex items-center gap-1.5">
            <span className="text-sm" aria-hidden="true">🛡️</span>
            Privacy First
          </span>
        </motion.div>
      </section>
    </>
  );
}

/* ─── Flagship Editors ──────────────────────────────────────────────── */

function FlagshipEditorsSection() {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-50 mb-2">
          Powerful Online Editors
        </h2>
        <p className="text-sm text-surface-400 max-w-md mx-auto">
          Open your files and start editing instantly — right in your browser.
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6"
      >
        {FLAGSHIP_EDITORS.map((editor) => (
          <motion.div key={editor.title} variants={fadeUp}>
            <FlagshipCard {...editor} />
          </motion.div>
        ))}
      </motion.div>
    </section>
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
  const [expandedCat, setExpandedCat] = useState(null);

  return (
    <section>
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-50 mb-2">
          {tools.length}+ Tools, 13 Categories
        </h2>
        <p className="text-sm text-surface-400">Click a category to explore.</p>
      </div>

      {/* Category grid with inline expansion */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((cat, i) => {
          const catTools = toolsForCategory(cat.id);
          const accent = CATEGORY_ACCENT[cat.id] || '#94a3b8';
          const isActive = expandedCat === cat.id;

          return (
            <React.Fragment key={cat.id}>
              {/* Category card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="relative rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  background: isActive ? 'rgba(44,44,46,0.95)' : 'rgba(44,44,46,0.5)',
                  border: `1px solid ${isActive ? accent + '60' : 'rgba(255,255,255,0.06)'}`,
                  backdropFilter: 'blur(12px)',
                  boxShadow: isActive ? `0 0 20px ${accent}20` : 'none',
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                }}
                onClick={() => setExpandedCat(isActive ? null : cat.id)}
              >
                <div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}15, transparent 70%)` }}
                />
                <div className="relative z-10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${accent}20`, color: accent }}>
                      {catTools.length}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-surface-100 mb-0.5">{cat.name}</h3>
                  <div className="flex items-center mt-2 -space-x-1">
                    {catTools.slice(0, 3).map((tool, j) => (
                      <div key={tool.id} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2" style={{ background: 'rgba(28,28,30,0.9)', borderColor: 'rgba(255,255,255,0.1)', zIndex: 3 - j }}>
                        {tool.icon}
                      </div>
                    ))}
                    {catTools.length > 3 && <span className="text-[10px] text-surface-500 ml-2">+{catTools.length - 3}</span>}
                  </div>
                </div>
              </motion.div>

              {/* Expanded panel — spans full grid width, appears right after this card */}
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.95 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.95 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="col-span-2 sm:col-span-3 lg:col-span-4 rounded-2xl overflow-hidden origin-top"
                  style={{
                    background: 'rgba(44,44,46,0.9)',
                    border: `1px solid ${accent}30`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <h3 className="text-base font-bold text-surface-100">{cat.name}</h3>
                        <span className="text-xs text-surface-500">{catTools.length} tools</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setExpandedCat(null); }} className="text-xs text-surface-400 hover:text-surface-200 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                        ✕ Close
                      </button>
                    </div>
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {catTools.map((tool) => (
                        <motion.div key={tool.id} variants={fadeUp}>
                          <Link to={tool.path} className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-sm shrink-0">{tool.icon}</span>
                            <span className="text-xs font-medium text-surface-300 group-hover:text-surface-100 truncate">{tool.name}</span>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                    <div className="mt-4 text-center">
                      <Link to={cat.path} className="text-xs font-semibold transition-colors hover:brightness-125" style={{ color: accent }}>
                        View all {cat.name} tools →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </React.Fragment>
          );
        })}
      </div>
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

      {/* Tools grid */}
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
  const stats = [`${tools.length}+ Tools`, `${categories.length} Categories`, '100% Free', 'Privacy First'];
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
    <div className="space-y-12 lg:space-y-16 pb-12">
      {/* Negative margin pulls hero up to eliminate gap from AppShell padding */}
      <div className="-mt-4 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <HeroSection />
      </div>
      <FlagshipEditorsSection />
      <QuickActionsStrip />
      <RecentlyUsed />
      <CategoryShowcase />
      <StatsBar />
    </div>
  );
}
