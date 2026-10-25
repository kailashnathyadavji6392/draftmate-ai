import assert from 'node:assert';
import http from 'node:http';
import { draftingService } from './services/draftingService.js';
import { redlineService } from './services/redlineService.js';

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5001,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  PROMPT 3C VERIFICATION: AI DRAFTING & SMART REDLINE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 6;

  // TEST 1: Drafting Service - Fact-Grounded Generation & Placeholders
  try {
    console.log('[TEST 1] AI Drafting Service: Fact Grounding & Missing Placeholders...');
    const result = await draftingService.generateDraft({
      templateType: 'legal_notice',
      instructions: 'Demand payment of INR 45,00,000 for unpaid invoices under Master Services Agreement dated 15 Jan 2024.',
      documents: [
        {
          id: 'doc-1',
          title: 'Master_Services_Agreement.pdf',
          content: 'AGREEMENT between Apex Technologies and Horizon Logistics. Section 4: Fees payable within 30 days.'
        }
      ],
      matter: {
        title: 'Apex Logistics Recovery',
        clientName: 'Apex Technologies Pvt Ltd',
        opponentName: 'Horizon Logistics Ltd',
        court: 'Hon\'ble High Court of Delhi'
      },
      language: 'en'
    });

    assert.ok(result.draft, 'Draft content should be generated');
    assert.ok(result.draft.includes('Apex Technologies'), 'Should contain client name');
    assert.ok(result.draft.includes('LEGAL NOTICE'), 'Should be formatted as legal notice');
    assert.ok(result.placeholders && result.placeholders.length > 0, 'Should detect missing placeholders');
    assert.ok(result.disclaimer, 'Should include mandatory advocate review disclaimer');
    assert.ok(result.evidenceCitations && result.evidenceCitations.length > 0, 'Should include evidence citations');

    console.log(`  ✓ Passed: Generated ${result.wordCount} words, ${result.placeholders.length} placeholders flagged, ${result.evidenceCitations.length} evidence links.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Failed Test 1:', err.message);
  }

  // TEST 2: Targeted Paragraph Regeneration
  try {
    console.log('\n[TEST 2] Targeted Single-Paragraph Regeneration...');
    const fullDraft = `PARAGRAPH 1: The Claimant is a company incorporated under the Companies Act, 2013 having registered office at New Delhi.

PARAGRAPH 2: The Respondent failed to make payment of INR 10,00,000 despite multiple written reminders.

PARAGRAPH 3: The Claimant therefore demands immediate liquidation of the outstanding sum within fifteen days.`;

    const paragraphs = fullDraft.split('\n\n');
    const targetPara = paragraphs[1];

    const regenResult = await draftingService.regenerateParagraph({
      fullDraft,
      paragraphIndex: 1,
      targetParagraph: targetPara,
      revisionInstruction: 'Increase amount to INR 25,00,000 and mention interest at 18% per annum under MSME Act.',
      context: 'Commercial debt recovery under Section 15 of MSMED Act'
    });

    assert.ok(regenResult.newParagraph, 'Should return regenerated paragraph');
    assert.ok(regenResult.fullRevisedDraft, 'Should return updated full draft');
    
    // Check that paragraph 0 and paragraph 2 are still in the full draft
    assert.ok(regenResult.fullRevisedDraft.includes('PARAGRAPH 1: The Claimant is a company'), 'Paragraph 1 must remain intact');
    assert.ok(regenResult.fullRevisedDraft.includes('PARAGRAPH 3: The Claimant therefore demands'), 'Paragraph 3 must remain intact');
    assert.ok(regenResult.newParagraph.includes('25,00,000') || regenResult.newParagraph.includes('18%') || regenResult.newParagraph.includes('MSME'), 'New paragraph must reflect revision instructions');

    console.log(`  ✓ Passed: Paragraph 2 regenerated selectively without disturbing preceding or succeeding text.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Failed Test 2:', err.message);
  }

  // TEST 3: LCS Matrix Diff & Indian Law Legal Implication Detection
  try {
    console.log('\n[TEST 3] Redline Service: LCS Matrix Diff & Perkins Eastman Detection...');
    const originalText = `14.1 Any dispute shall be referred to arbitration.
14.2 The Service Provider shall have the unilateral and sole discretion to appoint the Sole Arbitrator.
14.3 The seat of arbitration shall be New Delhi.`;

    const revisedText = `14.1 Any dispute shall be referred to arbitration.
14.2 The Sole Arbitrator shall be appointed by mutual agreement pursuant to Section 11 of the Arbitration and Conciliation Act 1996 and Perkins Eastman precedent.
14.3 The seat of arbitration shall be New Delhi.`;

    const diff = redlineService.compareTexts(originalText, revisedText);

    assert.ok(diff.summary, 'Summary object should exist');
    assert.equal(diff.summary.modifications, 1, 'Should detect exactly 1 modified clause');
    assert.equal(diff.summary.unchangedLines, 2, 'Should detect 2 unchanged lines');
    assert.ok(diff.summary.similarityPercentage >= 60, 'Similarity should be accurately computed');

    const modChange = diff.changes.find(c => c.type === 'modified');
    assert.ok(modChange, 'Modified change object should be present');
    assert.ok(modChange.wordDiff && modChange.wordDiff.length > 0, 'Word-level diff tokens should be generated');
    assert.ok(modChange.legalImplications.includes('Perkins Eastman') || modChange.legalImplications.includes('Arbitration'), 'Should identify Perkins Eastman / Section 11 arbitration implication');

    console.log(`  ✓ Passed: LCS matrix diff detected 1 modification, ${diff.summary.similarityPercentage}% similarity, and correctly flagged Perkins Eastman arbitration doctrine.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Failed Test 3:', err.message);
  }

  // TEST 4: Accept/Reject Decision Engine
  try {
    console.log('\n[TEST 4] Redline Decision Processor: Selective Accept/Reject Merging...');
    const originalText = `Clause 1: Initial terms.
Clause 2: Uncapped indemnification for all consequential damages.
Clause 3: Governing law of England.`;

    const revisedText = `Clause 1: Initial terms.
Clause 2: Capped indemnification subject to Section 73 Indian Contract Act.
Clause 3: Governing law of India with exclusive jurisdiction in Mumbai.`;

    const diff = redlineService.compareTexts(originalText, revisedText);
    const modChanges = diff.changes.filter(c => c.type === 'modified');
    assert.equal(modChanges.length, 2, 'Should identify two clause modifications');

    // Accept Clause 2 change, Reject Clause 3 change
    const decisions = {
      [modChanges[0].id]: 'accept',
      [modChanges[1].id]: 'reject'
    };

    const applied = redlineService.applyDecisions(originalText, revisedText, decisions);

    assert.equal(applied.acceptedCount, 1, 'Should count 1 accepted change');
    assert.equal(applied.rejectedCount, 1, 'Should count 1 rejected change');
    assert.ok(applied.finalDocumentText.includes('Capped indemnification subject to Section 73'), 'Accepted Clause 2 revised text should be present');
    assert.ok(applied.finalDocumentText.includes('Governing law of England'), 'Rejected Clause 3 original text must be preserved');
    assert.ok(!applied.finalDocumentText.includes('exclusive jurisdiction in Mumbai'), 'Rejected Clause 3 revised text must not be in final document');

    console.log(`  ✓ Passed: Applied 1 accepted edit and restored 1 rejected edit to original baseline with clean audit trail.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Failed Test 4:', err.message);
  }

  // TEST 5: API Endpoints (POST /api/drafting/generate & POST /api/redline/apply-decisions)
  try {
    console.log('\n[TEST 5] HTTP Endpoints: /api/drafting and /api/redline routes...');
    const draftingRes = await postJson('/api/drafting/generate', {
      templateType: 'commercial_plaint',
      instructions: 'Plaint for recovery of security deposit from landlord under Delhi Rent Control Act.',
      matter: {
        title: 'Security Deposit Suit',
        clientName: 'Rahul Verma',
        opponentName: 'Sanjay Aggarwal',
        court: 'Commercial Court, Saket, New Delhi'
      }
    });

    assert.equal(draftingRes.statusCode, 200, 'Drafting endpoint should return 200');
    assert.ok(draftingRes.body.success, 'Drafting response should indicate success');
    assert.ok(draftingRes.body.data.draft.includes('Rahul Verma'), 'Draft should include client');

    const redlineRes = await postJson('/api/redline/compare', {
      originalText: 'Party A shall pay 50% penalty upon 1-day delay.',
      revisedText: 'Party A shall pay reasonable interest capped under Section 74 Indian Contract Act.'
    });

    assert.equal(redlineRes.statusCode, 200, 'Redline compare endpoint should return 200');
    assert.ok(redlineRes.body.data.summary, 'Redline summary should be returned');

    console.log(`  ✓ Passed: POST /api/drafting/generate and POST /api/redline/compare verified on http://localhost:5001.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Failed Test 5:', err.message);
  }

  // TEST 6: Regression Verification (Risk Radar & Citations)
  try {
    console.log('\n[TEST 6] Regression Verification: Prompt 3A & 3B Features Intact...');
    const riskRes = await postJson('/api/analysis/risk-radar', {
      text: 'The Service Provider shall have the unilateral right to appoint the Sole Arbitrator. Consultant agrees to 3-year non-compete.'
    });

    assert.equal(riskRes.statusCode, 200, 'Risk radar endpoint should return 200');
    assert.ok(riskRes.body.data.findings.length >= 2, 'Risk radar should detect arbitration and non-compete risks');

    const citationRes = await postJson('/api/verification/citations', {
      text: 'According to Section 138 of Negotiable Instruments Act 1881 and Perkins Eastman Architects DPC v. HSCC (India) Ltd (2020) 15 SCC 760.'
    });

    assert.equal(citationRes.statusCode, 200, 'Citation endpoint should return 200');
    assert.ok(citationRes.body.data.citations.length >= 2, 'Citations should be extracted and verified');

    console.log(`  ✓ Passed: Legal Risk Radar and Citation Verification verified without regression.`);
    passed++;
  } catch (err) {
    console.error('  ✗ Failed Test 6:', err.message);
  }

  console.log('\n====================================================');
  console.log(`  VERIFICATION RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
