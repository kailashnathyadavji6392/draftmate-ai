import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Scale, 
  ArrowRightLeft, 
  CheckCircle2, 
  Sparkles, 
  FileText,
  ShieldAlert,
  ExternalLink,
  Info,
  Calendar,
  Building
} from 'lucide-react';
import { api } from '../../api/client';

export default function ResearchView({ showToast }) {
  const [activeTab, setActiveTab] = useState('central-statutes'); // 'central-statutes' | 'precedents' | 'transition'
  const [searchQuery, setSearchQuery] = useState('');
  const [statutesData, setStatutesData] = useState({ 
    centralEnactments: [],
    penalCode: [], 
    procedureCode: [], 
    evidenceCode: [] 
  });
  const [precedents, setPrecedents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStatutes();
    fetchPrecedents();
  }, []);

  const fetchStatutes = async (query = '') => {
    setIsLoading(true);
    try {
      const res = await api.getStatutes(query);
      if (res.success) {
        setStatutesData(res.data);
      }
    } catch (e) {
      console.error(e);
      if (showToast) showToast('Failed to load statutes library', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrecedents = async (query = '') => {
    try {
      const res = await api.getPrecedents(query);
      if (res.success) {
        setPrecedents(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStatutes(searchQuery);
    fetchPrecedents(searchQuery);
  };

  // Filter central enactments by query
  const centralEnactments = statutesData.centralEnactments || [];
  const filteredEnactments = centralEnactments.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = e.actTitle.toLowerCase().includes(q);
    const matchNumber = (e.actNumber || '').toLowerCase().includes(q);
    const matchKeySec = (e.keySections || []).some(k => k.section.toLowerCase().includes(q) || k.title.toLowerCase().includes(q) || k.summary.toLowerCase().includes(q));
    return matchTitle || matchNumber || matchKeySec;
  });

  return (
    <div style={{
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      overflowY: 'auto',
      height: '100%',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <BookOpen size={12} />
              LEGAL RESEARCH INTELLIGENCE
            </span>
            <span className="badge badge-info">India Code • Digital SCR Gateway</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: '#FFF', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            Indian Statutes, Central Enactments & Landmark Precedents
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '850px' }}>
            Comprehensive authoritative research library referencing official central enactments on India Code and Supreme Court Landmark Rulings with Digital SCR official links.
          </p>
        </div>

        {/* Global Search */}
        <form onSubmit={handleSearch} style={{ position: 'relative', width: '320px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="legal-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchStatutes(e.target.value);
              fetchPrecedents(e.target.value);
            }}
            placeholder="Search statute, section, citation or bench..."
            style={{ paddingLeft: '2.2rem', fontSize: '0.8rem', width: '100%' }}
          />
        </form>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('central-statutes')}
          className={activeTab === 'central-statutes' ? 'btn btn-gold' : 'btn btn-secondary'}
          style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Building size={14} />
          <span>Central Enactments on India Code ({centralEnactments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('precedents')}
          className={activeTab === 'precedents' ? 'btn btn-gold' : 'btn btn-secondary'}
          style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Scale size={14} />
          <span>Supreme Court Landmark Precedents ({precedents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transition')}
          className={activeTab === 'transition' ? 'btn btn-gold' : 'btn btn-secondary'}
          style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <ArrowRightLeft size={14} />
          <span>Criminal & Evidence Code Transition (BNS / BNSS / BSA)</span>
        </button>
      </div>

      {/* Tab 1: Central Enactments on India Code */}
      {activeTab === 'central-statutes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1rem' }}>
            {filteredEnactments.map((statute, idx) => (
              <div
                key={statute.actCode || idx}
                className="legal-card"
                style={{
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <span className="badge badge-gold font-mono" style={{ fontSize: '0.68rem' }}>
                      {statute.actNumber}
                    </span>
                    <span className="badge badge-outline" style={{ fontSize: '0.65rem' }}>
                      Year {statute.year}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                    {statute.actTitle}
                  </h3>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {statute.ministry} • <span style={{ color: 'var(--gold-light)' }}>{statute.status}</span>
                  </div>

                  {/* Key Sections Accordion/List */}
                  {statute.keySections && statute.keySections.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Key Statutory Provisions:</span>
                      {statute.keySections.map((sec, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '0.45rem 0.65rem',
                            backgroundColor: 'rgba(0,0,0,0.25)',
                            borderRadius: '4px',
                            borderLeft: '2px solid var(--border-gold)',
                            fontSize: '0.73rem'
                          }}
                        >
                          <strong style={{ color: 'var(--gold-light)' }}>{sec.section}:</strong> {sec.title}
                          <p style={{ margin: '0.15rem 0 0 0', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                            {sec.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Official Repository: India Code
                  </span>

                  <a
                    href={statute.indiaCodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-gold"
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span>View on India Code</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Supreme Court Landmark Precedents */}
      {activeTab === 'precedents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1rem' }}>
            {precedents.map((p, idx) => (
              <div
                key={p.id || idx}
                className="legal-card"
                style={{
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <span className="badge badge-gold font-mono" style={{ fontSize: '0.7rem' }}>
                      {p.citation}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                      {p.status || 'Active Landmark'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                    {p.title}
                  </h3>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <strong>Bench:</strong> {p.bench} {p.decisionDate && `• Decided: ${p.decisionDate}`}
                  </div>

                  <div style={{
                    padding: '0.65rem 0.8rem',
                    backgroundColor: 'rgba(212, 175, 55, 0.08)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-gold)',
                    fontSize: '0.76rem',
                    lineHeight: 1.45,
                    marginBottom: '0.5rem'
                  }}>
                    <strong style={{ color: 'var(--gold-light)' }}>Binding Ratio Decidendi:</strong>
                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
                      {p.ratio}
                    </p>
                  </div>

                  {p.relatedStatutes && p.relatedStatutes.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Governs: <span style={{ color: 'var(--text-secondary)' }}>{p.relatedStatutes.join(' • ')}</span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Portal: {p.officialSource || 'Digital SCR'}
                  </span>

                  {p.officialUrl && (
                    <a
                      href={p.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-gold"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <span>Digital SCR Judgment</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Criminal & Evidence Transition Hub */}
      {activeTab === 'transition' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Note on Transition */}
          <div style={{
            backgroundColor: 'rgba(212, 175, 55, 0.08)',
            border: '1px solid var(--border-gold)',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Info size={16} color="var(--gold-primary)" style={{ flexShrink: 0 }} />
            <div>
              <strong>Procedural Law Milestone</strong>: Offenses committed on or after <strong>1 July 2024</strong> are governed exclusively by the Bharatiya Nyaya Sanhita (BNS 2023), Bharatiya Nagarik Suraksha Sanhita (BNSS 2023), and Bharatiya Sakshya Adhiniyam (BSA 2023). Pre-July 2024 offenses remain governed by IPC, CrPC, and IEA.
            </div>
          </div>

          {/* Penal Code Section (BNS vs IPC) */}
          <div className="legal-card" style={{ padding: '1.1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Scale size={15} color="var(--gold-primary)" />
              Bharatiya Nyaya Sanhita, 2023 (BNS) vs Indian Penal Code, 1860 (IPC)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
              {statutesData.penalCode.map((s, i) => (
                <div key={i} style={{
                  padding: '0.85rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className="badge badge-gold font-mono">{s.bnsSection}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Replaces {s.ipcSection}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {s.bnsTitle}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginBottom: '0.4rem' }}>
                    {s.ipcTitle}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Punishment: {s.maxPunishment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Procedure Code Section (BNSS vs CrPC) */}
          <div className="legal-card" style={{ padding: '1.1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowRightLeft size={15} color="#F59E0B" />
              Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) vs Code of Criminal Procedure, 1973 (CrPC)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
              {statutesData.procedureCode.map((s, i) => (
                <div key={i} style={{
                  padding: '0.85rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className="badge badge-gold font-mono">{s.bnssSection}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Replaces {s.crpcSection}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {s.bnssTitle}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
                    Forum: {s.court}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gold-light)' }}>
                    Standard: {s.keyTest}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Code Section (BSA vs IEA) */}
          <div className="legal-card" style={{ padding: '1.1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} color="#10B981" />
              Bharatiya Sakshya Adhiniyam, 2023 (BSA) vs Indian Evidence Act, 1872 (IEA)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
              {statutesData.evidenceCode.map((s, i) => (
                <div key={i} style={{
                  padding: '0.85rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className="badge badge-gold font-mono">{s.bsaSection}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Replaces {s.ieaSection}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {s.bsaTitle}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.4 }}>
                    {s.requirement}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advisory Legal Safety Disclaimer Notice at bottom */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        fontSize: '0.73rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        marginTop: '0.5rem'
      }}>
        ⚖️ <strong>Informational Legal Research Notice</strong>: This compilation is provided for research and assistive purposes and requires independent advocate verification before inclusion in court pleadings or judicial submissions.
      </div>
    </div>
  );
}
