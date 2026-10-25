import express from 'express';
import { citationService } from '../services/citationService.js';
import { documentService } from '../services/documentService.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce authentication on all legal research endpoints
router.use(authenticateUser);

// GET all statutory cross-references and Central Enactments on India Code
router.get('/statutes', (req, res) => {
  const kb = citationService.getKnowledgeBase();
  const { query } = req.query;

  let centralEnactments = kb.centralStatutes || [];
  let penalCode = kb.statuteCrossReference || [];
  let procedureCode = kb.proceduralCrossReference || [];
  let evidenceCode = kb.evidenceCrossReference || [];

  if (query) {
    const q = query.toLowerCase();
    centralEnactments = centralEnactments.filter(s => 
      s.actTitle.toLowerCase().includes(q) ||
      s.actNumber.toLowerCase().includes(q) ||
      s.keySections.some(ks => ks.section.toLowerCase().includes(q) || ks.title.toLowerCase().includes(q))
    );
    penalCode = penalCode.filter(s => 
      s.bnsSection.toLowerCase().includes(q) || 
      s.bnsTitle.toLowerCase().includes(q) || 
      s.ipcSection.toLowerCase().includes(q) || 
      s.ipcTitle.toLowerCase().includes(q)
    );
    procedureCode = procedureCode.filter(s => 
      s.bnssSection.toLowerCase().includes(q) || 
      s.bnssTitle.toLowerCase().includes(q) || 
      s.crpcSection.toLowerCase().includes(q) || 
      s.crpcTitle.toLowerCase().includes(q)
    );
    evidenceCode = evidenceCode.filter(s => 
      s.bsaSection.toLowerCase().includes(q) || 
      s.bsaTitle.toLowerCase().includes(q) || 
      s.ieaSection.toLowerCase().includes(q) || 
      s.ieaTitle.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    data: {
      centralEnactments,
      penalCode,
      procedureCode,
      evidenceCode
    }
  });
});

// GET landmark precedents
router.get('/precedents', (req, res) => {
  const kb = citationService.getKnowledgeBase();
  const { query } = req.query;

  let precedents = kb.landmarkPrecedents || [];
  if (query) {
    const q = query.toLowerCase();
    precedents = precedents.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.citation.toLowerCase().includes(q) ||
      (p.alternativeCitation && p.alternativeCitation.toLowerCase().includes(q)) ||
      (p.inscCitation && p.inscCitation.toLowerCase().includes(q)) ||
      p.subject.toLowerCase().includes(q) ||
      p.ratio.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: precedents.length,
    data: precedents
  });
});

// POST research query & cross-reference
router.post('/query', (req, res) => {
  const { query, documentId } = req.body;
  const kb = citationService.getKnowledgeBase();

  let targetText = query || '';
  if (documentId && !targetText) {
    const doc = documentService.getById(documentId, req.userId);
    if (doc) targetText = doc.content;
  }

  if (!targetText) {
    return res.status(400).json({ success: false, error: 'Query parameter or document ID is required' });
  }

  const q = targetText.toLowerCase();

  const matchedPrecedents = kb.landmarkPrecedents.filter(p => 
    q.includes(p.title.toLowerCase()) ||
    p.title.toLowerCase().includes(q) ||
    q.includes(p.citation.toLowerCase()) ||
    (p.alternativeCitation && q.includes(p.alternativeCitation.toLowerCase())) ||
    p.subject.toLowerCase().includes(q) ||
    p.ratio.toLowerCase().includes(q)
  );

  const matchedStatutes = (kb.centralStatutes || []).filter(s => 
    q.includes(s.actTitle.toLowerCase()) ||
    s.actTitle.toLowerCase().includes(q) ||
    s.keySections.some(ks => q.includes(ks.section.toLowerCase()) || ks.title.toLowerCase().includes(q))
  );

  res.json({
    success: true,
    query: targetText.slice(0, 80),
    matchedPrecedentsCount: matchedPrecedents.length,
    matchedPrecedents,
    matchedStatutesCount: matchedStatutes.length,
    matchedStatutes,
    disclaimer: 'Legal research is provided for informational and assistive purposes. Professional verification by an advocate is required prior to judicial submission.'
  });
});

export default router;
