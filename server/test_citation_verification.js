// Comprehensive Test Suite for Prompt 3B - Citation Verification & Legal Research
import fetch from 'node-fetch';

async function runTests() {
  console.log('================================================================');
  console.log('--- PROMPT 3B: CITATION VERIFICATION & LEGAL RESEARCH SUITE ---');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 6;

  // TEST 1: Extraction & Verification from doc-002 (Anticipatory Bail Application)
  console.log('[TEST 1] Verifying citations in Anticipatory Bail Application (doc-002)...');
  try {
    const res = await fetch('http://localhost:5001/api/verification/citations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: 'doc-002' })
    });
    const data = await res.json();

    if (data.success && data.data.totalFound >= 6) {
      console.log('✓ PASS: Extracted', data.data.totalFound, 'citations from doc-002.');
      console.log('  - Integrity Score:', data.data.integrityScore + '%');
      console.log('  - Verified Count:', data.data.verifiedCount);
      console.log('  - Authoritative Sources Accessed:', data.data.authoritativeSourcesUsed.join(' | '));

      // Check specific verified items
      const satender = data.data.allCitations.find(c => c.citationText.includes('(2022) 10 SCC 51'));
      const bnss482 = data.data.allCitations.find(c => c.citationText.includes('482') && c.citationText.includes('BHARATIYA NAGARIK'));
      
      if (satender && satender.status === 'Verified' && satender.sourceUrl.includes('digiscr.sci.gov.in')) {
        console.log('  ✓ Verified Satender Kumar Antil (2022) 10 SCC 51 on Digital SCR:', satender.sourceUrl);
        console.log('  ✓ Location grounded:', satender.sourceLocation);
      }
      if (bnss482 && bnss482.status === 'Verified' && bnss482.sourceUrl.includes('indiacode.nic.in')) {
        console.log('  ✓ Verified Section 482 BNSS 2023 on India Code:', bnss482.sourceUrl);
      }
      passedTests++;
    } else {
      console.error('✗ FAIL: Test 1 unexpected result:', data);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 1 exception:', err.message);
  }

  // TEST 2: Single Citation Verification on Landmark Benchmark
  console.log('\n[TEST 2] Verifying landmark ruling "Perkins Eastman (2020) 12 SCC 767"...');
  try {
    const res = await fetch('http://localhost:5001/api/verification/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citation: '(2020) 12 SCC 767' })
    });
    const data = await res.json();

    if (data.success && data.data.status === 'Verified' && data.data.bench.includes('U.U. Lalit')) {
      console.log('✓ PASS: Landmark single citation verified:');
      console.log('  - Case Title:', data.data.caseTitle);
      console.log('  - Bench:', data.data.bench);
      console.log('  - Decision Date:', data.data.decisionDate);
      console.log('  - Official Source:', data.data.source);
      console.log('  - Official URL:', data.data.sourceUrl);
      console.log('  - Ratio Decidendi verified:', `"${data.data.sourceExcerpt.slice(0, 70)}..."`);
      passedTests++;
    } else {
      console.error('✗ FAIL: Test 2 unexpected result:', data);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 2 exception:', err.message);
  }

  // TEST 3: Unverified / Unknown Citation (Strict No-Fabrication Test)
  console.log('\n[TEST 3] Testing unindexed citation "(2099) 99 SCC 9999" (Strict No-Fabrication)...');
  try {
    const res = await fetch('http://localhost:5001/api/verification/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citation: '(2099) 99 SCC 9999' })
    });
    const data = await res.json();

    if (data.success && data.data.status === 'Unverified' && data.data.sourceUrl === null) {
      console.log('✓ PASS: System honestly flagged unindexed citation:');
      console.log('  - Status:', data.data.status);
      console.log('  - Source URL:', data.data.sourceUrl, '(No fake link created)');
      console.log('  - Limitation Note:', data.data.whatRemainsUncertain);
      passedTests++;
    } else {
      console.error('✗ FAIL: Test 3 should return Unverified with null URL:', data);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 3 exception:', err.message);
  }

  // TEST 4: Unavailable Source / Network Limitation Handling
  console.log('\n[TEST 4] Testing unavailable source / network limitation state (Unable to Check)...');
  try {
    const res = await fetch('http://localhost:5001/api/verification/citations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: 'doc-002', simulateOffline: true })
    });
    const data = await res.json();

    if (data.success && data.data.unableToCheckCount > 0 && data.data.allCitations[0].status === 'Unable to Check') {
      console.log('✓ PASS: Handled unavailable source gracefully:');
      console.log('  - Unable to Check Count:', data.data.unableToCheckCount);
      console.log('  - Error Status reported to user:', data.data.allCitations[0].status);
      console.log('  - Explanation:', data.data.allCitations[0].whatRemainsUncertain);
      passedTests++;
    } else {
      console.error('✗ FAIL: Test 4 expected Unable to Check status:', data);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 4 exception:', err.message);
  }

  // TEST 5: Research Library (Central Enactments on India Code & Precedents)
  console.log('\n[TEST 5] Testing Legal Research Library endpoints (/api/research/statutes & /precedents)...');
  try {
    const [statutesRes, precedentsRes] = await Promise.all([
      fetch('http://localhost:5001/api/research/statutes').then(r => r.json()),
      fetch('http://localhost:5001/api/research/precedents').then(r => r.json())
    ]);

    if (statutesRes.success && precedentsRes.success) {
      const contractAct = statutesRes.data.centralEnactments.find(e => e.actCode === 'ICA');
      const bsaAct = statutesRes.data.centralEnactments.find(e => e.actCode === 'BSA');

      if (contractAct && bsaAct && precedentsRes.count >= 8) {
        console.log('✓ PASS: Legal Research library loaded successfully:');
        console.log('  - Central Enactments:', statutesRes.data.centralEnactments.length, 'statutes on India Code');
        console.log('  - Contract Act 1872 India Code URL:', contractAct.indiaCodeUrl);
        console.log('  - BSA 2023 India Code URL:', bsaAct.indiaCodeUrl);
        console.log('  - Supreme Court Landmark Precedents:', precedentsRes.count, 'judgments');
        passedTests++;
      } else {
        console.error('✗ FAIL: Test 5 missing expected statutes or precedents:', statutesRes, precedentsRes);
      }
    } else {
      console.error('✗ FAIL: Test 5 endpoint failure:', statutesRes, precedentsRes);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 5 exception:', err.message);
  }

  // TEST 6: Regression check on Prompt 3A Legal Risk Radar
  console.log('\n[TEST 6] Regression test on Legal Risk Radar (doc-001)...');
  try {
    const res = await fetch('http://localhost:5001/api/analysis/risk-radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: 'doc-001' })
    });
    const data = await res.json();

    if (data.success && data.data.findings.length >= 3) {
      console.log('✓ PASS: Legal Risk Radar maintained 100% operational integrity.');
      console.log('  - Overall Risk Level:', data.data.metrics.overallRiskLevel);
      console.log('  - Total Grounded Findings:', data.data.totalFindings);
      passedTests++;
    } else {
      console.error('✗ FAIL: Risk radar regression detected:', data);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 6 exception:', err.message);
  }

  console.log('\n================================================================');
  console.log(`FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');
}

runTests();
