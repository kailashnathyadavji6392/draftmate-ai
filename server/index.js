import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Routes
import authRouter from './routes/auth.js';
import mattersRouter from './routes/matters.js';
import documentsRouter from './routes/documents.js';
import draftingRouter from './routes/drafting.js';
import draftsRouter from './routes/drafts.js';
import researchRouter from './routes/research.js';
import analysisRouter from './routes/analysis.js';
import verificationRouter from './routes/verification.js';
import redlineRouter from './routes/redline.js';
import exportRouter from './routes/export.js';
import configRouter from './routes/config.js';
import hearingsRouter from './routes/hearings.js';
import remindersRouter from './routes/reminders.js';
import { initDatabase } from './db/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure essential runtime directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 5001;

// Production-ready CORS with cookie credentials, Bearer tokens & exposed Content-Disposition
const configuredOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow non-browser requests (e.g. mobile apps, curl, uptime pingers)
    if (!origin) return callback(null, true);

    // 2. If no specific origins configured (e.g. local dev), reflect incoming origin
    if (configuredOrigins.length === 0) {
      return callback(null, true);
    }

    // 3. Exact match or Netlify wildcard match
    const isAllowed = configuredOrigins.some(allowed => {
      if (allowed === '*' || allowed === origin) return true;
      // Allow Netlify preview deploy subdomains if Netlify was configured
      if (origin.endsWith('.netlify.app') && (allowed.includes('.netlify.app') || allowed === 'netlify')) return true;
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}. Configured origins: ${configuredOrigins.join(', ')}`);
      callback(null, false);
    }
  },
  credentials: true, // Required for HttpOnly authentication cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Disposition']
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// NOTE: Private uploaded legal files are NEVER served publicly via static routes.
// All document downloads and views are strictly authenticated and ownership-checked
// via the authorized route GET /api/documents/:id/download

// Serve built frontend assets in production if client/dist exists
const clientDistPath = path.join(__dirname, '../client/dist');
const hasBuiltFrontend = fs.existsSync(clientDistPath) && fs.existsSync(path.join(clientDistPath, 'index.html'));
if (hasBuiltFrontend) {
  app.use(express.static(clientDistPath));
}

// Root endpoint: provides friendly status for decoupled backend or serves React app
app.get('/', (req, res) => {
  if (hasBuiltFrontend && !req.headers.accept?.includes('application/json')) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  res.json({
    service: 'DraftMate Evidence Intelligence API',
    status: 'ONLINE',
    version: '1.0.0-PRO',
    architecture: 'Decoupled (Frontend on Netlify / API Backend on Render)',
    jurisdiction: 'Republic of India (BNS, BNSS, BSA compliant)',
    endpoints: {
      health: '/api/health',
      matters: '/api/matters',
      hearings: '/api/hearings',
      reminders: '/api/reminders',
      documents: '/api/documents',
      drafting: '/api/drafting',
      verification: '/api/verification',
      research: '/api/research'
    },
    message: 'DraftMate AI API Backend is running. Access the user interface on your Netlify application.'
  });
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/matters', mattersRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/drafting', draftingRouter);
app.use('/api/drafts', draftsRouter);
app.use('/api/research', researchRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/redline', redlineRouter);
app.use('/api/export', exportRouter);
app.use('/api/config', configRouter);
app.use('/api/hearings', hearingsRouter);
app.use('/api/reminders', remindersRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'DraftMate Evidence Intelligence API',
    version: '1.0.0-PRO',
    authSystem: 'Multi-User Isolated (JWT HttpOnly + bcrypt)',
    jurisdiction: 'Republic of India (Bharatiya Nyaya Sanhita / BNSS / BSA compliant)',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// SPA fallback: Route all non-API GET requests to React index.html if frontend is packaged with backend
if (hasBuiltFrontend) {
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Initialize Database (PostgreSQL or local fallback)
await initDatabase().catch(err => {
  console.error('[DraftMate AI Backend] Fatal database initialization error:', err);
});

app.listen(PORT, () => {
  console.log(`[DraftMate AI Backend] Server running on http://localhost:${PORT}`);
  console.log(`[DraftMate AI Backend] Ready for Multi-User Indian Legal Tech Operations.`);
});

export default app;
