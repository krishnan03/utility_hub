export default function Footer() {
  return (
    <footer
      role="contentinfo"
      className="relative py-10 px-6 mt-16 overflow-hidden"
      style={{ borderTop: '1px solid var(--tp-border)' }}
    >
      {/* Subtle gradient glow at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--tp-accent), var(--tp-accent2), transparent)' }}
        aria-hidden="true"
      />
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs" style={{ color: 'var(--tp-muted)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold"
              style={{ background: 'var(--tp-gradient)', boxShadow: '0 2px 8px var(--tp-glow)' }}
            >
              TP
            </div>
            <span className="font-semibold text-surface-300">© {new Date().getFullYear()} ToolsPilot</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" aria-hidden="true" />
              All systems operational
            </span>
            <span className="w-px h-3 bg-surface-700" aria-hidden="true" />
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Your data is auto-deleted in 24h
            </span>
          </div>
          <a
            href="https://github.com/krishnan03/utility_hub"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{ color: 'var(--tp-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--tp-accent)'; e.currentTarget.style.borderColor = 'var(--tp-border-hover)'; e.currentTarget.style.background = 'var(--tp-selection)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tp-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Open Source
          </a>
        </div>
      </div>
    </footer>
  );
}
