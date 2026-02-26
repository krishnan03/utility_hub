import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ───────────────────────────────────────────────────────────────

const JSONLD_TYPES = ['Article', 'Product', 'FAQ', 'LocalBusiness', 'Event'];

const JSONLD_FIELDS = {
  Article: [
    { key: 'headline', label: 'Headline', placeholder: 'Article headline' },
    { key: 'author', label: 'Author Name', placeholder: 'John Doe' },
    { key: 'datePublished', label: 'Date Published', placeholder: '2024-01-15', type: 'date' },
    { key: 'dateModified', label: 'Date Modified', placeholder: '2024-01-20', type: 'date' },
    { key: 'image', label: 'Image URL', placeholder: 'https://example.com/image.jpg' },
    { key: 'publisher', label: 'Publisher Name', placeholder: 'My Website' },
  ],
  Product: [
    { key: 'name', label: 'Product Name', placeholder: 'Amazing Widget' },
    { key: 'description', label: 'Description', placeholder: 'A great product...' },
    { key: 'image', label: 'Image URL', placeholder: 'https://example.com/product.jpg' },
    { key: 'brand', label: 'Brand', placeholder: 'BrandName' },
    { key: 'price', label: 'Price', placeholder: '29.99' },
    { key: 'currency', label: 'Currency', placeholder: 'USD' },
    { key: 'availability', label: 'Availability', placeholder: 'InStock' },
  ],
  FAQ: [
    { key: 'q1', label: 'Question 1', placeholder: 'What is this product?' },
    { key: 'a1', label: 'Answer 1', placeholder: 'This product is...' },
    { key: 'q2', label: 'Question 2', placeholder: 'How does it work?' },
    { key: 'a2', label: 'Answer 2', placeholder: 'It works by...' },
    { key: 'q3', label: 'Question 3', placeholder: 'Where can I buy it?' },
    { key: 'a3', label: 'Answer 3', placeholder: 'You can buy it at...' },
  ],
  LocalBusiness: [
    { key: 'name', label: 'Business Name', placeholder: 'My Business' },
    { key: 'description', label: 'Description', placeholder: 'A local business...' },
    { key: 'image', label: 'Image URL', placeholder: 'https://example.com/business.jpg' },
    { key: 'telephone', label: 'Phone', placeholder: '+1-555-0100' },
    { key: 'address', label: 'Street Address', placeholder: '123 Main St' },
    { key: 'city', label: 'City', placeholder: 'Springfield' },
    { key: 'state', label: 'State', placeholder: 'IL' },
    { key: 'zip', label: 'Postal Code', placeholder: '62701' },
    { key: 'country', label: 'Country', placeholder: 'US' },
  ],
  Event: [
    { key: 'name', label: 'Event Name', placeholder: 'Tech Conference 2024' },
    { key: 'description', label: 'Description', placeholder: 'An amazing event...' },
    { key: 'startDate', label: 'Start Date', placeholder: '2024-06-15T09:00', type: 'datetime-local' },
    { key: 'endDate', label: 'End Date', placeholder: '2024-06-15T17:00', type: 'datetime-local' },
    { key: 'location', label: 'Location Name', placeholder: 'Convention Center' },
    { key: 'address', label: 'Address', placeholder: '123 Event Blvd' },
    { key: 'image', label: 'Image URL', placeholder: 'https://example.com/event.jpg' },
    { key: 'price', label: 'Ticket Price', placeholder: '49.99' },
    { key: 'currency', label: 'Currency', placeholder: 'USD' },
  ],
};

const ROBOTS_OPTIONS = [
  { key: 'index', label: 'index', desc: 'Allow indexing' },
  { key: 'follow', label: 'follow', desc: 'Follow links' },
  { key: 'noindex', label: 'noindex', desc: 'Prevent indexing' },
  { key: 'nofollow', label: 'nofollow', desc: 'Don\'t follow links' },
  { key: 'noarchive', label: 'noarchive', desc: 'No cached copy' },
  { key: 'nosnippet', label: 'nosnippet', desc: 'No text snippet' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(44,44,46,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, counter, maxLen, overLimit, type = 'text', rows }) {
  const cls = 'w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';
  const style = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-surface-300">{label}</label>
        {counter !== undefined && (
          <span className={`text-xs font-mono ${overLimit ? 'text-red-400 font-semibold' : 'text-surface-500'}`}>
            {counter}/{maxLen}{overLimit && ' ⚠'}
          </span>
        )}
      </div>
      {rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} maxLength={maxLen ? maxLen + 40 : undefined}
          placeholder={placeholder} className={`${cls} resize-none`} style={style} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLen ? maxLen + 20 : undefined}
          placeholder={placeholder} className={cls} style={style} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
        active
          ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-lg shadow-primary-500/20'
          : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04]'
      }`}
    >
      {children}
    </button>
  );
}

function CopyButton({ text, label = 'Copy All' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy}
      className="px-4 py-1.5 text-sm rounded-xl font-medium transition-all bg-gradient-to-r from-primary-500 to-primary-400 text-white hover:shadow-lg hover:shadow-primary-500/25 hover:scale-105 active:scale-95">
      {copied ? '✓ Copied!' : label}
    </button>
  );
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return 'example.com'; }
}

function getBreadcrumb(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts.length ? `${u.hostname} › ${parts.join(' › ')}` : u.hostname;
  } catch { return 'example.com'; }
}

function buildJsonLd(type, data) {
  if (type === 'Article') {
    return {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: data.headline || '', author: { '@type': 'Person', name: data.author || '' },
      datePublished: data.datePublished || '', dateModified: data.dateModified || '',
      image: data.image || '',
      publisher: { '@type': 'Organization', name: data.publisher || '' },
    };
  }
  if (type === 'Product') {
    return {
      '@context': 'https://schema.org', '@type': 'Product',
      name: data.name || '', description: data.description || '', image: data.image || '',
      brand: { '@type': 'Brand', name: data.brand || '' },
      offers: {
        '@type': 'Offer', price: data.price || '', priceCurrency: data.currency || 'USD',
        availability: `https://schema.org/${data.availability || 'InStock'}`,
      },
    };
  }
  if (type === 'FAQ') {
    const items = [];
    for (let i = 1; i <= 3; i++) {
      if (data[`q${i}`] && data[`a${i}`]) {
        items.push({ '@type': 'Question', name: data[`q${i}`], acceptedAnswer: { '@type': 'Answer', text: data[`a${i}`] } });
      }
    }
    return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items };
  }
  if (type === 'LocalBusiness') {
    return {
      '@context': 'https://schema.org', '@type': 'LocalBusiness',
      name: data.name || '', description: data.description || '', image: data.image || '',
      telephone: data.telephone || '',
      address: {
        '@type': 'PostalAddress', streetAddress: data.address || '',
        addressLocality: data.city || '', addressRegion: data.state || '',
        postalCode: data.zip || '', addressCountry: data.country || '',
      },
    };
  }
  if (type === 'Event') {
    return {
      '@context': 'https://schema.org', '@type': 'Event',
      name: data.name || '', description: data.description || '',
      startDate: data.startDate || '', endDate: data.endDate || '',
      image: data.image || '',
      location: { '@type': 'Place', name: data.location || '', address: data.address || '' },
      ...(data.price ? { offers: { '@type': 'Offer', price: data.price, priceCurrency: data.currency || 'USD' } } : {}),
    };
  }
  return {};
}

// ─── Preview Components ──────────────────────────────────────────────────────

function GooglePreview({ title, description, url }) {
  const displayTitle = title || 'Page Title';
  const displayDesc = description || 'Your meta description will appear here. Write a compelling description to improve click-through rates from search results.';
  const truncTitle = displayTitle.length > 60 ? displayTitle.slice(0, 57) + '...' : displayTitle;
  const truncDesc = displayDesc.length > 160 ? displayDesc.slice(0, 157) + '...' : displayDesc;
  const domain = getDomain(url || 'https://example.com');
  const breadcrumb = getBreadcrumb(url || 'https://example.com');

  return (
    <div className="rounded-xl p-5 max-w-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
      {/* Favicon + site name + breadcrumb */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #4285f4, #34a853)' }}>
          {domain.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-surface-200 leading-tight truncate">{domain}</div>
          <div className="text-xs text-surface-500 truncate">{breadcrumb}</div>
        </div>
      </div>
      {/* Title */}
      <h3 className="text-xl leading-snug mt-2 mb-1 cursor-pointer hover:underline" style={{ color: '#8ab4f8', fontFamily: 'Arial, sans-serif' }}>
        {truncTitle}
      </h3>
      {/* Description */}
      <p className="text-sm leading-relaxed" style={{ color: '#9aa0a6', fontFamily: 'Arial, sans-serif' }}>
        {truncDesc}
      </p>
    </div>
  );
}

function FacebookPreview({ title, description, url, image }) {
  const domain = getDomain(url || 'https://example.com').toUpperCase();
  const displayTitle = title || 'Page Title';
  const displayDesc = description || 'Page description will appear here...';
  const truncTitle = displayTitle.length > 65 ? displayTitle.slice(0, 62) + '...' : displayTitle;
  const truncDesc = displayDesc.length > 155 ? displayDesc.slice(0, 152) + '...' : displayDesc;

  return (
    <div className="rounded-lg overflow-hidden max-w-lg" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
      {/* Image area */}
      <div className="w-full h-52 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {image ? (
          <img src={image} alt="OG Preview" className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div className={`${image ? 'hidden' : 'flex'} w-full h-full items-center justify-center flex-col gap-2`}>
          <svg className="w-12 h-12 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-surface-600">1200 × 630 recommended</span>
        </div>
      </div>
      {/* Text area */}
      <div className="px-4 py-3 space-y-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="text-xs text-surface-500 uppercase tracking-wide">{domain}</div>
        <div className="text-surface-100 font-semibold leading-tight">{truncTitle}</div>
        <div className="text-sm text-surface-400 leading-snug">{truncDesc}</div>
      </div>
    </div>
  );
}

function TwitterPreview({ title, description, url, image }) {
  const domain = getDomain(url || 'https://example.com');
  const displayTitle = title || 'Page Title';
  const displayDesc = description || 'Page description will appear here...';
  const truncTitle = displayTitle.length > 70 ? displayTitle.slice(0, 67) + '...' : displayTitle;
  const truncDesc = displayDesc.length > 125 ? displayDesc.slice(0, 122) + '...' : displayDesc;

  return (
    <div className="rounded-2xl overflow-hidden max-w-lg" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
      {/* Image area */}
      <div className="w-full h-52 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {image ? (
          <img src={image} alt="Twitter Card" className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div className={`${image ? 'hidden' : 'flex'} w-full h-full items-center justify-center flex-col gap-2`}>
          <svg className="w-12 h-12 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-surface-600">Summary large image</span>
        </div>
      </div>
      {/* Text area */}
      <div className="px-4 py-3 space-y-0.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="text-surface-100 font-semibold leading-tight">{truncTitle}</div>
        <div className="text-sm text-surface-400 leading-snug">{truncDesc}</div>
        <div className="flex items-center gap-1.5 pt-1">
          <svg className="w-3.5 h-3.5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-xs text-surface-500">{domain}</span>
        </div>
      </div>
    </div>
  );
}


// ─── Main Component ──────────────────────────────────────────────────────────

export default function MetaTagGenerator() {
  const [fields, setFields] = useState({
    title: '', description: '', keywords: '', author: '',
    ogImage: '', twitter: '', canonical: '',
  });
  const [activeTab, setActiveTab] = useState('meta');
  const [previewTab, setPreviewTab] = useState('google');
  const [jsonLdType, setJsonLdType] = useState('Article');
  const [jsonLdData, setJsonLdData] = useState({});
  const [jsonLdCopied, setJsonLdCopied] = useState(false);
  const [robots, setRobots] = useState({ index: true, follow: true, noindex: false, nofollow: false, noarchive: false, nosnippet: false });

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));
  const setLd = (k, v) => setJsonLdData(d => ({ ...d, [k]: v }));
  const toggleRobot = (k) => setRobots(r => {
    const next = { ...r, [k]: !r[k] };
    // Mutual exclusion: index/noindex, follow/nofollow
    if (k === 'index' && next.index) next.noindex = false;
    if (k === 'noindex' && next.noindex) next.index = false;
    if (k === 'follow' && next.follow) next.nofollow = false;
    if (k === 'nofollow' && next.nofollow) next.follow = false;
    return next;
  });

  const titleLen = fields.title.length;
  const descLen = fields.description.length;

  // Robots meta content
  const robotsContent = useMemo(() => {
    const parts = Object.entries(robots).filter(([, v]) => v).map(([k]) => k);
    return parts.length ? parts.join(', ') : 'index, follow';
  }, [robots]);

  // Meta tags output
  const tags = useMemo(() => [
    fields.title && `<title>${fields.title}</title>`,
    fields.title && `<meta name="title" content="${fields.title}">`,
    fields.description && `<meta name="description" content="${fields.description}">`,
    fields.keywords && `<meta name="keywords" content="${fields.keywords}">`,
    fields.author && `<meta name="author" content="${fields.author}">`,
    fields.canonical && `<link rel="canonical" href="${fields.canonical}">`,
    `<meta name="robots" content="${robotsContent}">`,
    '',
    '<!-- Open Graph -->',
    fields.title && `<meta property="og:title" content="${fields.title}">`,
    fields.description && `<meta property="og:description" content="${fields.description}">`,
    fields.ogImage && `<meta property="og:image" content="${fields.ogImage}">`,
    fields.canonical && `<meta property="og:url" content="${fields.canonical}">`,
    '<meta property="og:type" content="website">',
    '',
    '<!-- Twitter Card -->',
    '<meta name="twitter:card" content="summary_large_image">',
    fields.twitter && `<meta name="twitter:site" content="@${fields.twitter.replace('@', '')}">`,
    fields.title && `<meta name="twitter:title" content="${fields.title}">`,
    fields.description && `<meta name="twitter:description" content="${fields.description}">`,
    fields.ogImage && `<meta name="twitter:image" content="${fields.ogImage}">`,
  ].filter(Boolean).join('\n'), [fields, robotsContent]);

  // JSON-LD output
  const jsonLdOutput = useMemo(() => {
    const ld = buildJsonLd(jsonLdType, jsonLdData);
    return JSON.stringify(ld, null, 2);
  }, [jsonLdType, jsonLdData]);

  const jsonLdScript = useMemo(() =>
    `<script type="application/ld+json">\n${jsonLdOutput}\n</script>`,
    [jsonLdOutput]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Top-level tabs ── */}
      <div className="flex gap-2">
        <TabButton active={activeTab === 'meta'} onClick={() => setActiveTab('meta')}>Meta Tags</TabButton>
        <TabButton active={activeTab === 'jsonld'} onClick={() => setActiveTab('jsonld')}>Structured Data (JSON-LD)</TabButton>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'meta' ? (
          <motion.div key="meta" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }} className="space-y-6">

            {/* ── Input Fields ── */}
            <GlassCard className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Title" value={fields.title} onChange={v => set('title', v)} placeholder="Page title"
                  counter={titleLen} maxLen={60} overLimit={titleLen > 60} />
                <InputField label="Author" value={fields.author} onChange={v => set('author', v)} placeholder="Author name" />
                <div className="sm:col-span-2">
                  <InputField label="Description" value={fields.description} onChange={v => set('description', v)}
                    placeholder="Meta description — aim for 150-160 characters" counter={descLen} maxLen={160} overLimit={descLen > 160} rows={2} />
                </div>
                <div className="sm:col-span-2">
                  <InputField label="Keywords (comma-separated)" value={fields.keywords} onChange={v => set('keywords', v)} placeholder="seo, tools, meta tags" />
                </div>
                <InputField label="OG Image URL" value={fields.ogImage} onChange={v => set('ogImage', v)} placeholder="https://example.com/image.jpg" />
                <InputField label="Twitter Handle" value={fields.twitter} onChange={v => set('twitter', v)} placeholder="@username" />
                <div className="sm:col-span-2">
                  <InputField label="Canonical URL" value={fields.canonical} onChange={v => set('canonical', v)} placeholder="https://example.com/page" />
                </div>
              </div>
            </GlassCard>

            {/* ── Robots Meta ── */}
            <GlassCard className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Robots Meta Tag
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ROBOTS_OPTIONS.map(opt => (
                  <label key={opt.key}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      robots[opt.key] ? 'ring-1 ring-primary-500/40 bg-primary-500/5' : 'hover:bg-white/[0.03]'
                    }`}
                    style={{ background: robots[opt.key] ? undefined : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <input type="checkbox" checked={robots[opt.key]} onChange={() => toggleRobot(opt.key)}
                      className="w-4 h-4 rounded accent-primary-500" />
                    <div>
                      <div className="text-sm font-mono text-surface-200">{opt.label}</div>
                      <div className="text-xs text-surface-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="rounded-xl p-3 text-xs font-mono text-surface-400" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {`<meta name="robots" content="${robotsContent}">`}
              </div>
            </GlassCard>

            {/* ── Previews ── */}
            {(fields.title || fields.description) && (
              <GlassCard className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-surface-300">Live Previews</h3>
                  <div className="flex gap-1.5">
                    <TabButton active={previewTab === 'google'} onClick={() => setPreviewTab('google')}>Google</TabButton>
                    <TabButton active={previewTab === 'facebook'} onClick={() => setPreviewTab('facebook')}>Facebook</TabButton>
                    <TabButton active={previewTab === 'twitter'} onClick={() => setPreviewTab('twitter')}>Twitter/X</TabButton>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {previewTab === 'google' && (
                    <motion.div key="gp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <GooglePreview title={fields.title} description={fields.description} url={fields.canonical} />
                      <div className="flex gap-4 mt-3 text-xs">
                        <span className={titleLen > 60 ? 'text-red-400' : 'text-surface-500'}>
                          Title: {titleLen}/60 {titleLen > 60 && '— too long, will be truncated'}
                        </span>
                        <span className={descLen > 160 ? 'text-red-400' : 'text-surface-500'}>
                          Description: {descLen}/160 {descLen > 160 && '— too long, will be truncated'}
                        </span>
                      </div>
                    </motion.div>
                  )}
                  {previewTab === 'facebook' && (
                    <motion.div key="fp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <div className="text-xs text-surface-500 mb-3">How your link appears on Facebook & LinkedIn</div>
                      <FacebookPreview title={fields.title} description={fields.description} url={fields.canonical} image={fields.ogImage} />
                    </motion.div>
                  )}
                  {previewTab === 'twitter' && (
                    <motion.div key="tp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <div className="text-xs text-surface-500 mb-3">Summary Large Image card on Twitter/X</div>
                      <TwitterPreview title={fields.title} description={fields.description} url={fields.canonical} image={fields.ogImage} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            )}

            {/* ── Generated Output ── */}
            <GlassCard className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-300">Generated Meta Tags</h3>
                <CopyButton text={tags} />
              </div>
              <pre className="rounded-xl p-4 text-xs font-mono text-surface-300 overflow-x-auto whitespace-pre-wrap"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {tags || '<!-- Fill in the fields above -->'}
              </pre>
            </GlassCard>
          </motion.div>
        ) : (
          /* ── JSON-LD Tab ── */
          <motion.div key="jsonld" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="space-y-6">

            <GlassCard className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Structured Data Type
                </h3>
              </div>

              {/* Type selector */}
              <div className="flex flex-wrap gap-2">
                {JSONLD_TYPES.map(t => (
                  <button key={t} onClick={() => { setJsonLdType(t); setJsonLdData({}); }}
                    className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
                      jsonLdType === t
                        ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-lg shadow-primary-500/20'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04]'
                    }`}
                    style={jsonLdType !== t ? { border: '1px solid rgba(255,255,255,0.08)' } : undefined}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Dynamic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(JSONLD_FIELDS[jsonLdType] || []).map(f => (
                  <InputField key={f.key} label={f.label} value={jsonLdData[f.key] || ''} onChange={v => setLd(f.key, v)}
                    placeholder={f.placeholder} type={f.type || 'text'} />
                ))}
              </div>
            </GlassCard>

            {/* JSON-LD Output */}
            <GlassCard className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-300">Generated JSON-LD</h3>
                <CopyButton text={jsonLdScript} label="Copy Script Tag" />
              </div>
              <pre className="rounded-xl p-4 text-xs font-mono text-surface-300 overflow-x-auto whitespace-pre-wrap"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {jsonLdScript}
              </pre>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
