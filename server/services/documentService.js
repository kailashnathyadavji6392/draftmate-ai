// server/services/documentService.js
// Document processing, text extraction (PDF, DOCX, TXT), evidence synthesis, and user-isolated document storage

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { citationService } from './citationService.js';
import { evidenceService } from './evidenceService.js';
import { db } from '../data/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const documentService = {
  /**
   * Get all documents with optional matterId and userId filtering
   */
  getAll(matterId = null, userId = null) {
    if (userId) {
      return db.documents.findByUserId(userId, d => !matterId || d.matterId === matterId);
    }
    if (matterId) {
      return db.documents.find(d => d.matterId === matterId);
    }
    return db.documents.find();
  },

  /**
   * Get single document by ID, optionally validating userId ownership
   */
  getById(id, userId = null) {
    const doc = db.documents.findById(id);
    if (!doc) return null;
    if (userId && doc.userId && doc.userId !== userId) {
      return null; // Deny access to other users' documents
    }
    return doc;
  },

  /**
   * Aggregate extracted facts and evidence for a matter
   */
  getMatterEvidence(matterId, userId = null) {
    const matterDocs = this.getAll(matterId, userId);
    const allFacts = [];
    const allParties = [];
    const allDates = [];
    const allFinancials = [];
    const allClaims = [];
    const allLegalRefs = [];

    for (const doc of matterDocs) {
      if (doc.extractedFacts) allFacts.push(...doc.extractedFacts);
      if (doc.parties) allParties.push(...doc.parties);
      if (doc.datesAndDeadlines) allDates.push(...doc.datesAndDeadlines);
      if (doc.financialObligations) allFinancials.push(...doc.financialObligations);
      if (doc.clausesAndClaims) allClaims.push(...doc.clausesAndClaims);
      if (doc.legalReferences) allLegalRefs.push(...doc.legalReferences);
    }

    return {
      matterId,
      documentsCount: matterDocs.length,
      totalFactsCount: allFacts.length,
      facts: allFacts,
      parties: allParties,
      datesAndDeadlines: allDates,
      financialObligations: allFinancials,
      clausesAndClaims: allClaims,
      legalReferences: allLegalRefs
    };
  },

  classifyDocumentType(text = '', fileName = '') {
    const combined = (text + ' ' + fileName).toLowerCase();
    if (combined.includes('anticipatory bail') || combined.includes('section 482 bnss') || combined.includes('section 438 crpc')) {
      return 'Anticipatory Bail Application';
    }
    if (combined.includes('plaint') || combined.includes('order vii') || combined.includes('commercial suit')) {
      return 'Plaint / Commercial Pleading';
    }
    if (combined.includes('written statement') || combined.includes('order viii')) {
      return 'Written Statement';
    }
    if (combined.includes('legal notice') || combined.includes('notice under section') || combined.includes('demand notice')) {
      return 'Legal Notice';
    }
    if (combined.includes('section 63') || combined.includes('section 65b') || combined.includes('certificate')) {
      return 'Electronic Evidence Certificate';
    }
    if (combined.includes('arbitration') || combined.includes('statement of claim') || combined.includes('section 11')) {
      return 'Arbitration Petition';
    }
    if (combined.includes('agreement') || combined.includes('contract') || combined.includes('mou')) {
      return 'Commercial Agreement';
    }
    return 'Legal Document';
  },

  extractClauses(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const clauses = [];
    let currentClause = null;

    const clauseRegex = /^(?:clause|article|section|\d+\.|\d+\))\s+(.+)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (clauseRegex.test(line) || /^[A-Z0-9\s:.-]{4,40}$/.test(line)) {
        if (currentClause) clauses.push(currentClause);
        currentClause = {
          id: `clause-${clauses.length + 1}`,
          heading: line,
          body: '',
          lineNumber: i + 1
        };
      } else {
        if (currentClause) {
          currentClause.body += (currentClause.body ? '\n' : '') + line;
        } else {
          currentClause = {
            id: `clause-${clauses.length + 1}`,
            heading: 'Preamble / Recitals',
            body: line,
            lineNumber: i + 1
          };
        }
      }
    }
    if (currentClause) clauses.push(currentClause);
    return clauses;
  },

  async processUploadedFile(file, matterId = null, userId = null) {
    if (!file) throw new Error('No file provided');

    const filePath = file.path;
    let content = '';
    let pages = [];
    let pageCount = 1;
    let isScanned = false;
    let scanNotice = null;

    const ext = path.extname(file.originalname).toLowerCase();

    // 1. TXT / MD / JSON Parsing
    if (['.txt', '.md', '.json', '.csv'].includes(ext)) {
      content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      pageCount = Math.max(1, Math.ceil(lines.length / 45));
    } 
    // 2. PDF Parsing via official PDFParse
    else if (ext === '.pdf') {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const uint8Data = new Uint8Array(fileBuffer);
        const pdfInstance = new PDFParse(uint8Data);
        await pdfInstance.load();
        const parseResult = await pdfInstance.getText();

        content = parseResult?.text || '';
        pageCount = parseResult?.total || 1;

        if (parseResult?.pages && Array.isArray(parseResult.pages)) {
          pages = parseResult.pages.map((p, idx) => ({
            pageNumber: idx + 1,
            text: p.text || ''
          }));
        }

        // Honest scanned PDF detection
        if (!content || content.trim().length < 25) {
          isScanned = true;
          scanNotice = 'Scanned PDF: This document consists of image scans without an embedded text layer. Optical Character Recognition (OCR) is required to extract text.';
          content = `[SCANNED DOCUMENT NOTICE]\n${file.originalname}\n${scanNotice}\n\nNote: Ground-truth text extraction could not retrieve character streams. File preserved in evidence repository.`;
        }
      } catch (pdfErr) {
        console.warn('PDF parsing warning:', pdfErr.message);
        content = `[PDF Parsing Error: ${file.originalname}]\nFailed to parse binary PDF stream: ${pdfErr.message}`;
        isScanned = true;
        scanNotice = `Parser warning: ${pdfErr.message}`;
      }
    } 
    // 3. Word (DOCX / DOC) Parsing via Mammoth
    else if (['.docx', '.doc'].includes(ext)) {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        content = result.value || '';
        if (result.messages && result.messages.length > 0) {
          console.log('Mammoth conversion messages:', result.messages);
        }
        pageCount = Math.max(1, Math.ceil(content.split('\n').length / 45));
      } catch (docxErr) {
        console.warn('DOCX parsing warning:', docxErr.message);
        content = `[DOCX Document: ${file.originalname}]\nExtraction warning: ${docxErr.message}`;
      }
    } else {
      content = fs.readFileSync(filePath, 'utf-8').catch(() => `[Binary File: ${file.originalname}]`);
    }

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const docType = this.classifyDocumentType(content, file.originalname);
    const hash = crypto.createHash('sha256').update(content || file.originalname).digest('hex');

    const newDocId = `doc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    // Extract deep evidence with genuine source locations
    const evidenceExtract = evidenceService.extractEvidence(content, {
      id: newDocId,
      title: file.originalname,
      pages
    });

    const newDoc = {
      id: newDocId,
      userId: userId || 'usr-legacy-demo', // Strictly bind to authenticated user
      matterId: matterId || null,
      title: file.originalname,
      originalName: file.originalname,
      fileType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size,
      storagePath: filePath,
      storageFileName: file.filename,
      downloadUrl: `/api/documents/${newDocId}/download`,
      wordCount,
      pageCount,
      isScanned,
      scanNotice,
      documentType: docType,
      sha256Hash: hash,
      pages,
      extractedFacts: evidenceExtract.extractedFacts,
      parties: evidenceExtract.parties,
      datesAndDeadlines: evidenceExtract.datesAndDeadlines,
      financialObligations: evidenceExtract.financialObligations,
      clausesAndClaims: evidenceExtract.clausesAndClaims,
      legalReferences: evidenceExtract.legalReferences,
      status: 'Processed',
      uploadedAt: new Date().toISOString(),
      content: content
    };

    db.documents.insert(newDoc);
    return newDoc;
  },

  createDocument(docData, userId = null) {
    const { title, content, matterId, documentType } = docData;
    const wordCount = content ? content.trim().split(/\s+/).length : 0;
    const pageCount = Math.max(1, Math.ceil(wordCount / 350));
    const newDocId = `doc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const evidenceExtract = evidenceService.extractEvidence(content || '', {
      id: newDocId,
      title: title || 'Untitled_Legal_Draft.txt'
    });

    const newDoc = {
      id: newDocId,
      userId: userId || 'usr-legacy-demo', // Strictly bind to authenticated user
      matterId: matterId || null,
      title: title || 'Untitled_Legal_Draft.txt',
      originalName: title || 'Untitled_Legal_Draft.txt',
      fileType: 'text/plain',
      sizeBytes: Buffer.byteLength(content || '', 'utf8'),
      downloadUrl: `/api/documents/${newDocId}/download`,
      wordCount,
      pageCount,
      isScanned: false,
      documentType: documentType || this.classifyDocumentType(content, title),
      sha256Hash: crypto.createHash('sha256').update(content || '').digest('hex'),
      extractedFacts: evidenceExtract.extractedFacts,
      parties: evidenceExtract.parties,
      datesAndDeadlines: evidenceExtract.datesAndDeadlines,
      financialObligations: evidenceExtract.financialObligations,
      clausesAndClaims: evidenceExtract.clausesAndClaims,
      legalReferences: evidenceExtract.legalReferences,
      status: 'Draft',
      uploadedAt: new Date().toISOString(),
      content: content || ''
    };

    db.documents.insert(newDoc);
    return newDoc;
  },

  updateContent(id, newContent, userId = null) {
    const doc = db.documents.findById(id);
    if (!doc) return null;
    if (userId && doc.userId && doc.userId !== userId) {
      return null;
    }

    const wordCount = newContent.trim().split(/\s+/).length;
    const pageCount = Math.max(1, Math.ceil(wordCount / 350));
    const sizeBytes = Buffer.byteLength(newContent, 'utf8');

    const evidenceExtract = evidenceService.extractEvidence(newContent, {
      id: doc.id,
      title: doc.title,
      pages: doc.pages || []
    });

    const updates = {
      content: newContent,
      wordCount,
      pageCount,
      sizeBytes,
      updatedAt: new Date().toISOString(),
      extractedFacts: evidenceExtract.extractedFacts,
      parties: evidenceExtract.parties,
      datesAndDeadlines: evidenceExtract.datesAndDeadlines,
      financialObligations: evidenceExtract.financialObligations,
      clausesAndClaims: evidenceExtract.clausesAndClaims,
      legalReferences: evidenceExtract.legalReferences
    };

    return db.documents.update(id, updates);
  },

  deleteDocument(id, userId = null) {
    const doc = db.documents.findById(id);
    if (!doc) return false;
    if (userId && doc.userId && doc.userId !== userId) {
      return false;
    }

    // Attempt to unlink local disk file if it exists
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (err) {
        console.warn('Could not remove file on disk:', err.message);
      }
    }

    db.documents.delete(id);
    return true;
  }
};
