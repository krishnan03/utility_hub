---
inclusion: auto
fileMatchPattern: "**/*.jsx"
---

# ToolsPilot — Design System & Component Patterns

This file defines the exact visual language for ToolsPilot. When generating or modifying JSX components, follow these patterns precisely. Do NOT improvise styling — use the tokens and patterns below.

## Design Philosophy

ToolsPilot follows a dark-first, Raycast-inspired aesthetic: deep navy backgrounds, pink-to-yellow gradient accents, frosted glass cards, and generous spacing. The vibe is premium dev tool — not generic SaaS. Think Linear, Raycast, Vercel dashboard.

## Color Tokens (use CSS variables, not raw hex)

```
Background:     var(--tp-bg)         → #1A1A2E (deep navy)
Card:           var(--tp-card)       → #22223a (elevated surface)
Card hover:     var(--tp-card-hover) → #2a2a48
Border:         var(--tp-border)     → rgba(255,45,120,0.3) (pink tint)
Border hover:   var(--tp-border-hover) → rgba(255,45,120,0.6)
Text:           var(--tp-text)       → #f5f5f7 (near-white)
Muted text:     var(--tp-muted)      → #8888aa
Accent:         var(--tp-accent)     → #FF2D78 (hot pink)
Accent 2:       var(--tp-accent2)    → #FFE600 (electric yellow)
Gradient:       var(--tp-gradient)   → linear-gradient(135deg, #FF2D78, #FFE600)
Glow:           var(--tp-glow)       → rgba(255,45,120,0.35)
Selection:      var(--tp-selection)  → rgba(255,45,120,0.3)
```

### Tailwind Color Classes
- Text: `text-surface-50` (bright), `text-surface-100` (body), `text-surface-400` (muted), `text-surface-500` (subtle)
- Backgrounds: `bg-surface-900` (page), `bg-surface-800` (card), `bg-surface-850` (elevated)
- Accent: `text-primary-400`, `text-primary-500`, `bg-primary-500/10` (tinted bg)
- Semantic: `text-accent-green` (success), `text-accent-red` (error), `text-accent-blue` (info)

## Typography

- Body: `-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif` → `font-sans`
- Code/numbers: `JetBrains Mono, SF Mono, Fira Code, monospace` → `font-mono`
- Headings: `font-extrabold` or `font-bold`, never `font-normal`
- Page title: `text-4xl lg:text-5xl font-extrabold`
- Section heading: `text-lg font-bold text-surface-100`
- Body text: `text-sm text-surface-400` or `text-surface-500`
- Labels: `text-xs font-semibold uppercase tracking-widest text-surface-500`
- Gradient text: use `text-gradient` class (applies `var(--tp-gradient)` as background-clip)

## Spacing Rules

- Between major sections: `space-y-8` or `space-y-10`
- Between related elements: `space-y-4` or `space-y-6`
- Card padding: `p-5` or `p-6`
- Page padding: `pb-12` bottom breathing room
- Gap in flex/grid: `gap-3` (tight), `gap-4` (normal), `gap-6` (generous)
- NEVER use `space-y-1` or `space-y-2` between sections — it looks cramped

## Component Classes (defined in index.css — use these, don't reinvent)

### Buttons
```jsx
// Primary CTA — gradient background with glow
<button className="btn-primary">Save PDF</button>

// Secondary — ghost with border
<button className="btn-secondary">Cancel</button>

// Small action button (inline in toolbars)
<button
  className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 transition-all"
  style={{ background: 'rgba(255,255,255,0.06)' }}
>
  Action
</button>
```

### Cards
```jsx
// Standard card
<div className="card">Content</div>

// Hoverable card (for tool listings, blog posts)
<div className="card-hover">Clickable content</div>

// Inline panel (for toolbars, info bars) — use raw styles
<div
  className="p-3 rounded-xl"
  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
>
```

### Glass Panel
```jsx
<div className="glass rounded-2xl p-6">Frosted content</div>
```

### Badges
```jsx
<span className="badge">Category</span>

// Or inline:
<span className="text-xs font-bold uppercase tracking-wider text-primary-500 bg-primary-500/10 px-2.5 py-1 rounded-full">
  Dev Tools
</span>
```

### Input Fields
```jsx
// Command-palette style input
<input className="cmd-input" placeholder="Search tools..." />

// Small inline input (in toolbars)
<input
  className="w-16 px-2 py-1 rounded-lg text-xs text-surface-200 focus:outline-none"
  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
/>

// Select dropdown
<select
  className="h-8 px-2 rounded-lg text-xs text-surface-200 focus:outline-none"
  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
>
```

## Framer Motion Patterns

Always import: `import { motion, AnimatePresence } from 'framer-motion';`

### Page/Section Enter
```jsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
```

### Result Card (celebratory scale-in)
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
>
```

### Success Checkmark (spring bounce)
```jsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
>
```

### Staggered List (for grids of cards)
```jsx
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

<motion.div variants={containerVariants} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={cardVariants}>...</motion.div>
  ))}
</motion.div>
```

### Page Transitions (with AnimatePresence)
```jsx
<AnimatePresence mode="wait">
  {step === 'upload' && <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>...</motion.div>}
  {step === 'result' && <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>...</motion.div>}
</AnimatePresence>
```

## Tool Page Structure (3-Step Flow)

Every tool page follows this pattern:

### Step 1: Upload
```jsx
if (!file) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-surface-100 mb-1">Tool Name</h2>
        <p className="text-sm text-surface-500">One-line description of what this tool does</p>
      </div>
      <FileUpload onFilesSelected={handleFiles} accept=".pdf" />
      {/* Feature pills grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {features.map(([icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-xl">{icon}</span>
            <span className="text-xs text-surface-500">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
```

### Step 2: Configure (tool-specific UI)
- Toolbar at top with tool options
- Main content area
- Action button (btn-primary) anchored bottom-right or in toolbar

### Step 3: Result
```jsx
if (result) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
      <div className="flex flex-col items-center gap-4 p-6 rounded-2xl"
        style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Success icon with spring animation */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(48,209,88,0.15)' }}>
          <svg className="w-7 h-7 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <p className="text-sm font-semibold text-surface-100">Success message here</p>
        <a href={downloadUrl} download={filename} className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px]">
          Download Result
        </a>
        <p className="text-xs text-surface-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
          100% client-side — your data never left your browser
        </p>
      </div>
      <button onClick={reset} className="w-full btn-secondary">Process Another File</button>
    </motion.div>
  );
}
```

## Error Display
```jsx
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
  className="p-3 rounded-xl text-sm text-red-400 flex items-center gap-2"
  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  {error}
</motion.div>
```

## Info/Tip Box
```jsx
<div className="flex items-start gap-3 p-3 rounded-xl text-xs"
  style={{ background: 'rgba(255,45,120,0.06)', border: '1px solid rgba(255,45,120,0.15)' }}>
  <span className="text-primary-400 text-base shrink-0">💡</span>
  <div className="text-surface-400">
    <p><span className="text-surface-200 font-medium">Tip:</span> Helpful context here.</p>
  </div>
</div>
```

## File Info Bar
```jsx
<div className="flex items-center justify-between px-3 py-2 rounded-xl"
  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
  <div className="flex items-center gap-2 min-w-0">
    <span className="text-base">📄</span>
    <span className="text-sm font-medium text-surface-200 truncate">{file.name}</span>
    <span className="text-xs text-surface-500 shrink-0">{fileSize} MB</span>
  </div>
  <button onClick={reset} className="text-xs text-surface-500 hover:text-red-400 transition-colors shrink-0 ml-2">✕ Close</button>
</div>
```

## Anti-Patterns (DO NOT DO)

- Do NOT use raw hex colors — always use CSS variables or Tailwind surface/primary classes
- Do NOT use `bg-gray-*` or `bg-slate-*` — use `bg-surface-*`
- Do NOT use `border-gray-*` — use `style={{ border: '1px solid rgba(255,255,255,0.08)' }}` or `var(--tp-border)`
- Do NOT use inline `style={{ color: '#fff' }}` — use `text-surface-100`
- Do NOT skip Framer Motion on page transitions — every step change must animate
- Do NOT use `rounded-md` — minimum is `rounded-lg`, prefer `rounded-xl` or `rounded-2xl`
- Do NOT use padding less than `p-3` on interactive containers
- Do NOT create new CSS classes — use Tailwind utilities + the existing component classes from index.css
- Do NOT use `shadow-sm` or `shadow-md` — use `shadow-card` or `shadow-glass` from the Tailwind config
