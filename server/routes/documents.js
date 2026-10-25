// server/routes/documents.js
// User-isolated document management, evidence extraction, upload, and authorized file downloads

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { documentService } from '../services/documentService.js';
import { citationService } from '../services/citationService.js';
import { evidenceService } from '../services/evidenceService.js';
import { aiService } from '../services/aiService.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// Enforce authentication on all document endpoints
router.use(authenticateUser);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx', '.md', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext) || file.mimetype.startsWith('text/')) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${ext}. Supported formats: PDF, DOCX, TXT, MD`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
  fileFilter
});

/**
 * GET /api/documents
 * Retrieve all documents belonging to the authenticated user
 */
router.get('/', (req, res) => {
  const { matterId } = req.query;
  const docs = documentService.getAll(matterId, req.userId);
  res.json({ success: true, count: docs.length, data: docs });
});

/**
 * GET /api/documents/matter/:matterId/evidence
 * Retrieve aggregated evidence facts for a specific matter owned by the authenticated user
 */
router.get('/matter/:matterId/evidence', (req, res) => {
  const { matterId } = req.params;
  const evidence = documentService.getMatterEvidence(matterId, req.userId);
  res.json({ success: true, data: evidence });
});

/**
 * GET /api/documents/:id/download or /api/documents/:id/file
 * Authorized, ownership-checked file download route
 */
const handleAuthorizedDownload = (req, res) => {
  const doc = documentService.getById(req.params.id, req.userId);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found or access denied' });
  }

  // Check if physical file exists on disk
  let filePath = doc.storagePath;
  if (!filePath || !fs.existsSync(filePath)) {
    if (doc.storageFileName) {
      const altPath = path.join(uploadsDir, doc.storageFileName);
      if (fs.existsSync(altPath)) filePath = altPath;
    }
  }

  const downloadFilename = doc.originalName || doc.title || 'document.txt';

  if (filePath && fs.existsSync(filePath)) {
    return res.download(filePath, downloadFilename);
  }

  // If text document without physical upload, stream content as text/plain file
  res.setHeader('Content-Type', doc.fileType || 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
  return res.send(doc.content || '');
};

router.get('/:id/download', handleAuthorizedDownload);
router.get('/:id/file', handleAuthorizedDownload);

/**
 * GET /api/documents/:id
 * Retrieve single document by ID with parsed clauses, citations, and evidence summary
 */
router.get('/:id', (req, res) => {
  const doc = documentService.getById(req.params.id, req.userId);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found or access denied' });
  }

  const clauses = documentService.extractClauses(doc.content);
  const citations = citationService.extractCitations(doc.content);
  const evidence = evidenceService.extractEvidence(doc.content, { id: doc.id, title: doc.title, pages: doc.pages });

  res.json({
    success: true,
    data: {
      ...doc,
      clauses,
      citations,
      evidence
    }
  });
});

/**
 * POST /api/documents/upload
 * Upload and process document bound to authenticated user
 */
router.post('/upload', (req, res) => {
  upload.single('document')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File exceeds maximum upload limit of 25MB.' });
      }
      return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file received in upload payload' });
      }

      const { matterId } = req.body;
      const processedDoc = await documentService.processUploadedFile(req.file, matterId, req.userId);

      res.status(201).json({
        success: true,
        message: `Document "${req.file.originalname}" processed (${processedDoc.wordCount} words, ${processedDoc.pageCount} pages).`,
        data: processedDoc
      });
    } catch (processErr) {
      console.error('File processing error:', processErr);
      res.status(500).json({ success: false, error: processErr.message || 'File processing failed' });
    }
  });
});

/**
 * POST /api/documents/:id/ai-interpret
 * AI evidence interpretation for a document owned by authenticated user
 */
router.post('/:id/ai-interpret', async (req, res) => {
  try {
    const doc = documentService.getById(req.params.id, req.userId);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found or access denied' });
    }

    const { matterContext } = req.body;
    const aiResult = await aiService.interpretEvidenceWithAI(doc.content, doc.title, matterContext || {});

    // Save AI interpretation onto document object
    doc.aiInterpretation = aiResult;
    documentService.updateContent(doc.id, doc.content, req.userId);

    res.json({
      success: true,
      data: aiResult
    });
  } catch (err) {
    console.error('AI interpretation route error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/documents
 * Create document directly bound to authenticated user
 */
router.post('/', (req, res) => {
  const { title, content, matterId, documentType } = req.body;
  if (!content) {
    return res.status(400).json({ success: false, error: 'Document content is required' });
  }

  const created = documentService.createDocument({ title, content, matterId, documentType }, req.userId);
  res.status(201).json({ success: true, data: created });
});

/**
 * PUT /api/documents/:id
 * Update document content owned by authenticated user
 */
router.put('/:id', (req, res) => {
  const { content } = req.body;
  if (content === undefined) {
    return res.status(400).json({ success: false, error: 'Content is required' });
  }

  const updated = documentService.updateContent(req.params.id, content, req.userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Document not found or access denied' });
  }

  res.json({ success: true, data: updated });
});

/**
 * DELETE /api/documents/:id
 * Delete document owned by authenticated user
 */
router.delete('/:id', (req, res) => {
  const removed = documentService.deleteDocument(req.params.id, req.userId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Document not found or access denied' });
  }
  res.json({ success: true, message: 'Document deleted successfully' });
});

export default router;
