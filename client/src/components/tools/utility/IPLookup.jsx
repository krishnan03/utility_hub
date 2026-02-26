import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const btnGradient = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };

const FIELD_LABELS = {
  ip: 'IP Address', country_name: 'Country', region: 'Region', city: 'City',
  org: 'ISP / Org', asn: 'ASN', timezone: 'Timezone',
  latitude: 'Latitude', longitude: 'Longitude', postal: 'Postal Code',
  currency: 'Currency', languages: 'Languages', connection_type: 'Connection Type',
};

const FIELD_ICONS = {
  ip: '🌐', country_name: '🏳️', region: '📍', city: '🏙️',
  org: '🏢', asn: '🔗', timezone: '🕐', latitude: '🗺️', longitude: '🗺️',
  postal: '📮', currency: '💱', languages: '🗣️', connection_type: '📶',
};

export default function IPLookup() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const lookup = async (ip) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const target = ip || query.trim() || 'json';
      const url = target === 'json' || target === 'my ip' || target === ''
        ? 'https://ipapi.co/json/'
        : `https://ipapi.co/${encodeURIComponent(target)}/json/`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.reason || 'Lookup failed');
      setData(json);
    } catch (e) {
      setError(e.message || 'Failed to look up IP. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); lookup(); };

  const lat = data?.latitude;
  const lng = data?.longitude;
  const mapUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  const osmEmbedUrl = lat && lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}&layer=mapnik&marker=${lat},${lng}`
    : null;

  const handleCopyAll = () => {
    if (!data) return;
    const lines = Object.entries(FIELD_LABELS).map(([key, label]) => {
      const val = data[key];
      return val ? `${label}: ${val}` : null;
    }).filter(Boolean);
    if (data.proxy) lines.push('Proxy: Yes');
    if (data.vpn) lines.push('VPN: Yes');
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h2 className="text-lg font-bold text-surface-100">IP Address Lookup</h2>
        <p className="text-xs text-surface-500">Uses ipapi.co — free tier, 1,000 requests/day</p>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Enter IP address (e.g. 8.8.8.8) or leave blank for your IP"
            className="flex-1 px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={inputStyle} />
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            type="submit" disabled={loading}
            className="px-5 py-2 rounded-xl font-medium text-white min-h-[44px] disabled:opacity-50 whitespace-nowrap"
            style={btnGradient}>
            {loading ? '...' : 'Lookup'}
          </motion.button>
        </form>

        <button onClick={() => { setQuery(''); lookup(''); }} disabled={loading}
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50">
          📡 Detect My IP
        </button>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-3 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {data && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Header card */}
            <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-2xl font-bold font-mono text-surface-100">{data.ip}</p>
                  {data.country_name && (
                    <p className="text-sm text-surface-400 mt-0.5">
                      {data.city && `${data.city}, `}{data.region && `${data.region}, `}{data.country_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleCopyAll}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 min-h-[44px]"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {copied ? '✓ Copied' : '📋 Copy All'}
                  </motion.button>
                  {mapUrl && (
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 flex items-center gap-1.5 min-h-[44px]"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      🗺️ Google Maps
                    </a>
                  )}
                </div>
              </div>

              {/* Threat/proxy badges */}
              {(data.proxy || data.vpn) && (
                <div className="flex gap-2">
                  {data.proxy && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold text-amber-400" style={{ background: 'rgba(255,159,67,0.12)' }}>
                      ⚠️ Proxy Detected
                    </span>
                  )}
                  {data.vpn && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold text-purple-400" style={{ background: 'rgba(168,85,247,0.12)' }}>
                      🛡️ VPN Detected
                    </span>
                  )}
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const val = data[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-lg leading-none mt-0.5">{FIELD_ICONS[key]}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-surface-400">{label}</p>
                        <p className="text-sm font-medium text-surface-100 truncate">{String(val)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OpenStreetMap embed */}
            {osmEmbedUrl && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-2xl overflow-hidden" style={cardStyle}>
                <iframe
                  src={osmEmbedUrl}
                  className="w-full h-48 rounded-xl"
                  title="IP Location Map"
                  loading="lazy"
                  style={{ border: 'none' }}
                />
                <div className="px-4 py-2">
                  <p className="text-xs text-surface-500">
                    Coordinates: {lat}, {lng}
                    {' · '}
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">
                      Open in Google Maps ↗
                    </a>
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
