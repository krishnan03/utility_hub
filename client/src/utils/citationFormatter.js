/**
 * Citation Formatter — APA 7th, MLA 9th, Chicago 17th, Harvard, IEEE, Vancouver
 * Pure client-side — no server calls.
 */

const VALID_STYLES = ['apa7', 'mla9', 'chicago17', 'harvard', 'ieee', 'vancouver'];
const VALID_TYPES = ['book', 'journal', 'website', 'film'];

/**
 * Format author name for a given style.
 * @param {string} author - "First Last" or "Last, First"
 * @param {string} style
 * @returns {string}
 */
function formatAuthor(author, style) {
  if (!author) return '';
  const parts = author.includes(',')
    ? author.split(',').map(p => p.trim())
    : (() => {
        const words = author.trim().split(/\s+/);
        if (words.length === 1) return [words[0]];
        return [words[words.length - 1], words.slice(0, -1).join(' ')];
      })();

  const [last, first] = parts;

  switch (style) {
    case 'apa7':
      return first ? `${last}, ${first[0]}.` : last;
    case 'mla9':
      return first ? `${last}, ${first}` : last;
    case 'chicago17':
      return first ? `${last}, ${first}` : last;
    case 'harvard':
      return first ? `${last}, ${first[0]}.` : last;
    case 'ieee':
      return first ? `${first[0]}. ${last}` : last;
    case 'vancouver':
      return first ? `${last} ${first[0]}` : last;
    default:
      return author;
  }
}

// ── APA 7th ──────────────────────────────────────────────────

function apa7Book(s) {
  const author = formatAuthor(s.author, 'apa7');
  let citation = `${author} (${s.year}). *${s.title}*.`;
  if (s.publisher) citation += ` ${s.publisher}.`;
  if (s.doi) citation += ` https://doi.org/${s.doi}`;
  return citation;
}

function apa7Journal(s) {
  const author = formatAuthor(s.author, 'apa7');
  let citation = `${author} (${s.year}). ${s.title}. *${s.journal}*`;
  if (s.volume) citation += `, *${s.volume}*`;
  if (s.pages) citation += `, ${s.pages}`;
  citation += '.';
  if (s.doi) citation += ` https://doi.org/${s.doi}`;
  return citation;
}

function apa7Website(s) {
  const author = s.author ? formatAuthor(s.author, 'apa7') : s.publisher || 'Unknown';
  let citation = `${author} (${s.year || 'n.d.'}). *${s.title}*.`;
  if (s.url) citation += ` ${s.url}`;
  return citation;
}

function apa7Film(s) {
  const director = s.author ? formatAuthor(s.author, 'apa7') : 'Unknown';
  let citation = `${director} (Director). (${s.year}). *${s.title}* [Film].`;
  if (s.publisher) citation += ` ${s.publisher}.`;
  return citation;
}

// ── MLA 9th ──────────────────────────────────────────────────

function mla9Book(s) {
  const author = formatAuthor(s.author, 'mla9');
  let citation = `${author}. *${s.title}*.`;
  if (s.publisher) citation += ` ${s.publisher},`;
  citation += ` ${s.year}.`;
  return citation;
}

function mla9Journal(s) {
  const author = formatAuthor(s.author, 'mla9');
  let citation = `${author}. "${s.title}." *${s.journal}*`;
  if (s.volume) citation += `, vol. ${s.volume}`;
  if (s.pages) citation += `, pp. ${s.pages}`;
  citation += `, ${s.year}.`;
  if (s.doi) citation += ` https://doi.org/${s.doi}`;
  return citation;
}

function mla9Website(s) {
  const author = s.author ? formatAuthor(s.author, 'mla9') : '';
  let citation = author ? `${author}. ` : '';
  citation += `"${s.title}."`;
  if (s.publisher) citation += ` *${s.publisher}*,`;
  citation += ` ${s.year || 'n.d.'}.`;
  if (s.url) citation += ` ${s.url}`;
  return citation;
}

function mla9Film(s) {
  let citation = `*${s.title}*.`;
  if (s.author) citation += ` Directed by ${s.author},`;
  if (s.publisher) citation += ` ${s.publisher},`;
  citation += ` ${s.year}.`;
  return citation;
}

// ── Chicago 17th ─────────────────────────────────────────────

function chicago17Book(s) {
  const author = formatAuthor(s.author, 'chicago17');
  let citation = `${author}. *${s.title}*.`;
  if (s.publisher) citation += ` ${s.publisher},`;
  citation += ` ${s.year}.`;
  return citation;
}

function chicago17Journal(s) {
  const author = formatAuthor(s.author, 'chicago17');
  let citation = `${author}. "${s.title}." *${s.journal}*`;
  if (s.volume) citation += ` ${s.volume}`;
  if (s.pages) citation += ` (${s.year}): ${s.pages}`;
  else citation += ` (${s.year})`;
  citation += '.';
  if (s.doi) citation += ` https://doi.org/${s.doi}`;
  return citation;
}

function chicago17Website(s) {
  const author = s.author ? formatAuthor(s.author, 'chicago17') : '';
  let citation = author ? `${author}. ` : '';
  citation += `"${s.title}."`;
  if (s.publisher) citation += ` ${s.publisher}.`;
  if (s.year) citation += ` ${s.year}.`;
  if (s.url) citation += ` ${s.url}`;
  return citation;
}

function chicago17Film(s) {
  let citation = `*${s.title}*.`;
  if (s.author) citation += ` Directed by ${s.author}.`;
  if (s.publisher) citation += ` ${s.publisher},`;
  citation += ` ${s.year}.`;
  return citation;
}

// ── Harvard ──────────────────────────────────────────────────

function harvardBook(s) {
  const author = formatAuthor(s.author, 'harvard');
  let citation = `${author} (${s.year}) *${s.title}*.`;
  if (s.publisher) citation += ` ${s.publisher}.`;
  return citation;
}

function harvardJournal(s) {
  const author = formatAuthor(s.author, 'harvard');
  let citation = `${author} (${s.year}) '${s.title}', *${s.journal}*`;
  if (s.volume) citation += `, ${s.volume}`;
  if (s.pages) citation += `, pp. ${s.pages}`;
  citation += '.';
  if (s.doi) citation += ` https://doi.org/${s.doi}`;
  return citation;
}

function harvardWebsite(s) {
  const author = s.author ? formatAuthor(s.author, 'harvard') : s.publisher || 'Unknown';
  let citation = `${author} (${s.year || 'n.d.'}) *${s.title}*.`;
  if (s.url) citation += ` Available at: ${s.url}`;
  return citation;
}

function harvardFilm(s) {
  let citation = `*${s.title}* (${s.year}) [Film].`;
  if (s.author) citation += ` Directed by ${s.author}.`;
  if (s.publisher) citation += ` ${s.publisher}.`;
  return citation;
}

// ── IEEE ─────────────────────────────────────────────────────

function ieeeBook(s) {
  const author = formatAuthor(s.author, 'ieee');
  let citation = `[1] ${author}, *${s.title}*.`;
  if (s.publisher) citation += ` ${s.publisher},`;
  citation += ` ${s.year}.`;
  return citation;
}

function ieeeJournal(s) {
  const author = formatAuthor(s.author, 'ieee');
  let citation = `[1] ${author}, "${s.title}," *${s.journal}*`;
  if (s.volume) citation += `, vol. ${s.volume}`;
  if (s.issue) citation += `, no. ${s.issue}`;
  if (s.pages) citation += `, pp. ${s.pages}`;
  citation += `, ${s.year}.`;
  return citation;
}

function ieeeWebsite(s) {
  const author = s.author ? formatAuthor(s.author, 'ieee') : s.publisher || 'Unknown';
  let citation = `[1] ${author}, "${s.title},"`;
  if (s.year) citation += ` ${s.year}.`;
  if (s.url) citation += ` [Online]. Available: ${s.url}`;
  return citation;
}

function ieeeFilm(s) {
  let citation = `[1] *${s.title}*,`;
  if (s.author) citation += ` directed by ${s.author},`;
  if (s.publisher) citation += ` ${s.publisher},`;
  citation += ` ${s.year}.`;
  return citation;
}

// ── Vancouver ────────────────────────────────────────────────

function vancouverBook(s) {
  const author = formatAuthor(s.author, 'vancouver');
  let citation = `${author}. ${s.title}.`;
  if (s.publisher) citation += ` ${s.publisher};`;
  citation += ` ${s.year}.`;
  return citation;
}

function vancouverJournal(s) {
  const author = formatAuthor(s.author, 'vancouver');
  let citation = `${author}. ${s.title}. ${s.journal}. ${s.year}`;
  if (s.volume) citation += `;${s.volume}`;
  if (s.issue) citation += `(${s.issue})`;
  if (s.pages) citation += `:${s.pages}`;
  citation += '.';
  return citation;
}

function vancouverWebsite(s) {
  const author = s.author ? formatAuthor(s.author, 'vancouver') : s.publisher || 'Unknown';
  let citation = `${author}. ${s.title}.`;
  if (s.year) citation += ` ${s.year}`;
  if (s.url) citation += ` Available from: ${s.url}`;
  return citation;
}

function vancouverFilm(s) {
  let citation = `${s.title} [Film].`;
  if (s.author) citation += ` Directed by ${s.author}.`;
  if (s.publisher) citation += ` ${s.publisher};`;
  citation += ` ${s.year}.`;
  return citation;
}

// ── Dispatch ─────────────────────────────────────────────────

const FORMATTERS = {
  apa7:      { book: apa7Book, journal: apa7Journal, website: apa7Website, film: apa7Film },
  mla9:      { book: mla9Book, journal: mla9Journal, website: mla9Website, film: mla9Film },
  chicago17: { book: chicago17Book, journal: chicago17Journal, website: chicago17Website, film: chicago17Film },
  harvard:   { book: harvardBook, journal: harvardJournal, website: harvardWebsite, film: harvardFilm },
  ieee:      { book: ieeeBook, journal: ieeeJournal, website: ieeeWebsite, film: ieeeFilm },
  vancouver: { book: vancouverBook, journal: vancouverJournal, website: vancouverWebsite, film: vancouverFilm },
};

/**
 * Format a single citation.
 * @param {{ type: string, title: string, author?: string, year?: string|number, journal?: string, volume?: string, issue?: string, pages?: string, url?: string, publisher?: string, doi?: string }} source
 * @param {'apa7'|'mla9'|'chicago17'|'harvard'|'ieee'|'vancouver'} style
 * @returns {string}
 */
export function formatCitation(source, style) {
  if (!source || !source.title) throw new Error('Source with title is required');
  if (!VALID_STYLES.includes(style)) throw new Error(`Invalid style: ${style}`);
  if (!VALID_TYPES.includes(source.type)) throw new Error(`Invalid source type: ${source.type}`);

  return FORMATTERS[style][source.type](source);
}

/**
 * Format multiple citations as a bibliography, sorted alphabetically by author.
 * @param {Array} sources
 * @param {'apa7'|'mla9'|'chicago17'|'harvard'|'ieee'|'vancouver'} style
 * @returns {string[]}
 */
export function formatBibliography(sources, style) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('At least one source is required');
  }

  const sorted = [...sources].sort((a, b) => {
    const aAuthor = (a.author || '').toLowerCase();
    const bAuthor = (b.author || '').toLowerCase();
    return aAuthor.localeCompare(bAuthor);
  });

  return sorted.map(s => formatCitation(s, style));
}
