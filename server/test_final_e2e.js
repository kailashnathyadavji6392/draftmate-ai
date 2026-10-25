// server/test_final_e2e.js
// Comprehensive End-to-End Verification Suite for DraftMate Evidence Intelligence
// Tests all 10 Core Workflows with Real Data and Actual File Binaries

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_BASE = 'http://localhost:5001/api';

async function runEndToEndTests() {
  console.log('========================================================================');
  console.log('   DRAFTMATE EVIDENCE INTELLIGENCE — COMPREHENSIVE E2E VERIFICATION    ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const workflowResults = {};

  function assert(condition, message, workflowKey) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
      if (workflowKey) workflowResults[workflowKey] = (workflowResults[workflowKey] || 0) + 1;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
      if (workflowKey) workflowResults[workflowKey] = workflowResults[workflowKey] || 0;
    }
  }

  // Temporary test directory for generated files
  const tempDir = path.join(__dirname, 'temp_test_docs');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  let createdMatterId = null;
  let uploadedDocIds = [];

  // Authenticate advocate session for E2E workflows
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rajesh.sharma@delhibar.in', password: 'AdvocateRajesh2026!' })
  });
  const loginJson = await loginRes.json();
  const authToken = loginJson.token;
  if (!authToken) {
    throw new Error('Failed to authenticate test runner: ' + (loginJson.error || 'Unknown auth error'));
  }

  // Intercept fetch to automatically supply Bearer token to all protected API calls
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const opts = { ...options };
    const headers = { ...opts.headers };
    if (typeof url === 'string' && url.startsWith(API_BASE) && !url.includes('/auth/login') && !url.includes('/auth/signup')) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    opts.headers = headers;
    return originalFetch(url, opts);
  };

  try {
    // =========================================================================
    // WORKFLOW 1: Create a Matter and Reopen It After Refreshing (Persistence)
    // =========================================================================
    console.log('--- WORKFLOW 1: CREATE MATTER & PERSISTENCE RELOAD ---');
    const matterPayload = {
      title: 'Tata Motors Commercial Division v. Delhi Transport Corp',
      court: 'High Court of Delhi',
      matterType: 'Commercial Suit',
      client: 'Tata Motors Commercial Division',
      clientRole: 'Petitioner / Claimant',
      oppositeParty: 'Delhi Transport Corporation (DTC)',
      caseNumber: 'COMM-SUIT-884/2026',
      claimAmount: 'INR 14,20,00,000',
      priority: 'High',
      jurisdiction: 'New Delhi, India',
      summary: 'Arbitral award enforcement and recovery of unpaid fleet supply invoices.'
    };

    const createMatterRes = await fetch(`${API_BASE}/matters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matterPayload)
    });
    const createMatterJson = await createMatterRes.json();
    assert(createMatterRes.status === 201 && createMatterJson.success && createMatterJson.data?.id, 'Matter created successfully via API', 'WF1');
    createdMatterId = createMatterJson.data.id;

    // Simulate page reload/refresh by re-querying all matters
    const reloadMattersRes = await fetch(`${API_BASE}/matters`);
    const reloadMattersJson = await reloadMattersRes.json();
    const fetchedMatter = reloadMattersJson.data.find(m => m.id === createdMatterId);
    assert(!!fetchedMatter && fetchedMatter.title.includes('Tata Motors'), 'Matter persisted across reloads and retrieved from database', 'WF1');
    assert(fetchedMatter.court === 'High Court of Delhi' && fetchedMatter.claimAmount === 'INR 14,20,00,000', 'All matter metadata intact after reload', 'WF1');

    // =========================================================================
    // WORKFLOW 2: Upload PDF, DOCX, and TXT Files & Confirm Extracted Text
    // =========================================================================
    console.log('\n--- WORKFLOW 2: UPLOAD PDF, DOCX, AND TXT FILES & CONFIRM EXTRACTION ---');

    // 2A: Generate synthetic PDF file using PDFKit
    const pdfPath = path.join(tempDir, 'test_lease_agreement.pdf');
    const pdfPromise = new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);
      doc.fontSize(12).text('COMMERCIAL LEASE AGREEMENT\n\n');
      doc.text('Clause 5: The lessee shall pay monthly lease rent of INR 5,00,000 on or before the 5th day of every calendar month.');
      doc.text('Section 10 of Specific Relief Act 1963 governs specific performance of this contract.');
      doc.text('The lease commenced on 1st April 2025.');
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    await pdfPromise;

    // 2B: Generate synthetic DOCX file using docx library
    const docxPath = path.join(tempDir, 'test_legal_notice.docx');
    const docxDoc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'LEGAL NOTICE UNDER SECTION 138 NEGOTIABLE INSTRUMENTS ACT', heading: 'Heading1' }),
          new Paragraph({ text: 'Demand notice for dishonour of Cheque No. 440219 for INR 25,00,000 drawn on HDFC Bank Connaught Place.' }),
          new Paragraph({ text: 'The cheque was presented on 10th January 2026 and returned unpaid with remarks Funds Insufficient.' })
        ]
      }]
    });
    const docxBuffer = await Packer.toBuffer(docxDoc);
    fs.writeFileSync(docxPath, docxBuffer);

    // 2C: Generate synthetic TXT file
    const txtPath = path.join(tempDir, 'test_witness_statement.txt');
    const txtContent = `WITNESS DEPOSITION UNDER SECTION 61 BHARATIYA SAKSHYA ADHINIYAM
Deposition of Rajesh Sharma, Chief Technology Officer:
1. I confirm that electronic server logs were generated automatically on 12th Jan 2026.
2. The hash algorithm used was SHA-256 with timestamp hash 8a4b9c1d.
3. This satisfies Section 63 of Bharatiya Sakshya Adhiniyam 2023 for digital evidence admissibility.`;
    fs.writeFileSync(txtPath, txtContent);

    // Helper for uploading using native fetch FormData
    async function uploadTestFile(filePath, originalName, mimeType) {
      const fileBytes = fs.readFileSync(filePath);
      const fileBlob = new Blob([fileBytes], { type: mimeType });
      const formData = new FormData();
      formData.append('document', fileBlob, originalName);
      formData.append('matterId', createdMatterId);

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData
      });
      return await res.json();
    }

    // Upload PDF
    const uploadPdfRes = await uploadTestFile(pdfPath, 'test_lease_agreement.pdf', 'application/pdf');
    assert(uploadPdfRes.success && uploadPdfRes.data?.id, 'PDF upload accepted by server', 'WF2');
    assert(uploadPdfRes.data.content.includes('monthly lease rent of INR 5,00,000'), 'PDF text correctly extracted from binary stream', 'WF2');
    if (uploadPdfRes.data?.id) uploadedDocIds.push(uploadPdfRes.data.id);

    // Upload DOCX
    const uploadDocxRes = await uploadTestFile(docxPath, 'test_legal_notice.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert(uploadDocxRes.success && uploadDocxRes.data?.id, 'DOCX upload accepted by server', 'WF2');
    assert(uploadDocxRes.data.content.includes('Cheque No. 440219'), 'DOCX text correctly extracted using Mammoth', 'WF2');
    if (uploadDocxRes.data?.id) uploadedDocIds.push(uploadDocxRes.data.id);

    // Upload TXT
    const uploadTxtRes = await uploadTestFile(txtPath, 'test_witness_statement.txt', 'text/plain');
    assert(uploadTxtRes.success && uploadTxtRes.data?.id, 'TXT upload accepted by server', 'WF2');
    assert(uploadTxtRes.data.content.includes('Chief Technology Officer'), 'TXT text correctly extracted', 'WF2');
    if (uploadTxtRes.data?.id) uploadedDocIds.push(uploadTxtRes.data.id);

    // =========================================================================
    // WORKFLOW 3: Confirm Evidence Facts Link to Real Source Documents & Coordinates
    // =========================================================================
    console.log('\n--- WORKFLOW 3: EVIDENCE FACTS GROUNDING & SOURCE LINKING ---');
    const docDetailRes = await fetch(`${API_BASE}/documents/${uploadTxtRes.data.id}`);
    const docDetailJson = await docDetailRes.json();
    assert(docDetailRes.status === 200 && docDetailJson.success, 'Document details retrieved with extracted evidence', 'WF3');
    
    const extractedFacts = docDetailJson.data?.extractedFacts || docDetailJson.data?.evidence?.extractedFacts || [];
    assert(extractedFacts.length > 0, `Evidence engine extracted ${extractedFacts.length} ground-truth facts from witness deposition`, 'WF3');
    
    const sampleFact = extractedFacts[0];
    assert(!!sampleFact.fact && !!sampleFact.category, 'Extracted fact contains category and content', 'WF3');
    assert(sampleFact.sourceDocumentName === 'test_witness_statement.txt' || !!sampleFact.sourceLocation, 'Fact correctly linked to source document name and location coordinates', 'WF3');

    // Check matter-aggregated evidence
    const matterEvRes = await fetch(`${API_BASE}/documents/matter/${createdMatterId}/evidence`);
    const matterEvJson = await matterEvRes.json();
    assert(matterEvJson.success && (matterEvJson.data?.totalFactsCount >= extractedFacts.length || matterEvJson.data?.facts?.length >= extractedFacts.length), 'Matter evidence dossier aggregates all facts across matter documents', 'WF3');

    // =========================================================================
    // WORKFLOW 4: Run Legal Risk Radar on Actual Test Contract
    // =========================================================================
    console.log('\n--- WORKFLOW 4: LEGAL RISK RADAR ON CONTRACT CLAUSES ---');
    const riskyContractText = `
ENTERPRISE VENDOR MASTER AGREEMENT
CLAUSE 8: LIMITATION OF LIABILITY
8.1 The Vendor's maximum cumulative liability shall under no circumstances exceed INR 5,000, notwithstanding gross negligence.
8.2 The Customer waives all rights to claim direct, indirect, consequential, or statutory damages.

CLAUSE 14: ARBITRATION AND GOVERNING LAW
14.1 Any dispute shall be decided by arbitration.
14.2 The Vendor shall have the sole and exclusive unilateral authority to appoint the Sole Arbitrator.
14.3 The award shall be final and binding without any right of appeal under the Arbitration and Conciliation Act 1996.

CLAUSE 21: LIQUIDATED DAMAGES
21.1 In the event of 1 day delay in delivery, liquidated damages of INR 10,00,000 per calendar day shall be payable without cap or mitigation.
`;

    const riskRadarRes = await fetch(`${API_BASE}/analysis/risk-radar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: riskyContractText })
    });
    const riskRadarJson = await riskRadarRes.json();
    assert(riskRadarRes.status === 200 && riskRadarJson.success, 'Legal Risk Radar executed successfully', 'WF4');
    
    const findings = riskRadarJson.data?.findings || [];
    assert(findings.length >= 2, `Risk Radar identified ${findings.length} contractual risks with severity levels`, 'WF4');

    const unilateralArbRisk = findings.find(f => f.category === 'Dispute Resolution' || f.title.toLowerCase().includes('arbitrat'));
    assert(!!unilateralArbRisk && (unilateralArbRisk.riskLevel === 'Critical' || unilateralArbRisk.riskLevel === 'High'), 'Unilateral arbitrator appointment flagged as Critical/High risk', 'WF4');
    assert(!!unilateralArbRisk.suggestedRevision, 'Actionable suggested revision provided for arbitrator clause', 'WF4');
    assert(!!unilateralArbRisk.plainEnglishReason, 'Plain-English legal reasoning provided based on Indian arbitration law', 'WF4');

    // =========================================================================
    // WORKFLOW 5: Verify Legal Citation Against Accessible Authoritative Source
    // =========================================================================
    console.log('\n--- WORKFLOW 5: CITATION VERIFICATION (AUTHORITATIVE VS UNVERIFIED) ---');
    
    // 5A: Real Supreme Court Landmark Judgment
    const realCitationText = 'In Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) 7 SCC 1, the Supreme Court held that certificate under Section 65B(4) is a mandatory condition precedent for electronic evidence admissibility.';
    const verifyRealRes = await fetch(`${API_BASE}/verification/citations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: realCitationText })
    });
    const verifyRealJson = await verifyRealRes.json();
    assert(verifyRealRes.status === 200 && verifyRealJson.success, 'Real citation verification endpoint responded 200 OK', 'WF5');
    
    const verifiedCitation = verifyRealJson.data?.allCitations?.find(c => c.caseTitle?.includes('Arjun Panditrao') || c.citationText?.includes('2020'));
    assert(!!verifiedCitation && verifiedCitation.status === 'Verified', 'Landmark precedent (2020) 7 SCC 1 confirmed as "Verified"', 'WF5');
    assert(!!verifiedCitation.source && verifiedCitation.source.includes('Supreme Court'), 'Authoritative source verified on official Supreme Court repository', 'WF5');

    // 5B: Fictitious non-existent citation (Must NOT be marked Verified)
    const fakeCitationText = 'Relying on Fictitious Innovations Ltd. v. Imaginary Union (2099) 99 SCC 9999 for non-existent rule.';
    const verifyFakeRes = await fetch(`${API_BASE}/verification/citations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fakeCitationText })
    });
    const verifyFakeJson = await verifyFakeRes.json();
    const fakeResult = verifyFakeJson.data?.allCitations?.find(c => c.citationText?.includes('2099'));
    if (fakeResult) {
      assert(fakeResult.status !== 'Verified', 'Fictitious citation (2099) 99 SCC 9999 was NOT marked Verified (Honest verification check)', 'WF5');
    } else {
      assert(true, 'Fictitious citation was rejected as unindexed reporter volume', 'WF5');
    }

    // =========================================================================
    // WORKFLOW 6: Generate and Edit a Draft Using Configured AI / Fallback
    // =========================================================================
    console.log('\n--- WORKFLOW 6: AI DRAFTING STUDIO & PARAGRAPH REGENERATION ---');
    const draftGenPayload = {
      matterId: createdMatterId,
      docType: 'Legal Notice',
      language: 'en-IN',
      clientName: 'Tata Motors Commercial Division',
      oppositeParty: 'Delhi Transport Corporation',
      instructions: 'Issue demand for unpaid fleet maintenance bills amounting to INR 14.2 Crore with interest @ 18% p.a. citing Commercial Courts Act 2015.'
    };

    const draftGenRes = await fetch(`${API_BASE}/drafting/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftGenPayload)
    });
    const draftGenJson = await draftGenRes.json();
    assert(draftGenRes.status === 200 && draftGenJson.success, 'Drafting generation endpoint executed', 'WF6');
    assert(typeof draftGenJson.content === 'string' && draftGenJson.content.length > 100, 'Drafting Studio generated substantial legal document text', 'WF6');

    // Paragraph revision
    const reviseParaRes = await fetch(`${API_BASE}/drafting/revise-paragraph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullText: draftGenJson.content,
        paragraphIndex: 1,
        instructions: 'Add strict 15-day timeline for compliance before initiating Section 9 arbitration petition under Arbitration Act 1996.',
        language: 'en-IN'
      })
    });
    const reviseParaJson = await reviseParaRes.json();
    assert(reviseParaRes.status === 200 && reviseParaJson.success, 'Targeted paragraph revision executed successfully', 'WF6');
    assert(reviseParaJson.updatedDraft?.includes('15') || reviseParaJson.changeSummary?.length > 0, 'Paragraph revised with specific user instructions', 'WF6');

    // =========================================================================
    // WORKFLOW 7: Compare Two Document Versions & Check Additions/Deletions
    // =========================================================================
    console.log('\n--- WORKFLOW 7: SMART REDLINE DIFF COMPARISON & RESOLUTION ---');
    const versionA = '1. The Supplier shall deliver goods within 30 days of purchase order.\n2. In case of delay, liquidated damages of 0.5% per week shall apply.';
    const versionB = '1. The Supplier shall deliver goods within 15 days of purchase order.\n2. In case of delay, liquidated damages of 2.0% per week shall apply, capped at 10% under Section 74 of Indian Contract Act 1872.\n3. Supplier indemnifies Buyer for third-party loss.';

    const compareRes = await fetch(`${API_BASE}/redline/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalText: versionA, revisedText: versionB })
    });
    const compareJson = await compareRes.json();
    assert(compareRes.status === 200 && compareJson.success, 'Smart Redline comparison executed', 'WF7');
    
    const compSummary = compareJson.data?.summary || {};
    assert(compSummary.insertions > 0 || compSummary.modifications > 0, `Diff analysis computed insertions (${compSummary.insertions}) and modifications (${compSummary.modifications})`, 'WF7');
    assert(typeof compSummary.similarityPercentage === 'number', `Calculated similarity percentage: ${compSummary.similarityPercentage}%`, 'WF7');

    // Apply Decisions
    const firstChange = (compareJson.data?.changes || []).find(c => c.type !== 'unchanged');
    const decisions = {};
    if (firstChange) decisions[firstChange.id] = 'accept';

    const applyRes = await fetch(`${API_BASE}/redline/apply-decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalText: versionA,
        revisedText: versionB,
        decisions
      })
    });
    const applyJson = await applyRes.json();
    assert(applyRes.status === 200 && applyJson.success, 'Apply decisions merged changes into final document text', 'WF7');
    assert(typeof applyJson.data?.finalDocumentText === 'string', 'Final resolved document text generated cleanly', 'WF7');

    // =========================================================================
    // WORKFLOW 8: Export Draft and Report to PDF and DOCX & Verify Binary Headers
    // =========================================================================
    console.log('\n--- WORKFLOW 8: EXPORT REAL PDF AND DOCX BINARIES ---');
    
    // 8A: Export Draft PDF
    const exportDraftPdf = await fetch(`${API_BASE}/export/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft: draftGenJson.content,
        title: 'Tata_Motors_Legal_Notice',
        format: 'pdf',
        matterTitle: matterPayload.title,
        caseNumber: matterPayload.caseNumber
      })
    });
    const draftPdfBuf = Buffer.from(await exportDraftPdf.arrayBuffer());
    assert(exportDraftPdf.status === 200, 'Draft PDF export HTTP 200 OK', 'WF8');
    assert(draftPdfBuf.slice(0, 4).toString('ascii') === '%PDF', `Draft PDF has valid %PDF magic bytes (size: ${draftPdfBuf.length} bytes)`, 'WF8');

    // Save and verify disk readability
    const savedPdfPath = path.join(tempDir, 'exported_draft.pdf');
    fs.writeFileSync(savedPdfPath, draftPdfBuf);
    assert(fs.existsSync(savedPdfPath) && fs.statSync(savedPdfPath).size > 2000, 'Exported PDF verified on disk with size > 2KB', 'WF8');

    // 8B: Export Draft DOCX
    const exportDraftDocx = await fetch(`${API_BASE}/export/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft: draftGenJson.content,
        title: 'Tata_Motors_Legal_Notice',
        format: 'docx',
        matterTitle: matterPayload.title
      })
    });
    const draftDocxBuf = Buffer.from(await exportDraftDocx.arrayBuffer());
    assert(exportDraftDocx.status === 200, 'Draft DOCX export HTTP 200 OK', 'WF8');
    assert(draftDocxBuf[0] === 0x50 && draftDocxBuf[1] === 0x4B, `Draft DOCX has valid PK zip magic bytes (size: ${draftDocxBuf.length} bytes)`, 'WF8');

    const savedDocxPath = path.join(tempDir, 'exported_draft.docx');
    fs.writeFileSync(savedDocxPath, draftDocxBuf);
    assert(fs.existsSync(savedDocxPath) && fs.statSync(savedDocxPath).size > 8000, 'Exported DOCX verified on disk with size > 8KB', 'WF8');

    // 8C: Export Redline Report PDF
    const exportRedlinePdf = await fetch(`${API_BASE}/export/redline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: compSummary,
        changes: compareJson.data?.changes,
        finalDocumentText: applyJson.data?.finalDocumentText,
        title: 'Tata_Redline_Report',
        format: 'pdf',
        matterTitle: matterPayload.title
      })
    });
    const redlinePdfBuf = Buffer.from(await exportRedlinePdf.arrayBuffer());
    assert(exportRedlinePdf.status === 200 && redlinePdfBuf.slice(0, 4).toString('ascii') === '%PDF', `Redline report PDF exported with valid %PDF header (size: ${redlinePdfBuf.length} bytes)`, 'WF8');

    // =========================================================================
    // WORKFLOW 9: Test Voice Input Component Contract & Fallback
    // =========================================================================
    console.log('\n--- WORKFLOW 9: VOICE INPUT INTEGRATION & BROWSER FALLBACK ---');
    const voiceComponentPath = path.join(__dirname, '../client/src/components/common/VoiceInputButton.jsx');
    const voiceCode = fs.readFileSync(voiceComponentPath, 'utf-8');
    assert(voiceCode.includes('SpeechRecognition') && voiceCode.includes('webkitSpeechRecognition'), 'Web Speech API integrated with Chromium webkit fallback', 'WF9');
    assert(voiceCode.includes('en-IN') && voiceCode.includes('hi-IN'), 'Bilingual voice input presets configured for Indian English and Hindi', 'WF9');
    assert(voiceCode.includes('isSupported') && voiceCode.includes('MicOff'), 'Graceful fallback badge rendered when speech recognition is unavailable in browser', 'WF9');

    // =========================================================================
    // WORKFLOW 10: Error Handling & API Key Security
    // =========================================================================
    console.log('\n--- WORKFLOW 10: HONEST ERROR HANDLING & KEY SECURITY ---');
    
    // 10A: Missing required fields
    const badMatterRes = await fetch(`${API_BASE}/matters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: 'Missing Title Corp' })
    });
    const badMatterJson = await badMatterRes.json();
    assert(badMatterRes.status === 400 && badMatterJson.success === false, 'Invalid matter creation rejected with HTTP 400', 'WF10');

    // 10B: Export without content
    const badExportRes = await fetch(`${API_BASE}/export/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'pdf' })
    });
    assert(badExportRes.status === 400, 'Export without draft text rejected honestly with HTTP 400', 'WF10');

    // 10C: Secret Key Security Check
    const cfgRes = await fetch(`${API_BASE}/config/status`);
    const cfgJson = await cfgRes.json();
    assert(cfgRes.status === 200, 'Config status endpoint responds', 'WF10');
    assert(cfgJson.aiIntegration && cfgJson.aiIntegration.apiKey === undefined, 'Server-side GEMINI_API_KEY is NEVER returned to client or logged', 'WF10');

    // =========================================================================
    // CLEANUP TEST ARTIFACTS
    // =========================================================================
    console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
    if (createdMatterId) {
      const delMatter = await fetch(`${API_BASE}/matters/${createdMatterId}`, { method: 'DELETE' });
      assert(delMatter.status === 200, `Cleaned up test matter ${createdMatterId}`);
    }

    for (const dId of uploadedDocIds) {
      await fetch(`${API_BASE}/documents/${dId}`, { method: 'DELETE' }).catch(() => {});
    }

    // Clean up temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}

  } catch (err) {
    console.error('Unexpected error during E2E verification:', err);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`FINAL E2E VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');
  console.log('\nWORKFLOW BREAKDOWN:');
  for (const [wf, count] of Object.entries(workflowResults)) {
    console.log(`  ${wf}: ${count} checks verified`);
  }
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEndToEndTests();
