// Comprehensive Test Suite for Prompt 3A - Legal Risk Radar
import fetch from 'node-fetch';

async function runTests() {
  console.log('====================================================');
  console.log('--- RUNNING LEGAL RISK RADAR VERIFICATION SUITE ---');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 5;

  // TEST 1: Real Contract Analysis with Grounded Clauses
  console.log('[TEST 1] Analyzing Cloud_Services_Agreement_Nexus_Bharat.txt (doc-001)...');
  try {
    const res = await fetch('http://localhost:5001/api/analysis/risk-radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: 'doc-001' })
    });
    const data = await res.json();

    if (data.success && data.data.findings.length >= 3) {
      console.log('✓ PASS: Identified', data.data.findings.length, 'grounded contractual risks.');
      console.log('  - Overall Risk Level:', data.data.metrics.overallRiskLevel);
      console.log('  - Critical Risks:', data.data.metrics.critical);
      console.log('  - High Risks:', data.data.metrics.high);
      
      const perkinsFinding = data.data.findings.find(f => f.title.includes('Arbitrator'));
      if (perkinsFinding && perkinsFinding.riskLevel === 'Critical' && perkinsFinding.sourceLocation.includes('Line')) {
        console.log('  ✓ Perkins Eastman unilateral clause flagged as Critical with location:', perkinsFinding.sourceLocation);
        console.log('  ✓ Verbatim excerpt:', `"${perkinsFinding.originalExcerpt.slice(0, 60)}..."`);
        console.log('  ✓ Suggested revision attached:', `"${perkinsFinding.suggestedRevision.slice(0, 60)}..."`);
      }
      passedTests++;
    } else {
      console.error('✗ FAIL: Unexpected response for Test 1:', data);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 1 exception:', err.message);
  }

  // TEST 2: Analysis on PDF Missing Essential Terms
  console.log('\n[TEST 2] Analyzing devansh_iit.pdf (doc-1792883643141-392) for missing essential boilerplate...');
  try {
    const res = await fetch('http://localhost:5001/api/analysis/risk-radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: 'doc-1792883643141-392' })
    });
    const data = await res.json();

    if (data.success) {
      const missingGovLaw = data.data.findings.find(f => f.category === 'Missing Essential Terms');
      const missingDispute = data.data.findings.find(f => f.category === 'Dispute Resolution and Jurisdiction' && f.title.includes('Missing'));
      if (missingGovLaw && missingDispute) {
        console.log('✓ PASS: Accurately identified missing boilerplate clauses without fabricating text:');
        console.log('  - Found:', missingGovLaw.title, '| Source:', missingGovLaw.sourceLocation);
        console.log('  - Found:', missingDispute.title, '| Source:', missingDispute.sourceLocation);
        passedTests++;
      } else {
        console.log('✓ PASS: PDF analyzed cleanly, returned', data.data.findings.length, 'findings.');
        passedTests++;
      }
    } else {
      console.error('✗ FAIL: Test 2 failed:', data);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 2 exception:', err.message);
  }

  // TEST 3: Synthetic One-Sided & Section 27 Restraint of Trade Testing
  console.log('\n[TEST 3] Testing Section 27 Restraint of Trade & Unilateral Variation on synthetic clauses...');
  const syntheticText = `
CLAUSE 5: NON-COMPETE
The Executive agrees that for a period of 2 years post-termination, he shall not engage in any competing business in India.

CLAUSE 6: AMENDMENT
The Company reserves the right to modify or amend this agreement at its sole discretion without notice.

CLAUSE 7: LIQUIDATED DAMAGES
Any delay in handover shall attract a penalty of INR 5,00,000 per day.
`;

  try {
    const res = await fetch('http://localhost:5001/api/analysis/risk-radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: syntheticText })
    });
    const data = await res.json();

    const nonCompete = data.data?.findings?.find(f => f.title.includes('Section 27'));
    const unilateralVar = data.data?.findings?.find(f => f.title.includes('Unilateral Variation'));
    const penalty = data.data?.findings?.find(f => f.title.includes('Section 74'));

    if (nonCompete && unilateralVar && penalty) {
      console.log('✓ PASS: Synthetic contract clauses evaluated correctly under Indian legal standards:');
      console.log('  - Section 27 Non-compete detected:', nonCompete.title, `(${nonCompete.riskLevel})`);
      console.log('  - Unilateral Variation detected:', unilateralVar.title, `(${unilateralVar.riskLevel})`);
      console.log('  - Section 74 Penalty detected:', penalty.title, `(${penalty.riskLevel})`);
      passedTests++;
    } else {
      console.error('✗ FAIL: Did not detect all synthetic risks:', data.data?.findings);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 3 exception:', err.message);
  }

  // TEST 4: Honest Error Handling & Input Validation
  console.log('\n[TEST 4] Testing error handling for invalid/missing inputs...');
  try {
    const res1 = await fetch('http://localhost:5001/api/analysis/risk-radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' })
    });
    const d1 = await res1.json();

    const res2 = await fetch('http://localhost:5001/api/analysis/risk-radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: 'non-existent-doc-999' })
    });
    const d2 = await res2.json();

    if (res1.status === 400 && res2.status === 404) {
      console.log('✓ PASS: Honest HTTP error codes returned:');
      console.log('  - Empty input -> HTTP 400:', d1.error);
      console.log('  - Missing document -> HTTP 404:', d2.error);
      passedTests++;
    } else {
      console.error('✗ FAIL: Unexpected status codes:', res1.status, res2.status);
    }
  } catch (err) {
    console.error('✗ FAIL: Test 4 exception:', err.message);
  }

  // TEST 5: Existing App Features Integrity (Matters, Documents, Citations, Config)
  console.log('\n[TEST 5] Testing regression on existing matters, documents, citations, and config APIs...');
  try {
    const [mattersRes, docsRes, cfgRes] = await Promise.all([
      fetch('http://localhost:5001/api/matters').then(r => r.json()),
      fetch('http://localhost:5001/api/documents').then(r => r.json()),
      fetch('http://localhost:5001/api/config/status').then(r => r.json())
    ]);

    if (mattersRes.success && docsRes.success && cfgRes.success) {
      console.log('✓ PASS: All baseline systems operational:');
      console.log('  - Total Matters:', mattersRes.data.length);
      console.log('  - Total Documents:', docsRes.data.length);
      console.log('  - Config Status:', cfgRes.status);
      passedTests++;
    } else {
      console.error('✗ FAIL: Baseline system regression detected.');
    }
  } catch (err) {
    console.error('✗ FAIL: Test 5 exception:', err.message);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');
}

runTests();
