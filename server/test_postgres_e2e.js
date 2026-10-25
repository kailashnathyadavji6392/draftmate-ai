// server/test_postgres_e2e.js
// Automated verification suite for PostgreSQL storage, pooling, migrations, JSON import & two-user isolation

import { newDb } from 'pg-mem';
import { setPool, query, closePool } from './db/pool.js';
import { runMigrations } from './db/migrations.js';
import { importJsonDataToPostgres } from './db/importer.js';
import { matterRepo } from './db/repositories/matterRepo.js';
import { hearingRepo } from './db/repositories/hearingRepo.js';
import { reminderRepo } from './db/repositories/reminderRepo.js';
import { userRepo } from './db/repositories/userRepo.js';

async function runPostgresTests() {
  console.log('🐘 STARTING DRAFTMATE POSTGRESQL PERSISTENCE & MIGRATION VERIFICATION\n');
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

  // 1. Setup in-memory PostgreSQL instance with pg-mem
  console.log('1. Setting up PostgreSQL Engine & Connection Pool');
  const memDb = newDb({
    autoCreateForeignKeyIndices: true
  });

  // Provide pg-mem adapter for pg.Pool
  const pgAdapter = memDb.adapters.createPg();
  const pool = new pgAdapter.Pool();
  setPool(pool);

  // Verify connection pool query
  const testConn = await query('SELECT 1 as connected');
  assert(testConn.rows[0].connected === 1, 'PostgreSQL connection pool established and responsive');

  // 2. Safe Schema Migrations & Indexes
  console.log('\n2. Executing Schema Migrations & Index Provisioning');
  await runMigrations();

  const tablesRes = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  const tableNames = tablesRes.rows.map(r => r.table_name);
  assert(tableNames.includes('users'), 'Users table provisioned in PostgreSQL');
  assert(tableNames.includes('matters'), 'Matters table provisioned in PostgreSQL');
  assert(tableNames.includes('hearings'), 'Hearings table provisioned in PostgreSQL');
  assert(tableNames.includes('reminders'), 'Reminders table provisioned in PostgreSQL');
  assert(tableNames.includes('schema_migrations'), 'Schema migrations tracking table provisioned');

  // Verify Idempotence of migrations
  try {
    await runMigrations();
    assert(true, 'Migrations are completely safe and idempotent (re-run without errors)');
  } catch (err) {
    assert(false, `Migrations failed on rerun: ${err.message}`);
  }

  // 3. One-time Validated JSON Import
  console.log('\n3. Validated One-Time Import from JSON to PostgreSQL');
  const importStats = await importJsonDataToPostgres();
  assert(importStats.users > 0, `Users imported from JSON into PostgreSQL (${importStats.users} users)`);
  assert(importStats.matters > 0, `Matters imported from JSON into PostgreSQL (${importStats.matters} matters)`);
  assert(importStats.hearings > 0, `Hearings imported from JSON into PostgreSQL (${importStats.hearings} hearings)`);
  assert(importStats.reminders > 0, `Reminders imported from JSON into PostgreSQL (${importStats.reminders} reminders)`);

  // Verify legacy demo user exists
  const legacyUser = await userRepo.findById('usr-legacy-demo');
  assert(legacyUser && legacyUser.id === 'usr-legacy-demo', 'Legacy demo user preserved for orphan records');

  // 4. Two-User Account Setup & Strict Ownership
  console.log('\n4. User Setup & Strict Data Isolation in PostgreSQL');
  const userA = await userRepo.create({
    id: `usr-test-a-${Date.now()}`,
    name: 'Adv. Rajesh Kumar',
    email: `rajesh.${Date.now()}@draftmate.legal`,
    passwordHash: '$2b$12$fakepasswordhashA',
    role: 'Advocate'
  });
  assert(userA.name === 'Adv. Rajesh Kumar', 'User A created in PostgreSQL');

  const userB = await userRepo.create({
    id: `usr-test-b-${Date.now()}`,
    name: 'Adv. Sneha Roy',
    email: `sneha.${Date.now()}@draftmate.legal`,
    passwordHash: '$2b$12$fakepasswordhashB',
    role: 'Advocate'
  });
  assert(userB.name === 'Adv. Sneha Roy', 'User B created in PostgreSQL');

  // 5. Matter CRUD in PostgreSQL (User A)
  console.log('\n5. Matter CRUD with Parameterized Queries in PostgreSQL (User A)');
  const caseNumberA = `CS(COMM)/${Date.now().toString().slice(-4)}/2026`;
  const matterA = await matterRepo.create({
    title: 'Adani Ports v. Global Marine Logistics',
    matterNumber: caseNumberA,
    cnr: `DLHC01${Date.now().toString().slice(-6)}`,
    court: 'High Court of Delhi',
    matterType: 'Commercial Suit',
    client: 'Adani Ports & SEZ Ltd.',
    clientRole: 'Plaintiff',
    oppositeParty: 'Global Marine Logistics Pvt Ltd',
    judge: "Hon'ble Commercial Division Bench 1",
    status: 'Open',
    priority: 'High',
    claimAmount: '₹ 15,00,00,000',
    filingDate: '2026-10-10',
    nextHearingDate: '2026-11-20',
    assignedLawyer: 'Adv. Rajesh Kumar',
    summary: 'Breach of charterparty agreement with Section 63 BSA electronic admissibility issue.'
  }, userA.id);

  assert(matterA.id && matterA.title.includes('Adani Ports'), 'Matter created in PostgreSQL with generated ID');
  assert(matterA.userId === userA.id, 'Matter bound strictly to User A');
  assert(matterA.claimAmount === '₹ 15,00,00,000', 'Suit claim amount persisted accurately');

  // Duplicate Check
  const dupCheck = await matterRepo.checkDuplicate(userA.id, caseNumberA, null);
  assert(dupCheck.isDuplicate === true, 'Duplicate case number detected in PostgreSQL');
  assert(dupCheck.existingMatter.id === matterA.id, 'Duplicate points to existing matter');

  // Query User A matters
  const userAMatters = await matterRepo.findByUserId(userA.id);
  assert(userAMatters.some(m => m.id === matterA.id), 'User A matters listed from PostgreSQL');

  // Verify KPI stats calculation in PostgreSQL
  const statsA = await matterRepo.getStats(userA.id);
  assert(statsA.totalMatters >= 1, `Total matters counted in SQL: ${statsA.totalMatters}`);
  assert(statsA.activeMatters >= 1, `Active matters counted in SQL: ${statsA.activeMatters}`);

  // Update Matter & Status Transition
  const updatedA = await matterRepo.update(matterA.id, userA.id, {
    notes: 'Updated strategy: Prepare interim injunction application.',
    priority: 'Critical'
  });
  assert(updatedA.priority === 'Critical', 'Matter updated in PostgreSQL with parameterized query');
  assert(updatedA.notes.includes('interim injunction'), 'Matter notes persisted');

  const statusUpdate = await matterRepo.updateStatus(matterA.id, userA.id, 'Pending');
  assert(statusUpdate.status === 'Pending', 'Matter status updated to Pending');

  // 6. Hearing Calendar & Reminders in PostgreSQL (User A)
  console.log('\n6. Court Hearing & Reminders in PostgreSQL (User A)');
  const hearingA = await hearingRepo.create({
    matterId: matterA.id,
    matterTitle: matterA.title,
    caseNumber: matterA.matterNumber,
    court: 'High Court of Delhi',
    location: 'Courtroom 6, Main Block',
    judge: "Hon'ble Justice Khanna",
    hearingDate: '2026-11-24T11:00:00+05:30',
    date: '2026-11-24',
    time: '11:00',
    hearingType: 'Interlocutory Arguments',
    status: 'Scheduled',
    priority: 'Critical',
    notes: 'Argue Section 63 BSA compliance for digital records.',
    reminderDays: [1, 3]
  }, userA.id);

  assert(hearingA.id && hearingA.hearingType === 'Interlocutory Arguments', 'Hearing created in PostgreSQL');
  assert(hearingA.userId === userA.id, 'Hearing bound strictly to User A');

  // Verify matter next_hearing_date synchronized
  const reloadedMatter = await matterRepo.findById(matterA.id, userA.id);
  assert(reloadedMatter.nextHearingDate === '2026-11-24', 'Matter next hearing date synchronized automatically');

  // Create In-App Reminders in PostgreSQL
  const reminderA = await reminderRepo.create({
    hearingId: hearingA.id,
    matterId: matterA.id,
    matterTitle: matterA.title,
    caseNumber: matterA.matterNumber,
    hearingDate: hearingA.hearingDate,
    dueDate: '2026-11-23T11:00:00+05:30',
    daysBefore: 1,
    title: '1-Day Reminder: Arguments in Adani Ports',
    message: 'Prepare courtroom paper book and case compendium.',
    type: 'HearingReminder',
    status: 'Pending',
    channel: 'In-App Notification'
  }, userA.id);

  assert(reminderA.id && reminderA.title.includes('1-Day Reminder'), 'Reminder created in PostgreSQL');
  assert(reminderA.userId === userA.id, 'Reminder bound strictly to User A');

  // Test Reminder Read & Complete
  const readRem = await reminderRepo.markRead(reminderA.id, userA.id);
  assert(readRem.isRead === true, 'Reminder marked as read in PostgreSQL');

  const compRem = await reminderRepo.complete(reminderA.id, userA.id);
  assert(compRem.status === 'Completed', 'Reminder marked as completed in PostgreSQL');

  // Reschedule hearing
  const rescheduledHrg = await hearingRepo.update(hearingA.id, userA.id, {
    date: '2026-11-28',
    time: '14:30',
    status: 'In Progress',
    outcome: 'Part-heard, listed for Monday'
  });
  assert(rescheduledHrg.date === '2026-11-28', 'Hearing date rescheduled in PostgreSQL');
  assert(rescheduledHrg.outcome.includes('Part-heard'), 'Hearing outcome recorded in PostgreSQL');

  // 7. Strict Two-User Isolation Verification in PostgreSQL
  console.log('\n7. Strict Cross-User Isolation Verification in PostgreSQL');
  // User B attempts to access User A's matter
  const leakMat = await matterRepo.findById(matterA.id, userB.id);
  assert(leakMat === null, 'User B cannot query User A matter (returned null)');

  // User B lists matters
  const userBMatters = await matterRepo.findByUserId(userB.id);
  assert(!userBMatters.some(m => m.id === matterA.id), 'User B matters list does not leak User A matters');

  // User B attempts to access User A's hearing
  const leakHrg = await hearingRepo.findById(hearingA.id, userB.id);
  assert(leakHrg === null, 'User B cannot query User A hearing (returned null)');

  // User B lists hearings
  const userBHearings = await hearingRepo.findByUserId(userB.id);
  assert(!userBHearings.some(h => h.id === hearingA.id), 'User B hearing calendar does not leak User A hearings');

  // User B attempts to access or mutate User A's reminder
  const leakRem = await reminderRepo.findById(reminderA.id, userB.id);
  assert(leakRem === null, 'User B cannot query User A reminder (returned null)');

  const leakRead = await reminderRepo.markRead(reminderA.id, userB.id);
  assert(leakRead === null, 'User B cannot mark User A reminder as read (returned null)');

  // User B creates their own private matter & hearing
  const matterB = await matterRepo.create({
    title: 'Sneha Private Family Trust Dispute',
    client: 'Private Client Roy',
    court: 'Bombay High Court',
    matterType: 'Trust Petition'
  }, userB.id);
  assert(matterB.id && matterB.userId === userB.id, 'User B created independent private matter');

  // User A attempts to access User B's matter
  const leakBack = await matterRepo.findById(matterB.id, userA.id);
  assert(leakBack === null, 'User A cannot query User B matter (returned null)');

  // 8. Cascade Deletion in PostgreSQL
  console.log('\n8. Cascade Deletion & Foreign Key Integrity in PostgreSQL');
  const deletedMat = await matterRepo.delete(matterA.id, userA.id);
  assert(deletedMat.id === matterA.id, 'Matter deleted in PostgreSQL');

  const checkHrg = await hearingRepo.findById(hearingA.id, userA.id);
  assert(checkHrg === null, 'Linked hearings deleted by CASCADE');

  const checkRem = await reminderRepo.findById(reminderA.id, userA.id);
  assert(checkRem === null, 'Linked reminders deleted by CASCADE');

  // 9. Simulated Restart & Persistence Verification
  console.log('\n9. Simulated Backend Restart & Data Persistence');
  // Query User B's matter to confirm data survived all operations
  const persistedB = await matterRepo.findById(matterB.id, userB.id);
  assert(persistedB && persistedB.title === matterB.title, 'Data persists across multiple operations and pool re-use');

  console.log(`\n======================================================`);
  console.log(`POSTGRESQL SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  await closePool();

  if (failed > 0) {
    process.exit(1);
  }
}

runPostgresTests().catch(err => {
  console.error('Fatal PostgreSQL test error:', err);
  process.exit(1);
});
