// server/test_matters_calendar.js
// Automated verification suite for Matter & Case Management + Hearing Calendar & Reminders

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

async function runTests() {
  console.log('⚖️ STARTING DRAFTMATE MODULE 1 & 2 VERIFICATION SUITE\n');
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

  // 1. Authenticate User A and User B
  const userAEmail = `adv.arjun.${Date.now()}@draftmate.legal`;
  const userBEmail = `adv.meera.${Date.now()}@draftmate.legal`;
  const password = 'LawyerStrongPass2026!';

  console.log('1. User Account Registration & Isolation Setup');
  const regARes = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Adv. Arjun Sharma', email: userAEmail, password, barNumber: 'D/4891/2018' })
  });
  assert(regARes.status === 201, `User A registered (${userAEmail})`);
  const cookieA = extractToken(regARes.setCookie);

  const regBRes = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Adv. Meera Sen', email: userBEmail, password, barNumber: 'MH/1102/2020' })
  });
  assert(regBRes.status === 201, `User B registered (${userBEmail})`);
  const cookieB = extractToken(regBRes.setCookie);

  // 2. Module 1: Create Matter for User A
  console.log('\n2. Module 1: Create & Manage Matters (User A)');
  const caseNumberA = `CS(COMM)/${Date.now().toString().slice(-4)}/2026`;
  const matterAPayload = {
    title: 'Bharat Pharma v. Global Biologics Inc.',
    matterNumber: caseNumberA,
    cnr: `DLHC0100${Date.now().toString().slice(-6)}`,
    client: 'Bharat Pharma Laboratories Ltd.',
    clientRole: 'Plaintiff',
    oppositeParty: 'Global Biologics Inc. & Anr.',
    court: 'High Court of Delhi',
    jurisdiction: 'New Delhi, India',
    matterType: 'Commercial Suit',
    filingDate: '2026-10-15',
    nextHearingDate: '2026-11-20',
    priority: 'High',
    status: 'Open',
    assignedLawyer: 'Adv. Arjun Sharma',
    notes: 'Injunction application under Order 39 Rule 1 & 2 CPC with Section 63 BSA electronic affidavit.'
  };

  const createMatRes = await request('/matters', {
    method: 'POST',
    body: JSON.stringify(matterAPayload)
  }, cookieA);

  assert(createMatRes.status === 201 && createMatRes.data.success, 'User A created matter successfully');
  const matterA = createMatRes.data.data;
  assert(matterA.title === matterAPayload.title, 'Matter title persisted accurately');
  assert(matterA.status === 'Open', 'Matter status normalized to "Open"');
  assert(matterA.assignedLawyer === 'Adv. Arjun Sharma', 'Assigned lawyer saved');

  // Duplicate case number check
  const dupCheckRes = await request(`/matters/check-duplicate?caseNumber=${encodeURIComponent(caseNumberA)}`, {}, cookieA);
  assert(dupCheckRes.data.isDuplicate === true, 'Duplicate case number detected accurately');
  assert(dupCheckRes.data.existingMatter.id === matterA.id, 'Duplicate warning references existing matter');

  // Check stats for User A
  const statsRes = await request('/matters/stats', {}, cookieA);
  assert(statsRes.status === 200, 'Fetched User A matter stats');
  assert(statsRes.data.data.totalMatters >= 1, `Total matters count correct (${statsRes.data.data.totalMatters})`);
  assert(statsRes.data.data.activeMatters >= 1, `Active matters count correct (${statsRes.data.data.activeMatters})`);
  assert(statsRes.data.data.upcomingHearings30Days >= 1, `Upcoming hearings in 30 days counted (${statsRes.data.data.upcomingHearings30Days})`);

  // Update matter status
  const statusUpdateRes = await request(`/matters/${matterA.id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'Pending' })
  }, cookieA);
  assert(statusUpdateRes.data.success && statusUpdateRes.data.data.status === 'Pending', 'Updated matter status to "Pending"');

  // Check matter timeline
  const timelineRes = await request(`/matters/${matterA.id}/timeline`, {}, cookieA);
  assert(timelineRes.data.success && Array.isArray(timelineRes.data.data), 'Matter activity timeline synthesized');
  assert(timelineRes.data.data.length >= 2, `Timeline contains creation and hearing events (count=${timelineRes.data.data.length})`);

  // 3. Module 2: Hearing Calendar & Reminders (User A)
  console.log('\n3. Module 2: Hearing Calendar & Reminders (User A)');
  const hearingsListRes = await request('/hearings', {}, cookieA);
  assert(hearingsListRes.status === 200, 'Fetched User A hearings');
  const initialHearing = hearingsListRes.data.data[0];
  assert(initialHearing && initialHearing.matterId === matterA.id, 'Hearing auto-scheduled from matter nextHearingDate');

  // Schedule a second hearing manually
  const newHearingPayload = {
    matterId: matterA.id,
    hearingType: 'Framing of Issues',
    date: '2026-11-25',
    time: '11:00',
    court: 'High Court of Delhi',
    location: 'Courtroom 12, Commercial Bench',
    judge: "Hon'ble Justice S. Kaul",
    priority: 'Urgent',
    notes: 'Draft proposed issues based on pleadings.',
    reminderDays: [1, 3, 7]
  };

  const createHrgRes = await request('/hearings', {
    method: 'POST',
    body: JSON.stringify(newHearingPayload)
  }, cookieA);

  assert(createHrgRes.status === 201, 'Scheduled new hearing for User A');
  const scheduledHrg = createHrgRes.data.data;
  assert(scheduledHrg.hearingType === 'Framing of Issues', 'Hearing type verified');
  assert(createHrgRes.data.remindersScheduled >= 2, `Generated in-app reminders (${createHrgRes.data.remindersScheduled} scheduled)`);

  // Check Reminders API
  const remindersRes = await request('/reminders', {}, cookieA);
  assert(remindersRes.status === 200, 'Fetched User A reminders list');
  assert(remindersRes.data.data.length >= 2, `User A has active reminders (count=${remindersRes.data.data.length})`);
  assert(remindersRes.data.disclosure.includes('In-app'), 'Honest disclosure on in-app reminders provided');

  // Mark reminder as read
  const testRem = remindersRes.data.data[0];
  const readRemRes = await request(`/reminders/${testRem.id}/read`, { method: 'PUT' }, cookieA);
  assert(readRemRes.data.success && readRemRes.data.data.isRead === true, 'Reminder marked as read');

  // Complete / dismiss reminder
  const completeRemRes = await request(`/reminders/${testRem.id}/complete`, { method: 'PUT' }, cookieA);
  assert(completeRemRes.data.success && completeRemRes.data.data.status === 'Completed', 'Reminder marked as completed');

  // Reschedule hearing
  const rescheduleRes = await request(`/hearings/${scheduledHrg.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      date: '2026-11-28',
      time: '14:30',
      status: 'In Progress',
      outcome: 'Part-heard, continued to next session'
    })
  }, cookieA);
  assert(rescheduleRes.data.success && rescheduleRes.data.data.date === '2026-11-28', 'Hearing successfully rescheduled');
  assert(rescheduleRes.data.data.outcome.includes('Part-heard'), 'Hearing outcome recorded');

  // 4. Multi-User Isolation Checks (User B vs User A)
  console.log('\n4. Multi-User Isolation Verification (User B vs User A)');
  // User B attempts to access User A's matter
  const leakMatterRes = await request(`/matters/${matterA.id}`, {}, cookieB);
  assert(leakMatterRes.status === 404, 'User B cannot access User A matter (HTTP 404)');

  // User B attempts to list matters
  const userBMatters = await request('/matters', {}, cookieB);
  assert(!userBMatters.data.data.some(m => m.id === matterA.id), 'User B matters list does not leak User A matters');
  assert(userBMatters.data.data.every(m => m.userId === regBRes.data.user.id), 'All matters for User B belong strictly to User B');

  // User B attempts to access User A's hearing
  const leakHearingRes = await request(`/hearings/${scheduledHrg.id}`, {}, cookieB);
  assert(leakHearingRes.status === 404, 'User B cannot access User A hearing (HTTP 404)');

  // User B attempts to list hearings
  const userBHearings = await request('/hearings', {}, cookieB);
  assert(!userBHearings.data.data.some(h => h.matterId === matterA.id), 'User B hearing calendar does not leak User A hearings');

  // User B attempts to view or complete User A's reminder
  const leakRemRes = await request(`/reminders/${testRem.id}/read`, { method: 'PUT' }, cookieB);
  assert(leakRemRes.status === 404, 'User B cannot modify User A reminders (HTTP 404)');

  // User B creates their own private matter & hearing
  const userBMatterPayload = {
    title: 'Meera Private Matrimonial Settlement',
    client: 'Private Client Sen',
    court: 'Family Court, Mumbai',
    matterType: 'Matrimonial / Divorce'
  };
  const matBRes = await request('/matters', { method: 'POST', body: JSON.stringify(userBMatterPayload) }, cookieB);
  assert(matBRes.status === 201, 'User B successfully created private matter');
  const matterBId = matBRes.data.data.id;

  // User A attempts to access User B's matter
  const leakBackRes = await request(`/matters/${matterBId}`, {}, cookieA);
  assert(leakBackRes.status === 404, 'User A cannot access User B matter (HTTP 404)');

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
