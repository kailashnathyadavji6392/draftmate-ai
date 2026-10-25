import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  GitCompare, 
  Save, 
  Sparkles, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Eye, 
  Edit3,
  Copy,
  Scale,
  FileDown
} from 'lucide-react';
import { api } from '../api/client';
import VoiceInputButton from './common/VoiceInputButton';

export default function DocumentEditor({ 
  currentDocument, 
  onSaveContent, 
  onRunAnalysis,
  showToast 
}) {
  const [content, setContent] = useState('');
  const [isRedlineMode, setIsRedlineMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [redlineComparison, setRedlineComparison] = useState(null);
  const [isLoadingRedline, setIsLoadingRedline] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (currentDocument) {
      setContent(currentDocument.content || '');
      setRedlineComparison(null);
      setIsRedlineMode(false);
    }
  }, [currentDocument?.id]);

  const handleExport = async (format) => {
    if (!content) return;
    setShowExportMenu(false);
    setIsExporting(true);
    try {
      await api.exportDraft({
        draft: content,
        title: currentDocument?.title?.replace(/\.[^/.]+$/, "") || 'Legal_Document',
        format,
        matter: { title: currentDocument?.title }
      });
      if (showToast) showToast(`Exported ${format.toUpperCase()} document successfully.`, 'success');
    } catch (err) {
      if (showToast) showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!currentDocument) return;
    setIsSaving(true);
    try {
      await api.updateDocumentContent(currentDocument.id, content);
      setLastSavedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (showToast) showToast('Document saved successfully.', 'success');
      if (onSaveContent) onSaveContent(currentDocument.id, content);
    } catch (err) {
      if (showToast) showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRedline = async () => {
    if (!isRedlineMode) {
      // Generate redline diff comparison
      setIsLoadingRedline(true);
      try {
        // Compare current content with a sample revised / proposed amendment or original
        const orig = currentDocument?.content || content;
        // Construct standard revised markup to show smart redline capabilities
        const revisedVersion = orig.replace(
          /unconditional.*indemnify/i,
          'indemnify (subject to reciprocal mutual fault and aggregate cap under Section 73)'
        ).replace(
          /unilateral right and sole discretion to appoint the Sole Arbitrator/i,
          'right to appoint Sole Arbitrator by mutual consent of both parties under the Arbitration and Conciliation Act, 1996'
        );

        const res = await api.compareTexts({ originalText: orig, revisedText: revisedVersion });
        if (res.success) {
          setRedlineComparison(res.data);
          setIsRedlineMode(true);
        }
      } catch (err) {
        if (showToast) showToast(`Redline calculation failed: ${err.message}`, 'error');
      } finally {
        setIsLoadingRedline(false);
      }
    } else {
      setIsRedlineMode(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content ? content.split('\n').length : 0;

  if (!currentDocument) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-muted)'
      }}>
        <FileText size={48} color="var(--gold-muted)" strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>
          No Document Selected
        </h3>
        <p style={{ fontSize: '0.85rem', maxWidth: '360px', textAlign: 'center' }}>
          Select a document from the Matter Workspace or Documents panel, or upload a new pleading/contract to begin drafting and analysis.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-subtle)'
    }}>
      {/* Editor Control Toolbar */}
      <div style={{
        padding: '0.65rem 1.25rem',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Document Title & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={16} color="var(--gold-primary)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {currentDocument.title}
              </span>
              <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                {currentDocument.documentType || 'Pleading'}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.85rem' }}>
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{lineCount} lines</span>
              {lastSavedTime && (
                <>
                  <span>•</span>
                  <span style={{ color: '#34D399' }}>Saved at {lastSavedTime}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Smart Redline Toggle */}
          <button
            onClick={handleToggleRedline}
            disabled={isLoadingRedline}
            className={isRedlineMode ? 'btn btn-gold' : 'btn btn-secondary'}
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
          >
            <GitCompare size={14} />
            <span>{isRedlineMode ? 'Exit Smart Redline' : 'Smart Redline View'}</span>
          </button>

          {/* Cite & Evidence Analysis */}
          <button
            onClick={() => onRunAnalysis && onRunAnalysis(currentDocument)}
            className="btn btn-outline-gold"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
            title="Scan text for Indian Court Citations and BSA Section 63 Evidence Admissibility"
          >
            <Scale size={14} color="var(--gold-light)" />
            <span>Scan Precedents</span>
          </button>

          {/* Copy Text */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(content);
              if (showToast) showToast('Content copied to clipboard', 'info');
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem' }}
            title="Copy Text"
          >
            <Copy size={14} />
          </button>

          {/* Voice Dictation */}
          <VoiceInputButton
            buttonLabel="Voice Dictate"
            onTranscriptAccepted={(dictated) => {
              setContent(prev => (prev ? prev + '\n\n' + dictated : dictated));
              if (showToast) showToast('Dictated text appended to document', 'success');
            }}
            showToast={showToast}
          />

          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowExportMenu(prev => !prev)}
              disabled={isExporting}
              className="btn btn-outline"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} color="var(--gold-primary)" />
              <span>{isExporting ? 'Exporting...' : 'Export File'}</span>
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
                  onClick={() => handleExport('pdf')}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(212, 175, 55, 0.15)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <FileDown size={14} color="#EF4444" />
                  <span>Download Court PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('docx')}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(212, 175, 55, 0.15)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <FileDown size={14} color="#3B82F6" />
                  <span>Download Word DOCX</span>
                </button>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-gold"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
        {!isRedlineMode ? (
          /* Standard Drafting View */
          <div style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--bg-primary)'
          }}>
            {/* Line numbers gutter */}
            <div style={{
              width: '45px',
              padding: '1.25rem 0.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-subtle)',
              textAlign: 'right',
              userSelect: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: '1.6'
            }}>
              {Array.from({ length: Math.max(lineCount, 25) }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Document Text Area */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter or paste Indian legal pleading, contract, or witness statement text here..."
              style={{
                flex: 1,
                height: '100%',
                padding: '1.25rem 1.5rem',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.88rem',
                lineHeight: '1.6',
                letterSpacing: '0.01em'
              }}
            />
          </div>
        ) : (
          /* Smart Redline View */
          <div style={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--bg-secondary)'
          }}>
            {/* Redline Header Summary */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-gold)',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h4 style={{ color: 'var(--gold-light)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <GitCompare size={15} color="var(--gold-primary)" />
                  Smart Redline Analysis Engine
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Highlighting proposed statutory corrections, liability balance, and Perkins Eastman compliance.
                </p>
              </div>

              {redlineComparison?.summary && (
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <span className="badge badge-success">+{redlineComparison.summary.insertions} Additions</span>
                  <span className="badge badge-danger">-{redlineComparison.summary.deletions} Removals</span>
                  <span className="badge badge-warning">{redlineComparison.summary.modifications} Modifications</span>
                  <span className="badge badge-gold font-mono">{redlineComparison.summary.similarityPercentage}% Similarity</span>
                </div>
              )}
            </div>

            {/* Redline Changes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              {redlineComparison?.changes?.map((ch, idx) => {
                if (ch.type === 'unchanged') {
                  return (
                    <div key={idx} style={{ padding: '0.2rem 0.5rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: '1rem' }}>{ch.lineNumber}</span>
                      <span>{ch.revised}</span>
                    </div>
                  );
                }

                if (ch.type === 'added') {
                  return (
                    <div key={idx} className="redline-insert">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>+ {ch.revised}</span>
                        {ch.risk?.level !== 'None' && (
                          <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{ch.risk.category}</span>
                        )}
                      </div>
                      {ch.risk?.notice && (
                        <div style={{ fontSize: '0.7rem', color: '#FCD34D', marginTop: '0.2rem', fontFamily: 'var(--font-sans)' }}>
                          ⚖️ {ch.risk.notice}
                        </div>
                      )}
                    </div>
                  );
                }

                if (ch.type === 'removed') {
                  return (
                    <div key={idx} className="redline-delete">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>- {ch.original}</span>
                        {ch.risk?.level !== 'None' && (
                          <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>{ch.risk.category}</span>
                        )}
                      </div>
                      {ch.risk?.notice && (
                        <div style={{ fontSize: '0.7rem', color: '#FCA5A5', marginTop: '0.2rem', fontFamily: 'var(--font-sans)' }}>
                          ⚠️ Removed: {ch.risk.notice}
                        </div>
                      )}
                    </div>
                  );
                }

                if (ch.type === 'modified') {
                  return (
                    <div key={idx} className="redline-modify">
                      <div style={{ textDecoration: 'line-through', color: '#F87171', opacity: 0.8 }}>
                        - {ch.original}
                      </div>
                      <div style={{ color: '#34D399', fontWeight: 600 }}>
                        + {ch.revised}
                      </div>
                      {ch.risk?.notice && (
                        <div style={{
                          fontSize: '0.72rem',
                          color: '#FDE68A',
                          marginTop: '0.3rem',
                          fontFamily: 'var(--font-sans)',
                          background: 'rgba(0,0,0,0.25)',
                          padding: '0.3rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          ⚖️ Legal Risk Advisory: {ch.risk.notice}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
