import { useEffect, useMemo, lazy, Suspense } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import tools from '../../lib/toolRegistry';
import useHistoryStore from '../../stores/useHistoryStore';

const CATEGORY_MAP = {
  image: { name: 'Images', icon: '🎯', path: '/category/image' },
  document: { name: 'Documents', icon: '📋', path: '/category/document' },
  text: { name: 'Text & Writing', icon: '✍️', path: '/category/text' },
  developer: { name: 'Dev Tools', icon: '⚡', path: '/category/developer' },
  media: { name: 'Audio & Video', icon: '🎧', path: '/category/media' },
  ai: { name: 'AI Tools', icon: '🧠', path: '/category/ai' },
  student: { name: 'Academic', icon: '📐', path: '/category/student' },
  design: { name: 'Creative', icon: '🎨', path: '/category/design' },
  security: { name: 'Privacy', icon: '🛡️', path: '/category/security' },
  seo: { name: 'SEO & Web', icon: '🌐', path: '/category/seo' },
  utility: { name: 'Converters', icon: '⚙️', path: '/category/utility' },
  spreadsheet: { name: 'Spreadsheets', icon: '📊', path: '/category/spreadsheet' },
  finance: { name: 'Finance', icon: '💹', path: '/category/finance' },
};

/**
 * Lazy-loaded tool component mapping.
 * Maps tool registry paths to their React components using React.lazy for code splitting.
 */
const toolComponents = {
  '/tools/image/convert': lazy(() => import('../tools/image/ImageConverter')),
  '/tools/image/compress': lazy(() => import('../tools/image/ImageCompressor')),
  '/tools/image/resize': lazy(() => import('../tools/image/ImageResizer')),
  '/tools/image/edit': lazy(() => import('../tools/image/ImageEditor')),
  '/tools/image/background-remove': lazy(() => import('../tools/image/BackgroundRemover')),
  '/tools/security/password-generator': lazy(() => import('../tools/security/PasswordGenerator')),
  '/tools/student/scientific-calculator': lazy(() => import('../tools/student/ScientificCalculator')),
  '/tools/design/color-tools': lazy(() => import('../tools/design/ColorTools')),
  '/tools/utility/unit-converter': lazy(() => import('../tools/utility/UnitConverter')),
  '/tools/text/utilities': lazy(() => import('../tools/text/TextUtilities')),
  '/tools/student/gpa-calculator': lazy(() => import('../tools/student/GpaCalculator')),
  '/tools/student/academic-metrics': lazy(() => import('../tools/student/AcademicMetrics')),
  '/tools/developer/data-transformer': lazy(() => import('../tools/developer/DataTransformer')),
  '/tools/text/markdown-editor': lazy(() => import('../tools/text/MarkdownEditor')),
  '/tools/text/summarizer': lazy(() => import('../tools/text/TextSummarizer')),
  '/tools/text/morse-code': lazy(() => import('../tools/text/MorseCodeTranslator')),
  '/tools/text/braille-converter': lazy(() => import('../tools/text/BrailleConverter')),
  '/tools/text/nato-alphabet': lazy(() => import('../tools/text/NATOAlphabet')),
  '/tools/text/emoji-picker': lazy(() => import('../tools/text/EmojiPicker')),
  '/tools/text/word-frequency': lazy(() => import('../tools/text/WordFrequencyCounter')),
  '/tools/text/ascii-art': lazy(() => import('../tools/text/ASCIIArtGenerator')),
  '/tools/text/markdown-table': lazy(() => import('../tools/text/MarkdownTableGenerator')),
  '/tools/text/plagiarism-checker': lazy(() => import('../tools/text/PlagiarismChecker')),
  '/tools/text/grammar-checker': lazy(() => import('../tools/text/GrammarChecker')),
  '/tools/text/paraphraser': lazy(() => import('../tools/text/Paraphraser')),
  '/tools/text/text-to-speech': lazy(() => import('../tools/text/TextToSpeech')),
  '/tools/text/writing-templates': lazy(() => import('../tools/text/WritingTemplates')),
  // Developer tools
  '/tools/developer/json-yaml-xml': lazy(() => import('../tools/developer/JSONYAMLXMLFormatter')),
  '/tools/developer/jwt-decoder': lazy(() => import('../tools/developer/JWTDecoder')),
  '/tools/developer/regex-tester': lazy(() => import('../tools/developer/RegexTester')),
  '/tools/developer/cron-parser': lazy(() => import('../tools/developer/CronParser')),
  '/tools/developer/timestamp-converter': lazy(() => import('../tools/developer/TimestampConverter')),
  '/tools/developer/url-encoder': lazy(() => import('../tools/developer/URLEncoderDecoder')),
  '/tools/developer/base64-file': lazy(() => import('../tools/developer/Base64FileEncoder')),
  '/tools/developer/sql-formatter': lazy(() => import('../tools/developer/SQLFormatter')),
  '/tools/developer/diff-checker': lazy(() => import('../tools/developer/DiffChecker')),
  '/tools/developer/binary-converter': lazy(() => import('../tools/developer/BinaryConverter')),
  '/tools/developer/random-generator': lazy(() => import('../tools/developer/RandomDataGenerator')),
  '/tools/developer/crontab-guru': lazy(() => import('../tools/developer/CrontabGuru')),
  '/tools/developer/chmod-calculator': lazy(() => import('../tools/developer/ChmodCalculator')),
  '/tools/developer/json-schema': lazy(() => import('../tools/developer/JSONSchemaValidator')),
  '/tools/developer/css-minify': lazy(() => import('../tools/developer/CSSMinifier')),
  '/tools/developer/html-minify': lazy(() => import('../tools/developer/HTMLMinifier')),
  '/tools/developer/color-code-converter': lazy(() => import('../tools/developer/ColorCodeConverter')),
  '/tools/developer/json-path-tester': lazy(() => import('../tools/developer/JSONPathTester')),
  '/tools/developer/text-to-binary': lazy(() => import('../tools/developer/TextToBinary')),
  '/tools/developer/api-builder': lazy(() => import('../tools/developer/APIRequestBuilder')),
  // Finance tools
  '/tools/finance/emi-calculator': lazy(() => import('../tools/finance/EMICalculator')),
  '/tools/finance/compound-interest': lazy(() => import('../tools/finance/CompoundInterestCalculator')),
  '/tools/finance/sip-calculator': lazy(() => import('../tools/finance/SIPCalculator')),
  '/tools/finance/property-calculator': lazy(() => import('../tools/finance/PropertyCalculator')),
  '/tools/finance/rental-yield': lazy(() => import('../tools/finance/RentalYieldCalculator')),
  '/tools/finance/spy-spx-converter': lazy(() => import('../tools/finance/SPYSPXConverter')),
  '/tools/finance/options-calculator': lazy(() => import('../tools/finance/OptionsCalculator')),
  '/tools/finance/stock-return': lazy(() => import('../tools/finance/StockReturnCalculator')),
  '/tools/finance/gst-calculator': lazy(() => import('../tools/finance/GSTCalculator')),
  '/tools/finance/salary-calculator': lazy(() => import('../tools/finance/SalaryCalculator')),
  '/tools/finance/retirement-calculator': lazy(() => import('../tools/finance/RetirementCalculator')),
  '/tools/finance/fd-calculator': lazy(() => import('../tools/finance/FDCalculator')),
  '/tools/finance/ppf-calculator': lazy(() => import('../tools/finance/PPFCalculator')),
  '/tools/finance/inflation-calculator': lazy(() => import('../tools/finance/InflationCalculator')),
  '/tools/finance/break-even-calculator': lazy(() => import('../tools/finance/BreakEvenCalculator')),
  '/tools/finance/margin-calculator': lazy(() => import('../tools/finance/MarginCalculator')),
  '/tools/finance/pip-calculator': lazy(() => import('../tools/finance/PipCalculator')),
  '/tools/finance/dividend-calculator': lazy(() => import('../tools/finance/DividendCalculator')),
  '/tools/finance/tax-calculator': lazy(() => import('../tools/finance/TaxCalculator')),
  '/tools/finance/crypto-converter': lazy(() => import('../tools/finance/CryptoConverter')),
  '/tools/finance/currency-converter': lazy(() => import('../tools/finance/CurrencyConverter')),
  // Student tools
  '/tools/student/citation-generator': lazy(() => import('../tools/student/CitationGenerator')),
  '/tools/student/study-timer': lazy(() => import('../tools/student/PomodoroTimer')),
  '/tools/student/flashcards': lazy(() => import('../tools/student/Flashcards')),
  '/tools/student/essay-outline': lazy(() => import('../tools/student/EssayOutline')),
  '/tools/student/latex-renderer': lazy(() => import('../tools/student/LaTeXRenderer')),
  '/tools/student/graphing-calculator': lazy(() => import('../tools/student/GraphingCalculator')),
  '/tools/student/math-solver': lazy(() => import('../tools/student/MathSolver')),
  // Utility tools
  '/tools/utility/age-calculator': lazy(() => import('../tools/utility/AgeCalculator')),
  '/tools/utility/date-calculator': lazy(() => import('../tools/utility/DateCalculator')),
  '/tools/utility/percentage-calculator': lazy(() => import('../tools/utility/PercentageCalculator')),
  '/tools/utility/bmi-calculator': lazy(() => import('../tools/utility/BMICalculator')),
  '/tools/utility/number-to-words': lazy(() => import('../tools/utility/NumberToWords')),
  '/tools/utility/roman-numeral': lazy(() => import('../tools/utility/RomanNumeralConverter')),
  '/tools/utility/typing-speed': lazy(() => import('../tools/utility/TypingSpeedTest')),
  '/tools/utility/barcode-reader': lazy(() => import('../tools/utility/BarcodeReader')),
  // SEO tools
  '/tools/seo/heading-analyzer': lazy(() => import('../tools/seo/HeadingAnalyzer')),
  '/tools/seo/meta-tag-generator': lazy(() => import('../tools/seo/MetaTagGenerator')),
  '/tools/seo/robots-txt-generator': lazy(() => import('../tools/seo/RobotsTxtGenerator')),
  '/tools/seo/sitemap-generator': lazy(() => import('../tools/seo/SitemapGenerator')),
  '/tools/seo/keyword-density': lazy(() => import('../tools/seo/KeywordDensityChecker')),
  '/tools/seo/page-speed': lazy(() => import('../tools/seo/PageSpeedInsights')),
  '/tools/seo/redirect-checker': lazy(() => import('../tools/seo/RedirectChecker')),
  // Security tools
  '/tools/security/hash-generator': lazy(() => import('../tools/security/HashGenerator')),
  '/tools/security/uuid-generator': lazy(() => import('../tools/security/UUIDGenerator')),
  '/tools/security/checksum-calculator': lazy(() => import('../tools/security/ChecksumCalculator')),
  '/tools/security/file-encryption': lazy(() => import('../tools/security/FileEncryption')),
  '/tools/security/totp-generator': lazy(() => import('../tools/security/TOTPGenerator')),
  '/tools/security/breach-checker': lazy(() => import('../tools/security/EmailBreachChecker')),
  '/tools/security/secure-random': lazy(() => import('../tools/security/SecureRandomGenerator')),
  // Design tools
  '/tools/design/color-blindness': lazy(() => import('../tools/design/ColorBlindnessSimulator')),
  '/tools/design/screen-resolution': lazy(() => import('../tools/design/ScreenResolutionTester')),
  // Spreadsheet tools
  '/tools/spreadsheet/excel-to-csv': lazy(() => import('../tools/spreadsheet/ExcelToCSV')),
  '/tools/spreadsheet/csv-viewer': lazy(() => import('../tools/spreadsheet/CSVViewer')),
  '/tools/spreadsheet/csv-to-sql': lazy(() => import('../tools/spreadsheet/CSVToSQL')),
  '/tools/spreadsheet/merge-csv': lazy(() => import('../tools/spreadsheet/MergeCSV')),
  // AI tools
  '/tools/ai/ai-detector': lazy(() => import('../tools/ai/AIDetector')),
  '/tools/ai/sentiment-analysis': lazy(() => import('../tools/ai/SentimentAnalyzer')),
  // Spreadsheet tools (additional)
  '/tools/spreadsheet/csv-to-excel': lazy(() => import('../tools/spreadsheet/CSVToExcel')),
  '/tools/spreadsheet/excel-to-json': lazy(() => import('../tools/spreadsheet/ExcelToJSON')),
  '/tools/spreadsheet/json-to-excel': lazy(() => import('../tools/spreadsheet/JSONToExcel')),
  '/tools/spreadsheet/deduplicate': lazy(() => import('../tools/spreadsheet/CSVDeduplicate')),
  '/tools/spreadsheet/pivot-table': lazy(() => import('../tools/spreadsheet/PivotTable')),
  '/tools/spreadsheet/json-flattener': lazy(() => import('../tools/spreadsheet/JSONFlattener')),
  // Utility tools (additional)
  '/tools/utility/loan-calculator': lazy(() => import('../tools/utility/LoanCalculator')),
  '/tools/utility/world-clock': lazy(() => import('../tools/utility/WorldClock')),
  '/tools/utility/ip-lookup': lazy(() => import('../tools/utility/IPLookup')),
  '/tools/utility/url-shortener': lazy(() => import('../tools/utility/URLShortener')),
  '/tools/utility/countdown-timer': lazy(() => import('../tools/utility/CountdownTimer')),
  // Image tools (additional)
  '/tools/image/photo-editor': lazy(() => import('../tools/image/PhotoEditor')),
  // Design tools (additional)
  '/tools/design/meme-generator': lazy(() => import('../tools/design/MemeGenerator')),
  '/tools/design/favicon-generator': lazy(() => import('../tools/design/FaviconGenerator')),
  // PDF tools
  '/tools/pdf/convert': lazy(() => import('../tools/document/PDFConverter')),
  '/tools/pdf/merge': lazy(() => import('../tools/document/PDFMerger')),
  '/tools/pdf/split': lazy(() => import('../tools/document/PDFSplitter')),
  '/tools/pdf/compress': lazy(() => import('../tools/document/PDFCompressor')),
  '/tools/pdf/protect': lazy(() => import('../tools/document/PDFProtect')),
  '/tools/pdf/reorder': lazy(() => import('../tools/document/PDFReorder')),
  '/tools/pdf/rotate': lazy(() => import('../tools/document/PDFRotate')),
  '/tools/pdf/watermark': lazy(() => import('../tools/document/PDFWatermark')),
  '/tools/pdf/pages': lazy(() => import('../tools/document/PDFPages')),
  '/tools/pdf/esignature': lazy(() => import('../tools/document/PDFESignature')),
  '/tools/pdf/ocr': lazy(() => import('../tools/document/PDFOcr')),
  '/tools/pdf/flatten': lazy(() => import('../tools/document/PDFFlatten')),
  // Document tools
  '/tools/document/convert': lazy(() => import('../tools/document/DocumentConverter')),
  '/tools/document/word-to-pdf': lazy(() => import('../tools/document/WordToPDF')),
  '/tools/document/pdf-to-word': lazy(() => import('../tools/document/PDFToWord')),
  '/tools/document/pdf-to-excel': lazy(() => import('../tools/document/PDFToExcel')),
  '/tools/document/ppt-to-pdf': lazy(() => import('../tools/document/PPTToPDF')),
  '/tools/document/pdf-editor': lazy(() => import('../tools/document/PDFEditor')),
  '/tools/document/html-to-pdf': lazy(() => import('../tools/document/HTMLToPDF')),
  '/tools/pdf/form-filler': lazy(() => import('../tools/document/PDFFormFiller')),
  '/tools/pdf/compare': lazy(() => import('../tools/document/PDFCompare')),
  // Media tools
  '/tools/media/audio-convert': lazy(() => import('../tools/media/AudioConverter')),
  '/tools/media/video-convert': lazy(() => import('../tools/media/VideoConverter')),
  '/tools/media/gif-maker': lazy(() => import('../tools/media/GIFMaker')),
  '/tools/media/video-to-gif': lazy(() => import('../tools/media/VideoToGIF')),
  '/tools/media/audio-trimmer': lazy(() => import('../tools/media/AudioTrimmer')),
  '/tools/media/video-compressor': lazy(() => import('../tools/media/VideoCompressor')),
  // Text tools (server)
  '/tools/text/ocr': lazy(() => import('../tools/text/OCRTool')),
  // Utility tools (server)
  '/tools/utility/qr-barcode': lazy(() => import('../tools/utility/QRBarcodeGenerator')),
  // SEO tools (server)
  '/tools/seo/seo-analyzer': lazy(() => import('../tools/seo/SEOAnalyzer')),
  // Image tools (server)
  '/tools/image/image-to-pdf': lazy(() => import('../tools/image/ImageToPDF')),
  '/tools/image/heic-to-jpg': lazy(() => import('../tools/image/HEICToJPG')),
  '/tools/image/svg-to-png': lazy(() => import('../tools/image/SVGToPNG')),
  '/tools/image/metadata': lazy(() => import('../tools/image/ImageMetadata')),
};

function ToolComponentFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex items-center gap-3 text-surface-400 dark:text-surface-500">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading tool...</span>
      </div>
    </div>
  );
}

export default function ToolPage() {
  const location = useLocation();
  const addRecentTool = useHistoryStore((s) => s.addRecentTool);

  const tool = useMemo(
    () => tools.find((t) => t.path === location.pathname),
    [location.pathname],
  );

  const category = useMemo(
    () => (tool ? CATEGORY_MAP[tool.category] : null),
    [tool],
  );

  const relatedTools = useMemo(() => {
    if (!tool) return [];
    return tools
      .filter((t) => t.category === tool.category && t.id !== tool.id)
      .slice(0, 5);
  }, [tool]);

  useEffect(() => {
    if (tool) {
      addRecentTool(tool.id);
    }
  }, [tool, addRecentTool]);

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <span className="text-5xl mb-4" aria-hidden="true">🔧</span>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
          Tool Not Found
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mb-6">
          This tool doesn't exist or hasn't been built yet.
        </p>
        <Link to="/" className="btn-primary">← Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-surface-500 dark:text-surface-400 mb-4 flex items-center gap-1.5">
          <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400">Home</Link>
          <span aria-hidden="true">›</span>
          {category && (
            <>
              <Link to={category.path} className="hover:text-primary-600 dark:hover:text-primary-400">
                {category.name}
              </Link>
              <span aria-hidden="true">›</span>
            </>
          )}
          <span className="text-surface-900 dark:text-surface-50">{tool.name}</span>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3 mb-2">
            <span aria-hidden="true">{tool.icon}</span>
            {tool.name}
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mb-8">
            {tool.description}
          </p>

          {/* Tool component */}
          <div className="card">
            {toolComponents[tool.path] ? (
              <Suspense fallback={<ToolComponentFallback />}>
                {(() => {
                  const ToolComponent = toolComponents[tool.path];
                  return <ToolComponent />;
                })()}
              </Suspense>
            ) : (
              <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
                <p className="text-surface-400 dark:text-surface-500 text-center">
                  This tool is coming soon
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Related Tools Sidebar */}
      {relatedTools.length > 0 && (
        <aside className="lg:w-64 shrink-0" aria-label="Related tools">
          <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
            Related Tools
          </h2>
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {relatedTools.map((rt) => (
              <Link
                key={rt.id}
                to={rt.path}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap lg:whitespace-normal hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <span aria-hidden="true">{rt.icon}</span>
                <span className="text-surface-700 dark:text-surface-300">{rt.name}</span>
              </Link>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}