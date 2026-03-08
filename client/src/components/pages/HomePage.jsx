import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate, useSpring } from 'framer-motion';
import { categories } from '../layout/Sidebar';
import tools from '../../lib/toolRegistry';
import useHistoryStore, { getRecentToolObjects } from '../../stores/useHistoryStore';
import CommandBar from '../common/CommandBar';
import SEOHead from '../common/SEOHead';

/* ─── Spotlight Card Wrapper ────────────────────────────────────────── */

function SpotlightCard({ children, className = '', style = {}, as: Tag = 'div', ...props }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  return (
    <Tag
      className={`group relative overflow-hidden ${className}`}
      style={style}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(500px circle at ${mouseX}px ${mouseY}px, var(--tp-selection), transparent 80%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </Tag>
  );
}

/* ─── Character-by-Character Text Reveal ────────────────────────────── */

function TextReveal({ text, className = '', delay = 0 }) {
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: delay + i * 0.025, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : undefined }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Typewriter Hook ───────────────────────────────────────────────── */

function useTypewriter(phrases, typingSpeed = 80, deletingSpeed = 40, pauseTime = 2000) {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let timeout;

    if (!isDeleting && text === currentPhrase) {
      timeout = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && text === '') {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    } else {
      timeout = setTimeout(() => {
        setText(currentPhrase.substring(0, text.length + (isDeleting ? -1 : 1)));
      }, isDeleting ? deletingSpeed : typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [text, phraseIndex, isDeleting, phrases, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

/* ─── Infinite Marquee ──────────────────────────────────────────────── */

function ToolMarquee() {
  const marqueeTools = useMemo(() => {
    const shuffled = [...tools].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 24);
  }, []);

  // Double the array for seamless loop
  const doubled = [...marqueeTools, ...marqueeTools];

  return (
    <div className="relative overflow-hidden py-6" aria-hidden="true">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10" style={{ background: 'linear-gradient(90deg, var(--tp-bg), transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10" style={{ background: 'linear-gradient(270deg, var(--tp-bg), transparent)' }} />
      <div
        className="flex gap-3 whitespace-nowrap"
        style={{ animation: 'marquee-scroll 40s linear infinite', width: 'max-content' }}
      >
        {doubled.map((tool, i) => (
          <div
            key={`${tool.id}-${i}`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-surface-400 shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="text-sm">{tool.icon}</span>
            {tool.name}
          </div>
        ))}
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { id: 'pdf-signature-verify', label: 'Verify Signature', emoji: '🔏' },
  { id: 'excel-editor',       label: 'Excel Editor',   emoji: '📊' },
  { id: 'word-editor',        label: 'Word Editor',    emoji: '📝' },
  { id: 'pdf-editor',         label: 'PDF Editor',     emoji: '📄' },
  { id: 'pdf-merge',          label: 'Merge PDF',      emoji: '🔗' },
  { id: 'image-compress',     label: 'Compress Image', emoji: '🗜️' },
  { id: 'json-yaml-xml',      label: 'Format JSON',    emoji: '🧩' },
  { id: 'password-generator', label: 'Password',       emoji: '🔐' },
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

/* ─── Flagship Card (Bento) ──────────────────────────────────────────── */

function FlagshipCard({ icon, title, description, features, link, accentColor, featured }) {
  return (
    <Link to={link} className="block h-full">
      <SpotlightCard
        className={`rounded-3xl transition-all duration-300 h-full ${featured ? 'p-8 sm:p-10' : 'p-6'}`}
        style={{
          background: 'var(--tp-card)',
          border: `1px solid ${accentColor}30`,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Corner accent */}
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-20 group-hover:opacity-40 transition-opacity duration-500"
          style={{ background: `radial-gradient(circle at 100% 0%, ${accentColor}40, transparent 70%)` }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`${featured ? 'w-14 h-14 text-3xl' : 'w-10 h-10 text-xl'} rounded-2xl flex items-center justify-center shrink-0`}
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
            >
              {icon}
            </div>
            {featured && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: `${accentColor}15`, color: accentColor }}>
                Popular
              </span>
            )}
          </div>
          <h3 className={`${featured ? 'text-2xl' : 'text-lg'} font-bold text-surface-50 mb-2`}>{title}</h3>
          <p className={`${featured ? 'text-base' : 'text-sm'} text-surface-400 leading-relaxed mb-4`}>{description}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {features.map((f) => (
              <span
                key={f}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}20` }}
              >
                {f}
              </span>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2 text-sm font-semibold" style={{ color: accentColor }}>
            Open Editor
            <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </SpotlightCard>
    </Link>
  );
}

/* ─── Live Activity Ticker ───────────────────────────────────────────── */

const ACTIVITY_MESSAGES = [
  { emoji: '📄', text: 'Someone just merged 3 PDFs', time: '2s ago' },
  { emoji: '🖼️', text: 'An image was compressed by 74%', time: '5s ago' },
  { emoji: '🔐', text: 'A 32-char password was generated', time: '8s ago' },
  { emoji: '📊', text: 'Excel file converted to CSV', time: '12s ago' },
  { emoji: '🧩', text: 'JSON formatted and validated', time: '15s ago' },
  { emoji: '✂️', text: 'PDF split into 5 pages', time: '18s ago' },
  { emoji: '🔤', text: 'Regex pattern tested successfully', time: '22s ago' },
  { emoji: '📝', text: 'Word document exported to PDF', time: '25s ago' },
];

function LiveActivityTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ACTIVITY_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const msg = ACTIVITY_MESSAGES[index];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="flex justify-center"
    >
      <div
        className="inline-flex items-center gap-3 px-4 py-2 rounded-full text-xs overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse shrink-0" />
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-surface-400 whitespace-nowrap"
          >
            <span className="mr-1.5">{msg.emoji}</span>
            {msg.text}
            <span className="text-surface-600 ml-2">{msg.time}</span>
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Typewriter Subtitle ────────────────────────────────────────────── */

const TYPEWRITER_PHRASES = [
  'Edit PDFs, Excel & Word files',
  'Convert and compress images',
  'Format JSON, YAML & XML',
  'Generate secure passwords',
  'Build cron expressions visually',
  'Calculate finance & investments',
  'Analyze SEO & meta tags',
];

function TypewriterSubtitle() {
  const text = useTypewriter(TYPEWRITER_PHRASES, 60, 30, 2200);
  return (
    <span className="text-surface-300 font-medium">
      {text}
      <span className="inline-block w-0.5 h-5 ml-0.5 align-middle animate-pulse" style={{ background: 'var(--tp-accent)' }} />
    </span>
  );
}

/* ─── Floating Particles ────────────────────────────────────────────── */

function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 6,
      opacity: Math.random() * 0.4 + 0.1,
    })),
  []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.id % 3 === 0 ? 'var(--tp-accent)' : p.id % 3 === 1 ? 'var(--tp-accent2)' : 'rgba(255,255,255,0.6)',
            animation: `float-particle ${p.duration}s linear ${p.delay}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
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
      {/* Sticky search */}
      <div
        className={`fixed top-14 left-0 right-0 z-30 py-3 px-4 transition-all duration-200 ${searchSticky ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
        style={{
          background: 'rgba(26,26,46,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-xl mx-auto">
          <CommandBar />
        </div>
      </div>

      <section className="relative text-center pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Primary pink orb — top left */}
          <div
            className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-orb-1"
            style={{ background: 'radial-gradient(circle, rgba(255,45,120,0.15), transparent 70%)' }}
          />
          {/* Yellow orb — top right */}
          <div
            className="absolute -top-20 -right-40 w-[400px] h-[400px] rounded-full animate-orb-2"
            style={{ background: 'radial-gradient(circle, rgba(255,230,0,0.08), transparent 70%)' }}
          />
          {/* Blue orb — bottom center */}
          <div
            className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full animate-orb-3"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1), transparent 70%)' }}
          />
        </div>

        {/* Aurora bands */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute -top-1/2 left-0 w-[200%] h-[200%] animate-aurora-1 opacity-[0.07]"
            style={{ background: 'linear-gradient(135deg, transparent 30%, var(--tp-accent) 50%, transparent 70%)', filter: 'blur(80px)' }}
          />
          <div
            className="absolute -top-1/3 left-0 w-[200%] h-[200%] animate-aurora-2 opacity-[0.05]"
            style={{ background: 'linear-gradient(225deg, transparent 30%, var(--tp-accent2) 50%, transparent 70%)', filter: 'blur(100px)' }}
          />
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 animate-grid-pulse pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
          aria-hidden="true"
        />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Gradient line accent */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, var(--tp-accent), var(--tp-accent2), transparent)' }}
          aria-hidden="true"
        />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 mb-8"
        >
          {/* Animated tool count badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{
              background: 'rgba(255,45,120,0.1)',
              border: '1px solid rgba(255,45,120,0.3)',
              color: 'var(--tp-accent)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--tp-accent)', boxShadow: '0 0 8px var(--tp-accent)' }} />
            <span className="tabular-nums font-mono">{animatedCount}</span>+ free tools — no signup
          </motion.div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <TextReveal text="Free Online Tools" className="text-surface-50" delay={0.1} />
            <br />
            <TextReveal text="Built for Everyone" className="text-gradient" delay={0.6} />
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative z-10 text-surface-400 text-lg max-w-2xl mx-auto leading-relaxed mb-10"
        >
          <TypewriterSubtitle />
          <br />
          <span className="text-surface-300 font-medium">{tools.length}+ tools</span>, zero signup, <span className="text-surface-300 font-medium">100% free</span>.
        </motion.p>

        <motion.div
          ref={searchRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="relative z-20 max-w-lg mx-auto mb-10"
        >
          {/* Animated gradient border wrapper */}
          <div className="relative rounded-2xl p-px overflow-hidden" style={{ background: 'var(--tp-card)' }}>
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'conic-gradient(from var(--border-angle, 0deg), var(--tp-accent), var(--tp-accent2), var(--tp-accent), var(--tp-accent2), var(--tp-accent))',
                animation: 'spin-border 4s linear infinite',
                opacity: 0.6,
              }}
              aria-hidden="true"
            />
            <div className="relative rounded-[15px]" style={{ background: 'var(--tp-card)' }}>
              <CommandBar />
            </div>
          </div>
        </motion.div>

        {/* Trust badges — glass cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="relative z-10 flex items-center justify-center gap-3 sm:gap-4"
        >
          {[
            { icon: '🔓', label: 'No Signup' },
            { icon: '✨', label: '100% Free' },
            { icon: '🛡️', label: 'Privacy First' },
            { icon: '⚡', label: 'Instant Results' },
          ].map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-surface-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="text-sm">{badge.icon}</span>
              <span className="hidden sm:inline">{badge.label}</span>
            </div>
          ))}
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
        <span className="section-label mb-3 block" style={{ color: 'var(--tp-accent)' }}>✦ Flagship Editors</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-50 mb-2">
          Powerful Online Editors
        </h2>
        <p className="text-sm text-surface-400 max-w-md mx-auto">
          Open your files and start editing instantly — right in your browser.
        </p>
      </motion.div>

      {/* Bento grid: first card spans 2 cols on md+ */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5"
      >
        {/* Featured — large card spanning full width on mobile, 1 col + full height on md */}
        <motion.div variants={fadeUp} className="md:row-span-2">
          <FlagshipCard {...FLAGSHIP_EDITORS[0]} featured />
        </motion.div>
        {/* Two smaller cards stacked */}
        <motion.div variants={fadeUp}>
          <FlagshipCard {...FLAGSHIP_EDITORS[1]} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FlagshipCard {...FLAGSHIP_EDITORS[2]} />
        </motion.div>
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
        <p className="section-label mb-4 text-center" style={{ color: 'var(--tp-accent)' }}>⚡ Quick actions</p>
        <div className="flex gap-2.5 overflow-x-auto py-1 pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
          {quickTools.map((qa, i) => (
            <motion.div
              key={qa.id}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Link
                to={qa.tool.path}
                className="group relative flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium text-surface-300 whitespace-nowrap shrink-0 transition-all duration-200 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--tp-selection)';
                  e.currentTarget.style.borderColor = 'var(--tp-border-hover)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Shimmer on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)' }}
                  aria-hidden="true"
                />
                <span className="text-lg relative z-10" aria-hidden="true">{qa.emoji}</span>
                <span className="relative z-10 group-hover:text-surface-50 transition-colors">{qa.label}</span>
              </Link>
            </motion.div>
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <span className="section-label mb-3 block" style={{ color: 'var(--tp-accent)' }}>🗂️ Browse by Category</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-50 mb-2">
          {tools.length}+ Tools, {categories.length} Categories
        </h2>
        <p className="text-sm text-surface-400">Click a category to explore.</p>
      </motion.div>

      {/* Category grid with inline expansion */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat, i) => {
          const catTools = toolsForCategory(cat.id);
          const accent = CATEGORY_ACCENT[cat.id] || '#94a3b8';
          const isActive = expandedCat === cat.id;

          return (
            <React.Fragment key={cat.id}>
              {/* Category card with spotlight */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
              >
                <SpotlightCard
                  className="rounded-2xl cursor-pointer h-full"
                  style={{
                    background: isActive ? 'var(--tp-card-hover)' : 'var(--tp-card)',
                    border: `1px solid ${isActive ? accent + '60' : 'rgba(255,255,255,0.06)'}`,
                    backdropFilter: 'blur(12px)',
                    boxShadow: isActive ? `0 0 24px ${accent}25, 0 8px 20px rgba(0,0,0,0.3)` : 'none',
                    transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s, transform 0.2s',
                  }}
                  onClick={() => setExpandedCat(isActive ? null : cat.id)}
                >
                  {/* Accent gradient top edge */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                    aria-hidden="true"
                  />

                  <div className="relative z-10 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
                      >
                        {cat.icon}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
                        >
                          {catTools.length} tools
                        </span>
                        {/* Expand indicator */}
                        <motion.svg
                          animate={{ rotate: isActive ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="w-3.5 h-3.5 text-surface-500"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-surface-100 mb-1">{cat.name}</h3>
                    {/* Preview: top 3 tool names */}
                    <p className="text-[11px] text-surface-500 leading-relaxed line-clamp-1">
                      {catTools.slice(0, 3).map(t => t.name).join(' · ')}
                    </p>
                    {/* Tool icon stack */}
                    <div className="flex items-center mt-3 -space-x-1.5">
                      {catTools.slice(0, 4).map((tool, j) => (
                        <motion.div
                          key={tool.id}
                          initial={{ opacity: 0, x: -8 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 + j * 0.05 }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border-2"
                          style={{
                            background: 'var(--tp-bg)',
                            borderColor: `${accent}30`,
                            zIndex: 4 - j,
                          }}
                        >
                          {tool.icon}
                        </motion.div>
                      ))}
                      {catTools.length > 4 && (
                        <span
                          className="text-[10px] font-semibold ml-2 px-1.5 py-0.5 rounded-md"
                          style={{ background: `${accent}10`, color: accent }}
                        >
                          +{catTools.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>

              {/* Expanded panel — full grid width */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="col-span-2 sm:col-span-3 lg:col-span-4 overflow-hidden"
                  >
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: 'var(--tp-card)',
                        border: `1px solid ${accent}30`,
                        backdropFilter: 'blur(16px)',
                        boxShadow: `0 0 30px ${accent}10, 0 12px 40px rgba(0,0,0,0.4)`,
                      }}
                    >
                      {/* Accent top bar */}
                      <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

                      <div className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                              style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
                            >
                              {cat.icon}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-surface-100">{cat.name}</h3>
                              <span className="text-xs text-surface-500">{catTools.length} tools available</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              to={cat.path}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                              style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View all →
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedCat(null); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-200 transition-all duration-200"
                              style={{ background: 'rgba(255,255,255,0.06)' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <motion.div
                          variants={staggerContainer}
                          initial="hidden"
                          animate="show"
                          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                        >
                          {catTools.map((tool) => (
                            <motion.div key={tool.id} variants={fadeUp}>
                              <Link
                                to={tool.path}
                                className="group relative flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = `${accent}10`;
                                  e.currentTarget.style.borderColor = `${accent}30`;
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <span className="text-base shrink-0 group-hover:scale-110 transition-transform duration-200">{tool.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-semibold text-surface-200 group-hover:text-surface-50 truncate block transition-colors">{tool.name}</span>
                                  <span className="text-[10px] text-surface-500 truncate block">{tool.description?.slice(0, 40)}...</span>
                                </div>
                                <svg className="w-3 h-3 text-surface-600 group-hover:text-surface-300 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5"
      >
        <span className="section-label" style={{ color: 'var(--tp-accent)' }}>🔧 All Tools</span>
        <h2 className="text-xl font-bold text-surface-100 shrink-0">{filteredTools.length} Tools</h2>
        <div className="flex-1 h-px hidden sm:block" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </motion.div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <motion.button
          type="button"
          onClick={() => setActiveFilter(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
          style={!activeFilter
            ? { background: 'var(--tp-gradient)', color: '#fff', boxShadow: '0 2px 12px var(--tp-glow)' }
            : { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--tp-border)', color: 'var(--tp-muted)' }
          }
        >
          All
        </motion.button>
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            type="button"
            onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={activeFilter === cat.id
              ? { background: 'var(--tp-gradient)', color: '#fff', boxShadow: '0 2px 12px var(--tp-glow)' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--tp-border)', color: 'var(--tp-muted)' }
            }
          >
            <span aria-hidden="true">{cat.icon}</span>
            {cat.name}
          </motion.button>
        ))}
      </div>

      {/* Tools grid — animated layout */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      >
        <AnimatePresence mode="popLayout">
          {filteredTools.map((tool) => (
            <motion.div
              key={tool.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link
                to={tool.path}
                className="group relative flex items-start gap-3 p-4 h-full rounded-2xl overflow-hidden transition-all duration-200"
                style={{ background: 'var(--tp-card)', border: '1px solid var(--tp-border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--tp-border-hover)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--tp-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at 50% 0%, var(--tp-selection), transparent 70%)' }}
                  aria-hidden="true"
                />
                <div className="relative z-10 icon-box w-9 h-9 text-lg shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <span aria-hidden="true">{tool.icon}</span>
                </div>
                <div className="relative z-10 min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-surface-100 truncate group-hover:text-surface-50 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-surface-500 line-clamp-2 mt-0.5 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
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

/* ─── Animated Stat Counter ──────────────────────────────────────────── */

function AnimatedStat({ value, suffix, label, icon, delay }) {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);
  const count = useAnimatedCounter(inView ? value : 0, 1200);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
      className="relative flex flex-col items-center gap-3 py-6 rounded-2xl overflow-hidden group"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, var(--tp-selection), transparent 70%)' }}
        aria-hidden="true"
      />
      <span className="text-2xl relative z-10">{icon}</span>
      <span className="text-2xl font-extrabold font-mono text-surface-50 tabular-nums relative z-10">
        {value === 0 ? (suffix !== '' ? suffix : '✓') : `${count}${suffix}`}
      </span>
      <span className="text-xs font-medium text-surface-400 relative z-10">{label}</span>
    </motion.div>
  );
}

function StatsBar() {
  return (
    <section className="py-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AnimatedStat value={tools.length} suffix="+" label="Free Tools" icon="🧰" delay={0} />
        <AnimatedStat value={categories.length} suffix="" label="Categories" icon="📂" delay={0.1} />
        <AnimatedStat value={100} suffix="%" label="Always Free" icon="✨" delay={0.2} />
        <AnimatedStat value={0} suffix="Zero" label="Data Collected" icon="🛡️" delay={0.3} />
      </div>
    </section>
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
      <SEOHead
        title={null}
        description="159+ free online tools — PDF editor, Excel editor, Word editor, image converter, developer tools, finance calculators and more. No signup required."
        path="/"
      />
      {/* Negative margin pulls hero up to eliminate gap from AppShell padding */}
      <div className="-mt-4 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <HeroSection />
      </div>
      <FlagshipEditorsSection />
      <ToolMarquee />
      <QuickActionsStrip />
      <LiveActivityTicker />
      <RecentlyUsed />
      <CategoryShowcase />
      <StatsBar />
    </div>
  );
}
