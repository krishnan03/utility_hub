/**
 * Password & Passphrase Generator
 * Pure client-side, no server calls (except optional HIBP k-anonymity check).
 * Includes zxcvbn-style strength estimation, EFF-inspired wordlist, and breach checking.
 */

// ─── Character Sets ──────────────────────────────────────────────────────────

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

// ─── Common Passwords (top 100 for pattern detection) ────────────────────────

const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
  'dragon', '111111', 'baseball', 'iloveyou', 'trustno1', 'sunshine',
  'princess', 'football', 'charlie', 'shadow', 'michael', 'login',
  'letmein', 'superman', 'hello', 'welcome', 'admin', 'passw0rd',
  '1234567', '12345', '1234567890', '123123', '654321', 'password1',
  'qwerty123', 'qwertyuiop', '1q2w3e4r', 'zaq1xsw2', 'password123',
  'access', 'flower', 'hottie', 'loveme', 'zaq1zaq1', 'test',
  'whatever', 'donald', 'batman', 'starwars', 'summer', 'ashley',
  'bailey', 'buster', 'harley', 'jordan', 'robert', 'thomas',
  'hockey', 'ranger', 'daniel', 'hunter', 'andrew', 'joshua',
  'matthew', 'george', 'soccer', 'killer', 'pepper', 'ginger',
  'cookie', 'cheese', 'butter', 'coffee', 'chicken', 'orange',
  'banana', 'purple', 'silver', 'golden', 'diamond', 'secret',
  'freedom', 'thunder', 'hammer', 'knight', 'wizard', 'ninja',
  'pirate', 'rocket', 'falcon', 'phoenix', 'legend', 'magic',
  'spirit', 'storm', 'blaze', 'power', 'turbo', 'cyber',
  'alpha', 'omega', 'delta', 'sigma', 'matrix', 'system',
  'hacker', 'gaming', 'player', 'winner', 'champion', 'victory',
]);

// ─── EFF-inspired Wordlist (200+ common English words) ───────────────────────

const EFF_WORDLIST = [
  'abandon', 'ability', 'absorb', 'account', 'achieve', 'acorn', 'action',
  'active', 'adapt', 'adjust', 'advance', 'advice', 'afford', 'agenda',
  'agree', 'airport', 'alarm', 'album', 'alert', 'alien', 'alpha',
  'anchor', 'angel', 'animal', 'annual', 'answer', 'apple', 'arctic',
  'arena', 'armor', 'arrow', 'artist', 'atlas', 'autumn', 'avocado',
  'badge', 'bamboo', 'banana', 'banner', 'barrel', 'basket', 'beacon',
  'blanket', 'blizzard', 'blossom', 'bonus', 'bottle', 'bounce', 'brave',
  'breeze', 'bridge', 'bronze', 'bubble', 'bucket', 'buffalo', 'bumper',
  'cabin', 'cactus', 'camera', 'campus', 'candle', 'canyon', 'captain',
  'carbon', 'carpet', 'castle', 'catalog', 'cedar', 'cellar', 'chapter',
  'cherry', 'chicken', 'chimney', 'circle', 'citrus', 'clever', 'climate',
  'cobalt', 'coconut', 'coffee', 'comet', 'compass', 'copper', 'coral',
  'cotton', 'cradle', 'crystal', 'curtain', 'cushion', 'cypress',
  'dagger', 'dancer', 'danger', 'dazzle', 'debris', 'decade', 'defend',
  'delta', 'desert', 'device', 'diesel', 'dinner', 'dolphin', 'donkey',
  'dragon', 'dream', 'driver', 'durable', 'dynamic',
  'eagle', 'eclipse', 'editor', 'effort', 'elbow', 'elegant', 'element',
  'ember', 'empire', 'enable', 'energy', 'engine', 'enjoy', 'enough',
  'envelope', 'episode', 'equip', 'escape', 'eternal', 'evening', 'evolve',
  'fabric', 'falcon', 'family', 'fantasy', 'fashion', 'feather', 'fence',
  'festival', 'fiction', 'filter', 'finger', 'firefly', 'flannel', 'flavor',
  'flight', 'flower', 'forest', 'fossil', 'fountain', 'frozen', 'furnace',
  'galaxy', 'garden', 'garlic', 'gather', 'gentle', 'geyser', 'ginger',
  'glacier', 'glimpse', 'global', 'golden', 'gorilla', 'gossip', 'granite',
  'gravity', 'guitar', 'gutter',
  'hammer', 'harbor', 'harvest', 'hazard', 'helmet', 'hidden', 'highway',
  'hollow', 'horizon', 'humble', 'hunter', 'hybrid',
  'iceberg', 'ignite', 'impact', 'import', 'impulse', 'indoor', 'infant',
  'insect', 'install', 'intact', 'invent', 'island', 'ivory',
  'jacket', 'jaguar', 'jargon', 'jelly', 'jersey', 'jewel', 'jigsaw',
  'journal', 'jungle', 'junior', 'justice',
  'kayak', 'kernel', 'kettle', 'kidney', 'kingdom', 'kitchen', 'kitten',
  'knight', 'knuckle',
  'ladder', 'lagoon', 'lantern', 'laptop', 'launch', 'lava', 'leader',
  'legend', 'lemon', 'leopard', 'letter', 'liberty', 'library', 'linen',
  'lizard', 'lobster', 'lumber', 'lunar',
  'magnet', 'mango', 'mansion', 'marble', 'market', 'meadow', 'melody',
  'mentor', 'method', 'mirror', 'mission', 'mobile', 'monkey', 'monster',
  'mosaic', 'muffin', 'museum', 'mustard',
  'napkin', 'nature', 'nebula', 'needle', 'nephew', 'neutral', 'nimble',
  'noble', 'noodle', 'normal', 'novel', 'number', 'nutmeg',
  'object', 'observe', 'obtain', 'ocean', 'octopus', 'olive', 'onion',
  'opera', 'option', 'orange', 'orbit', 'orchid', 'origin', 'osprey',
  'outfit', 'oxygen',
  'paddle', 'palace', 'panda', 'panther', 'parcel', 'patrol', 'pebble',
  'pelican', 'pencil', 'pepper', 'permit', 'phoenix', 'pillow', 'planet',
  'plunge', 'pocket', 'ponder', 'portal', 'potato', 'powder', 'prism',
  'public', 'pumpkin', 'puzzle',
  'quartz', 'queen', 'query', 'quest', 'quiver', 'quota',
  'rabbit', 'racket', 'random', 'ranger', 'raven', 'reason', 'recipe',
  'reform', 'region', 'relief', 'remote', 'rescue', 'result', 'ribbon',
  'ripple', 'ritual', 'rocket', 'roster', 'rubber', 'rumble',
  'saddle', 'safari', 'salmon', 'sandal', 'saturn', 'scatter', 'school',
  'season', 'secret', 'shadow', 'shelter', 'shield', 'signal', 'silver',
  'simple', 'sketch', 'slogan', 'sniper', 'socket', 'solar', 'spider',
  'spirit', 'sponge', 'stable', 'statue', 'stereo', 'storm', 'studio',
  'summit', 'sunset', 'supply', 'switch', 'symbol',
  'tablet', 'talent', 'target', 'temple', 'tender', 'theory', 'thirst',
  'throne', 'ticket', 'timber', 'tissue', 'tomato', 'topple', 'tornado',
  'travel', 'trophy', 'tunnel', 'turtle', 'twelve',
  'umbrella', 'unfold', 'unique', 'unlock', 'update', 'upward', 'useful',
  'vacant', 'valley', 'vanish', 'velvet', 'vendor', 'venture', 'vessel',
  'vintage', 'violin', 'virtual', 'vivid', 'volcano', 'voyage',
  'waffle', 'wallet', 'walnut', 'wander', 'wealth', 'weapon', 'whisper',
  'wicked', 'window', 'winter', 'wisdom', 'wonder', 'worthy',
  'yellow', 'yogurt', 'zenith', 'zigzag', 'zombie', 'zephyr',
];

// ─── Crypto Helpers ──────────────────────────────────────────────────────────

/**
 * Get a cryptographically random integer in [0, max).
 */
function randomInt(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

// ─── Strength Estimation (zxcvbn-style) ──────────────────────────────────────

/**
 * Detect sequential character runs (abc, 123, cba, 321).
 * Returns the count of sequential triplets found.
 */
function countSequentialPatterns(password) {
  let count = 0;
  const lower = password.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    // Forward sequential (abc, 123)
    if (b === a + 1 && c === a + 2) count++;
    // Reverse sequential (cba, 321)
    if (b === a - 1 && c === a - 2) count++;
  }
  return count;
}

/**
 * Detect repeated character runs (aaa, 111).
 * Returns the count of repeated triplets found.
 */
function countRepeatedPatterns(password) {
  let count = 0;
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      count++;
    }
  }
  return count;
}

/**
 * Calculate the effective character pool size based on what's in the password.
 */
function getCharPoolSize(password) {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
  return pool;
}

/**
 * Estimate entropy in bits.
 */
export function calculateEntropy(password) {
  if (!password) return 0;
  const pool = getCharPoolSize(password);
  if (pool === 0) return 0;
  return Math.round(password.length * Math.log2(pool));
}

/**
 * Estimate crack time in seconds assuming 10 billion guesses/sec (modern GPU cluster).
 */
function estimateCrackTimeSeconds(password) {
  const entropy = calculateEntropy(password);
  // 2^entropy / guesses_per_second
  // Use log to avoid overflow: 2^entropy / 1e10
  const logCombinations = entropy * Math.LN2;
  const logGuessRate = Math.log(1e10);
  const logSeconds = logCombinations - logGuessRate;
  return Math.exp(logSeconds);
}

/**
 * Format crack time into human-readable string.
 */
export function formatCrackTime(password) {
  if (!password) return 'instant';
  const seconds = estimateCrackTimeSeconds(password);

  if (seconds < 0.001) return 'instant';
  if (seconds < 1) return 'less than a second';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 86400 * 30) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 86400 * 365) return `${Math.round(seconds / (86400 * 30))} months`;
  if (seconds < 86400 * 365 * 100) return `${Math.round(seconds / (86400 * 365))} years`;
  if (seconds < 86400 * 365 * 1000) return `${Math.round(seconds / (86400 * 365 * 100))} centuries`;
  if (seconds < 86400 * 365 * 1e6) return `${Math.round(seconds / (86400 * 365 * 1000))} millennia`;
  return 'heat death of universe';
}

/**
 * Advanced strength calculation (zxcvbn-style).
 * Returns { label, score (0-4), entropy, crackTime, composition }.
 */
export function calculateStrength(password) {
  if (!password) {
    return {
      label: 'Weak', score: 0, entropy: 0, crackTime: 'instant',
      composition: { lowercase: 0, uppercase: 0, numbers: 0, symbols: 0 },
    };
  }

  // Composition breakdown
  const composition = {
    lowercase: (password.match(/[a-z]/g) || []).length,
    uppercase: (password.match(/[A-Z]/g) || []).length,
    numbers: (password.match(/[0-9]/g) || []).length,
    symbols: (password.match(/[^a-zA-Z0-9]/g) || []).length,
  };

  const entropy = calculateEntropy(password);
  const crackTime = formatCrackTime(password);

  // Start with entropy-based score
  let score = 0;
  if (entropy >= 25) score = 1;
  if (entropy >= 40) score = 2;
  if (entropy >= 60) score = 3;
  if (entropy >= 80) score = 4;

  // Penalties
  const lowerPw = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowerPw)) {
    score = 0; // Common password = instant crack
  }

  const seqCount = countSequentialPatterns(password);
  if (seqCount >= 2) score = Math.max(0, score - 1);

  const repCount = countRepeatedPatterns(password);
  if (repCount >= 2) score = Math.max(0, score - 1);

  // All same character type penalty
  const typesUsed = [composition.lowercase, composition.uppercase, composition.numbers, composition.symbols]
    .filter(c => c > 0).length;
  if (typesUsed === 1 && password.length < 20) {
    score = Math.min(score, 1);
  }

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  return {
    label: labels[score],
    score,
    entropy,
    crackTime,
    composition,
  };
}

// ─── Password Generation ─────────────────────────────────────────────────────

/**
 * Generate a random password.
 * @param {{ length?: number, uppercase?: boolean, lowercase?: boolean, numbers?: boolean, special?: boolean }} options
 * @returns {{ password: string, strength: object }}
 */
export function generatePassword(options = {}) {
  const {
    length: rawLength = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    special = true,
  } = options;

  const length = Math.max(8, Math.min(128, rawLength));

  let charset = '';
  const required = [];
  if (uppercase) { charset += CHAR_SETS.uppercase; required.push(CHAR_SETS.uppercase); }
  if (lowercase) { charset += CHAR_SETS.lowercase; required.push(CHAR_SETS.lowercase); }
  if (numbers) { charset += CHAR_SETS.numbers; required.push(CHAR_SETS.numbers); }
  if (special) { charset += CHAR_SETS.special; required.push(CHAR_SETS.special); }

  if (!charset) charset = CHAR_SETS.lowercase;

  // Generate password ensuring at least one char from each selected set
  let password = '';
  for (const set of required) {
    password += set[randomInt(set.length)];
  }
  for (let i = password.length; i < length; i++) {
    password += charset[randomInt(charset.length)];
  }

  // Shuffle to avoid predictable positions for required chars
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  password = arr.join('');

  return { password, strength: calculateStrength(password) };
}

// ─── Passphrase Generation ───────────────────────────────────────────────────

/**
 * Generate a random passphrase from the EFF-inspired wordlist.
 * @param {{ wordCount?: number, separator?: string, capitalize?: boolean, includeNumber?: boolean }} options
 * @returns {{ passphrase: string, strength: object, wordCountUsed: number, estimatedEntropy: number }}
 */
export function generatePassphrase(options = {}) {
  const {
    wordCount: rawCount = 4,
    separator = '-',
    capitalize = false,
    includeNumber = false,
  } = options;

  const wordCount = Math.max(3, Math.min(8, rawCount));

  const words = [];
  for (let i = 0; i < wordCount; i++) {
    let word = EFF_WORDLIST[randomInt(EFF_WORDLIST.length)];
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  let passphrase = words.join(separator);
  if (includeNumber) {
    passphrase += randomInt(10);
  }

  // Entropy for passphrase: log2(wordlist_size) * word_count
  const bitsPerWord = Math.log2(EFF_WORDLIST.length);
  const estimatedEntropy = Math.round(bitsPerWord * wordCount + (includeNumber ? 3.32 : 0));

  return {
    passphrase,
    strength: calculateStrength(passphrase),
    wordCountUsed: wordCount,
    estimatedEntropy,
  };
}

// ─── HIBP Breach Check (k-anonymity) ─────────────────────────────────────────

/**
 * Check if a password has appeared in known data breaches using HIBP k-anonymity API.
 * Only the first 5 chars of the SHA-1 hash are sent — the password never leaves the browser.
 * @param {string} password
 * @returns {Promise<{ breached: boolean, count: number }>}
 */
export async function checkBreach(password) {
  if (!password) return { breached: false, count: 0 };

  // SHA-1 hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
  });

  if (!response.ok) {
    throw new Error('Failed to check breach database');
  }

  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const [hashSuffix, count] = line.split(':');
    if (hashSuffix.trim() === suffix) {
      return { breached: true, count: parseInt(count.trim(), 10) };
    }
  }

  return { breached: false, count: 0 };
}
