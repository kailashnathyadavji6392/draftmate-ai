// server/test_e2e_modules.js
// Comprehensive End-to-End Test Suite for Matter Management & Hearing Calendar & Reminders

const API_BASE = 'http://localhost:5001/api';

async function request(endpoint, options = {}, cookie = '') {
  const headers = {
    'Content-Type': 'application/json',
    ...(cookie ? { 'Cookie': cookie } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const setCookie = res.headers.get('set-cookie');
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data, setCookie };
}

function extractToken(setCookieHeader) {
  if (!setCookieHeader) return '';
  const match = setCookieHeader.match(/draftmate_token=([^;]+)/);
  return match ? `draftmate_token=${match[1]}` : '';
}

async function run() {
  console.log('🏛️ STARTING E2E VERIFICATION: MATTER MANAGEMENT & HEARING CALENDAR & REMINDERS\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- Step 1: User Registration ---
  console.log('Step 1: Authenticate Advocates (Multi-User)');
  const ts = Date.now();
  const user1Email = `adv.priya.${ts}@draftmate.in`;
  const user2Email = `adv.vikram.${ts}@draftmate.in`;
  const pass = 'HighCourtAdvocate2026!';

  const reg1 = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Senior Adv. Priya Desai', email: user1Email, password: pass })
  });
  assert(reg1.status === 201, `Adv. Priya registered successfully`);
  const cookie1 = extractToken(reg1.setCookie);

  const reg2 = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Adv. Vikram Seth', email: user2Email, password: pass })
  });
  assert(reg2.status === 201, `Adv. Vikram registered successfully`);
  const cookie2 = extractToken(reg2.setCookie);

  // --- Step 2: Module 1 — Matter Creation & Management ---
  console.log('\nStep 2: Module 1 — Matter Creation & Validation');
  const caseNumber1 = `CS(COMM)/${ts.toString().slice(-4)}/2026`;
  const cnr1 = `DLHC01${ts.toString().slice(-8)}`;

  const createMatterRes = await request('/matters', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Reliance Retail Ltd. v. Metro Cash & Carry',
      matterNumber: caseNumber1,
      cnr: cnr1,
      court: 'High Court of Delhi (Commercial Division)',
      matterType: 'Commercial Suit',
      jurisdiction: 'New Delhi, India',
      client: 'Reliance Retail Ventures Ltd.',
      clientRole: 'Plaintiff',
      oppositeParty: 'Metro Cash & Carry India Pvt Ltd',
      opposingCounsel: 'Senior Counsel on Record',
      judge: "Hon'ble Commercial Division Bench 3",
      priority: 'High',
      status: 'Open',
      claimAmount: '₹ 12,50,00,000',
      filingDate: '2026-10-18',
      nextHearingDate: '2026-11-18',
      assignedLawyer: 'Senior Adv. Priya Desai',
      summary: 'Suit for perpetual injunction restraining infringement of supply trademarks and damages.',
      notes: 'Ensure Section 63 BSA electronic admissibility certificate is appended with WhatsApp chats.'
    })
  }, cookie1);

  assert(createMatterRes.status === 201 && createMatterRes.data.success, 'Matter created successfully');
  const matter1 = createMatterRes.data.data;
  assert(matter1.title.includes('Reliance Retail'), 'Matter title persisted');
  assert(matter1.status === 'Open', 'Matter status set to Open');
  assert(matter1.claimAmount === '₹ 12,50,00,000', 'Suit claim value saved');

  // Test Non-blocking Duplicate Check
  console.log('\nStep 3: Duplicate Case Number Check');
  const dupCheck = await request(`/matters/check-duplicate?caseNumber=${encodeURIComponent(caseNumber1)}`, {}, cookie1);
  assert(dupCheck.data.isDuplicate === true, 'Duplicate case number accurately detected');
  assert(dupCheck.data.existingMatter.id === matter1.id, 'Duplicate points to existing matter ID');

  // Test Matter Summary KPIs
  console.log('\nStep 4: Matter Summary KPIs & Statistics');
  const statsRes = await request('/matters/stats', {}, cookie1);
  assert(statsRes.status === 200, 'Fetched matter KPI statistics');
  const stats = statsRes.data.data;
  assert(stats.totalMatters >= 1, `Total matters count verified: ${stats.totalMatters}`);
  assert(stats.activeMatters >= 1, `Active matters count verified: ${stats.activeMatters}`);
  assert(stats.upcomingHearings30Days >= 1, `Upcoming hearings in 30 days verified: ${stats.upcomingHearings30Days}`);

  // Test Matter Workspace Details & Timeline
  console.log('\nStep 5: Matter Workspace & Chronological Timeline');
  const workspaceRes = await request(`/matters/${matter1.id}`, {}, cookie1);
  assert(workspaceRes.status === 200, 'Fetched dedicated matter workspace details');
  assert(Array.isArray(workspaceRes.data.data.hearings), 'Hearings list attached to matter workspace');
  assert(workspaceRes.data.data.documentsCount === 0, 'Clean empty state for documents acknowledged');

  const timelineRes = await request(`/matters/${matter1.id}/timeline`, {}, cookie1);
  assert(timelineRes.status === 200, 'Fetched chronological activity timeline');
  assert(timelineRes.data.data.length >= 2, `Timeline has audit events (${timelineRes.data.data.length} events found)`);
  assert(timelineRes.data.data.some(e => e.type === 'MATTER_CREATED'), 'Docket initiation event recorded');

  // --- Step 3: Module 2 — Hearing Calendar & Reminders ---
  console.log('\nStep 6: Module 2 — Hearing Scheduling & Automated Reminders');
  const newHrgRes = await request('/hearings', {
    method: 'POST',
    body: JSON.stringify({
      matterId: matter1.id,
      hearingType: 'Interlocutory Application (Order 39 R1 & R2 CPC)',
      date: '2026-11-22',
      time: '11:30',
      court: 'High Court of Delhi',
      location: 'Courtroom 22, Commercial Division',
      judge: "Hon'ble Justice Rajiv Sahai",
      priority: 'Urgent',
      notes: 'Oral arguments on interim injunction against unlawful retail distribution.',
      reminderDays: [1, 3, 7]
    })
  }, cookie1);

  assert(newHrgRes.status === 201, 'Scheduled new hearing with reminders');
  const hearing2 = newHrgRes.data.data;
  assert(hearing2.hearingType.includes('Order 39'), 'Hearing type verified');
  assert(newHrgRes.data.remindersScheduled >= 2, `Automated reminders scheduled: ${newHrgRes.data.remindersScheduled}`);

  // Fetch Reminders
  console.log('\nStep 7: Hearing Reminders API & Status Transitions');
  const remRes = await request('/reminders', {}, cookie1);
  assert(remRes.status === 200, 'Fetched reminders list');
  assert(remRes.data.data.length >= 2, `Reminders count verified: ${remRes.data.data.length}`);
  assert(remRes.data.disclosure.includes('In-app'), 'Honest disclosure on in-app notifications present');

  const testRem = remRes.data.data[0];
  const readRes = await request(`/reminders/${testRem.id}/read`, { method: 'PUT' }, cookie1);
  assert(readRes.data.success && readRes.data.data.isRead === true, 'Reminder marked as read');

  const compRes = await request(`/reminders/${testRem.id}/complete`, { method: 'PUT' }, cookie1);
  assert(compRes.data.success && compRes.data.data.status === 'Completed', 'Reminder marked as completed');

  // Reschedule Hearing & Sync Next Hearing Date
  console.log('\nStep 8: Reschedule Hearing & Hearing Outcome Recording');
  const updateHrgRes = await request(`/hearings/${hearing2.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      date: '2026-11-26',
      time: '14:00',
      status: 'In Progress',
      outcome: 'Part-heard arguments. Defendant directed to file reply by Monday.'
    })
  }, cookie1);

  assert(updateHrgRes.status === 200, 'Hearing rescheduled successfully');
  assert(updateHrgRes.data.data.date === '2026-11-26', 'Hearing date updated to 2026-11-26');
  assert(updateHrgRes.data.data.outcome.includes('Part-heard'), 'Hearing outcome recorded');

  // Update Matter Status: Close and Reopen
  console.log('\nStep 9: Matter Lifecycle (Close, Reopen)');
  const closeMatterRes = await request(`/matters/${matter1.id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'Closed' })
  }, cookie1);
  assert(closeMatterRes.data.data.status === 'Closed', 'Matter closed successfully');

  const reopenMatterRes = await request(`/matters/${matter1.id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'Open' })
  }, cookie1);
  assert(reopenMatterRes.data.data.status === 'Open', 'Matter reopened successfully');

  // --- Step 4: Multi-User Data Isolation Verification ---
  console.log('\nStep 10: Multi-User Strict Isolation Tests (User 2 vs User 1)');
  // User 2 tries to fetch User 1's matter
  const leakMat = await request(`/matters/${matter1.id}`, {}, cookie2);
  assert(leakMat.status === 404, 'User 2 blocked from accessing User 1 matter (404)');

  // User 2 tries to fetch User 1's timeline
  const leakTimeline = await request(`/matters/${matter1.id}/timeline`, {}, cookie2);
  assert(leakTimeline.status === 404, 'User 2 blocked from accessing User 1 timeline (404)');

  // User 2 tries to fetch User 1's hearing
  const leakHrg = await request(`/hearings/${hearing2.id}`, {}, cookie2);
  assert(leakHrg.status === 404, 'User 2 blocked from accessing User 1 hearing (404)');

  // User 2 tries to view or dismiss User 1's reminder
  const leakRem = await request(`/reminders/${testRem.id}/read`, { method: 'PUT' }, cookie2);
  assert(leakRem.status === 404, 'User 2 blocked from modifying User 1 reminder (404)');

  // User 2 matters list contains zero User 1 matters
  const user2Matters = await request('/matters', {}, cookie2);
  assert(!user2Matters.data.data.some(m => m.id === matter1.id), 'User 2 matters docket does not leak User 1 matter');

  // User 2 calendar contains zero User 1 hearings
  const user2Hearings = await request('/hearings', {}, cookie2);
  assert(!user2Hearings.data.data.some(h => h.matterId === matter1.id), 'User 2 calendar does not leak User 1 hearings');

  // --- Step 5: Clean Cascade Deletion ---
  console.log('\nStep 11: Cascade Deletion of Matter, Hearings, and Reminders');
  const delMatRes = await request(`/matters/${matter1.id}`, { method: 'DELETE' }, cookie1);
  assert(delMatRes.status === 200, 'Matter deleted successfully');

  const verifyHrgDel = await request(`/hearings/${hearing2.id}`, {}, cookie1);
  assert(verifyHrgDel.status === 404, 'Linked hearings were cascade deleted');

  const verifyRemDel = await request('/reminders', {}, cookie1);
  assert(!verifyRemDel.data.data.some(r => r.matterId === matter1.id), 'Linked reminders were cascade deleted');

  console.log(`\n======================================================`);
  console.log(`ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
