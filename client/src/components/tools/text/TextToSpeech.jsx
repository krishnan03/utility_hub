import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function TextToSpeech() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) {
        setVoices(v);
        setSelectedVoice(v[0]?.name || '');
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const play = () => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => { setSpeaking(true); setPaused(false); };
    utterance.onend = () => { setSpeaking(false); setPaused(false); };
    utterance.onerror = () => { setSpeaking(false); setPaused(false); };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (speaking && !paused) {
      window.speechSynthesis.pause();
      setPaused(true);
    } else if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {!supported && (
        <div className="border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Your browser doesn't support the Web Speech API.
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        Uses your browser's built-in text-to-speech. Available voices depend on your OS and browser.
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
          placeholder="Enter text to speak..."
        />

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
            >
              {voices.map(v => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
              {voices.length === 0 && <option>Loading voices...</option>}
            </select>
          </div>

          {[
            { label: 'Rate', value: rate, setter: setRate, min: 0.5, max: 2, step: 0.1, display: `${rate.toFixed(1)}x` },
            { label: 'Pitch', value: pitch, setter: setPitch, min: 0.5, max: 2, step: 0.1, display: pitch.toFixed(1) },
            { label: 'Volume', value: volume, setter: setVolume, min: 0, max: 1, step: 0.1, display: `${Math.round(volume * 100)}%` },
          ].map(({ label, value, setter, min, max, step, display }) => (
            <div key={label} className="flex items-center gap-3">
              <label className="text-sm text-surface-400 w-16">{label}</label>
              <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => setter(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-sm font-mono text-surface-300 w-12 text-right">{display}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={play}
            disabled={!text.trim() || !supported}
            className="px-4 py-2 bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <span>▶</span> Play
          </button>
          <button
            onClick={pause}
            disabled={!speaking}
            className="px-4 py-2 hover:bg-white/5 disabled:opacity-50 text-surface-300 rounded-xl font-medium transition-colors"
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={stop}
            disabled={!speaking && !paused}
            className="px-4 py-2 hover:bg-white/5 disabled:opacity-50 text-surface-300 rounded-xl font-medium transition-colors"
          >
            ⏹ Stop
          </button>
        </div>

        {speaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-primary-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            {paused ? 'Paused' : 'Speaking...'}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
