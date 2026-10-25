// server/routes/drafting.js
// AI Drafting Studio: Grounded legal document generation, targeted paragraph revision, and legal templates

import express from 'express';
import { draftingService } from '../services/draftingService.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce authentication on all drafting operations
router.use(authenticateUser);

const TEMPLATES = [
  {
    id: 'tpl-notice-138',
    title: 'Statutory Demand Notice under Section 138 NI Act',
    category: 'Banking & Commercial Crimes',
    statute: 'Negotiable Instruments Act, 1881',
    description: 'Mandatory 15-day statutory notice for cheque dishonor with return memo particulars, drawer liability, and formal demand.',
    docType: 'Legal Notice',
    fields: ['clientName', 'oppositeParty', 'claimAmount', 'jurisdiction']
  },
  {
    id: 'tpl-bail-482',
    title: 'Anticipatory Bail Application under Section 482 BNSS',
    category: 'Criminal Defense',
    statute: 'Bharatiya Nagarik Suraksha Sanhita, 2023 (Sec 482 / Erstwhile CrPC Sec 438)',
    description: 'Anticipatory bail petition incorporating Satender Kumar Antil and Arnesh Kumar safeguards, demonstrating absence of custodial requirement.',
    docType: 'Anticipatory Bail Application',
    fields: ['clientName', 'oppositeParty', 'court', 'disputeDetails']
  },
  {
    id: 'tpl-comm-plaint',
    title: 'Commercial Suit Plaint for Breach of Contract',
    category: 'Commercial Litigation',
    statute: 'Commercial Courts Act, 2015 & Order VII CPC',
    description: 'Plaint structure for recovery of commercial dues, liquidated damages under Section 73 Contract Act, and Section 63 BSA certificate.',
    docType: 'Commercial Plaint',
    fields: ['clientName', 'oppositeParty', 'court', 'claimAmount', 'jurisdiction']
  },
  {
    id: 'tpl-arb-clause',
    title: 'Perkins-Compliant Bilateral Arbitration Agreement',
    category: 'Arbitration',
    statute: 'Arbitration and Conciliation Act, 1996 (Section 12(5))',
    description: 'Neutral dispute resolution clause with mutual consent appointment, seat designation, and aggregate liability cap.',
    docType: 'Arbitration Clause',
    fields: ['clientName', 'oppositeParty', 'jurisdiction']
  }
];

// GET available legal templates
router.get('/templates', (req, res) => {
  res.json({ success: true, count: TEMPLATES.length, data: TEMPLATES });
});

// POST generate grounded legal draft
router.post('/generate', async (req, res) => {
  try {
    const result = await draftingService.generateDraft(req.body);
    res.json({ success: true, data: result, ...result });
  } catch (err) {
    console.error('Draft generation error:', err);
    res.status(500).json({ success: false, error: err.message || 'Draft generation failed' });
  }
});

// POST targeted paragraph revision
router.post('/revise-paragraph', async (req, res) => {
  try {
    const { fullText, paragraphIndex, selectedParagraph, instructions, language } = req.body;
    if (!fullText) {
      return res.status(400).json({ success: false, error: 'Full document text is required.' });
    }

    const result = await draftingService.regenerateParagraph({
      fullText,
      paragraphIndex: paragraphIndex ?? 0,
      selectedParagraph: selectedParagraph || '',
      instructions: instructions || '',
      language: language || 'en'
    });

    res.json({ success: true, data: result, ...result });
  } catch (err) {
    console.error('Paragraph revision error:', err);
    res.status(500).json({ success: false, error: err.message || 'Paragraph revision failed' });
  }
});

// POST full draft targeted revision
router.post('/revise', async (req, res) => {
  try {
    const { fullText, revisionPrompt, language } = req.body;
    if (!fullText) {
      return res.status(400).json({ success: false, error: 'Full text is required for revision.' });
    }

    const result = await draftingService.reviseDraft({
      fullText,
      revisionPrompt: revisionPrompt || '',
      language: language || 'en'
    });

    res.json({ success: true, data: result, ...result });
  } catch (err) {
    console.error('Draft revision error:', err);
    res.status(500).json({ success: false, error: err.message || 'Draft revision failed' });
  }
});

export default router;
