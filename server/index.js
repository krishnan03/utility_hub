import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import { sessionMiddleware } from './middleware/session.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { requestIdMiddleware, errorHandler } from './middleware/errorHandler.js';
import filesRouter from './routes/files.js';
import imageRouter from './routes/image.js';
import pdfRouter from './routes/pdf.js';
import signatureRouter from './routes/signature.js';
import documentRouter from './routes/document.js';
import mediaRouter from './routes/media.js';
import qrRouter from './routes/qr.js';
import ocrRouter from './routes/ocr.js';
import seoRouter from './routes/seo.js';
import faviconRouter from './routes/favicon.js';
import toolsRouter from './routes/tools.js';
import { startCleanup } from './services/cleanupService.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({ origin: config.corsOrigin }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing (required before session middleware)
app.use(cookieParser());

// Request ID — unique UUID per request for error logging
app.use(requestIdMiddleware);

// Session — assigns a UUID session ID via cookie
app.use(sessionMiddleware);

// Rate limiting
app.use(apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route placeholders — each will be replaced with real routers as tools are built
const placeholderRouter = (name) => {
  const router = express.Router();
  router.all('*', (req, res) => {
    res.status(501).json({ success: false, message: `${name} routes not yet implemented` });
  });
  return router;
};

app.use('/api/image', imageRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/document', documentRouter);
app.use('/api/media', mediaRouter);
app.use('/api/ocr', ocrRouter);
app.use('/api/qr', qrRouter);
app.use('/api/seo', seoRouter);
app.use('/api/meme', placeholderRouter('meme'));
app.use('/api/favicon', faviconRouter);
app.use('/api/gif', placeholderRouter('gif'));
app.use('/api/signature', signatureRouter);
app.use('/api/files', filesRouter);
app.use('/api/tools', toolsRouter);

// Global error handler — MUST be last middleware
app.use(errorHandler);

// Start server only when run directly (not imported for testing)
if (process.env.NODE_ENV !== 'test') {
  startCleanup();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export default app;
