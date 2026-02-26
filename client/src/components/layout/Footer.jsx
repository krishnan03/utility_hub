export default function Footer() {
  return (
    <footer
      role="contentinfo"
      className="py-6 px-4 mt-8"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-surface-500">
        <p className="font-medium">© {new Date().getFullYear()} ToolPilot</p>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" aria-hidden="true" />
            All systems operational
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your data is auto-deleted in 24h
          </span>
        </div>
        <p>Made with <span className="text-gradient font-bold">♥</span> for productivity</p>
      </div>
    </footer>
  );
}
