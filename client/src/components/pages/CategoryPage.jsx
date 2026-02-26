import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import tools from '../../lib/toolRegistry';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const CATEGORY_META = {
  image:       { name: 'Images',       icon: '🎯', description: 'Convert, compress, resize, edit, and remove backgrounds from images.' },
  document:    { name: 'Documents',    icon: '📋', description: 'PDF operations, document conversion, and e-signatures.' },
  text:        { name: 'Text & Writing',icon: '✍️', description: 'Text utilities, Markdown editor, OCR, and summarization.' },
  developer:   { name: 'Dev Tools',    icon: '⚡', description: 'JSON/YAML/XML formatting, JWT decoding, regex testing, and more.' },
  media:       { name: 'Audio & Video',icon: '🎧', description: 'Audio and video conversion, GIF creation.' },
  ai:          { name: 'AI Tools',     icon: '🧠', description: 'AI content detection for text and images.' },
  student:     { name: 'Academic',     icon: '📐', description: 'GPA calculator, flashcards, citations, LaTeX, timers, and more.' },
  design:      { name: 'Creative',     icon: '🎨', description: 'Color tools, meme generator, and favicon creation.' },
  security:    { name: 'Privacy',      icon: '🛡️', description: 'Password generation and file checksum verification.' },
  seo:         { name: 'SEO & Web',    icon: '🌐', description: 'SEO analysis and meta tag generation.' },
  utility:     { name: 'Converters',   icon: '⚙️', description: 'Unit conversion, QR codes, and barcodes.' },
  spreadsheet: { name: 'Spreadsheets', icon: '📊', description: 'Excel, CSV, and spreadsheet conversion, viewing, editing, and data cleanup.' },
  finance:     { name: 'Finance',      icon: '💹', description: 'Investment calculators, trading tools, property valuation, EMI, tax estimation, and retirement planning.' },
};

export default function CategoryPage() {
  const { categoryId } = useParams();
  const category = CATEGORY_META[categoryId];
  const categoryTools = tools.filter((t) => t.category === categoryId);

  if (!category || categoryTools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <span className="text-5xl mb-4" aria-hidden="true">🤷</span>
        <h1 className="text-2xl font-bold text-surface-50 mb-2">Category Not Found</h1>
        <p className="text-surface-500 mb-6">No tools found for this category.</p>
        <Link to="/" className="btn-primary">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-primary-400 transition-colors mb-4"
        >
          ← Back to all tools
        </Link>
        <h1 className="text-3xl font-bold text-surface-50 flex items-center gap-3">
          <span aria-hidden="true">{category.icon}</span>
          {category.name} Tools
        </h1>
        <p className="text-surface-400 mt-2">{category.description}</p>
      </div>

      {/* Tools grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {categoryTools.map((tool) => (
          <motion.div key={tool.id} variants={cardVariants}>
            <Link to={tool.path} className="card-hover flex items-start gap-4 p-5 h-full">
              <div className="icon-box w-10 h-10 text-xl shrink-0">
                <span aria-hidden="true">{tool.icon}</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-surface-100">{tool.name}</h2>
                <p className="text-sm text-surface-500 mt-1 leading-relaxed">{tool.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
