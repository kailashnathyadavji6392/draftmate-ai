// server/routes/analysis.js
// User-isolated Risk Radar and evidence analysis route

import express from 'express';
import { evidenceService } from '../services/evidenceService.js';
import { documentService } from '../services/documentService.js';
import { riskAnalysisService } from '../services/riskAnalysisService.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce authentication on all analysis routes
router.use(authenticateUser);

// POST Risk Radar Analysis
router.post('/risk-radar', async (req, res) => {
  try {
    const { documentId, text, metadata } = req.body;
    let contentToAnalyze = text || '';

    if (documentId && !contentToAnalyze) {
      const doc = documentService.getById(documentId, req.userId);
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Document not found or access denied' });
      }
      contentToAnalyze = doc.content;
    }

    if (!contentToAnalyze) {
      return res.status(400).json({ success: false, error: 'Document ID or text content is required' });
    }

    const riskResult = await riskAnalysisService.analyzeDocumentRisks(documentId, contentToAnalyze, metadata || {});

    // Compute multi-vector risk scores for radar visualization
    const hasUnilateral = riskResult.findings.some(f => f.category?.includes('Dispute') && f.riskLevel === 'Critical');
    const hasIndemnity = riskResult.findings.some(f => f.category?.includes('Indemnity'));
    const hasBsa = riskResult.findings.some(f => f.id?.includes('bsa'));
    const hasTiming = riskResult.findings.some(f => f.category?.includes('Termination') || f.category?.includes('Payment'));

    const radarMetrics = [
      { 
        dimension: 'Electronic Admissibility (BSA s.63)', 
        score: hasBsa ? 75 : 20, 
        threshold: 40, 
        status: hasBsa ? 'Action Required' : 'Secure' 
      },
      { 
        dimension: 'Arbitration Neutrality (Perkins Test)', 
        score: hasUnilateral ? 95 : 15, 
        threshold: 50, 
        status: hasUnilateral ? 'Critical' : 'Valid' 
      },
      { 
        dimension: 'Indemnity Exposure (Contract Act s.73)', 
        score: hasIndemnity ? 85 : 25, 
        threshold: 50, 
        status: hasIndemnity ? 'High Exposure' : 'Standard' 
      },
      { 
        dimension: 'Limitation & Procedural Timing', 
        score: hasTiming ? 65 : 20, 
        threshold: 50, 
        status: hasTiming ? 'Review Notice Terms' : 'In Time' 
      }
    ];

    // Map findings to flags format for backward compatibility
    const flags = riskResult.findings.map(f => ({
      title: f.title,
      severity: f.riskLevel,
      description: f.plainEnglishReason,
      remedy: f.suggestedRevision,
      excerpt: f.originalExcerpt,
      sourceLocation: f.sourceLocation,
      category: f.category,
      confidence: f.confidence
    }));

    res.json({
      success: true,
      data: {
        ...riskResult,
        radarMetrics,
        flags
      }
    });
  } catch (err) {
    console.error('Risk Radar error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Evidence Summary & Timeline Extraction
router.post('/evidence-summary', (req, res) => {
  const { documentId, text } = req.body;
  let contentToAnalyze = text || '';

  if (documentId && !contentToAnalyze) {
    const doc = documentService.getById(documentId, req.userId);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found or access denied' });
    }
    contentToAnalyze = doc.content;
  }

  if (!contentToAnalyze) {
    return res.status(400).json({ success: false, error: 'Document ID or text is required' });
  }

  const analysis = evidenceService.extractEvidence(contentToAnalyze);

  res.json({
    success: true,
    data: analysis
  });
});

export default router;
