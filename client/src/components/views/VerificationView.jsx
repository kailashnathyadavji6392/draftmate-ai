import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Search, 
  Scale, 
  ShieldCheck, 
  FileCheck, 
  AlertTriangle,
  ExternalLink,
  BookOpen,
  RefreshCw,
  FileText,
  Filter,
  Info,
  Clock,
  HelpCircle,
  XCircle,
  WifiOff
} from 'lucide-react';
import { api } from '../../api/client';

export default function VerificationView({ 
  currentDocument, 
  documents = [], 
  activeMatter, 
  onSelectDocument,
  onNavigateToEditor,
  showToast 
}) {
  const [activeSubTab, setActiveSubTab] = useState('doc-citations'); // 'doc-citations' | 'lookup' | 'bsa'
  
  // Document Citations state
  const matterDocs = activeMatter 
    ? documents.filter(d => !d.matterId || d.matterId === activeMatter.id)
    : documents;

  const [selectedDocId, setSelectedDocId] = useState(
    currentDocument?.id || (matterDocs.length > 0 ? matterDocs[0].id : '')
  );
  const [docCitationsResult, setDocCitationsResult] = useState(null);
  const [isAuditingDoc, setIsAuditingDoc] = useState(false);
  const [citationFilter, setCitationFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Single Citation lookup state
  const [citationInput, setCitationInput] = useState('(2020) 7 SCC 1');
  const [citationResult, setCitationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // BSA Section 63 Electronic Record Validator state
  const [bsaHasCert, setBsaHasCert] = useState(true);
  const [bsaHasHash, setBsaHasHash] = useState(true);
  const [bsaCustodian, setBsaCustodian] = useState('Chief Technology Officer / System Admin');
  const [bsaSampleText, setBsaSampleText] = useState('System logs and cloud server audit trails authenticated with SHA-256 cryptographic hash value.');
  const [bsaAuditResult, setBsaAuditResult] = useState(null);

  // Sync selected doc with currentDocument prop
  useEffect(() => {
    if (currentDocument?.id && currentDocument.id !== selectedDocId) {
      setSelectedDocId(currentDocument.id);
    }
  }, [currentDocument?.id]);

  // Run document citation verification when selectedDocId changes
  useEffect(() => {
    if (selectedDocId) {
      handleAuditDocument(selectedDocId);
    } else {
      setDocCitationsResult(null);
    }
  }, [selectedDocId]);

  const activeDoc = documents.find(d => d.id === selectedDocId) || currentDocument;

  const handleAuditDocument = async (docIdToAudit = selectedDocId, simulateOffline = false) => {
    if (!docIdToAudit) {
      if (showToast) showToast('Please select a document to verify citations.', 'info');
      return;
    }

    setIsAuditingDoc(true);
    try {
      const doc = documents.find(d => d.id === docIdToAudit);
      const res = await api.verifyCitations(doc?.content || undefined, {
        documentId: docIdToAudit,
        metadata: {
          title: doc?.title,
          pages: doc?.pages
        },
        simulateOffline
      });

      if (res.success) {
        setDocCitationsResult(res.data);
        if (showToast) {
          if (simulateOffline) {
            showToast('Simulated source limitation: Status reported as Unable to Check.', 'warning');
          } else {
            showToast(`Extracted & verified ${res.data.totalFound} legal citations.`, 'success');
          }
        }
      }
    } catch (err) {
      console.error('Audit document error:', err);
      if (showToast) showToast(`Verification error: ${err.message}`, 'error');
    } finally {
      setIsAuditingDoc(false);
    }
  };

  const handleDocumentChange = (e) => {
    const newId = e.target.value;
    setSelectedDocId(newId);
    const chosenDoc = documents.find(d => d.id === newId);
    if (chosenDoc && onSelectDocument) {
      onSelectDocument(chosenDoc);
    }
  };

  const handleVerifySingle = async (e) => {
    if (e) e.preventDefault();
    if (!citationInput.trim()) return;

    setIsVerifying(true);
    try {
      const res = await api.verifySingleCitation(citationInput.trim());
      if (res.success) {
        setCitationResult(res.data);
        if (showToast) showToast('Citation verified against authoritative registries.', 'success');
      }
    } catch (err) {
      if (showToast) showToast(`Verification failed: ${err.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyBsa = async () => {
    try {
      const res = await api.verifyBsaElectronic({
        text: bsaSampleText,
        hasCertificate: bsaHasCert,
        hasHash: bsaHasHash,
        custodianDesignation: bsaCustodian
      });
      if (res.success) {
        setBsaAuditResult(res.data);
        if (showToast) showToast('BSA electronic compliance audited.', 'success');
      }
    } catch (e) {
      if (showToast) showToast(`BSA audit error: ${e.message}`, 'error');
    }
  };

  const handleJumpToEditor = (citation) => {
    if (onNavigateToEditor && activeDoc) {
      onNavigateToEditor(activeDoc, {
        title: citation.citationText,
        sourceLocation: citation.sourceLocation
      });
    } else if (showToast) {
      showToast(`Locating in editor: ${citation.sourceLocation}`, 'info');
    }
  };

  // Filter citations
  const allCitations = docCitationsResult?.allCitations || [];
  const filteredCitations = allCitations.filter(c => {
    if (citationFilter === 'VERIFIED' && c.status !== 'Verified') return false;
    if (citationFilter === 'PARTIAL' && c.status !== 'Partially Verified') return false;
    if (citationFilter === 'UNVERIFIED' && c.status !== 'Unverified') return false;
    if (citationFilter === 'UNABLE' && c.status !== 'Unable to Check') return false;
    if (citationFilter === 'STATUTE' && c.citationType !== 'Statutory Provision') return false;
    if (citationFilter === 'CASE' && c.citationType !== 'Case Precedent') return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchText = c.citationText.toLowerCase().includes(q);
      const matchSource = (c.source || '').toLowerCase().includes(q);
      const matchWhat = (c.whatWasChecked || '').toLowerCase().includes(q);
      return matchText || matchSource || matchWhat;
    }
    return true;
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldCheck size={12} />
              AUTHORITATIVE CITATION VERIFIER
            </span>
            <span className="badge badge-info">India Code • Digital SCR • SCI Gateway</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: '#FFF', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            Authoritative Citation Verification & Precedent Integrity
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '850px' }}>
            Extracts and validates statutory provisions against India Code and case precedents against Supreme Court of India records. Authoritative source links are surfaced only when confirmed.
          </p>
        </div>

        {/* Tab Navigation Switches */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-surface)', padding: '0.3rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveSubTab('doc-citations')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: activeSubTab === 'doc-citations' ? 600 : 400,
              backgroundColor: activeSubTab === 'doc-citations' ? 'var(--gold-primary)' : 'transparent',
              color: activeSubTab === 'doc-citations' ? '#0A0E17' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <FileText size={14} />
            <span>Document Citations ({allCitations.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lookup')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: activeSubTab === 'lookup' ? 600 : 400,
              backgroundColor: activeSubTab === 'lookup' ? 'var(--gold-primary)' : 'transparent',
              color: activeSubTab === 'lookup' ? '#0A0E17' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Search size={14} />
            <span>Single Citation Lookup</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bsa')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: activeSubTab === 'bsa' ? 600 : 400,
              backgroundColor: activeSubTab === 'bsa' ? 'var(--gold-primary)' : 'transparent',
              color: activeSubTab === 'bsa' ? '#0A0E17' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <FileCheck size={14} />
            <span>BSA Sec 63 Validator</span>
          </button>
        </div>
      </div>

      {/* 1. DOCUMENT CITATIONS AUDIT VIEW */}
      {activeSubTab === 'doc-citations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Document Selector & Action Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            backgroundColor: 'var(--bg-surface)',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={16} color="var(--gold-primary)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Audit Target:</span>
              <select
                value={selectedDocId}
                onChange={handleDocumentChange}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  outline: 'none',
                  minWidth: '240px',
                  cursor: 'pointer'
                }}
              >
                {matterDocs.length === 0 ? (
                  <option value="">No documents available</option>
                ) : (
                  matterDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({doc.documentType || 'Legal Document'})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handleAuditDocument(selectedDocId, false)}
                disabled={isAuditingDoc || !selectedDocId}
                className="btn btn-gold"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} className={isAuditingDoc ? 'animate-spin' : ''} />
                <span>{isAuditingDoc ? 'Verifying...' : 'Re-verify Document'}</span>
              </button>

              <button
                onClick={() => handleAuditDocument(selectedDocId, true)}
                disabled={isAuditingDoc || !selectedDocId}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Test source limitation / unavailable network state"
              >
                <WifiOff size={13} color="#EF4444" />
                <span>Simulate Offline Source</span>
              </button>
            </div>
          </div>

          {/* Verification Status Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem'
          }}>
            <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid var(--gold-primary)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--gold-light)', textTransform: 'uppercase' }}>Citation Integrity</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold-primary)', marginTop: '0.2rem' }}>
                {docCitationsResult?.totalFound > 0 && docCitationsResult?.integrityScore !== null ? `${docCitationsResult.integrityScore}%` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {docCitationsResult?.totalFound > 0 ? `${docCitationsResult.totalFound} citations detected` : 'No citations in document'}
              </div>
            </div>

            <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid #10B981' }}>
              <div style={{ fontSize: '0.7rem', color: '#6EE7B7', textTransform: 'uppercase' }}>Fully Verified</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10B981', marginTop: '0.2rem' }}>
                {docCitationsResult?.verifiedCount ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Confirmed on official portal</div>
            </div>

            <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid #F59E0B' }}>
              <div style={{ fontSize: '0.7rem', color: '#FCD34D', textTransform: 'uppercase' }}>Partially Verified</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F59E0B', marginTop: '0.2rem' }}>
                {docCitationsResult?.partiallyVerifiedCount ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Subsections pending check</div>
            </div>

            <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid #6B7280' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Unverified</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#9CA3AF', marginTop: '0.2rem' }}>
                {docCitationsResult?.unverifiedCount ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unindexed volume / syntax</div>
            </div>

            <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid #EF4444' }}>
              <div style={{ fontSize: '0.7rem', color: '#FCA5A5', textTransform: 'uppercase' }}>Unable to Check</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#EF4444', marginTop: '0.2rem' }}>
                {docCitationsResult?.unableToCheckCount ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Network / source timeout</div>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '0.2rem' }}>
                <Filter size={12} style={{ display: 'inline', marginRight: '3px' }} />
                Filter:
              </span>

              {[
                { id: 'ALL', label: `All (${allCitations.length})` },
                { id: 'VERIFIED', label: `Verified (${docCitationsResult?.verifiedCount ?? 0})` },
                { id: 'PARTIAL', label: `Partially Verified (${docCitationsResult?.partiallyVerifiedCount ?? 0})` },
                { id: 'UNVERIFIED', label: `Unverified (${docCitationsResult?.unverifiedCount ?? 0})` },
                { id: 'UNABLE', label: `Unable to Check (${docCitationsResult?.unableToCheckCount ?? 0})` },
                { id: 'STATUTE', label: `Statutes (${docCitationsResult?.statutoryCitations?.length ?? 0})` },
                { id: 'CASE', label: `Precedents (${docCitationsResult?.caseCitations?.length ?? 0})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setCitationFilter(f.id)}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    border: '1px solid',
                    cursor: 'pointer',
                    backgroundColor: citationFilter === f.id ? 'var(--gold-primary)' : 'var(--bg-surface)',
                    color: citationFilter === f.id ? '#0A0E17' : 'var(--text-secondary)',
                    borderColor: citationFilter === f.id ? 'var(--gold-primary)' : 'var(--border-subtle)',
                    fontWeight: citationFilter === f.id ? 600 : 400
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter by citation text or Act..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.65rem 0.35rem 2rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Citations List */}
          {isAuditingDoc ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}>
              <RefreshCw size={26} className="animate-spin" color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Cross-Referencing Citations on Official Indian Portals...
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Checking Central Enactments on India Code and Supreme Court Digital Reports (DigiSCR).
              </div>
            </div>
          ) : filteredCitations.length === 0 ? (
            <div style={{
              padding: '2.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)'
            }}>
              <BookOpen size={30} color="var(--gold-primary)" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {allCitations.length === 0 ? 'No Legal Citations Detected' : 'No citations match the selected filter'}
              </div>
              <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                {allCitations.length === 0 
                  ? 'Upload a document or pleading citing Indian statutes or reported judgments (e.g. SCC, AIR, BNS, BSA).'
                  : 'Try selecting "All" or clearing the search box to view all citations.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredCitations.map((citation, idx) => {
                const isVerified = citation.status === 'Verified';
                const isPartial = citation.status === 'Partially Verified';
                const isUnverified = citation.status === 'Unverified';
                const isUnable = citation.status === 'Unable to Check';

                const borderLeftColor = isVerified ? '#10B981' : isPartial ? '#F59E0B' : isUnable ? '#EF4444' : '#6B7280';

                return (
                  <div
                    key={citation.id || idx}
                    className="legal-card"
                    style={{
                      padding: '1rem',
                      borderLeft: `4px solid ${borderLeftColor}`,
                      backgroundColor: 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    {/* Top Row: Citation, Status Badge, Location */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                          <span className={`badge ${citation.statusBadge || 'badge-success'}`} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                            {citation.status}
                          </span>
                          <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                            {citation.citationType}
                          </span>
                          {citation.actCode && (
                            <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                              {citation.actCode}
                            </span>
                          )}
                        </div>

                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {citation.citationText}
                        </h4>
                      </div>

                      {/* Location Pill & Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-gold font-mono" style={{ fontSize: '0.7rem' }}>
                          📍 {citation.sourceLocation || 'Document Text'}
                        </span>

                        <button
                          onClick={() => handleJumpToEditor(citation)}
                          className="btn btn-outline-gold"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="View clause in Document Editor"
                        >
                          <span>In Editor</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Verbatim Document Excerpt */}
                    {citation.documentExcerpt && (
                      <div style={{
                        padding: '0.55rem 0.8rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                        borderLeft: '2px solid var(--border-gold)',
                        borderRadius: '0 4px 4px 0',
                        fontSize: '0.76rem',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        lineHeight: 1.4
                      }}>
                        "{citation.documentExcerpt}"
                      </div>
                    )}

                    {/* What Was Checked & What Remains Uncertain */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1.2fr',
                      gap: '0.75rem',
                      fontSize: '0.76rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div>
                        <strong style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                          <CheckCircle2 size={13} />
                          What was authenticated:
                        </strong>
                        <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {citation.whatWasChecked || 'Confirmed against central statutory registers.'}
                        </span>
                      </div>

                      <div>
                        <strong style={{ color: isUnable ? '#EF4444' : '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                          <AlertTriangle size={13} />
                          Audit Limitations / Pending verification:
                        </strong>
                        <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {citation.whatRemainsUncertain || 'None — statutory section is active and verified.'}
                        </span>
                      </div>
                    </div>

                    {/* Official Source Excerpt */}
                    {citation.sourceExcerpt && (
                      <div style={{
                        backgroundColor: 'rgba(212, 175, 55, 0.07)',
                        border: '1px solid rgba(212, 175, 55, 0.25)',
                        borderRadius: '6px',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.75rem'
                      }}>
                        <strong style={{ color: 'var(--gold-light)' }}>
                          {citation.citationType === 'Case Precedent' ? 'Binding Ratio Decidendi:' : 'Official Statutory Excerpt:'}
                        </strong>
                        <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                          {citation.sourceExcerpt}
                        </p>
                      </div>
                    )}

                    {/* Bottom Metadata & Official Link */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.72rem',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.5rem',
                      color: 'var(--text-muted)'
                    }}>
                      <div>
                        Source: <strong style={{ color: 'var(--text-secondary)' }}>{citation.source}</strong>
                        {citation.decisionDate && (
                          <span> • Decided: {citation.decisionDate}</span>
                        )}
                        {citation.bench && (
                          <span> • Bench: {citation.bench}</span>
                        )}
                      </div>

                      {/* Working Link only when confirmed! */}
                      {citation.sourceUrl ? (
                        <a
                          href={citation.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--gold-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            textDecoration: 'none',
                            fontWeight: 600
                          }}
                        >
                          <span>Authoritative Record</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No verified official URL
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. SINGLE CITATION MANUAL SEARCH VIEW */}
      {activeSubTab === 'lookup' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '1.25rem' }}>
          <div className="legal-card" style={{ padding: '1.2rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} color="var(--gold-primary)" />
              Supreme Court & India Code Query Console
            </h3>

            <form onSubmit={handleVerifySingle} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Enter Case Citation, Case Title, or Statutory Provision:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    className="legal-input font-mono"
                    value={citationInput}
                    onChange={(e) => setCitationInput(e.target.value)}
                    placeholder="e.g. (2020) 12 SCC 767 or Section 12(5) Arbitration Act or Fateh Chand"
                    style={{ fontSize: '0.82rem' }}
                  />
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="btn btn-gold"
                    style={{ padding: '0.45rem 1rem' }}
                  >
                    <Search size={15} />
                    <span>Verify</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick Landmark Benchmarks:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {[
                  { label: 'Perkins Eastman (Arb s.12)', val: '(2020) 12 SCC 767' },
                  { label: 'Arjun Panditrao (BSA s.63)', val: '(2020) 7 SCC 1' },
                  { label: 'Satender Antil (Bail)', val: '(2022) 10 SCC 51' },
                  { label: 'Vidya Drolia (Arbitrability)', val: '(2021) 2 SCC 1' },
                  { label: 'Fateh Chand (Penalty s.74)', val: 'Fateh Chand v. Balkishan Dass' },
                  { label: 'Section 73 Contract Act', val: 'Section 73 Indian Contract Act' },
                  { label: 'Section 27 Non-compete', val: 'Section 27 Indian Contract Act' }
                ].map(p => (
                  <button
                    key={p.val}
                    onClick={() => {
                      setCitationInput(p.val);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className="legal-card" style={{ padding: '1.2rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Scale size={15} color="var(--gold-primary)" />
              Authoritative Registry Response
            </h3>

            {isVerifying ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={22} className="animate-spin" color="var(--gold-primary)" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.85rem' }}>Querying Supreme Court & India Code Gateways...</div>
              </div>
            ) : citationResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ color: 'var(--gold-light)', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.2rem 0' }}>
                      {citationResult.caseTitle || citationResult.actTitle || citationResult.citationText}
                    </h4>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {citationResult.citationText} • {citationResult.court || citationResult.source}
                    </span>
                  </div>

                  <span className={`badge ${citationResult.statusBadge || 'badge-success'}`}>
                    {citationResult.status}
                  </span>
                </div>

                {citationResult.bench && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong>Bench:</strong> {citationResult.bench} {citationResult.decisionDate && `• Decided: ${citationResult.decisionDate}`}
                  </div>
                )}

                <div style={{
                  backgroundColor: 'rgba(212, 175, 55, 0.08)',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-gold)',
                  fontSize: '0.78rem'
                }}>
                  <strong style={{ color: 'var(--gold-light)' }}>Binding Ratio / Statutory Provision:</strong>
                  <p style={{ marginTop: '0.25rem', color: 'var(--text-primary)', lineHeight: 1.45, margin: '0.25rem 0 0 0' }}>
                    {citationResult.sourceExcerpt || citationResult.whatWasChecked}
                  </p>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  <strong>Checked:</strong> {citationResult.whatWasChecked}
                </div>

                {citationResult.whatRemainsUncertain && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    <strong>Limitation note:</strong> {citationResult.whatRemainsUncertain}
                  </div>
                )}

                {citationResult.sourceUrl && (
                  <div style={{ marginTop: '0.35rem' }}>
                    <a
                      href={citationResult.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-gold"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span>Open Official Record</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Enter an Indian citation on the left and click "Verify" to fetch bench details and ratio.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. BSA 2023 ELECTRONIC VALIDATOR VIEW */}
      {activeSubTab === 'bsa' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: '1.25rem' }}>
          <div className="legal-card" style={{ padding: '1.2rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileCheck size={16} color="var(--gold-primary)" />
              BSA 2023 Section 63 Electronic Evidence Audit
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.78rem' }}>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Under <strong>Arjun Panditrao Khotkar (2020) 7 SCC 1</strong>, digital records without a statutory certificate signed by the system custodian are inadmissible.
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Electronic Document Text / Reference:</label>
                <textarea
                  className="legal-input font-mono"
                  rows={3}
                  value={bsaSampleText}
                  onChange={(e) => setBsaSampleText(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Designation of Custodian / Signatory:</label>
                <input
                  type="text"
                  className="legal-input"
                  value={bsaCustodian}
                  onChange={(e) => setBsaCustodian(e.target.value)}
                  style={{ width: '100%', fontSize: '0.75rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={bsaHasCert}
                    onChange={(e) => setBsaHasCert(e.target.checked)}
                  />
                  <span>Section 63 Statutory Certificate Accompanying Evidence</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={bsaHasHash}
                    onChange={(e) => setBsaHasHash(e.target.checked)}
                  />
                  <span>Cryptographic Hash (SHA-256) / Server Audit Trail Included</span>
                </label>
              </div>

              <button
                onClick={handleVerifyBsa}
                className="btn btn-gold"
                style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
              >
                Run BSA 63 Compliance Audit
              </button>
            </div>
          </div>

          <div className="legal-card" style={{ padding: '1.2rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} color="var(--gold-primary)" />
              Admissibility Determination
            </h3>

            {bsaAuditResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{
                  padding: '0.85rem',
                  backgroundColor: bsaAuditResult.score >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '6px',
                  border: `1px solid ${bsaAuditResult.score >= 80 ? '#10B981' : '#EF4444'}`
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: bsaAuditResult.score >= 80 ? '#10B981' : '#EF4444' }}>
                    {bsaAuditResult.score}% • {bsaAuditResult.admissibilityStatus}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Governing Standard: {bsaAuditResult.relevantPrecedent}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {bsaAuditResult.checklist.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      <span>{item.item}</span>
                      <span className={`badge ${item.pass ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                        {item.pass ? `+${item.weight} pts` : 'Missing (0)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Configure parameters on the left and click "Run BSA 63 Compliance Audit".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advisory Disclaimer Notice at bottom */}
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
        ⚖️ <strong>Authoritative Verification Notice</strong>: Legal research and citation checking results are informational assistive resources based on India Code and Supreme Court records. Independent verification by an advocate is required prior to judicial filing.
      </div>
    </div>
  );
}
