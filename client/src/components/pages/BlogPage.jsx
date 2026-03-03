import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEOHead from '../common/SEOHead';

const BLOG_POSTS = [
  {
    slug: 'cron-expression-guide',
    title: 'How to Read and Write Cron Expressions — Free Crontab Guru Tool',
    excerpt: 'Learn cron schedule syntax with clear examples for every field. Build and validate cron expressions visually with our free Crontab Guru — no signup required.',
    date: '2026-03-02',
    category: 'Dev Tools',
    readTime: '6 min',
  },
  {
    slug: 'free-online-diff-checker',
    title: 'Free Online Diff Checker — Compare Text and Files Side by Side',
    excerpt: 'Paste two blocks of text or code and instantly see every addition, deletion, and change highlighted side by side. Runs in your browser — nothing is uploaded.',
    date: '2026-03-02',
    category: 'Dev Tools',
    readTime: '5 min',
  },
  {
    slug: 'chmod-calculator-explained',
    title: 'Chmod Calculator — Understand Unix File Permissions in Seconds',
    excerpt: 'Learn what chmod 755, 644, and 777 actually mean. Use our visual chmod calculator to build permission strings with checkboxes instead of memorizing octal codes.',
    date: '2026-03-02',
    category: 'Dev Tools',
    readTime: '5 min',
  },
  {
    slug: 'free-online-regex-tester',
    title: 'Free Online Regex Tester — Build and Debug Regular Expressions Instantly',
    excerpt: 'Test regex patterns against sample text with real-time highlighting, match groups, and common pattern library. No signup, runs entirely in your browser.',
    date: '2026-03-01',
    category: 'Dev Tools',
    readTime: '5 min',
  },
  {
    slug: 'decode-jwt-tokens-online',
    title: 'How to Decode JWT Tokens Online — Inspect Headers, Payloads, and Expiry',
    excerpt: 'Paste a JWT and instantly see its decoded header, payload, and expiration status. Verify signatures and debug auth issues without writing code.',
    date: '2026-03-01',
    category: 'Dev Tools',
    readTime: '4 min',
  },
  {
    slug: 'free-online-excel-editor',
    title: 'Free Online Excel Editor — Edit Spreadsheets Without Installing Anything',
    excerpt: 'Open, edit, and save Excel files directly in your browser. Full formula support, multi-sheet editing, formatting, and XLSX import/export — no Microsoft Office needed.',
    date: '2026-02-26',
    category: 'Spreadsheets',
    readTime: '5 min',
  },
  {
    slug: 'free-online-word-editor',
    title: 'Free Online Word Editor — Create and Edit Documents in Your Browser',
    excerpt: 'A full-featured document editor with rich text formatting, tables, images, and DOCX import/export. Works like Google Docs but with zero signup.',
    date: '2026-02-26',
    category: 'Documents',
    readTime: '5 min',
  },
  {
    slug: 'free-online-pdf-editor',
    title: 'Free Online PDF Editor — Add Text, Draw, Annotate, and Sign PDFs',
    excerpt: 'Edit PDFs directly in your browser — add text, draw, highlight, insert images, and e-sign. No upload to servers, 100% client-side processing.',
    date: '2026-02-26',
    category: 'Documents',
    readTime: '5 min',
  },
  {
    slug: 'toolspilot-api-llms-smart-search',
    title: 'ToolsPilot Now Has a Public API, llms.txt, and AI-Powered Smart Search',
    excerpt: 'We launched a public REST API for programmatic access to our tools, added llms.txt for AI discoverability, and shipped a Spotlight-style command bar that understands natural language like "fix messy JSON".',
    date: '2026-02-25',
    category: 'Product',
    readTime: '5 min',
  },
  {
    slug: 'how-to-convert-images-online',
    title: 'How to Convert Images Online — PNG, JPG, WEBP, and More',
    excerpt: 'Learn how to convert images between formats instantly without installing software. Support for PNG, JPG, WEBP, SVG, GIF, AVIF, and more.',
    date: '2026-02-20',
    category: 'Images',
    readTime: '4 min',
  },
  {
    slug: 'merge-pdf-files-free',
    title: 'How to Merge PDF Files for Free',
    excerpt: 'Combine multiple PDF documents into one file with drag-and-drop ordering. Fast, free, and your files are auto-deleted in 24 hours.',
    date: '2026-02-18',
    category: 'Documents',
    readTime: '3 min',
  },
  {
    slug: 'best-online-json-formatter',
    title: 'The Best Online JSON Formatter and Validator in 2026',
    excerpt: 'Format, validate, and convert JSON, YAML, and XML with syntax highlighting. Perfect for developers who need quick data formatting.',
    date: '2026-02-15',
    category: 'Dev Tools',
    readTime: '5 min',
  },
  {
    slug: 'compress-images-without-losing-quality',
    title: 'How to Compress Images Without Losing Quality',
    excerpt: 'Reduce image file sizes by up to 80% with lossy and lossless compression. Perfect for web optimization and faster page loads.',
    date: '2026-02-12',
    category: 'Images',
    readTime: '4 min',
  },
  {
    slug: 'spy-to-spx-converter-explained',
    title: 'SPY to SPX Converter — How ETF Prices Relate to the S&P 500 Index',
    excerpt: 'Understand the relationship between SPY ETF prices and the S&P 500 index value. Use our free converter for instant calculations.',
    date: '2026-02-10',
    category: 'Finance',
    readTime: '6 min',
  },
  {
    slug: 'free-online-ocr-tool',
    title: 'Extract Text from Images with Free Online OCR — 10+ Languages',
    excerpt: 'Convert images and scanned documents to editable text using AI-powered OCR. Supports English, Spanish, French, Chinese, and more.',
    date: '2026-02-08',
    category: 'Text & Writing',
    readTime: '4 min',
  },
  {
    slug: 'online-scientific-calculator',
    title: 'Free Online Scientific Calculator with History',
    excerpt: 'A powerful scientific calculator with trigonometry, logarithms, factorials, and calculation history. Works entirely in your browser.',
    date: '2026-02-05',
    category: 'Academic',
    readTime: '3 min',
  },
  {
    slug: 'generate-secure-passwords',
    title: 'How to Generate Secure Passwords and Passphrases',
    excerpt: 'Create strong, random passwords with our free generator. Choose length, character types, and get instant strength ratings.',
    date: '2026-02-03',
    category: 'Privacy',
    readTime: '4 min',
  },
  {
    slug: 'excel-to-csv-converter',
    title: 'Convert Excel to CSV Online — Free and Instant',
    excerpt: 'Upload your Excel spreadsheet and download a clean CSV file. No software needed, works with .xlsx and .xls files.',
    date: '2026-02-01',
    category: 'Spreadsheets',
    readTime: '3 min',
  },
  {
    slug: 'qr-code-generator-guide',
    title: 'How to Create Custom QR Codes — Colors, Sizes, and Error Correction',
    excerpt: 'Generate QR codes with custom colors, sizes, and error correction levels. Perfect for business cards, marketing, and product packaging.',
    date: '2026-01-28',
    category: 'Converters',
    readTime: '5 min',
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export { BLOG_POSTS };

export default function BlogPage() {
  return (
    <div className="space-y-10 pb-12">
      <SEOHead
        title="Blog"
        description="Tips, guides, and tutorials for getting the most out of free online tools — PDF editing, image conversion, developer utilities, and more."
        path="/blog"
      />
      <div>
        <h1 className="text-4xl lg:text-5xl font-extrabold text-surface-900 dark:text-surface-50 mb-3">
          Blog
        </h1>
        <p className="text-lg text-surface-500 dark:text-surface-400">
          Tips, guides, and tutorials for getting the most out of your tools.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {BLOG_POSTS.map((post) => (
          <motion.article key={post.slug} variants={cardVariants}>
            <Link
              to={`/blog/${post.slug}`}
              className="group block p-6 rounded-3xl bg-white dark:bg-surface-900/50 border border-surface-200/60 dark:border-surface-800/60 hover:border-primary-400/30 dark:hover:border-primary-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-500 bg-primary-500/10 px-2.5 py-1 rounded-full">
                  {post.category}
                </span>
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  {post.readTime} read
                </span>
              </div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                {post.title}
              </h2>
              <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                {post.excerpt}
              </p>
              <time className="block mt-3 text-xs text-surface-400 dark:text-surface-500">
                {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            </Link>
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}