import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BLOG_POSTS } from './BlogPage';

// ── Full blog post content (keyed by slug) ───────────────────────────
const BLOG_CONTENT = {
  'toolspilot-api-llms-smart-search': {
    sections: [
      {
        heading: 'A Public API for Your Scripts and Workflows',
        body: `We've opened up a REST API so you can hit ToolsPilot programmatically — no browser required. Whether you're batch-converting images in a CI pipeline or compressing PDFs from a cron job, the API has you covered.`,
      },
      {
        heading: 'Quick Start',
        code: `# Browse the full tool catalog
curl https://toolspilot.work/api/tools

# Search for a specific tool
curl "https://toolspilot.work/api/tools?q=json"

# Filter by category
curl "https://toolspilot.work/api/tools?category=developer"

# Get details + curl example for a single tool
curl https://toolspilot.work/api/tools/pdf-compress

# Compress a PDF via the API
curl -X POST https://toolspilot.work/api/pdf/compress \\
  -F "file=@report.pdf" -F "quality=medium"

# Convert an image to WebP
curl -X POST https://toolspilot.work/api/image/convert \\
  -F "file=@photo.png" -F "format=webp"`,
      },
      {
        heading: 'No Auth, No Signup',
        body: `The API requires zero authentication. It's rate-limited to 100 requests per 15 minutes per IP. Uploaded files are auto-deleted within 24 hours — same privacy guarantees as the web UI.`,
      },
      {
        heading: 'llms.txt — Making ToolsPilot Visible to AI',
        body: `We added a /llms.txt file at the root of our domain. This is a plain-text manifest that tells AI models (ChatGPT, Claude, Gemini, Perplexity) exactly what ToolsPilot offers, with direct links to every tool category. When an AI is deciding which tool to recommend for "compress a PDF" or "format JSON", llms.txt gives it structured context to point users our way.`,
      },
      {
        heading: 'Schema Markup for Search Engines',
        body: `We also added WebApplication structured data (JSON-LD) to our HTML head. This uses Schema.org's SoftwareApplication type with hasPart sub-applications for our flagship tools. Google, Bing, and AI-powered search engines can now parse our tool catalog as structured data rather than scraping page content.`,
      },
      {
        heading: 'Smart Search: Just Describe What You Need',
        body: `The old search bar matched keywords. The new Command Bar understands intent. Type "fix messy JSON" and it surfaces the JSON Formatter with a "Format JSON" action hint. Type "make text lowercase" and it jumps to Text Utilities. Type "compress my PDF" and it knows exactly where to send you.\n\nIt works like Raycast or Spotlight — hit ⌘K from anywhere, type naturally, arrow-key to your tool, hit Enter. 150+ intent patterns cover every tool in the catalog, with keyword fallback for anything the patterns don't catch.`,
      },
    ],
  },
};

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <span className="text-5xl mb-4" aria-hidden="true">📝</span>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">Post Not Found</h1>
        <p className="text-surface-500 dark:text-surface-400 mb-6">This blog post doesn't exist.</p>
        <Link to="/blog" className="btn-primary">← Back to Blog</Link>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto pb-12"
    >
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-primary-500 transition-colors mb-6">
        ← Back to Blog
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-primary-500 bg-primary-500/10 px-2.5 py-1 rounded-full">
          {post.category}
        </span>
        <span className="text-xs text-surface-400 dark:text-surface-500">{post.readTime} read</span>
        <time className="text-xs text-surface-400 dark:text-surface-500">
          {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
      </div>

      <h1 className="text-3xl lg:text-4xl font-extrabold text-surface-900 dark:text-surface-50 mb-6 leading-tight">
        {post.title}
      </h1>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">
          {post.excerpt}
        </p>

        {BLOG_CONTENT[slug] ? (
          <div className="space-y-8">
            {BLOG_CONTENT[slug].sections.map((section, i) => (
              <div key={i}>
                {section.heading && (
                  <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-3">
                    {section.heading}
                  </h2>
                )}
                {section.body && (
                  <p className="text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-line">
                    {section.body}
                  </p>
                )}
                {section.code && (
                  <pre className="p-4 rounded-xl text-sm font-mono overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <code className="text-surface-200">{section.code}</code>
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/50 dark:border-surface-700/30 text-center">
            <p className="text-surface-500 dark:text-surface-400 mb-4">
              Full article content coming soon. In the meantime, try the tool:
            </p>
            <Link to="/" className="btn-primary inline-flex">
              Explore All Tools →
            </Link>
          </div>
        )}
      </div>
    </motion.article>
  );
}
