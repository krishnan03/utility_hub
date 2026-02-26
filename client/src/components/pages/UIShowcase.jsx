import { useState } from 'react';

// ─── Shared mock data ────────────────────────────────────────────────────────
const CATEGORIES = ['Image Tools', 'PDF Tools', 'Text Tools', 'Dev Tools'];
const TOOLS = ['Image Compressor', 'PDF Merger', 'Base64 Encoder', 'JSON Formatter', 'Color Picker', 'QR Generator'];

// ─── Theme 1: Obsidian ───────────────────────────────────────────────────────
function Theme1() {
  return (
    <div style={{ background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Dot grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #D4A85322 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #D4A85333', position: 'relative', zIndex: 1 }}>
        <span style={{ color: '#D4A853', fontWeight: 700, letterSpacing: '0.15em', fontSize: 13 }}>TOOLSPILOT</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Tools', 'Blog', 'About'].map(n => <span key={n} style={{ fontSize: 11, color: '#ffffff88', letterSpacing: '0.1em' }}>{n}</span>)}
        </div>
      </div>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '40px 24px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 72, fontWeight: 100, color: '#D4A853', lineHeight: 1, letterSpacing: '-2px' }}>122</div>
        <div style={{ fontSize: 11, color: '#ffffff55', letterSpacing: '0.3em', marginTop: 6, textTransform: 'uppercase' }}>Professional Tools, Zero Cost</div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', background: '#ffffff08', border: '1px solid #D4A85344', borderRadius: 4, padding: '8px 14px', maxWidth: 280, margin: '16px auto 0' }}>
          <span style={{ fontSize: 11, color: '#ffffff33', flex: 1 }}>Search tools...</span>
          <span style={{ color: '#D4A853', fontSize: 11 }}>⌘K</span>
        </div>
      </div>
      {/* Category pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 24px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        {CATEGORIES.map(c => (
          <div key={c} style={{ border: '1px solid #D4A85366', borderRadius: 2, padding: '4px 12px', fontSize: 10, color: '#D4A853', letterSpacing: '0.1em' }}>{c.toUpperCase()}</div>
        ))}
      </div>
      {/* Tool cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '16px 24px', position: 'relative', zIndex: 1 }}>
        {TOOLS.slice(0, 6).map(t => (
          <div key={t} style={{ background: '#ffffff06', border: '1px solid #ffffff11', borderRadius: 4, padding: '12px 10px', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#D4A85366'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#ffffff11'}>
            <div style={{ width: 20, height: 20, background: '#D4A85322', borderRadius: 2, marginBottom: 8 }} />
            <div style={{ fontSize: 10, color: '#ffffffcc', fontWeight: 500 }}>{t}</div>
            <div style={{ fontSize: 9, color: '#ffffff44', marginTop: 3 }}>Free · Instant</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 2: Aurora ─────────────────────────────────────────────────────────
function Theme2() {
  return (
    <div style={{ background: '#0D0F1A', color: '#fff', fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Blobs */}
      <div style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, background: 'radial-gradient(circle, #7C3AED55, transparent 70%)', borderRadius: '50%', filter: 'blur(30px)' }} />
      <div style={{ position: 'absolute', top: 40, right: -40, width: 180, height: 180, background: 'radial-gradient(circle, #FF006E44, transparent 70%)', borderRadius: '50%', filter: 'blur(30px)' }} />
      <div style={{ position: 'absolute', bottom: 20, left: '40%', width: 160, height: 160, background: 'radial-gradient(circle, #00D4FF33, transparent 70%)', borderRadius: '50%', filter: 'blur(30px)' }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', backdropFilter: 'blur(12px)', background: '#ffffff08', borderBottom: '1px solid #ffffff11', position: 'relative', zIndex: 2 }}>
        <span style={{ background: 'linear-gradient(90deg, #00D4FF, #FF006E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, fontSize: 14 }}>ToolsPilot</span>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Tools', 'Blog'].map(n => <span key={n} style={{ fontSize: 11, color: '#ffffff77' }}>{n}</span>)}
        </div>
      </div>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '36px 20px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, #00D4FF, #7C3AED, #FF006E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>Every Tool<br/>You Need</div>
        <div style={{ fontSize: 11, color: '#ffffff66', marginTop: 8 }}>122 free tools · Instant results</div>
        <div style={{ marginTop: 14, background: '#ffffff0D', backdropFilter: 'blur(16px)', border: '1px solid #ffffff22', borderRadius: 50, padding: '8px 16px', maxWidth: 260, margin: '14px auto 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#00D4FF' }}>🔍</span>
          <span style={{ fontSize: 11, color: '#ffffff44' }}>Search 122 tools...</span>
        </div>
      </div>
      {/* Category cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 20px', position: 'relative', zIndex: 2 }}>
        {[['Image Tools', 'linear-gradient(135deg,#7C3AED,#00D4FF)'], ['PDF Tools', 'linear-gradient(135deg,#FF006E,#FF8C00)'], ['Text Tools', 'linear-gradient(135deg,#00D4FF,#00FF88)'], ['Dev Tools', 'linear-gradient(135deg,#FF006E,#7C3AED)']].map(([c, g]) => (
          <div key={c} style={{ background: '#ffffff08', border: '1px solid #ffffff11', borderRadius: 10, padding: '12px', backdropFilter: 'blur(8px)' }}>
            <div style={{ width: 28, height: 4, background: g, borderRadius: 2, marginBottom: 8 }} />
            <div style={{ fontSize: 11, fontWeight: 600 }}>{c}</div>
            <div style={{ fontSize: 9, color: '#ffffff55', marginTop: 2 }}>12 tools</div>
          </div>
        ))}
      </div>
      {/* Tool pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px 20px', position: 'relative', zIndex: 2 }}>
        {TOOLS.map(t => (
          <div key={t} style={{ background: '#ffffff0D', border: '1px solid #ffffff22', borderRadius: 50, padding: '4px 10px', fontSize: 9, color: '#ffffffcc' }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 3: Minimal Pro ────────────────────────────────────────────────────
function Theme3() {
  return (
    <div style={{ background: '#fff', color: '#000', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif', height: '100%', overflow: 'hidden' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 28px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.3px' }}>ToolsPilot</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Tools', 'Blog', 'About'].map(n => <span key={n} style={{ fontSize: 11, color: '#666' }}>{n}</span>)}
        </div>
        <div style={{ background: '#0071E3', color: '#fff', borderRadius: 20, padding: '5px 14px', fontSize: 10, fontWeight: 600 }}>Get Started</div>
      </div>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '44px 28px 28px' }}>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, color: '#000' }}>The tools<br/>you need.</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 10, fontWeight: 400 }}>122 free tools for images, PDFs, text, and more.</div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', borderBottom: '2px solid #0071E3', maxWidth: 260, margin: '18px auto 0', padding: '6px 0' }}>
          <span style={{ fontSize: 11, color: '#aaa', flex: 1 }}>Search tools...</span>
        </div>
      </div>
      {/* Category grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 28px' }}>
        {CATEGORIES.map(c => (
          <div key={c} style={{ background: '#fafafa', borderRadius: 10, padding: '14px', boxShadow: '0 1px 4px #0000000A' }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>🗂️</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{c}</div>
            <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>12 tools →</div>
          </div>
        ))}
      </div>
      {/* Tool list */}
      <div style={{ padding: '16px 28px' }}>
        {TOOLS.slice(0, 4).map(t => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
            <span style={{ fontSize: 11, fontWeight: 500 }}>{t}</span>
            <span style={{ fontSize: 10, color: '#0071E3' }}>Open →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 4: Neon Terminal ──────────────────────────────────────────────────
function Theme4() {
  return (
    <div style={{ background: '#000', color: '#00FF41', fontFamily: '"JetBrains Mono", "Courier New", monospace', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Scanline */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00000033 2px, #00000033 4px)', pointerEvents: 'none', zIndex: 10 }} />
      {/* Nav */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #00FF4133', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>root@toolspilot:~$</span>
        <span style={{ fontSize: 10, color: '#00FF4177' }}>v2.0.1 [ONLINE]</span>
      </div>
      {/* Hero */}
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ fontSize: 9, color: '#00FF4188', marginBottom: 4 }}>// TOOLSPILOT — SYSTEM INITIALIZED</div>
        <pre style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: '#00FF41', margin: 0 }}>{`██╗   ██╗██╗  ██╗
██║   ██║██║  ██║
██║   ██║███████║
██║   ██║██╔══██║
╚██████╔╝██║  ██║`}</pre>
        <div style={{ fontSize: 10, marginTop: 8, color: '#00FF41BB' }}>
          <span>{'>'} 122 tools loaded</span>
          <span style={{ animation: 'blink 1s step-end infinite', marginLeft: 2 }}>█</span>
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#00FF4188' }}>$</span>
          <span style={{ fontSize: 10, borderBottom: '1px solid #00FF41', paddingBottom: 2, flex: 1, maxWidth: 200 }}>search --query ""</span>
        </div>
      </div>
      {/* Categories */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 9, color: '#00FF4166', marginBottom: 6 }}>$ ls categories/</div>
        {CATEGORIES.map((c, i) => (
          <div key={c} style={{ fontSize: 10, color: '#00FF41CC', padding: '3px 0', display: 'flex', gap: 10 }}>
            <span style={{ color: '#00FF4155' }}>drwxr-xr-x</span>
            <span style={{ color: '#00FF4188' }}>{String(i + 1).padStart(2, '0')}</span>
            <span>{c.toLowerCase().replace(' ', '-')}/</span>
          </div>
        ))}
      </div>
      {/* Tools */}
      <div style={{ padding: '10px 20px' }}>
        <div style={{ fontSize: 9, color: '#00FF4166', marginBottom: 6 }}>$ ls tools/ | head -6</div>
        {TOOLS.map(t => (
          <div key={t} style={{ fontSize: 10, color: '#00FF41AA', padding: '2px 0', display: 'flex', gap: 8 }}>
            <span style={{ color: '#00FF4144' }}>-rwxr--r--</span>
            <span>{t.toLowerCase().replace(' ', '-')}.sh</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

// ─── Theme 5: Glassmorphism Pro ──────────────────────────────────────────────
function Theme5() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1A0533 0%, #0D1B4B 50%, #0A0A1A 100%)', color: '#fff', fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', width: 2, height: 2, background: '#fff', borderRadius: '50%', opacity: Math.random() * 0.7 + 0.1, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }} />
      ))}
      {/* Blobs */}
      <div style={{ position: 'absolute', top: 0, left: '20%', width: 200, height: 200, background: 'radial-gradient(circle, #7C3AED44, transparent 70%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '10%', width: 180, height: 180, background: 'radial-gradient(circle, #06B6D444, transparent 70%)', filter: 'blur(40px)' }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 13, background: 'linear-gradient(90deg,#A78BFA,#67E8F9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ToolsPilot</span>
        <div style={{ display: 'flex', gap: 14 }}>
          {['Tools', 'Blog'].map(n => <span key={n} style={{ fontSize: 10, color: '#ffffff66' }}>{n}</span>)}
        </div>
      </div>
      {/* Hero glass card */}
      <div style={{ margin: '24px 20px 16px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '20px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 11, color: '#A78BFA', letterSpacing: '0.15em', marginBottom: 6 }}>✦ 122 TOOLS AVAILABLE</div>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1 }}>Next-Gen<br/><span style={{ background: 'linear-gradient(90deg,#A78BFA,#67E8F9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tool Suite</span></div>
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#A78BFA' }}>⌕</span>
          <span style={{ fontSize: 10, color: '#ffffff44' }}>Search tools...</span>
        </div>
      </div>
      {/* Category glass cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 20px', position: 'relative', zIndex: 2 }}>
        {CATEGORIES.map((c, i) => (
          <div key={c} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px' }}>
            <div style={{ fontSize: 16, marginBottom: 6 }}>{'🖼️📄📝⚙️'[i * 2]}{'🖼️📄📝⚙️'[i * 2 + 1]}</div>
            <div style={{ fontSize: 10, fontWeight: 600 }}>{c}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 6: Brutalist Bold ─────────────────────────────────────────────────
function Theme6() {
  return (
    <div style={{ background: '#F5F0E8', color: '#000', fontFamily: 'Georgia, serif', height: '100%', overflow: 'hidden' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '3px solid #000' }}>
        <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>TOOLSPILOT</span>
        <div style={{ display: 'flex', gap: 0 }}>
          {['TOOLS', 'BLOG', 'ABOUT'].map(n => <span key={n} style={{ fontSize: 9, fontWeight: 700, padding: '4px 10px', borderLeft: '2px solid #000', fontFamily: 'Arial, sans-serif', letterSpacing: '0.1em' }}>{n}</span>)}
        </div>
      </div>
      {/* Hero */}
      <div style={{ padding: '24px 24px 16px', borderBottom: '3px solid #000' }}>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.9, letterSpacing: '-3px', fontFamily: 'Arial Black, sans-serif' }}>122<br/>TOOLS</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 0 }}>
          <input readOnly placeholder="SEARCH TOOLS..." style={{ flex: 1, border: '3px solid #000', background: '#FFE600', padding: '8px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'Arial, sans-serif', outline: 'none', letterSpacing: '0.05em' }} />
          <button style={{ background: '#000', color: '#FFE600', border: '3px solid #000', padding: '8px 16px', fontSize: 11, fontWeight: 900, fontFamily: 'Arial, sans-serif', cursor: 'pointer', letterSpacing: '0.1em' }}>GO</button>
        </div>
      </div>
      {/* Categories — newspaper columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '3px solid #000' }}>
        {CATEGORIES.map((c, i) => (
          <div key={c} style={{ padding: '12px 16px', borderRight: i % 2 === 0 ? '3px solid #000' : 'none', borderBottom: i < 2 ? '3px solid #000' : 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#FFE600'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontSize: 11, fontWeight: 900, fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.3px' }}>{c.toUpperCase()}</div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 3, fontFamily: 'Arial, sans-serif' }}>12 tools available</div>
          </div>
        ))}
      </div>
      {/* Tool list */}
      <div style={{ padding: '12px 24px' }}>
        {TOOLS.slice(0, 4).map((t, i) => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #00000033' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 900, fontFamily: 'Arial, sans-serif', color: '#888' }}>0{i + 1}</span>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>{t}</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 900, fontFamily: 'Arial, sans-serif', background: '#000', color: '#FFE600', padding: '2px 8px' }}>USE →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 7: Cosmic Dark ────────────────────────────────────────────────────
function Theme7() {
  return (
    <div style={{ background: '#050510', color: '#fff', fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Star field */}
      {[...Array(30)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', width: i % 5 === 0 ? 3 : 1.5, height: i % 5 === 0 ? 3 : 1.5, background: '#fff', borderRadius: '50%', opacity: Math.random() * 0.8 + 0.1, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, boxShadow: i % 5 === 0 ? '0 0 4px #fff' : 'none' }} />
      ))}
      {/* Nebula */}
      <div style={{ position: 'absolute', top: '10%', left: '30%', width: 250, height: 150, background: 'radial-gradient(ellipse, #7C3AED22, transparent 70%)', filter: 'blur(20px)' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 200, height: 120, background: 'radial-gradient(ellipse, #06B6D422, transparent 70%)', filter: 'blur(20px)' }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', position: 'relative', zIndex: 2, borderBottom: '1px solid #7C3AED33' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#A78BFA' }}>⬡ ToolsPilot</span>
        <div style={{ display: 'flex', gap: 14 }}>
          {['Mission', 'Tools', 'Log'].map(n => <span key={n} style={{ fontSize: 10, color: '#ffffff55' }}>{n}</span>)}
        </div>
      </div>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '28px 20px 16px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 40 }}>🌍</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, lineHeight: 1.1 }}>Mission Control<br/><span style={{ color: '#7C3AED' }}>for Your Files</span></div>
        <div style={{ fontSize: 10, color: '#ffffff55', marginTop: 6 }}>122 tools · All systems operational</div>
        <div style={{ marginTop: 12, background: '#7C3AED22', border: '1px solid #7C3AED55', borderRadius: 8, padding: '7px 14px', maxWidth: 240, margin: '12px auto 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#A78BFA' }}>◈</span>
          <span style={{ fontSize: 10, color: '#ffffff44' }}>Search mission tools...</span>
        </div>
      </div>
      {/* Category orbit cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 20px', position: 'relative', zIndex: 2 }}>
        {[['🖼️', 'Image Tools', '#7C3AED'], ['📄', 'PDF Tools', '#06B6D4'], ['📝', 'Text Tools', '#10B981'], ['⚙️', 'Dev Tools', '#F59E0B']].map(([icon, name, color]) => (
          <div key={name} style={{ background: '#ffffff06', border: `1px solid ${color}44`, borderRadius: 10, padding: '12px', boxShadow: `0 0 12px ${color}22` }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 10, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 9, color: color, marginTop: 2 }}>12 tools ›</div>
          </div>
        ))}
      </div>
      {/* Status bar */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 20px', position: 'relative', zIndex: 2 }}>
        {['SYSTEMS', 'ONLINE', 'SECURE'].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: '#06B6D4', letterSpacing: '0.1em' }}>
            <div style={{ width: 5, height: 5, background: '#06B6D4', borderRadius: '50%', boxShadow: '0 0 4px #06B6D4' }} />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 8: Warm Sunset ────────────────────────────────────────────────────
function Theme8() {
  return (
    <div style={{ background: '#FFF8F0', color: '#1A1A1A', fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #FFD70033' }}>
        <span style={{ fontWeight: 800, fontSize: 13, background: 'linear-gradient(90deg,#FF6B6B,#FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ToolsPilot 🌅</span>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Tools', 'Blog'].map(n => <span key={n} style={{ fontSize: 11, color: '#888' }}>{n}</span>)}
        </div>
        <div style={{ background: 'linear-gradient(90deg,#FF6B6B,#FFA500)', color: '#fff', borderRadius: 20, padding: '5px 14px', fontSize: 10, fontWeight: 600 }}>Explore</div>
      </div>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 24px 20px' }}>
        <div style={{ fontSize: 40 }}>🌅</div>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, marginTop: 8, background: 'linear-gradient(135deg,#FF6B6B,#FFA500,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Creative<br/>Toolkit</div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>122 free tools, warm and ready ☀️</div>
        <div style={{ marginTop: 14, background: '#fff', border: '2px solid #FFA50044', borderRadius: 50, padding: '8px 16px', maxWidth: 260, margin: '14px auto 0', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px #FF6B6B22' }}>
          <span style={{ fontSize: 12 }}>🔍</span>
          <span style={{ fontSize: 11, color: '#bbb' }}>Search tools...</span>
        </div>
      </div>
      {/* Category tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 24px' }}>
        {[['🖼️', 'Image Tools', '#FF6B6B'], ['📄', 'PDF Tools', '#FFA500'], ['📝', 'Text Tools', '#FFD700'], ['⚙️', 'Dev Tools', '#FF8C69']].map(([icon, name, color]) => (
          <div key={name} style={{ background: '#fff', borderRadius: 16, padding: '14px', boxShadow: `0 4px 16px ${color}22`, border: `1px solid ${color}33` }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 9, color: color, marginTop: 3, fontWeight: 600 }}>12 tools →</div>
          </div>
        ))}
      </div>
      {/* Tool pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '14px 24px' }}>
        {TOOLS.map(t => (
          <div key={t} style={{ background: '#fff', border: '1px solid #FFA50044', borderRadius: 50, padding: '4px 12px', fontSize: 9, color: '#555', fontWeight: 500 }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 9: Monochrome Ink ─────────────────────────────────────────────────
function Theme9() {
  return (
    <div style={{ background: '#fff', color: '#000', fontFamily: 'Georgia, "Times New Roman", serif', height: '100%', overflow: 'hidden' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '2px solid #000' }}>
        <span style={{ fontWeight: 900, fontSize: 14, fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.5px' }}>TOOLSPILOT</span>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Tools', 'Blog', 'About'].map(n => <span key={n} style={{ fontSize: 10, fontFamily: 'Arial, sans-serif', color: '#555' }}>{n}</span>)}
        </div>
        <div style={{ background: '#FF0000', color: '#fff', padding: '4px 12px', fontSize: 10, fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>OPEN</div>
      </div>
      {/* Hero */}
      <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 0.9, fontFamily: 'Arial Black, sans-serif', letterSpacing: '-4px' }}>122</div>
          <div style={{ paddingBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>FREE TOOLS</div>
            <div style={{ width: 60, height: 3, background: '#FF0000', marginTop: 4 }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 10, fontFamily: 'Arial, sans-serif', lineHeight: 1.5 }}>Professional-grade utilities for images, PDFs, text, and development.</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 0 }}>
          <input readOnly placeholder="Search tools..." style={{ flex: 1, border: '2px solid #000', padding: '7px 12px', fontSize: 11, fontFamily: 'Arial, sans-serif', outline: 'none', maxWidth: 220 }} />
          <button style={{ background: '#FF0000', color: '#fff', border: '2px solid #FF0000', padding: '7px 14px', fontSize: 11, fontFamily: 'Arial, sans-serif', fontWeight: 700, cursor: 'pointer' }}>SEARCH</button>
        </div>
      </div>
      {/* Categories — magazine columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {CATEGORIES.map((c, i) => (
          <div key={c} style={{ padding: '12px 16px', borderRight: i % 2 === 0 ? '1px solid #ddd' : 'none', borderBottom: '1px solid #ddd' }}>
            <div style={{ fontSize: 10, fontWeight: 900, fontFamily: 'Arial Black, sans-serif', letterSpacing: '0.05em' }}>{c.toUpperCase()}</div>
            <div style={{ fontSize: 9, color: '#888', marginTop: 3, fontFamily: 'Arial, sans-serif' }}>12 tools</div>
          </div>
        ))}
      </div>
      {/* Tool list — article style */}
      <div style={{ padding: '12px 24px' }}>
        {TOOLS.slice(0, 4).map((t, i) => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#FF0000', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>0{i + 1}</span>
              <span style={{ fontSize: 11, fontFamily: 'Arial, sans-serif', fontWeight: 500 }}>{t}</span>
            </div>
            <span style={{ fontSize: 9, color: '#FF0000', fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>USE →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 10: Cyberpunk 2077 ────────────────────────────────────────────────
function Theme10() {
  return (
    <div style={{ background: '#1A1A2E', color: '#fff', fontFamily: '"Rajdhani", Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Scanline */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, #FF2D7808 3px, #FF2D7808 4px)', pointerEvents: 'none', zIndex: 1 }} />
      {/* Diagonal stripes accent */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'repeating-linear-gradient(45deg, #FFE60011 0px, #FFE60011 4px, transparent 4px, transparent 12px)', pointerEvents: 'none', zIndex: 1 }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px', borderBottom: '2px solid #FF2D78', position: 'relative', zIndex: 2 }}>
        <div>
          <span style={{ fontWeight: 900, fontSize: 14, color: '#FF2D78', letterSpacing: '0.1em', textTransform: 'uppercase' }}>ToolsPilot</span>
          <span style={{ fontWeight: 900, fontSize: 14, color: '#FFE600', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Hub</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, background: '#00FF88', borderRadius: '50%', boxShadow: '0 0 6px #00FF88' }} />
          <span style={{ fontSize: 8, color: '#00FF88', letterSpacing: '0.15em' }}>SYSTEM ONLINE</span>
        </div>
      </div>
      {/* Hero with glitch */}
      <div style={{ padding: '20px 22px 14px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 9, color: '#FF2D7888', letterSpacing: '0.2em', marginBottom: 6 }}>// INITIALIZING TOOL MATRIX...</div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-1px', textTransform: 'uppercase' }}>
            <span style={{ color: '#FF2D78' }}>122</span>
            <br />
            <span style={{ color: '#FFE600' }}>TOOLS</span>
          </div>
          {/* Glitch layers */}
          <div style={{ position: 'absolute', top: 0, left: 2, fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-1px', textTransform: 'uppercase', color: '#00D4FF', opacity: 0.3, clipPath: 'inset(30% 0 50% 0)' }}>
            <span>122</span><br /><span>TOOLS</span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#ffffff66', marginTop: 8, letterSpacing: '0.05em' }}>NO LIMITS · NO SIGNUP · JACK IN NOW</div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ flex: 1, maxWidth: 220, background: '#ffffff0D', border: '1px solid #FF2D7866', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#FF2D78' }}>▶</span>
            <span style={{ fontSize: 10, color: '#ffffff44' }}>SEARCH TOOLS...</span>
          </div>
          <div style={{ background: '#FF2D78', padding: '7px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}>RUN</div>
        </div>
      </div>
      {/* Category cards — holographic sticker style */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 22px', position: 'relative', zIndex: 2 }}>
        {[['🖼️', 'IMAGE', '#FF2D78'], ['📄', 'PDF', '#FFE600'], ['📝', 'TEXT', '#00D4FF'], ['⚙️', 'DEV', '#00FF88']].map(([icon, name, color]) => (
          <div key={name} style={{ background: '#ffffff08', border: `2px solid ${color}`, padding: '10px', position: 'relative', transform: 'skewX(-2deg)' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#000', fontWeight: 900 }}>▲</div>
            <div style={{ fontSize: 16 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: color, letterSpacing: '0.1em', marginTop: 4 }}>{name}</div>
            <div style={{ fontSize: 8, color: '#ffffff55', letterSpacing: '0.1em' }}>12 TOOLS</div>
          </div>
        ))}
      </div>
      {/* Tool list */}
      <div style={{ padding: '10px 22px', position: 'relative', zIndex: 2 }}>
        {TOOLS.slice(0, 3).map((t, i) => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #FF2D7822' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#FF2D78', fontWeight: 700 }}>[{String(i + 1).padStart(2, '0')}]</span>
              <span style={{ fontSize: 10, letterSpacing: '0.05em' }}>{t.toUpperCase()}</span>
            </div>
            <span style={{ fontSize: 8, color: '#FFE600', fontWeight: 700 }}>EXECUTE ›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 11: Linear Dark ───────────────────────────────────────────────────
function Theme11() {
  return (
    <div style={{ background: '#0F0F10', color: '#fff', fontFamily: 'Inter, -apple-system, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Subtle grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#ffffff06 1px, transparent 1px), linear-gradient(90deg, #ffffff06 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      {/* Top glow */}
      <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 400, height: 200, background: 'radial-gradient(ellipse, #5E6AD244, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #ffffff0F', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, background: 'linear-gradient(135deg, #5E6AD2, #8B5CF6)', borderRadius: 5 }} />
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.3px' }}>ToolsPilot</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Tools', 'Docs', 'Blog'].map(n => <span key={n} style={{ fontSize: 11, color: '#ffffff55', letterSpacing: '-0.1px' }}>{n}</span>)}
        </div>
        <div style={{ background: '#5E6AD2', color: '#fff', borderRadius: 6, padding: '5px 14px', fontSize: 11, fontWeight: 600, letterSpacing: '-0.2px' }}>Get started</div>
      </div>
      {/* Hero */}
      <div style={{ padding: '36px 24px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#5E6AD211', border: '1px solid #5E6AD233', borderRadius: 20, padding: '3px 10px', marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, background: '#5E6AD2', borderRadius: '50%' }} />
          <span style={{ fontSize: 10, color: '#5E6AD2', fontWeight: 600, letterSpacing: '0.02em' }}>122 tools available</span>
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', maxWidth: 320 }}>
          Build faster with<br /><span style={{ color: '#5E6AD2' }}>every tool</span> you need.
        </div>
        <div style={{ fontSize: 12, color: '#ffffff55', marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>Free and instant. Images, PDFs, text, code — all in one place.</div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', background: '#ffffff08', border: '1px solid #ffffff11', borderRadius: 8, padding: '8px 12px', maxWidth: 280, gap: 8 }}>
          <span style={{ fontSize: 11, color: '#ffffff33' }}>⌘</span>
          <span style={{ fontSize: 11, color: '#ffffff33', flex: 1 }}>Search tools...</span>
          <span style={{ fontSize: 9, color: '#ffffff22', background: '#ffffff0A', padding: '2px 6px', borderRadius: 4, border: '1px solid #ffffff11' }}>K</span>
        </div>
      </div>
      {/* Tool grid — Linear-style cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '0 24px', position: 'relative', zIndex: 2 }}>
        {[['🖼️', 'Images', '#5E6AD2'], ['📄', 'PDFs', '#8B5CF6'], ['📝', 'Text', '#06B6D4'], ['⚙️', 'Dev', '#10B981'], ['💰', 'Finance', '#F59E0B'], ['🔐', 'Privacy', '#EF4444']].map(([icon, name, color]) => (
          <div key={name} style={{ background: '#ffffff06', border: '1px solid #ffffff0D', borderRadius: 8, padding: '10px 8px', transition: 'border-color 0.2s' }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#ffffffCC', letterSpacing: '-0.2px' }}>{name}</div>
            <div style={{ width: 20, height: 2, background: color, borderRadius: 1, marginTop: 6, opacity: 0.7 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 12: Vercel Dark ───────────────────────────────────────────────────
function Theme12() {
  return (
    <div style={{ background: '#000', color: '#fff', fontFamily: 'Inter, -apple-system, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 76 65" fill="white"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
          <span style={{ fontWeight: 700, fontSize: 13 }}>ToolsPilot</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Tools', 'Docs', 'Blog'].map(n => <span key={n} style={{ fontSize: 11, color: '#888' }}>{n}</span>)}
        </div>
        <div style={{ background: '#fff', color: '#000', borderRadius: 6, padding: '5px 14px', fontSize: 11, fontWeight: 700 }}>Deploy</div>
      </div>
      {/* Hero — Vercel-style centered */}
      <div style={{ textAlign: 'center', padding: '32px 24px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111', border: '1px solid #333', borderRadius: 20, padding: '4px 12px', marginBottom: 16 }}>
          <span style={{ fontSize: 9, color: '#888' }}>✦ New</span>
          <span style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>122 tools now available</span>
          <span style={{ fontSize: 9, color: '#888' }}>→</span>
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px' }}>
          Your toolkit.<br />
          <span style={{ background: 'linear-gradient(90deg, #fff 0%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Deployed instantly.</span>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 10 }}>Free tools for every workflow. No account needed.</div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <div style={{ background: '#fff', color: '#000', borderRadius: 6, padding: '8px 18px', fontSize: 11, fontWeight: 700 }}>Browse Tools →</div>
          <div style={{ background: 'transparent', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '8px 18px', fontSize: 11, fontWeight: 600 }}>Learn more</div>
        </div>
      </div>
      {/* Tool cards — Vercel deployment card style */}
      <div style={{ padding: '0 24px', position: 'relative', zIndex: 2 }}>
        {[['Image Compressor', '🖼️', 'Ready', '#00FF88'], ['PDF Merger', '📄', 'Ready', '#00FF88'], ['JSON Formatter', '⚙️', 'Building', '#FFB800']].map(([name, icon, status, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#111', border: '1px solid #222', borderRadius: 8, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 9, color: '#555', marginTop: 1 }}>toolspilot.io/tools</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, background: color, borderRadius: '50%', boxShadow: `0 0 6px ${color}` }} />
              <span style={{ fontSize: 9, color: color, fontWeight: 600 }}>{status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 13: Raycast Inspired ──────────────────────────────────────────────
function Theme13() {
  return (
    <div style={{ background: '#1C1C1E', color: '#fff', fontFamily: '-apple-system, Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Gradient top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(180deg, #FF6363AA 0%, transparent 100%)', opacity: 0.15, pointerEvents: 'none' }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg, #FF6363, #FF9F43)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.3px' }}>ToolsPilot</span>
        </div>
        <div style={{ background: '#2C2C2E', border: '1px solid #3A3A3C', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 8, width: 180 }}>
          <span style={{ fontSize: 11, color: '#ffffff44' }}>🔍</span>
          <span style={{ fontSize: 11, color: '#ffffff33' }}>Search tools...</span>
          <span style={{ fontSize: 9, color: '#ffffff22', marginLeft: 'auto', background: '#3A3A3C', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {['Tools', 'Blog'].map(n => <span key={n} style={{ fontSize: 11, color: '#ffffff55' }}>{n}</span>)}
        </div>
      </div>
      {/* Hero */}
      <div style={{ padding: '24px 22px 16px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px' }}>
          Supercharge<br />your <span style={{ background: 'linear-gradient(90deg, #FF6363, #FF9F43)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>workflow.</span>
        </div>
        <div style={{ fontSize: 11, color: '#ffffff55', marginTop: 8 }}>122 tools. Instant. Free. No friction.</div>
      </div>
      {/* Raycast-style command list */}
      <div style={{ margin: '0 22px', background: '#2C2C2E', border: '1px solid #3A3A3C', borderRadius: 12, overflow: 'hidden', position: 'relative', zIndex: 2 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #3A3A3C', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#ffffff33' }}>TOOLS</span>
        </div>
        {[['🖼️', 'Image Compressor', 'Compress images instantly', '#FF6363'], ['📄', 'PDF Merger', 'Combine multiple PDFs', '#FF9F43'], ['🧩', 'JSON Formatter', 'Format & validate JSON', '#5E6AD2'], ['🔐', 'Password Generator', 'Generate secure passwords', '#10B981']].map(([icon, name, desc, color], i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: i === 0 ? '#FF636311' : 'transparent', borderBottom: '1px solid #3A3A3C' }}>
            <div style={{ width: 28, height: 28, background: `${color}22`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? '#fff' : '#ffffffCC' }}>{name}</div>
              <div style={{ fontSize: 9, color: '#ffffff44', marginTop: 1 }}>{desc}</div>
            </div>
            {i === 0 && <span style={{ fontSize: 9, color: '#FF6363', background: '#FF636322', padding: '2px 6px', borderRadius: 4 }}>↵</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 14: Stripe Gradient ───────────────────────────────────────────────
function Theme14() {
  return (
    <div style={{ background: '#0A2540', color: '#fff', fontFamily: '-apple-system, Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Stripe-style gradient mesh */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, #635BFF44, transparent 60%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, background: 'radial-gradient(circle, #00D4FF33, transparent 60%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #635BFF, #00D4FF)', borderRadius: '50%' }} />
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.5px' }}>ToolsPilot</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Products', 'Docs', 'Pricing'].map(n => <span key={n} style={{ fontSize: 11, color: '#ffffff88' }}>{n}</span>)}
        </div>
        <div style={{ background: '#635BFF', color: '#fff', borderRadius: 6, padding: '6px 16px', fontSize: 11, fontWeight: 700 }}>Start free →</div>
      </div>
      {/* Hero */}
      <div style={{ padding: '28px 24px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 11, color: '#635BFF', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10, textTransform: 'uppercase' }}>The all-in-one toolkit</div>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', maxWidth: 300 }}>
          Tools that work<br />as hard as you do.
        </div>
        <div style={{ fontSize: 11, color: '#ffffff66', marginTop: 10, lineHeight: 1.6 }}>122 professional tools. Free forever. No account required.</div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <div style={{ background: '#635BFF', color: '#fff', borderRadius: 6, padding: '8px 16px', fontSize: 11, fontWeight: 700 }}>Browse all tools</div>
          <div style={{ background: 'transparent', color: '#fff', border: '1px solid #ffffff33', borderRadius: 6, padding: '8px 16px', fontSize: 11 }}>See pricing</div>
        </div>
      </div>
      {/* Stripe-style feature cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 24px', position: 'relative', zIndex: 2 }}>
        {[['🖼️', 'Image Tools', '5 tools', '#635BFF'], ['📄', 'PDF Suite', '10 tools', '#00D4FF'], ['💰', 'Finance', '20 tools', '#00C896'], ['⚙️', 'Dev Tools', '19 tools', '#FF6B6B']].map(([icon, name, count, color]) => (
          <div key={name} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 8, color: color, background: `${color}22`, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>{count}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{name}</div>
            <div style={{ width: '100%', height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: 1, marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme 15: Luma / Event-style ────────────────────────────────────────────
function Theme15() {
  return (
    <div style={{ background: '#08080C', color: '#fff', fontFamily: 'Inter, sans-serif', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Iridescent orb */}
      <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'conic-gradient(from 0deg, #FF006E, #7C3AED, #00D4FF, #00FF88, #FFD700, #FF006E)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.25, pointerEvents: 'none' }} />
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', position: 'relative', zIndex: 2 }}>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #fff, #ffffff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ToolsPilot</span>
        <div style={{ display: 'flex', gap: 14 }}>
          {['Explore', 'Blog'].map(n => <span key={n} style={{ fontSize: 11, color: '#ffffff44' }}>{n}</span>)}
        </div>
        <div style={{ background: 'linear-gradient(135deg, #7C3AED, #FF006E)', color: '#fff', borderRadius: 20, padding: '5px 16px', fontSize: 11, fontWeight: 700 }}>Join free</div>
      </div>
      {/* Hero — Luma event card style */}
      <div style={{ textAlign: 'center', padding: '20px 22px 16px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #7C3AED22, #FF006E22)', border: '1px solid #ffffff11', borderRadius: 16, padding: '20px 24px', backdropFilter: 'blur(20px)', maxWidth: 280, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: '#ffffff55', marginBottom: 6, letterSpacing: '0.05em' }}>FREE · INSTANT · PRIVATE</div>
          <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px', background: 'linear-gradient(135deg, #fff, #ffffff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>122 Tools</div>
          <div style={{ fontSize: 11, color: '#ffffff66', marginTop: 6 }}>Everything you need, nothing you don't</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center' }}>
            {['🖼️', '📄', '📝', '⚙️', '💰', '🔐'].map(e => (
              <div key={e} style={{ width: 28, height: 28, background: '#ffffff11', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{e}</div>
            ))}
          </div>
        </div>
      </div>
      {/* Tool cards — Luma attendee card style */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 22px', position: 'relative', zIndex: 2 }}>
        {[['Image Compressor', '🖼️', '#FF006E'], ['PDF Merger', '📄', '#7C3AED'], ['JSON Formatter', '⚙️', '#00D4FF'], ['Password Gen', '🔐', '#00FF88']].map(([name, icon, color]) => (
          <div key={name} style={{ background: '#ffffff06', border: `1px solid ${color}33`, borderRadius: 12, padding: '10px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 9, color: color, marginTop: 3, fontWeight: 600 }}>Open →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Theme metadata ──────────────────────────────────────────────────────────
const THEMES = [
  { id: 1, name: 'Obsidian', description: 'Ultra-dark luxury with gold accents. CRED-inspired editorial feel.', component: Theme1 },
  { id: 2, name: 'Aurora', description: 'Vibrant gradient mesh with neon accents and animated blobs.', component: Theme2 },
  { id: 3, name: 'Minimal Pro', description: 'Apple.com-inspired. Massive typography, pure whitespace, zero clutter.', component: Theme3 },
  { id: 4, name: 'Neon Terminal', description: 'Hacker/developer aesthetic. Matrix green, monospace, scanlines.', component: Theme4 },
  { id: 5, name: 'Glassmorphism Pro', description: 'Next-gen layered glass with iridescent accents and deep blur.', component: Theme5 },
  { id: 6, name: 'Brutalist Bold', description: 'Raw editorial design. Thick borders, yellow on black, no radius.', component: Theme6 },
  { id: 7, name: 'Cosmic Dark', description: 'Space/sci-fi mission control. Star fields, glowing panels, nebula.', component: Theme7 },
  { id: 8, name: 'Warm Sunset', description: 'Friendly and approachable. Coral-to-gold gradients, soft shadows.', component: Theme8 },
  { id: 9, name: 'Monochrome Ink', description: 'B&W editorial with red as the single accent. Newspaper meets magazine.', component: Theme9 },
  { id: 10, name: 'Cyberpunk 2077', description: 'Neon dystopia. Pink/yellow glitch effects, skewed panels, scanlines.', component: Theme10 },
  { id: 11, name: 'Linear Dark', description: 'Linear.app-inspired. Subtle grid, indigo accents, command palette feel.', component: Theme11 },
  { id: 12, name: 'Vercel Dark', description: 'Vercel-inspired. Pure black, deployment cards, triangle logo aesthetic.', component: Theme12 },
  { id: 13, name: 'Raycast', description: 'Raycast-inspired. Command launcher UI, orange gradient, macOS feel.', component: Theme13 },
  { id: 14, name: 'Stripe', description: 'Stripe-inspired. Deep navy, purple gradient mesh, enterprise polish.', component: Theme14 },
  { id: 15, name: 'Luma', description: 'Luma-inspired. Iridescent orb, event card aesthetic, conic gradients.', component: Theme15 },
];

// ─── Theme Card ──────────────────────────────────────────────────────────────
function ThemeCard({ theme }) {
  const Component = theme.component;
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Number badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>{theme.id}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{theme.name}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{theme.description}</div>
        </div>
      </div>

      {/* Preview frame */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          minHeight: 700,
          border: hovered ? '2px solid #6366f1' : '2px solid #1e293b',
          boxShadow: hovered ? '0 0 32px #6366f144, 0 20px 60px #00000066' : '0 8px 32px #00000044',
          transition: 'border-color 0.25s, box-shadow 0.25s',
          cursor: 'default',
        }}
      >
        {/* Scale wrapper — renders theme at 1.5x then scales down */}
        <div style={{
          width: '200%',
          height: '200%',
          transform: 'scale(0.5)',
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}>
          <Component />
        </div>

        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 60%, #00000088 100%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Select button */}
      <button
        onClick={() => console.log(`Selected theme: ${theme.id} — ${theme.name}`)}
        style={{
          marginTop: 14,
          padding: '11px 0',
          borderRadius: 10,
          border: '1px solid #334155',
          background: hovered ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#0f172a',
          color: hovered ? '#fff' : '#94a3b8',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.25s, color 0.25s, border-color 0.25s',
          letterSpacing: '0.02em',
          fontFamily: 'Inter, sans-serif',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = 'transparent';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#0f172a';
          e.currentTarget.style.color = '#94a3b8';
          e.currentTarget.style.borderColor = '#334155';
        }}
      >
        Select This Theme
      </button>
    </div>
  );
}

// ─── UIShowcase Page ─────────────────────────────────────────────────────────
export default function UIShowcase() {
  return (
    <div style={{ minHeight: '100vh', background: '#020817', fontFamily: 'Inter, sans-serif' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(2, 8, 23, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #1e293b',
        padding: '18px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
            UI Theme Showcase
            <span style={{ background: 'linear-gradient(90deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> — Pick Your Favorite</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>10 homepage concepts · Hover to preview · Click to select</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '6px 14px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>10 themes loaded</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
        gap: 48,
        padding: '48px 40px 80px',
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        {THEMES.map(theme => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
      </div>
    </div>
  );
}
