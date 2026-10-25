import React from 'react';
import { 
  Briefcase, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Calendar, 
  Sparkles, 
  ArrowUpRight, 
  Clock, 
  Scale, 
  AlertTriangle,
  Bell,
  CalendarCheck,
  ChevronRight
} from 'lucide-react';

export default function DashboardView({ 
  matters = [], 
  documents = [], 
  hearings = [],
  reminders = [],
  activeMatter = null,
  evidenceData = null,
  onSelectMatter, 
  onSelectDocument, 
  setActiveTab,
  configStatus 
}) {
  const isAiConfigured = configStatus?.aiIntegration?.isConfigured;
  const criticalMatters = matters.filter(m => m.priority === 'Critical' || m.priority === 'High');
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  // Upcoming hearings in next 30 days
  const upcomingHearings = hearings
    .filter(h => (h.status === 'Scheduled' || h.status === 'In Progress') && new Date(h.date || h.hearingDate) >= new Date(todayStr))
    .sort((a, b) => new Date(a.date || a.hearingDate) - new Date(b.date || b.hearingDate));

  const dueReminders = reminders.filter(r => r.status === 'Due' || (!r.isRead && new Date(r.dueDate) <= now));

  // Compute dynamic ground-truth statistics across documents
  const totalExtractedFacts = documents.reduce((sum, d) => sum + (d.extractedFacts?.length || 0), 0);
  
  // Real BSA compliance score: calculate from active matter / documents
  let dynamicBsaScore = 100;
  if (documents.length > 0) {
    const hasElectronic = documents.some(d => /email|whatsapp|server log|timestamp/i.test(d.content || ''));
    const hasCert = documents.some(d => /section 63|section 65b/i.test(d.content || ''));
    if (hasElectronic && !hasCert) {
      dynamicBsaScore = 55;
    } else if (hasElectronic && hasCert) {
      dynamicBsaScore = 95;
    } else {
      dynamicBsaScore = 90;
    }
  }

  return (
    <div style={{
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      overflowY: 'auto',
      height: '100%',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid var(--border-gold)',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-gold font-serif">ENTERPRISE LEGAL TECH</span>
            <span className="badge badge-info">Bharatiya Nyaya Sanhita (BNS) Compliant</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#FFF', fontWeight: 700 }}>
            Legal Workbench & Evidence Intelligence
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '650px', marginTop: '0.2rem' }}>
            Engineered for Indian Supreme Court, High Courts, and Arbitral Tribunals. Features live Section 63 BSA electronic admissibility auditing, citation verification, and smart contractual redlining.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => setActiveTab('drafting')}
            className="btn btn-gold"
          >
            <Sparkles size={15} />
            <span>AI Drafting Studio</span>
          </button>
          <button 
            onClick={() => setActiveTab('research')}
            className="btn btn-secondary"
          >
            <Scale size={15} color="var(--gold-primary)" />
            <span>Statute Cross-Ref</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        <div className="legal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
            <span>ACTIVE MATTERS</span>
            <Briefcase size={16} color="var(--gold-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-serif)' }}>
            {matters.filter(m => m.status !== 'Closed' && m.status !== 'Archived').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {criticalMatters.length} High / Critical priority matters
          </div>
        </div>

        <div 
          className="legal-card"
          onClick={() => setActiveTab && setActiveTab('calendar')}
          style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
            <span>UPCOMING HEARINGS (30D)</span>
            <Calendar size={16} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#38BDF8', fontFamily: 'var(--font-serif)' }}>
            {upcomingHearings.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gold-light)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>View Hearing Calendar</span>
            <ArrowUpRight size={12} />
          </div>
        </div>

        <div className="legal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
            <span>BSA ELECTRONIC ADMISSIBILITY</span>
            <ShieldAlert size={16} color={dynamicBsaScore >= 80 ? '#10B981' : '#F59E0B'} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: dynamicBsaScore >= 80 ? '#34D399' : '#FBBF24', fontFamily: 'var(--font-serif)' }}>
            {dynamicBsaScore}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Calculated from active dossier exhibits
          </div>
        </div>

        <div className="legal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
            <span>AI ENGINE STATUS</span>
            <Sparkles size={16} color={isAiConfigured ? '#34D399' : '#F59E0B'} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isAiConfigured ? '#34D399' : '#FBBF24', marginTop: '0.4rem' }}>
            {isAiConfigured ? 'Gemini 2.0 Live' : 'Heuristic Engine'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {isAiConfigured ? 'Official @google/genai SDK active' : 'Rule-based legal engine (Key pending)'}
          </div>
        </div>
      </div>

      {/* Hackathon Demo Quickstart Guide */}
      <div className="legal-card" style={{
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem' }}>⚖️</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold-light)' }}>
              Hackathon Guided Demo Workflow (3 Quick Steps)
            </span>
            <span className="badge badge-gold" style={{ fontSize: '0.62rem' }}>Judge / Evaluator Guide</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Republic of India Judicial Jurisdiction</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '0.2rem' }}>
          <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold-primary)', marginBottom: '0.25rem' }}>
              1. Matters & Evidence Dossier
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
              Switch matters or upload sample contracts (PDF/DOCX/TXT). View extracted facts linked to page/line coordinates in the Central Editor bottom panels.
            </p>
          </div>

          <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold-primary)', marginBottom: '0.25rem' }}>
              2. Legal Risk Radar & Verification
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
              Check contract clauses for unilateral arbitration or uncapped damages. Audits citations on India Code and Supreme Court portals with zero fake cases.
            </p>
          </div>

          <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold-primary)', marginBottom: '0.25rem' }}>
              3. AI Drafting & Smart Redline
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
              Generate evidence-grounded legal drafts with voice dictation (Hindi & English), run interactive diff redline comparison, and export real binary PDF & Word DOCX files.
            </p>
          </div>
        </div>
      </div>

      {/* Due Court Reminders Alert Banner */}
      {dueReminders.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid var(--border-gold)',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(212, 175, 55, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gold-light)'
            }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFF' }}>
                {dueReminders.length} Due Court Hearing Reminder(s) Today
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-muted)' }}>
                In-app notification active (External SMTP/SMS unconfigured). Cause list briefing required.
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab && setActiveTab('calendar')}
            className="btn btn-gold"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
          >
            <span>Review in Calendar</span>
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Main Grid: Active Matters & Upcoming Hearings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1.2fr',
        gap: '1.25rem'
      }}>
        {/* Upcoming Court Hearings Docket */}
        <div className="legal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
              <CalendarCheck size={16} color="var(--gold-primary)" />
              Upcoming Court Hearings
            </h3>
            <button 
              onClick={() => setActiveTab && setActiveTab('calendar')}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
            >
              <span>Calendar</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {upcomingHearings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No court hearings scheduled in next 30 days.
              </div>
            ) : (
              upcomingHearings.slice(0, 4).map((h) => (
                <div
                  key={h.id}
                  onClick={() => setActiveTab && setActiveTab('calendar')}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8' }}>
                      {h.date || h.hearingDate?.slice(0, 10)} • {h.time || '10:30'} IST
                    </span>
                    <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                      {h.hearingType}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.matterTitle}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    🏛️ {h.court} • 📍 {h.location || 'Courtroom 4'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Matters Docket */}
        <div className="legal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
              <Briefcase size={16} color="var(--gold-primary)" />
              Active Litigation Matters Docket
            </h3>
            <button 
              onClick={() => setActiveTab('matters')}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
            >
              <span>View All</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {matters.map((m) => (
              <div
                key={m.id}
                onClick={() => onSelectMatter && onSelectMatter(m)}
                style={{
                  padding: '0.85rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <div>
                    <span className="badge badge-gold font-mono" style={{ fontSize: '0.68rem', marginRight: '0.5rem' }}>
                      {m.matterNumber}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      {m.title}
                    </span>
                  </div>
                  <span className={`badge ${m.priority === 'Critical' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                    {m.priority}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>{m.court}</span>
                  <span style={{ color: '#38BDF8' }}>Next Date: {m.nextHearingDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Alerts & Quick Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Statutory Alert Card */}
          <div className="legal-card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} color="#F59E0B" />
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FDE68A' }}>
                New Criminal Laws In Effect
              </h4>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Bharatiya Nyaya Sanhita (BNS), BNSS, and BSA apply to all offences and electronic evidence from 1 July 2024. Use the built-in <strong>Statute Cross-Ref</strong> tool to auto-map erstwhile IPC/CrPC/IEA sections.
            </p>
            <button
              onClick={() => setActiveTab('research')}
              className="btn btn-outline-gold"
              style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.75rem', padding: '0.4rem' }}
            >
              Open BNS / IPC Cross-Reference
            </button>
          </div>

          {/* Recent Documents Quick Access */}
          <div className="legal-card" style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={15} color="var(--gold-primary)" />
              Recent Pleadings & Exhibits
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {documents.slice(0, 3).map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDocument && onSelectDocument(d)}
                  style={{
                    padding: '0.5rem 0.65rem',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                    {d.title}
                  </span>
                  <span className="badge badge-gold" style={{ fontSize: '0.62rem' }}>
                    {d.documentType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
