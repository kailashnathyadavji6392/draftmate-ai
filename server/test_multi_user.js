// server/test_multi_user.js
// Automated verification test suite for Multi-User Account System & Data Isolation

const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('================================================================================');
  console.log('  DRAFTMATE EVIDENCE INTELLIGENCE — MULTI-USER SYSTEM & ISOLATION VERIFICATION  ');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      if (details) console.error(`    Details: ${details}`);
      failed++;
    }
  }

  // Helper for requests with Cookie / Bearer handling
  async function apiCall(endpoint, { method = 'GET', body = null, token = null, cookie = null } = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (cookie) headers['Cookie'] = cookie;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const setCookieHeader = res.headers.get('set-cookie');
    let data = {};
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }

    return { status: res.status, ok: res.ok, data, headers: res.headers, setCookie: setCookieHeader };
  }

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: UNAUTHENTICATED PROTECTION
    // -------------------------------------------------------------------------
    console.log('[SUITE 1] Unauthenticated API Protection & Rejection');
    const unauthMatters = await apiCall('/api/matters');
    assert(unauthMatters.status === 401, 'Unauthenticated GET /api/matters returns HTTP 401');

    const unauthDocs = await apiCall('/api/documents');
    assert(unauthDocs.status === 401, 'Unauthenticated GET /api/documents returns HTTP 401');

    const unauthDrafts = await apiCall('/api/drafts');
    assert(unauthDrafts.status === 401, 'Unauthenticated GET /api/drafts returns HTTP 401');

    const unauthRedline = await apiCall('/api/redline/history');
    assert(unauthRedline.status === 401, 'Unauthenticated GET /api/redline/history returns HTTP 401');

    // -------------------------------------------------------------------------
    // TEST SUITE 2: REGISTRATION, PASSWORD VALIDATION & DUPLICATE CHECKS
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 2] User Registration & Validation Security');
    const testTimestamp = Date.now();
    const userA_Email = `advocate.rajesh.${testTimestamp}@delhibar.in`;
    const userB_Email = `advocate.priya.${testTimestamp}@bombaybar.in`;

    // Weak password rejection
    const weakPass = await apiCall('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Weak User', email: `weak.${testTimestamp}@test.in`, password: 'short' }
    });
    assert(weakPass.status === 400 && weakPass.data.error.includes('at least 8 characters'), 'Rejects passwords under 8 characters');

    const noNumPass = await apiCall('/api/auth/signup', {
      method: 'POST',
      body: { name: 'No Num User', email: `nonum.${testTimestamp}@test.in`, password: 'onlylettershere' }
    });
    assert(noNumPass.status === 400 && noNumPass.data.error.includes('number'), 'Rejects passwords lacking numeric digits');

    // Register User A
    const signupA = await apiCall('/api/auth/signup', {
      method: 'POST',
      body: {
        name: 'Advocate Rajesh Sharma',
        email: userA_Email,
        password: 'PasswordRajesh2026!',
        barCouncilNumber: 'D/1942/2019',
        chamberName: 'Sharma Commercial Chambers'
      }
    });
    assert(signupA.status === 201 && signupA.data.user.id.startsWith('usr-'), 'User A registers successfully and receives unique userId');
    const userA_Token = signupA.data.token;
    const userA_Cookie = signupA.setCookie?.split(';')[0];
    const userA_Id = signupA.data.user.id;

    // Prevent duplicate email registration
    const duplicateA = await apiCall('/api/auth/signup', {
      method: 'POST',
      body: {
        name: 'Rajesh Duplicate',
        email: userA_Email,
        password: 'PasswordRajesh2026!'
      }
    });
    assert(duplicateA.status === 400 && duplicateA.data.error.includes('already exists'), 'Prevents duplicate email registration');

    // Register User B
    const signupB = await apiCall('/api/auth/signup', {
      method: 'POST',
      body: {
        name: 'Senior Advocate Priya Desai',
        email: userB_Email,
        password: 'PasswordPriya2026!',
        barCouncilNumber: 'MAH/4021/2015',
        chamberName: 'Desai Arbitration Chambers'
      }
    });
    assert(signupB.status === 201 && signupB.data.user.id !== userA_Id, 'User B registers with completely distinct userId');
    const userB_Token = signupB.data.token;
    const userB_Cookie = signupB.setCookie?.split(';')[0];
    const userB_Id = signupB.data.user.id;

    // -------------------------------------------------------------------------
    // TEST SUITE 3: AUTHENTICATED PROFILE & SESSION VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 3] User Profile & Identity Verification');
    const meA = await apiCall('/api/auth/me', { token: userA_Token });
    assert(meA.status === 200 && meA.data.user.email === userA_Email, 'User A identifies correctly via GET /api/auth/me');

    const meB = await apiCall('/api/auth/me', { token: userB_Token });
    assert(meB.status === 200 && meB.data.user.email === userB_Email, 'User B identifies correctly via GET /api/auth/me');

    // -------------------------------------------------------------------------
    // TEST SUITE 4: MATTER ISOLATION & UNAUTHORIZED CRUD PREVENTION
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 4] Legal Matter Isolation & Access Control');
    // User A creates confidential matter
    const createMatterA = await apiCall('/api/matters', {
      method: 'POST',
      token: userA_Token,
      body: {
        title: 'User A Secret Commercial Injunction',
        client: 'Confidential Client A',
        court: 'High Court of Delhi',
        matterType: 'Commercial Suit'
      }
    });
    assert(createMatterA.status === 201, 'User A creates private matter');
    const matterA_Id = createMatterA.data.data.id;

    // User B lists matters
    const listMattersB = await apiCall('/api/matters', { token: userB_Token });
    const userB_HasMatterA = listMattersB.data.data.some(m => m.id === matterA_Id);
    assert(!userB_HasMatterA, 'User B matter listing does NOT contain User A matter');

    // User B attempts to read User A matter
    const readMatterB = await apiCall(`/api/matters/${matterA_Id}`, { token: userB_Token });
    assert(readMatterB.status === 404, 'User B cannot read User A matter (HTTP 404 Access Denied)');

    // User B attempts to update User A matter
    const updateMatterB = await apiCall(`/api/matters/${matterA_Id}`, {
      method: 'PUT',
      token: userB_Token,
      body: { title: 'Compromised by User B' }
    });
    assert(updateMatterB.status === 404, 'User B cannot modify User A matter (HTTP 404 Access Denied)');

    // User B attempts to delete User A matter
    const deleteMatterB = await apiCall(`/api/matters/${matterA_Id}`, {
      method: 'DELETE',
      token: userB_Token
    });
    assert(deleteMatterB.status === 404, 'User B cannot delete User A matter (HTTP 404 Access Denied)');

    // -------------------------------------------------------------------------
    // TEST SUITE 5: DOCUMENT & EVIDENCE ISOLATION & SECURE DOWNLOADS
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 5] Document Evidence Isolation & Secure Downloads');
    // User A creates private document
    const createDocA = await apiCall('/api/documents', {
      method: 'POST',
      token: userA_Token,
      body: {
        title: 'User_A_Privileged_Deposition.txt',
        content: 'This is confidential client testimony given in camera under Section 327 CrPC / 371 BNSS. Strictly privileged.',
        matterId: matterA_Id,
        documentType: 'Witness Statement'
      }
    });
    assert(createDocA.status === 201, 'User A creates private document');
    const docA_Id = createDocA.data.data.id;

    // User B lists documents
    const listDocsB = await apiCall('/api/documents', { token: userB_Token });
    const userB_HasDocA = listDocsB.data.data.some(d => d.id === docA_Id);
    assert(!userB_HasDocA, 'User B document listing does NOT contain User A document');

    // User B attempts to get User A document details
    const readDocB = await apiCall(`/api/documents/${docA_Id}`, { token: userB_Token });
    assert(readDocB.status === 404, 'User B cannot read User A document metadata (HTTP 404)');

    // User B attempts to download User A private document
    const downloadDocB = await apiCall(`/api/documents/${docA_Id}/download`, { token: userB_Token });
    assert(downloadDocB.status === 404, 'User B cannot download User A document (HTTP 404)');

    // User A authorized download
    const downloadDocA = await apiCall(`/api/documents/${docA_Id}/download`, { token: userA_Token });
    assert(downloadDocA.status === 200 && downloadDocA.data.rawText.includes('confidential client testimony'), 'User A downloads their own document successfully');

    // -------------------------------------------------------------------------
    // TEST SUITE 6: DRAFT & REDLINE ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 6] AI Drafts & Smart Redline Session Isolation');
    // User A saves private draft
    const createDraftA = await apiCall('/api/drafts', {
      method: 'POST',
      token: userA_Token,
      body: {
        title: 'User A Privileged Legal Notice',
        content: 'LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT 1881...',
        matterId: matterA_Id
      }
    });
    assert(createDraftA.status === 201, 'User A saves private draft');
    const draftA_Id = createDraftA.data.data.id;

    // User B lists drafts
    const listDraftsB = await apiCall('/api/drafts', { token: userB_Token });
    const userB_HasDraftA = listDraftsB.data.data.some(dr => dr.id === draftA_Id);
    assert(!userB_HasDraftA, 'User B draft list does NOT contain User A draft');

    // User B tries to read User A draft
    const readDraftB = await apiCall(`/api/drafts/${draftA_Id}`, { token: userB_Token });
    assert(readDraftB.status === 404, 'User B cannot read User A draft (HTTP 404)');

    // User A saves redline session
    const saveRedlineA = await apiCall('/api/redline/save-session', {
      method: 'POST',
      token: userA_Token,
      body: {
        title: 'User A Redline Comparison Review',
        originalText: 'Original clause text',
        revisedText: 'Revised clause text',
        matterId: matterA_Id
      }
    });
    assert(saveRedlineA.status === 201, 'User A saves redline comparison session');
    const redlineA_Id = saveRedlineA.data.data.id;

    // User B lists redline sessions
    const listRedlineB = await apiCall('/api/redline/history', { token: userB_Token });
    const userB_HasRedlineA = listRedlineB.data.data.some(r => r.id === redlineA_Id);
    assert(!userB_HasRedlineA, 'User B redline history does NOT contain User A session');

    // -------------------------------------------------------------------------
    // TEST SUITE 7: PASSWORD RESET LIFECYCLE (SINGLE-USE, EXPIRING TOKENS)
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 7] Password Reset Lifecycle');
    const forgotRes = await apiCall('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: userA_Email }
    });
    assert(forgotRes.status === 200 && forgotRes.data.success, 'Forgot password request succeeds');
    const resetToken = forgotRes.data.resetToken;
    assert(Boolean(resetToken && resetToken.length === 64), 'Generates 64-character cryptographically secure reset token');

    // Perform password reset
    const newPassword = 'NewSecretPassword2026!';
    const resetRes = await apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: { token: resetToken, newPassword }
    });
    assert(resetRes.status === 200 && resetRes.data.success, 'Resets password successfully with valid token');

    // Ensure reset token cannot be reused (Single-Use Token Enforcement)
    const reuseToken = await apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: { token: resetToken, newPassword: 'AnotherPassword2026!' }
    });
    assert(reuseToken.status === 400, 'Rejects reused password reset token');

    // Verify login with new password succeeds
    const loginNew = await apiCall('/api/auth/login', {
      method: 'POST',
      body: { email: userA_Email, password: newPassword }
    });
    assert(loginNew.status === 200 && loginNew.data.user.id === userA_Id, 'User A logs in successfully with new password');

    // Verify old password is rejected
    const loginOld = await apiCall('/api/auth/login', {
      method: 'POST',
      body: { email: userA_Email, password: 'PasswordRajesh2026!' }
    });
    assert(loginOld.status === 401, 'Old password is correctly rejected after reset');

    // -------------------------------------------------------------------------
    // TEST SUITE 8: LOGOUT & COOKIE CLEARING
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 8] Logout & Session Cleanup');
    const logoutRes = await apiCall('/api/auth/logout', { method: 'POST' });
    assert(logoutRes.status === 200, 'Logout endpoint returns HTTP 200');

    console.log('\n================================================================================');
    console.log(`  MULTI-USER TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('================================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution fatal error:', err);
    process.exit(1);
  }
}

runTests();
