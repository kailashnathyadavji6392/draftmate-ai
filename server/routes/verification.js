// server/routes/verification.js
// Indian Legal Citation Verification and BSA Electronic Evidence Admissibility

import express from 'express';
import { citationService } from '../services/citationService.js';
import { evidenceService } from '../services/evidenceService.js';
import { documentService } from '../services/documentService.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce authentication on verification endpoints
router.use(authenticateUser);

// POST verify all citations in document or raw text
router.post('/citations', (req, res) => {
  try {
    const { documentId, text, metadata = {}, simulateOffline } = req.body;
    let contentToAnalyze = text || '';

    let doc = null;
    if (documentId) {
      doc = documentService.getById(documentId, req.userId);
      if (doc) {
        contentToAnalyze = contentToAnalyze || doc.content;
        metadata.title = metadata.title || doc.title;
        metadata.pages = metadata.pages || doc.pages;
      } else if (!contentToAnalyze) {
        return res.status(404).json({ success: false, error: 'Document not found or access denied' });
      }
    }

    if (!contentToAnalyze || !contentToAnalyze.trim()) {
      return res.status(400).json({ success: false, error: 'Document ID or text content is required' });
    }

    const results = citationService.extractAndVerifyCitations(contentToAnalyze, metadata);

    // If source simulation or network offline flag is requested for testing
    if (simulateOffline) {
      const offlineCitations = results.allCitations.map(c => ({
        ...c,
        status: 'Unable to Check',
        statusBadge: 'badge-danger',
        sourceUrl: null,
        whatWasChecked: 'Attempted connection to official government repository.',
        whatRemainsUncertain: 'Source repository endpoint timed out or was temporarily unreachable. Check internet connection and retry.',
        sourceExcerpt: 'Verification could not be completed because of access/network limitations.'
      }));

      return res.json({
        success: true,
        data: {
          ...results,
          verifiedCount: 0,
          partiallyVerifiedCount: 0,
          unableToCheckCount: offlineCitations.length,
          integrityScore: 0,
          allCitations: offlineCitations,
          caseCitations: offlineCitations.filter(c => c.citationType === 'Case Precedent'),
          statutoryCitations: offlineCitations.filter(c => c.citationType === 'Statutory Provision'),
          isOfflineSimulated: true
        }
      });
    }

    res.json({
      success: true,
      data: {
        documentId: doc?.id || documentId || null,
        documentTitle: doc?.title || metadata.title || 'Legal Document',
        ...results
      }
    });
  } catch (err) {
    console.error('Citation verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST verify single citation query
router.post('/single', (req, res) => {
  try {
    const { citation, simulateOffline } = req.body;
    if (!citation || !citation.trim()) {
      return res.status(400).json({ success: false, error: 'Citation string is required' });
    }

    if (simulateOffline) {
      return res.json({
        success: true,
        data: {
          citationText: citation,
          citationType: 'Unknown',
          status: 'Unable to Check',
          statusBadge: 'badge-danger',
          source: 'Supreme Court / India Code Gateway',
          sourceUrl: null,
          whatWasChecked: 'External network connection attempt to official repository.',
          whatRemainsUncertain: 'Unable to reach official court servers. Please verify network access and retry.',
          sourceExcerpt: 'Verification service offline or rate limited.'
        }
      });
    }

    const result = citationService.verifyCitation(citation);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Single citation verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST verify BSA Section 63 electronic compliance
router.post('/bsa-electronic', (req, res) => {
  try {
    const { text, hasCertificate, hasHash, custodianDesignation } = req.body;
    const analysis = evidenceService.extractEvidence(text || '');

    const checklist = [
      { item: 'Digital Record Source Identified', pass: Boolean(analysis.evidenceItems.some(e => e.category === 'Electronic Evidence') || /email|log|server|whatsapp|digital/i.test(text || '')), weight: 20 },
      { item: 'Section 63 BSA Certificate Attached/Referenced', pass: Boolean(hasCertificate || analysis.bsaCompliance?.hasCertificate), weight: 40 },
      { item: 'SHA-256 / Cryptographic Hash Authenticated', pass: Boolean(hasHash || analysis.bsaCompliance?.hasAuditTrail), weight: 20 },
      { item: 'Responsible System Custodian Attestation', pass: Boolean(custodianDesignation || /administrator|custodian|manager|officer/i.test(text || '')), weight: 20 }
    ];

    const earned = checklist.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);

    res.json({
      success: true,
      data: {
        score: earned,
        admissibilityStatus: earned >= 80 
          ? 'Fully Admissible under BSA Sec 63' 
          : earned >= 60 
          ? 'Conditionally Admissible (Curable Defect)' 
          : 'Inadmissible (Barred under Arjun Panditrao 2020 7 SCC 1)',
        checklist,
        relevantPrecedent: 'Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) 7 SCC 1',
        officialLink: 'https://digiscr.sci.gov.in'
      }
    });
  } catch (err) {
    console.error('BSA Electronic verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
