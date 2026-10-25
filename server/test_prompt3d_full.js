// server/test_prompt3d_full.js
// Verification suite for Prompt 3D: Persistent Storage, Document Export & Voice Input

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('=================================================================');
  console.log('   DRAFTMATE EVIDENCE INTELLIGENCE — PROMPT 3D VERIFICATION     ');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // Authenticate advocate session
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rajesh.sharma@delhibar.in', password: 'AdvocateRajesh2026!' })
  });
  const loginJson = await loginRes.json();
  const authToken = loginJson.token;
  if (!authToken) {
    throw new Error('Failed to authenticate test runner');
  }

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
    // -------------------------------------------------------------
    // TEST SUITE 1: System Health & Regression Check
    // -------------------------------------------------------------
    console.log('--- 1. SYSTEM HEALTH & REGRESSION ---');
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'ONLINE', 'Server health endpoint responds 200 OK (ONLINE)');

    const configRes = await fetch(`${API_BASE}/config/status`);
    const configJson = await configRes.json();
    assert(configRes.status === 200 && configJson.aiIntegration !== undefined, 'Config status reports AI availability without leaking keys');

    // -------------------------------------------------------------
    // TEST SUITE 2: Persistent Matter Storage & CRUD
    // -------------------------------------------------------------
    console.log('\n--- 2. PERSISTENT MATTER STORAGE & CRUD ---');
    const newMatter = {
      title: 'Harbor Shipping Corp v. Maritime Board',
      court: 'High Court of Judicature at Bombay',
      matterType: 'Commercial Suit',
      client: 'Harbor Shipping Corp',
      oppositeParty: 'Maharashtra Maritime Board',
      caseNumber: 'COMM-SUIT-409/2026',
      claimAmount: 'INR 18,50,00,000',
      status: 'Active'
    };

    const createMatterRes = await fetch(`${API_BASE}/matters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMatter)
    });
    const createMatterJson = await createMatterRes.json();
    assert(createMatterRes.status === 201 && createMatterJson.success && createMatterJson.data.id, 'Create matter persisted successfully');
    const testMatterId = createMatterJson.data.id;

    const getMattersRes = await fetch(`${API_BASE}/matters`);
    const mattersJson = await getMattersRes.json();
    const mattersList = mattersJson.data || mattersJson;
    const foundMatter = mattersList.find(m => m.id === testMatterId);
    assert(!!foundMatter && foundMatter.client === 'Harbor Shipping Corp', 'Matter retrieved from persistent file store');

    // -------------------------------------------------------------
    // TEST SUITE 3: Persistent Drafts Repository & CRUD
    // -------------------------------------------------------------
    console.log('\n--- 3. PERSISTENT DRAFTS REPOSITORY & CRUD ---');
    const draftPayload = {
      title: 'Commercial Legal Notice under Section 80 CPC',
      content: 'LEGAL NOTICE\n\nTo,\nMaharashtra Maritime Board\n\nUnder instructions from our client Harbor Shipping Corp, we state as follows:\n1. That the respondent unlawfully withheld harbor access.\n2. [INSERT SPECIFIC BERTHING DATES]\n\nAdvocate for Claimant',
      matterId: testMatterId,
      docType: 'Legal Notice',
      language: 'en-IN',
      isAiPowered: true,
      provider: 'DraftMate Legal Engine (Prompt 3C/3D)',
      evidenceClaims: [
        { claim: 'Unlawfully withheld harbor access', sourceDoc: 'Berthing Log 2026', page: 4, verified: true }
      ],
      missingPlaceholders: ['[INSERT SPECIFIC BERTHING DATES]'],
      disclaimer: 'DRAFT — Subject to verification and advocate signoff under Advocates Act, 1961.'
    };

    const saveDraftRes = await fetch(`${API_BASE}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftPayload)
    });
    const saveDraftJson = await saveDraftRes.json();
    assert(saveDraftRes.status === 201 && saveDraftJson.success && !!saveDraftJson.data.id, 'Save draft persisted with ID');
    const savedDraftId = saveDraftJson.data.id;

    // Retrieve by Matter
    const getDraftsRes = await fetch(`${API_BASE}/drafts?matterId=${testMatterId}`);
    const getDraftsJson = await getDraftsRes.json();
    assert(getDraftsJson.success && getDraftsJson.count >= 1 && getDraftsJson.data.some(d => d.id === savedDraftId), 'Draft query by matterId returns associated draft');

    // Update Draft
    const updateDraftRes = await fetch(`${API_BASE}/drafts/${savedDraftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'LEGAL NOTICE (AMENDED)\n\nParagraph 1 revised with verified invoices.\n2. Berthing dates 12th Jan to 18th Jan confirmed.\n\nAdvocate for Claimant'
      })
    });
    const updateDraftJson = await updateDraftRes.json();
    assert(updateDraftRes.status === 200 && updateDraftJson.success && updateDraftJson.data.content.includes('(AMENDED)'), 'Draft update persisted successfully');

    // -------------------------------------------------------------
    // TEST SUITE 4: Persistent Redline Comparison History & CRUD
    // -------------------------------------------------------------
    console.log('\n--- 4. PERSISTENT REDLINE COMPARISON HISTORY ---');
    const redlinePayload = {
      title: 'Harbor Concession Agreement Clause 14 Diff',
      matterId: testMatterId,
      originalText: '14.1 The Concessionaire shall pay liquidated damages of INR 50,000 per day of delay.',
      revisedText: '14.1 The Concessionaire shall pay liquidated damages of INR 2,00,000 per day of delay, subject to Section 74 of the Indian Contract Act 1872.',
      summary: {
        insertions: 1,
        deletions: 1,
        modifications: 1,
        similarityPercentage: 74,
        overallAssessment: 'Substantial financial exposure increase'
      },
      changes: [
        {
          id: 'chg-1',
          type: 'modified',
          originalText: 'INR 50,000 per day',
          revisedText: 'INR 2,00,000 per day, subject to Section 74 of the Indian Contract Act 1872',
          riskLevel: 'Critical',
          explanation: '400% increase in liquidated damages cap.'
        }
      ],
      decisions: { 'chg-1': 'reject' },
      finalDocumentText: '14.1 The Concessionaire shall pay liquidated damages of INR 50,000 per day of delay.'
    };

    const saveSessionRes = await fetch(`${API_BASE}/redline/save-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(redlinePayload)
    });
    const saveSessionJson = await saveSessionRes.json();
    assert(saveSessionRes.status === 201 && saveSessionJson.success && !!saveSessionJson.data.id, 'Redline comparison session saved persistently');
    const savedSessionId = saveSessionJson.data.id;

    // Fetch History by Matter
    const getHistoryRes = await fetch(`${API_BASE}/redline/history?matterId=${testMatterId}`);
    const getHistoryJson = await getHistoryRes.json();
    assert(getHistoryJson.success && getHistoryJson.count >= 1 && getHistoryJson.data.some(h => h.id === savedSessionId), 'Redline history filtered by matterId returned saved session');

    // -------------------------------------------------------------
    // TEST SUITE 5: Real Server-Side Binary PDF & DOCX Exports
    // -------------------------------------------------------------
    console.log('\n--- 5. REAL BINARY PDF & DOCX EXPORTS ---');

    // 5A: Legal Draft Export (PDF)
    const exportDraftPdfRes = await fetch(`${API_BASE}/export/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Legal Notice',
        content: 'BEFORE THE HON\'BLE HIGH COURT OF JUDICATURE AT BOMBAY\nCOMMERCIAL DIVISION\n\nLEGAL NOTICE\n\nUnder Section 80 CPC\n\n1. That our client is a registered shipping carrier.\n2. The dispute relates to unconstitutional demurrage.',
        format: 'pdf',
        matterTitle: 'Harbor Shipping Corp v. Maritime Board',
        caseNumber: 'COMM-SUIT-409/2026',
        evidenceClaims: [{ claim: 'Demurrage unlawfully levied', sourceDoc: 'Tariff Order 2025', page: 2 }]
      })
    });
    const draftPdfBuffer = Buffer.from(await exportDraftPdfRes.arrayBuffer());
    assert(exportDraftPdfRes.status === 200, 'Draft PDF export HTTP 200 OK');
    assert(exportDraftPdfRes.headers.get('content-type').includes('application/pdf'), 'Draft PDF Content-Type is application/pdf');
    assert(draftPdfBuffer.slice(0, 4).toString('ascii') === '%PDF', `Draft PDF has valid %PDF magic bytes (size: ${draftPdfBuffer.length} bytes)`);

    // 5B: Legal Draft Export (DOCX)
    const exportDraftDocxRes = await fetch(`${API_BASE}/export/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Legal Notice',
        content: 'BEFORE THE HON\'BLE HIGH COURT OF JUDICATURE AT BOMBAY\n\nCOMMERCIAL SUIT',
        format: 'docx',
        matterTitle: 'Harbor Shipping Corp v. Maritime Board'
      })
    });
    const draftDocxBuffer = Buffer.from(await exportDraftDocxRes.arrayBuffer());
    assert(exportDraftDocxRes.status === 200, 'Draft DOCX export HTTP 200 OK');
    assert(exportDraftDocxRes.headers.get('content-type').includes('wordprocessingml'), 'Draft DOCX Content-Type is valid Word document');
    // Word DOCX files are zip archives starting with 'PK\x03\x04'
    assert(draftDocxBuffer[0] === 0x50 && draftDocxBuffer[1] === 0x4B, `Draft DOCX has valid PK zip archive header (size: ${draftDocxBuffer.length} bytes)`);

    // 5C: Redline Comparison Export (PDF & DOCX)
    const exportRedlinePdfRes = await fetch(`${API_BASE}/export/redline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Redline Comparison',
        format: 'pdf',
        summary: redlinePayload.summary,
        changes: redlinePayload.changes,
        decisions: redlinePayload.decisions,
        finalDocumentText: redlinePayload.finalDocumentText,
        matterTitle: 'Harbor Shipping Corp'
      })
    });
    const redlinePdfBuffer = Buffer.from(await exportRedlinePdfRes.arrayBuffer());
    assert(exportRedlinePdfRes.status === 200 && redlinePdfBuffer.slice(0, 4).toString('ascii') === '%PDF', `Redline PDF export valid (size: ${redlinePdfBuffer.length} bytes)`);

    const exportRedlineDocxRes = await fetch(`${API_BASE}/export/redline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Redline Comparison',
        format: 'docx',
        summary: redlinePayload.summary,
        changes: redlinePayload.changes,
        decisions: redlinePayload.decisions,
        finalDocumentText: redlinePayload.finalDocumentText
      })
    });
    const redlineDocxBuffer = Buffer.from(await exportRedlineDocxRes.arrayBuffer());
    assert(exportRedlineDocxRes.status === 200 && redlineDocxBuffer[0] === 0x50 && redlineDocxBuffer[1] === 0x4B, `Redline DOCX export valid (size: ${redlineDocxBuffer.length} bytes)`);

    // 5D: Evidence Dossier Export (PDF & DOCX)
    const exportEvidencePdfRes = await fetch(`${API_BASE}/export/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Evidence Dossier',
        format: 'pdf',
        matterTitle: 'Harbor Shipping Corp',
        dossier: {
          executiveSummary: 'Evidence corroborates unilateral berthing cancellation without statutory notice.',
          extractedClaims: [
            { claim: 'Vessel arrived at anchorage on 14 Jan 2026', source: 'Pilotage Record', page: 3, category: 'Fact' }
          ]
        }
      })
    });
    const evidencePdfBuffer = Buffer.from(await exportEvidencePdfRes.arrayBuffer());
    assert(exportEvidencePdfRes.status === 200 && evidencePdfBuffer.slice(0, 4).toString('ascii') === '%PDF', `Evidence PDF export valid (size: ${evidencePdfBuffer.length} bytes)`);

    const exportEvidenceDocxRes = await fetch(`${API_BASE}/export/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Evidence Dossier',
        format: 'docx',
        matterTitle: 'Harbor Shipping Corp',
        dossier: {
          extractedClaims: [
            { claim: 'Vessel arrived at anchorage on 14 Jan 2026', source: 'Pilotage Record', page: 3, category: 'Fact' }
          ]
        }
      })
    });
    const evidenceDocxBuffer = Buffer.from(await exportEvidenceDocxRes.arrayBuffer());
    assert(exportEvidenceDocxRes.status === 200 && evidenceDocxBuffer[0] === 0x50 && evidenceDocxBuffer[1] === 0x4B, `Evidence DOCX export valid (size: ${evidenceDocxBuffer.length} bytes)`);

    // 5E: Risk Radar Report Export (PDF & DOCX)
    const exportRiskPdfRes = await fetch(`${API_BASE}/export/risk-radar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Contract Risk Radar',
        format: 'pdf',
        matterTitle: 'Harbor Shipping Corp',
        risks: [
          {
            title: 'Uncapped Liquidated Damages',
            level: 'Critical',
            category: 'Financial Liability',
            originalClause: 'Clause 14: Liquidated damages shall be INR 2,00,000 per day without maximum limit.',
            whyRisky: 'Contravenes Section 74 of the Indian Contract Act 1872 which mandates reasonable compensation only.',
            suggestedRevision: 'Cap liquidated damages at 10% of total contract value.'
          }
        ]
      })
    });
    const riskPdfBuffer = Buffer.from(await exportRiskPdfRes.arrayBuffer());
    assert(exportRiskPdfRes.status === 200 && riskPdfBuffer.slice(0, 4).toString('ascii') === '%PDF', `Risk Radar PDF export valid (size: ${riskPdfBuffer.length} bytes)`);

    const exportRiskDocxRes = await fetch(`${API_BASE}/export/risk-radar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Contract Risk Radar',
        format: 'docx',
        matterTitle: 'Harbor Shipping Corp',
        risks: [
          {
            title: 'Uncapped Liquidated Damages',
            level: 'Critical',
            category: 'Financial Liability',
            originalClause: 'Clause 14: Liquidated damages shall be INR 2,00,000 per day without maximum limit.',
            whyRisky: 'Contravenes Section 74 of the Indian Contract Act 1872.',
            suggestedRevision: 'Cap liquidated damages at 10%.'
          }
        ]
      })
    });
    const riskDocxBuffer = Buffer.from(await exportRiskDocxRes.arrayBuffer());
    assert(exportRiskDocxRes.status === 200 && riskDocxBuffer[0] === 0x50 && riskDocxBuffer[1] === 0x4B, `Risk Radar DOCX export valid (size: ${riskDocxBuffer.length} bytes)`);

    // 5F: Citation Verification Report Export (PDF & DOCX)
    const exportCitationPdfRes = await fetch(`${API_BASE}/export/citations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Citation Verification Dossier',
        format: 'pdf',
        matterTitle: 'Harbor Shipping Corp',
        citations: [
          {
            reference: 'Kailash Nath Associates v. DDA (2015) 4 SCC 136',
            status: 'Verified',
            court: 'Supreme Court of India',
            authorityScore: 98,
            notes: 'Authoritative ruling on Section 74 Indian Contract Act damages.'
          }
        ]
      })
    });
    const citationPdfBuffer = Buffer.from(await exportCitationPdfRes.arrayBuffer());
    assert(exportCitationPdfRes.status === 200 && citationPdfBuffer.slice(0, 4).toString('ascii') === '%PDF', `Citation Verification PDF export valid (size: ${citationPdfBuffer.length} bytes)`);

    const exportCitationDocxRes = await fetch(`${API_BASE}/export/citations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Harbor Citation Verification Dossier',
        format: 'docx',
        matterTitle: 'Harbor Shipping Corp',
        citations: [
          {
            reference: 'Kailash Nath Associates v. DDA (2015) 4 SCC 136',
            status: 'Verified',
            court: 'Supreme Court of India',
            authorityScore: 98
          }
        ]
      })
    });
    const citationDocxBuffer = Buffer.from(await exportCitationDocxRes.arrayBuffer());
    assert(exportCitationDocxRes.status === 200 && citationDocxBuffer[0] === 0x50 && citationDocxBuffer[1] === 0x4B, `Citation Verification DOCX export valid (size: ${citationDocxBuffer.length} bytes)`);

    // -------------------------------------------------------------
    // TEST SUITE 6: Clean Up Created Test Data
    // -------------------------------------------------------------
    console.log('\n--- 6. CLEAN UP PERSISTENT TEST RECORDS ---');
    const delDraftRes = await fetch(`${API_BASE}/drafts/${savedDraftId}`, { method: 'DELETE' });
    const delDraftJson = await delDraftRes.json();
    assert(delDraftRes.status === 200 && delDraftJson.success, 'Test draft deleted cleanly');

    const delRedlineRes = await fetch(`${API_BASE}/redline/history/${savedSessionId}`, { method: 'DELETE' });
    const delRedlineJson = await delRedlineRes.json();
    assert(delRedlineRes.status === 200 && delRedlineJson.success, 'Test redline session deleted cleanly');

    const delMatterRes = await fetch(`${API_BASE}/matters/${testMatterId}`, { method: 'DELETE' });
    assert(delMatterRes.status === 200, 'Test matter deleted cleanly');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n=================================================================');
  console.log(`PROMPT 3D TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
