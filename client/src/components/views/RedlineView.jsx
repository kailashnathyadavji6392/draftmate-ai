import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  RefreshCw,
  Copy,
  ExternalLink,
  Layers,
  Check,
  X,
  BookOpen,
  Scale,
  Sparkles,
  Download,
  AlertTriangle,
  HelpCircle,
  FolderOpen,
  Save,
  FileDown,
  Trash2
} from 'lucide-react';
import { api } from '../../api/client';

const PRESETS = [
  {
    id: 'arbitration',
    name: 'Arbitration: Unilateral vs Perkins Eastman Mutual',
    tag: 'Sec 11 Arbitration Act 1996',
    original: `CLAUSE 14: DISPUTE RESOLUTION
14.1 Any dispute arising out of or in connection with this Agreement shall be referred to arbitration.
14.2 The Service Provider shall have the unilateral and exclusive right to appoint the Sole Arbitrator.
14.3 The arbitration proceedings shall be conducted in English and the seat of arbitration shall be New Delhi.
14.4 The award rendered by such sole arbitrator shall be final, binding, and conclusive upon both parties.`,
    revised: `CLAUSE 14: DISPUTE RESOLUTION
14.1 Any dispute arising out of or in connection with this Agreement shall be referred to arbitration.
14.2 The dispute shall be referred to a Sole Arbitrator appointed by mutual agreement of both parties in strict compliance with Section 11 of the Arbitration and Conciliation Act, 1996 and Perkins Eastman Architects DPC v. HSCC (India) Ltd (2020) 15 SCC 760. In the event of failure to agree within thirty (30) days, either party may approach the Hon'ble High Court of Delhi under Section 11(6).
14.3 The arbitration proceedings shall be conducted in English and the seat and venue of arbitration shall be New Delhi.
14.4 The arbitral award shall be final, binding, and enforceable in accordance with the Arbitration and Conciliation Act, 1996.`
  },
  {
    id: 'indemnity',
    name: 'Indemnity: Uncapped vs Section 73 Capped Damages',
    tag: 'Sec 73 Indian Contract Act 1872',
    original: `CLAUSE 8: INDEMNIFICATION AND LIABILITY
8.1 Service Recipient agrees to unconditionally indemnify, defend, and hold harmless Service Provider and its affiliates against any and all claims, losses, uncapped consequential damages, punitive damages, and loss of business profits.
8.2 Service Provider's total aggregate liability under this Agreement shall in no event exceed INR 10,000.`,
    revised: `CLAUSE 8: INDEMNIFICATION AND LIABILITY
8.1 Each party agrees to indemnify, defend, and hold harmless the other party against direct losses and damages arising directly from material breach of this Agreement, fraud, or gross negligence, pursuant to Section 73 of the Indian Contract Act, 1872. Neither party shall be liable for indirect, remote, or speculative consequential damages.
8.2 Each party's total aggregate liability under this Agreement shall be limited to the total fees paid or payable by Service Recipient under this Agreement during the twelve (12) months preceding the claim.`
  },
  {
    id: 'noncompete',
    name: 'Non-Compete: Restraint of Trade vs Valid IP Confidentiality',
    tag: 'Sec 27 Indian Contract Act 1872 (Percept D\'Mark)',
    original: `CLAUSE 11: RESTRICTIVE COVENANTS
11.1 The Consultant covenants that for a period of two (2) years following the termination of this Agreement, the Consultant shall not directly or indirectly engage in, advise, or be employed by any business competing with the Company anywhere in the territory of India.
11.2 In case of breach, Consultant shall pay liquidated damages of INR 25,00,000.`,
    revised: `CLAUSE 11: RESTRICTIVE COVENANTS AND CONFIDENTIALITY
11.1 During the term of this Agreement, the Consultant shall devote professional efforts to the Company and shall not undertake conflicting commercial engagements. Post-termination, the Consultant covenants to strictly preserve and protect the proprietary trade secrets, confidential technical data, and client lists of the Company in perpetuity.
11.2 The parties acknowledge that this clause protects proprietary goodwill and confidential information without imposing a post-employment restraint of lawful profession, consistent with Section 27 of the Indian Contract Act, 1872 and Percept D'Mark (India) Pvt Ltd v. Zaheer Khan (2006) 4 SCC 227.`
  }
];

export default function RedlineView({
  documents = [],
  currentDocument,
  activeMatter,
  onLoadIntoEditor,
  showToast
}) {
  const [originalText, setOriginalText] = useState(
    currentDocument?.content || PRESETS[0].original
  );
  const [revisedText, setRevisedText] = useState(PRESETS[0].revised);

  const [docAId, setDocAId] = useState(currentDocument?.id || 'custom');
  const [docBId, setDocBId] = useState('custom');

  const [comparison, setComparison] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [viewMode, setViewMode] = useState('inline'); // 'inline' | 'cards' | 'sidebyside' | 'resolved'

  // Decisions state: { [changeId]: 'accept' | 'reject' }
  const [decisions, setDecisions] = useState({});
  const [resolvedResult, setResolvedResult] = useState(null);
  const [isApplyingDecisions, setIsApplyingDecisions] = useState(false);

  // Persistent History & Export State
  const [historyList, setHistoryList] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await api.getRedlineHistory(activeMatter?.id);
      if (res.success && res.data) {
        setHistoryList(res.data);
      }
    } catch (e) {
      console.warn('Could not load redline history:', e.message);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeMatter]);

  const handleSaveSession = async () => {
    if (!comparison) return;
    setIsSavingSession(true);
    try {
      const title = `Redline Diff - ${new Date().toLocaleDateString('en-IN')}`;
      const res = await api.saveRedlineSession({
        title,
        matterId: activeMatter?.id || 'mat-ind-001',
        originalText,
        revisedText,
        summary: comparison.summary,
        changes: comparison.changes,
        decisions,
        finalDocumentText: resolvedResult?.finalDocumentText || '',
        auditTrail: resolvedResult?.auditTrail || []
      });
      if (res.success) {
        fetchHistory();
        if (showToast) showToast('Redline comparison saved to matter history.', 'success');
      }
    } catch (err) {
      if (showToast) showToast(`Failed to save redline session: ${err.message}`, 'error');
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleLoadHistorySession = (item) => {
    setOriginalText(item.originalText || '');
    setRevisedText(item.revisedText || '');
    setComparison({ summary: item.summary, changes: item.changes });
    setDecisions(item.decisions || {});
    if (item.finalDocumentText) {
      setResolvedResult({
        finalDocumentText: item.finalDocumentText,
        auditTrail: item.auditTrail || [],
        acceptedCount: Object.values(item.decisions || {}).filter(d => d === 'accept').length,
        rejectedCount: Object.values(item.decisions || {}).filter(d => d === 'reject').length
      });
      setViewMode('resolved');
    } else {
      setViewMode('inline');
    }
    setShowHistoryModal(false);
    if (showToast) showToast(`Restored redline session: ${item.title}`, 'info');
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      const res = await api.deleteRedlineSession(sessionToDelete.id);
      if (res.success) {
        fetchHistory();
        if (showToast) showToast('Comparison session deleted from history.', 'info');
      }
    } catch (err) {
      if (showToast) showToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setSessionToDelete(null);
    }
  };

  const handleExportRedline = async (format) => {
    if (!comparison) return;
    setShowExportMenu(false);
    setIsExporting(true);
    try {
      await api.exportRedline({
        redlineResult: {
          ...comparison,
          finalDocumentText: resolvedResult?.finalDocumentText,
          acceptedCount,
          rejectedCount
        },
        title: `Redline_Comparison_${activeMatter?.title || 'Report'}`.replace(/\s+/g, '_'),
        format,
        matter: activeMatter || {}
      });
      if (showToast) showToast(`Exported ${format.toUpperCase()} redline report.`, 'success');
    } catch (err) {
      if (showToast) showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Sync with currentDocument if provided initially
  useEffect(() => {
    if (currentDocument && currentDocument.content && docAId === currentDocument.id) {
      setOriginalText(currentDocument.content);
    }
  }, [currentDocument]);

  const handleSelectDocA = (e) => {
    const selectedId = e.target.value;
    setDocAId(selectedId);
    if (selectedId === 'custom') return;
    const doc = documents.find(d => d.id === selectedId);
    if (doc) {
      setOriginalText(doc.content || '');
      if (showToast) showToast(`Loaded "${doc.title}" as Version A`, 'info');
    }
  };

  const handleSelectDocB = (e) => {
    const selectedId = e.target.value;
    setDocBId(selectedId);
    if (selectedId === 'custom') return;
    const doc = documents.find(d => d.id === selectedId);
    if (doc) {
      setRevisedText(doc.content || '');
      if (showToast) showToast(`Loaded "${doc.title}" as Version B`, 'info');
    }
  };

  const handleApplyPreset = (preset) => {
    setOriginalText(preset.original);
    setRevisedText(preset.revised);
    setDocAId('custom');
    setDocBId('custom');
    setComparison(null);
    setResolvedResult(null);
    setDecisions({});
    if (showToast) showToast(`Applied template: ${preset.name}`, 'info');
  };

  const handleCompare = async () => {
    if (!originalText.trim() && !revisedText.trim()) {
      if (showToast) showToast('Please enter text for Version A and Version B to compare.', 'warning');
      return;
    }

    setIsComparing(true);
    setResolvedResult(null);
    try {
      const res = await api.compareTexts({ originalText, revisedText });
      if (res.success && res.data) {
        setComparison(res.data);

        // Initialize default decisions: accept all by default
        const initDecisions = {};
        res.data.changes?.forEach(ch => {
          if (ch.type !== 'unchanged') {
            initDecisions[ch.id] = 'accept';
          }
        });
        setDecisions(initDecisions);

        if (showToast) {
          const modCount = res.data.summary?.modifications || 0;
          const addCount = res.data.summary?.insertions || 0;
          const delCount = res.data.summary?.deletions || 0;
          showToast(`LCS Diff computed: ${addCount} additions, ${delCount} deletions, ${modCount} modifications.`, 'success');
        }
      }
    } catch (err) {
      if (showToast) showToast(`Comparison failed: ${err.message}`, 'error');
    } finally {
      setIsComparing(false);
    }
  };

  const handleToggleDecision = (changeId, decision) => {
    setDecisions(prev => ({
      ...prev,
      [changeId]: decision
    }));
  };

  const handleBatchDecisions = (action) => {
    if (!comparison || !comparison.changes) return;
    const updated = {};
    comparison.changes.forEach(ch => {
      if (ch.type !== 'unchanged') {
        updated[ch.id] = action;
      }
    });
    setDecisions(updated);
    if (showToast) showToast(`Marked all changes as ${action === 'accept' ? 'Accepted' : 'Rejected'}.`, 'info');
  };

  const handleApplyDecisions = async () => {
    if (!comparison) return;
    setIsApplyingDecisions(true);
    try {
      const res = await api.applyRedlineDecisions({
        originalText,
        revisedText,
        decisions
      });
      if (res.success && res.data) {
        setResolvedResult(res.data);
        setViewMode('resolved');
        if (showToast) {
          showToast(`Applied ${res.data.acceptedCount} accepted and ${res.data.rejectedCount} rejected changes to working draft.`, 'success');
        }
      }
    } catch (err) {
      if (showToast) showToast(`Failed to apply decisions: ${err.message}`, 'error');
    } finally {
      setIsApplyingDecisions(false);
    }
  };

  const handleLoadFinalIntoEditor = () => {
    if (!resolvedResult || !resolvedResult.finalDocumentText) {
      if (showToast) showToast('Please apply decisions to generate the resolved draft first.', 'warning');
      return;
    }
    if (onLoadIntoEditor) {
      onLoadIntoEditor(resolvedResult.finalDocumentText, 'Resolved_Redline_Agreement.txt');
    }
  };

  const handleCopyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (showToast) showToast(`${label} copied to clipboard.`, 'success');
  };

  const actionableChanges = comparison?.changes?.filter(ch => ch.type !== 'unchanged') || [];
  const acceptedCount = Object.values(decisions).filter(d => d === 'accept').length;
  const rejectedCount = Object.values(decisions).filter(d => d === 'reject').length;

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      overflowY: 'auto',
      height: '100%',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Header & Preset Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-gold">SMART REDLINE ENGINE</span>
            <span className="badge badge-info">Indian Commercial & Pleading Diff</span>
            <span className="badge font-mono" style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold-light)', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
              LCS Matrix + Word Diff
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: '#FFF', fontWeight: 700 }}>
            Document Redline & Contractual Risk Diff
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '780px' }}>
            Compare original and counter-draft contracts or amended pleadings. Inspect line-by-line & word-level redlines, evaluate statutory compliance under Indian law, and interactively accept or reject individual changes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FolderOpen size={14} color="var(--gold-primary)" />
            <span>Comparison History ({historyList.length})</span>
          </button>

          <button
            onClick={handleCompare}
            disabled={isComparing}
            className="btn btn-gold"
            style={{ fontWeight: 600, padding: '0.55rem 1.1rem' }}
          >
            {isComparing ? <RefreshCw size={15} className="spin" /> : <GitCompare size={15} />}
            <span>{isComparing ? 'Computing Diff...' : 'Run Redline Compare'}</span>
          </button>
        </div>
      </div>

      {/* Preset Quick-Load Buttons */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '0.6rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Scale size={13} color="var(--gold-primary)" />
          Indian Precedent Demos:
        </span>
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => handleApplyPreset(p)}
            className="btn btn-outline"
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <span>{p.name}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--gold-light)', opacity: 0.8 }}>({p.tag})</span>
          </button>
        ))}
      </div>

      {/* Input Panes: Document Pickers & Text Editors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Version A: Original Baseline */}
        <div className="legal-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F87171' }} />
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FCA5A5' }}>
                Version A: Original / Baseline
              </h4>
            </div>
            <select
              value={docAId}
              onChange={handleSelectDocA}
              className="legal-input font-mono"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', width: '220px' }}
            >
              <option value="custom">-- Custom Text / Paste --</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.wordCount || d.content?.split(/\s+/).length || 0} words)
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="legal-textarea font-mono"
            rows={7}
            value={originalText}
            onChange={(e) => {
              setOriginalText(e.target.value);
              setDocAId('custom');
            }}
            placeholder="Paste original contract clause or baseline pleading here..."
            style={{ fontSize: '0.78rem', lineHeight: '1.45', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Lines: {originalText ? originalText.split('\n').length : 0}</span>
            <span>Words: {originalText ? originalText.trim().split(/\s+/).filter(Boolean).length : 0}</span>
          </div>
        </div>

        {/* Version B: Proposed Revision / Counter-Draft */}
        <div className="legal-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34D399' }} />
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6EE7B7' }}>
                Version B: Proposed Counter-Draft / Revision
              </h4>
            </div>
            <select
              value={docBId}
              onChange={handleSelectDocB}
              className="legal-input font-mono"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', width: '220px' }}
            >
              <option value="custom">-- Custom Text / Paste --</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.wordCount || d.content?.split(/\s+/).length || 0} words)
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="legal-textarea font-mono"
            rows={7}
            value={revisedText}
            onChange={(e) => {
              setRevisedText(e.target.value);
              setDocBId('custom');
            }}
            placeholder="Paste proposed revision, counter-draft clause, or amended pleading here..."
            style={{ fontSize: '0.78rem', lineHeight: '1.45', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Lines: {revisedText ? revisedText.split('\n').length : 0}</span>
            <span>Words: {revisedText ? revisedText.trim().split(/\s+/).filter(Boolean).length : 0}</span>
          </div>
        </div>
      </div>

      {/* Comparison Results Card */}
      {comparison && (
        <div className="legal-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary & View Tabs Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <GitCompare size={18} color="var(--gold-primary)" />
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>Diff Analysis</span>
              </div>
              <span className="badge badge-gold font-mono" style={{ fontWeight: 700 }}>
                {comparison.summary?.similarityPercentage}% Similarity
              </span>
              <span className="badge badge-success">+{comparison.summary?.insertions || 0} Additions</span>
              <span className="badge badge-danger">-{comparison.summary?.deletions || 0} Removals</span>
              <span className="badge badge-warning">~{comparison.summary?.modifications || 0} Modifications</span>
              {comparison.summary?.overallAssessment && (
                <span className="badge" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold-light)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                  {comparison.summary.overallAssessment}
                </span>
              )}
            </div>

            {/* View Mode Switcher */}
            <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '6px' }}>
              <button
                onClick={() => setViewMode('inline')}
                className={`btn ${viewMode === 'inline' ? 'btn-gold' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              >
                Interactive Inline Diff
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`btn ${viewMode === 'cards' ? 'btn-gold' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              >
                Risk Diff Cards ({actionableChanges.length})
              </button>
              <button
                onClick={() => setViewMode('sidebyside')}
                className={`btn ${viewMode === 'sidebyside' ? 'btn-gold' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setViewMode('resolved')}
                className={`btn ${viewMode === 'resolved' ? 'btn-gold' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              >
                Resolved Preview {resolvedResult ? '✓' : ''}
              </button>
            </div>
          </div>

          {/* Interactive Decision Control Bar */}
          {actionableChanges.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid var(--border-gold)',
              borderRadius: '6px',
              padding: '0.55rem 0.85rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Decision Status:
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  {acceptedCount} Accepted
                </span>
                <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                  {rejectedCount} Rejected
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  of {actionableChanges.length} actionable changes
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Save Redline Session */}
                <button
                  type="button"
                  onClick={handleSaveSession}
                  disabled={isSavingSession}
                  className="btn btn-outline"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Save comparison session to matter history"
                >
                  <Save size={12} color="var(--gold-primary)" />
                  <span>{isSavingSession ? 'Saving...' : 'Save Session'}</span>
                </button>

                {/* Export Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu(prev => !prev)}
                    disabled={isExporting}
                    className="btn btn-outline"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Download size={12} color="var(--gold-primary)" />
                    <span>{isExporting ? 'Exporting...' : 'Export Diff'}</span>
                  </button>

                  {showExportMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-gold)',
                      borderRadius: '6px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                      zIndex: 100,
                      width: '180px',
                      overflow: 'hidden'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleExportRedline('pdf')}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: '#FFF',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(212, 175, 55, 0.15)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <FileDown size={13} color="#EF4444" />
                        <span>Export PDF Report</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportRedline('docx')}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: '#FFF',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(212, 175, 55, 0.15)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <FileDown size={13} color="#3B82F6" />
                        <span>Export Word DOCX</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleBatchDecisions('accept')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', borderColor: '#059669', color: '#34D399' }}
                >
                  <Check size={12} /> Accept All
                </button>
                <button
                  onClick={() => handleBatchDecisions('reject')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', borderColor: '#DC2626', color: '#F87171' }}
                >
                  <X size={12} /> Reject All
                </button>
                <button
                  onClick={handleApplyDecisions}
                  disabled={isApplyingDecisions}
                  className="btn btn-gold"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', fontWeight: 600 }}
                >
                  {isApplyingDecisions ? <RefreshCw size={13} className="spin" /> : <Sparkles size={13} />}
                  <span>Apply Decisions</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW MODE 1: Interactive Inline Diff */}
          {viewMode === 'inline' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem'
            }}>
              {comparison.changes?.map((ch, idx) => {
                if (ch.type === 'unchanged') {
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.3rem 0.6rem',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'transparent',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', minWidth: '28px', textAlign: 'right', userSelect: 'none' }}>
                        {ch.lineNumRev || ch.lineNumOrig || '·'}
                      </span>
                      <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{ch.revised || ch.original}</span>
                    </div>
                  );
                }

                const decision = decisions[ch.id] || 'accept';
                const isAccepted = decision === 'accept';

                return (
                  <div
                    key={idx}
                    style={{
                      border: `1px solid ${isAccepted ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      borderRadius: '6px',
                      backgroundColor: isAccepted ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                      padding: '0.6rem 0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem'
                    }}
                  >
                    {/* Change Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-sans)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className={`badge ${ch.type === 'added' ? 'badge-success' : ch.type === 'deleted' ? 'badge-danger' : 'badge-warning'}`}>
                          {ch.type.toUpperCase()}
                        </span>
                        {ch.category && (
                          <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                            {ch.category}
                          </span>
                        )}
                        {ch.riskLevel && ch.riskLevel !== 'None' && (
                          <span className={`badge ${ch.riskLevel === 'Critical' || ch.riskLevel === 'High' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                            {ch.riskLevel} Risk
                          </span>
                        )}
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          ID: {ch.id}
                        </span>
                      </div>

                      {/* Decision Toggle Buttons */}
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleToggleDecision(ch.id, 'accept')}
                          className={`btn ${isAccepted ? 'btn-success' : 'btn-outline'}`}
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.2rem 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: isAccepted ? '#059669' : 'transparent',
                            color: isAccepted ? '#FFF' : '#34D399',
                            borderColor: '#059669'
                          }}
                        >
                          <Check size={11} /> Accept
                        </button>
                        <button
                          onClick={() => handleToggleDecision(ch.id, 'reject')}
                          className={`btn ${!isAccepted ? 'btn-danger' : 'btn-outline'}`}
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.2rem 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: !isAccepted ? '#DC2626' : 'transparent',
                            color: !isAccepted ? '#FFF' : '#F87171',
                            borderColor: '#DC2626'
                          }}
                        >
                          <X size={11} /> Reject
                        </button>
                      </div>
                    </div>

                    {/* Word-level diff display */}
                    <div style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      lineHeight: '1.5'
                    }}>
                      {ch.type === 'modified' && (
                        <div>
                          <div style={{ textDecoration: 'line-through', color: '#F87171', opacity: 0.85, marginBottom: '0.25rem' }}>
                            <span style={{ color: '#EF4444', fontWeight: 700, marginRight: '0.35rem' }}>-</span>
                            {ch.original}
                          </div>
                          <div style={{ color: '#34D399', fontWeight: 500 }}>
                            <span style={{ color: '#10B981', fontWeight: 700, marginRight: '0.35rem' }}>+</span>
                            {ch.revised}
                          </div>
                        </div>
                      )}

                      {ch.type === 'added' && (
                        <div style={{ color: '#34D399' }}>
                          <span style={{ color: '#10B981', fontWeight: 700, marginRight: '0.35rem' }}>+</span>
                          {ch.revised}
                        </div>
                      )}

                      {ch.type === 'deleted' && (
                        <div style={{ textDecoration: 'line-through', color: '#F87171' }}>
                          <span style={{ color: '#EF4444', fontWeight: 700, marginRight: '0.35rem' }}>-</span>
                          {ch.original}
                        </div>
                      )}
                    </div>

                    {/* Legal Risk Advisory Box */}
                    {(ch.explanation || ch.legalImplications) && (
                      <div style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-sans)',
                        backgroundColor: 'rgba(212, 175, 55, 0.05)',
                        borderLeft: '3px solid var(--gold-primary)',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '0 4px 4px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.2rem'
                      }}>
                        {ch.explanation && (
                          <div style={{ color: '#FCD34D' }}>
                            <strong>Plain English:</strong> {ch.explanation}
                          </div>
                        )}
                        {ch.legalImplications && (
                          <div style={{ color: 'var(--text-secondary)' }}>
                            <strong>Legal Implication (Indian Law):</strong> {ch.legalImplications}
                          </div>
                        )}
                        {ch.suggestedAction && (
                          <div style={{ color: '#93C5FD', fontSize: '0.7rem' }}>
                            💡 <strong>Recommended Action:</strong> {ch.suggestedAction}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: Risk Diff Cards */}
          {viewMode === 'cards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {actionableChanges.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No substantive differences detected between Version A and Version B.
                </div>
              ) : (
                actionableChanges.map((ch, idx) => {
                  const decision = decisions[ch.id] || 'accept';
                  const isAccepted = decision === 'accept';

                  return (
                    <div
                      key={idx}
                      className="legal-card"
                      style={{
                        padding: '0.9rem 1.1rem',
                        borderLeft: `4px solid ${
                          ch.riskLevel === 'Critical' ? '#EF4444' :
                          ch.riskLevel === 'High' ? '#F97316' :
                          ch.riskLevel === 'Medium' ? '#FBBF24' : '#10B981'
                        }`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            <span className={`badge ${ch.type === 'added' ? 'badge-success' : ch.type === 'deleted' ? 'badge-danger' : 'badge-warning'}`}>
                              {ch.type.toUpperCase()}
                            </span>
                            <span className="badge badge-gold">{ch.category || 'Contractual Modification'}</span>
                            <span className={`badge ${ch.riskLevel === 'Critical' || ch.riskLevel === 'High' ? 'badge-danger' : 'badge-info'}`}>
                              {ch.riskLevel || 'Low'} Risk
                            </span>
                          </div>
                          <h4 style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 600 }}>
                            {ch.explanation || `Modification to Clause ${ch.lineNumRev || ch.lineNumOrig || idx + 1}`}
                          </h4>
                        </div>

                        {/* Interactive Decision Button */}
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleToggleDecision(ch.id, 'accept')}
                            className={`btn ${isAccepted ? 'btn-success' : 'btn-outline'}`}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.25rem 0.65rem',
                              backgroundColor: isAccepted ? '#059669' : 'transparent',
                              color: isAccepted ? '#FFF' : '#34D399',
                              borderColor: '#059669'
                            }}
                          >
                            <Check size={12} /> {isAccepted ? 'Accepted' : 'Accept Change'}
                          </button>
                          <button
                            onClick={() => handleToggleDecision(ch.id, 'reject')}
                            className={`btn ${!isAccepted ? 'btn-danger' : 'btn-outline'}`}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.25rem 0.65rem',
                              backgroundColor: !isAccepted ? '#DC2626' : 'transparent',
                              color: !isAccepted ? '#FFF' : '#F87171',
                              borderColor: '#DC2626'
                            }}
                          >
                            <X size={12} /> {!isAccepted ? 'Rejected' : 'Reject Change'}
                          </button>
                        </div>
                      </div>

                      {/* Text Excerpt Comparison */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                        <div style={{
                          backgroundColor: 'rgba(220, 38, 38, 0.08)',
                          border: '1px solid rgba(220, 38, 38, 0.25)',
                          borderRadius: '4px',
                          padding: '0.5rem 0.7rem'
                        }}>
                          <div style={{ fontSize: '0.68rem', color: '#FCA5A5', fontWeight: 600, marginBottom: '0.2rem' }}>
                            ORIGINAL (Version A):
                          </div>
                          <div style={{ color: ch.original ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: ch.original ? 'normal' : 'italic' }}>
                            {ch.original || '[Not present in original version]'}
                          </div>
                        </div>

                        <div style={{
                          backgroundColor: 'rgba(5, 150, 105, 0.08)',
                          border: '1px solid rgba(5, 150, 105, 0.25)',
                          borderRadius: '4px',
                          padding: '0.5rem 0.7rem'
                        }}>
                          <div style={{ fontSize: '0.68rem', color: '#6EE7B7', fontWeight: 600, marginBottom: '0.2rem' }}>
                            REVISED (Version B):
                          </div>
                          <div style={{ color: ch.revised ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: ch.revised ? 'normal' : 'italic' }}>
                            {ch.revised || '[Deleted in counter-draft]'}
                          </div>
                        </div>
                      </div>

                      {/* Indian Law Legal Implication Details */}
                      {ch.legalImplications && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'var(--bg-secondary)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '4px',
                          borderLeft: '3px solid var(--gold-light)'
                        }}>
                          <div style={{ color: 'var(--gold-light)', fontWeight: 600, marginBottom: '0.15rem' }}>
                            ⚖️ Indian Law Statutory & Precedent Risk:
                          </div>
                          <div>{ch.legalImplications}</div>
                          {ch.suggestedAction && (
                            <div style={{ marginTop: '0.35rem', color: '#93C5FD' }}>
                              💡 <strong>Drafting Strategy:</strong> {ch.suggestedAction}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW MODE 3: Side-by-Side View */}
          {viewMode === 'sidebyside' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              {/* Original Column */}
              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '0.75rem',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                <div style={{ fontWeight: 600, color: '#FCA5A5', marginBottom: '0.5rem', fontSize: '0.8rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>
                  Version A: Original Baseline
                </div>
                {comparison.changes?.map((ch, idx) => {
                  if (ch.type === 'unchanged') {
                    return (
                      <div key={idx} style={{ padding: '0.25rem 0', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>{ch.lineNumOrig}</span>
                        {ch.original}
                      </div>
                    );
                  }
                  if (ch.type === 'deleted' || ch.type === 'modified') {
                    return (
                      <div key={idx} style={{
                        padding: '0.25rem 0.4rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        borderLeft: '3px solid #EF4444',
                        color: '#FCA5A5',
                        textDecoration: 'line-through',
                        margin: '0.2rem 0',
                        borderRadius: '2px'
                      }}>
                        <span style={{ color: '#EF4444', marginRight: '0.5rem' }}>{ch.lineNumOrig}</span>
                        {ch.original}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} style={{ padding: '0.25rem 0', opacity: 0.3, color: 'var(--text-muted)' }}>
                      [Lines inserted in Revision]
                    </div>
                  );
                })}
              </div>

              {/* Revised Column */}
              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '0.75rem',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                <div style={{ fontWeight: 600, color: '#6EE7B7', marginBottom: '0.5rem', fontSize: '0.8rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>
                  Version B: Counter-Draft / Revision
                </div>
                {comparison.changes?.map((ch, idx) => {
                  if (ch.type === 'unchanged') {
                    return (
                      <div key={idx} style={{ padding: '0.25rem 0', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>{ch.lineNumRev}</span>
                        {ch.revised}
                      </div>
                    );
                  }
                  if (ch.type === 'added' || ch.type === 'modified') {
                    return (
                      <div key={idx} style={{
                        padding: '0.25rem 0.4rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderLeft: '3px solid #10B981',
                        color: '#6EE7B7',
                        fontWeight: 600,
                        margin: '0.2rem 0',
                        borderRadius: '2px'
                      }}>
                        <span style={{ color: '#10B981', marginRight: '0.5rem' }}>{ch.lineNumRev}</span>
                        {ch.revised}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} style={{ padding: '0.25rem 0', opacity: 0.3, color: 'var(--text-muted)' }}>
                      [Lines removed in Revision]
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 4: Resolved Final Document Preview */}
          {viewMode === 'resolved' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {!resolvedResult ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <Layers size={32} color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem auto' }} />
                  <h4 style={{ color: '#FFF', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Ready to Apply Decisions
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '480px', margin: '0 auto 1rem auto' }}>
                    You have decided {acceptedCount} accepted and {rejectedCount} rejected changes. Click below to merge decisions into a clean legal draft.
                  </p>
                  <button
                    onClick={handleApplyDecisions}
                    disabled={isApplyingDecisions}
                    className="btn btn-gold"
                    style={{ fontWeight: 600 }}
                  >
                    {isApplyingDecisions ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                    <span>Generate Resolved Document Now</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Resolved Action Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    border: '1px solid rgba(5, 150, 105, 0.3)',
                    padding: '0.65rem 1rem',
                    borderRadius: '6px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34D399', fontWeight: 600, fontSize: '0.85rem' }}>
                        <CheckCircle2 size={16} />
                        Decisions Successfully Incorporated
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Merged {resolvedResult.acceptedCount} accepted changes and restored {resolvedResult.rejectedCount} rejected changes.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleCopyToClipboard(resolvedResult.finalDocumentText, 'Resolved text')}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        <Copy size={13} /> Copy Draft
                      </button>
                      <button
                        onClick={handleLoadFinalIntoEditor}
                        className="btn btn-gold"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', fontWeight: 600 }}
                      >
                        <ExternalLink size={13} /> Load into Central Editor
                      </button>
                    </div>
                  </div>

                  {/* Resolved Textarea */}
                  <div className="legal-card" style={{ padding: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gold-light)' }}>
                        Resolved Contract Text:
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                        Ready for Execution / Filing
                      </span>
                    </div>
                    <textarea
                      readOnly
                      className="legal-textarea font-mono"
                      rows={12}
                      value={resolvedResult.finalDocumentText}
                      style={{ fontSize: '0.82rem', lineHeight: '1.5' }}
                    />
                  </div>

                  {/* Audit Trail of Decisions */}
                  {resolvedResult.auditTrail && resolvedResult.auditTrail.length > 0 && (
                    <div className="legal-card" style={{ padding: '0.85rem' }}>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.5rem' }}>
                        Audit Log of Decisions Made:
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto', fontSize: '0.72rem' }}>
                        {resolvedResult.auditTrail.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.3rem 0.5rem',
                              backgroundColor: item.action.startsWith('Accepted') ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                              borderRadius: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span className={`badge ${item.action.startsWith('Accepted') ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.62rem' }}>
                                {item.action}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{item.summary}</span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comparison History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 10, 18, 0.85)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-gold)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={18} color="var(--gold-primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>
                  Matter Redline Comparison History ({historyList.length})
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {historyList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FolderOpen size={36} color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>No Saved Redline Sessions Yet</div>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    Run a redline comparison and click "Save Session" to store it permanently in this matter history.
                  </p>
                </div>
              ) : (
                historyList.map(h => (
                  <div
                    key={h.id}
                    className="legal-card"
                    style={{
                      padding: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-surface)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                          {h.summary?.similarityPercentage ?? 100}% Similarity
                        </span>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                          {h.changes?.length || 0} Changes
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.2rem 0' }}>
                        {h.title}
                      </h4>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {h.summary?.overallAssessment || 'Contractual Evaluation'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleLoadHistorySession(h)}
                        className="btn btn-gold"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                      >
                        Restore Session
                      </button>
                      <button
                        onClick={() => setSessionToDelete(h)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', borderColor: '#EF4444', color: '#F87171' }}
                        title="Delete session from history"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Delete Confirmation Dialog */}
      {sessionToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 10, 18, 0.85)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid #EF4444',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F87171' }}>
              <AlertTriangle size={20} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Confirm Session Deletion
              </h4>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Are you sure you want to permanently delete redline comparison <strong>"{sessionToDelete.title}"</strong> from this matter? This cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSession}
                className="btn btn-danger"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.9rem', backgroundColor: '#DC2626', borderColor: '#DC2626', color: '#FFF', fontWeight: 600 }}
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
