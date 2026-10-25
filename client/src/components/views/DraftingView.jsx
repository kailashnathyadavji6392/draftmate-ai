import React, { useState, useEffect } from 'react';
import { 
  Feather, 
  Sparkles, 
  BookOpen, 
  FileCheck, 
  Copy, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Settings,
  RefreshCw,
  FileText,
  AlertTriangle,
  ExternalLink,
  Languages,
  Check,
  Edit3,
  Download,
  Save,
  FolderOpen,
  Trash2,
  X,
  FileDown
} from 'lucide-react';
import { api } from '../../api/client';
import VoiceInputButton from '../common/VoiceInputButton';

export default function DraftingView({ 
  documents = [],
  currentDocument,
  activeMatter, 
  onLoadIntoEditor, 
  onSettingsClick,
  showToast 
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('tpl-notice-138');
  const [docType, setDocType] = useState('Legal Notice');
  const [language, setLanguage] = useState('en'); // 'en' | 'hi'

  // Selected source documents
  const matterDocs = activeMatter 
    ? documents.filter(d => !d.matterId || d.matterId === activeMatter.id)
    : documents;

  const [selectedDocIds, setSelectedDocIds] = useState(
    currentDocument ? [currentDocument.id] : (matterDocs.length > 0 ? [matterDocs[0].id] : [])
  );

  // Form parameters
  const [clientName, setClientName] = useState(activeMatter?.client || '');
  const [oppositeParty, setOppositeParty] = useState(activeMatter?.oppositeParty || '');
  const [court, setCourt] = useState(activeMatter?.court || 'High Court of Delhi');
  const [jurisdiction, setJurisdiction] = useState(activeMatter?.jurisdiction || 'New Delhi');
  const [claimAmount, setClaimAmount] = useState(activeMatter?.claimAmount || '₹ 45,00,000');
  const [instructions, setInstructions] = useState('');

  // Generation & Editor state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [draftContent, setDraftContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null);

  // Targeted Paragraph Regeneration state
  const [selectedParaIdx, setSelectedParaIdx] = useState(0);
  const [paraRevisionInstructions, setParaRevisionInstructions] = useState('');
  const [isRevisingPara, setIsRevisingPara] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Saved Drafts Library
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState(null);

  const fetchSavedDrafts = async () => {
    try {
      const res = await api.getDrafts(activeMatter?.id);
      if (res.success && res.data) {
        setSavedDrafts(res.data);
      }
    } catch (err) {
      console.warn('Could not load saved drafts:', err.message);
    }
  };

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await api.getTemplates();
        if (res.success && res.data.length > 0) {
          setTemplates(res.data);
        }
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchSavedDrafts();
  }, [activeMatter]);

  // Update client / opposite defaults when activeMatter changes
  useEffect(() => {
    if (activeMatter) {
      if (activeMatter.client) setClientName(activeMatter.client);
      if (activeMatter.oppositeParty) setOppositeParty(activeMatter.oppositeParty);
      if (activeMatter.court) setCourt(activeMatter.court);
      if (activeMatter.jurisdiction) setJurisdiction(activeMatter.jurisdiction);
      if (activeMatter.claimAmount) setClaimAmount(activeMatter.claimAmount);
    }
  }, [activeMatter]);

  const handleToggleDoc = (docId) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleTemplateSelect = (tpl) => {
    setSelectedTemplateId(tpl.id);
    if (tpl.docType) setDocType(tpl.docType);
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setIsGenerating(true);

    try {
      const res = await api.generateDraft({
        matterId: activeMatter?.id,
        documentIds: selectedDocIds,
        docType,
        instructions,
        language,
        clientName: clientName.trim() || undefined,
        oppositeParty: oppositeParty.trim() || undefined,
        court: court.trim() || undefined,
        jurisdiction: jurisdiction.trim() || undefined,
        claimAmount: claimAmount.trim() || undefined
      });

      if (res.success) {
        const draftText = res.content || res.draft || (res.data && (res.data.content || res.data.draft));
        setGeneratedDraft(res);
        setDraftContent(draftText);
        setIsDirty(true);
        setCurrentDraftId(null);
        if (showToast) showToast('Legal draft generated successfully.', 'success');
      } else {
        throw new Error(res.error || 'Failed to generate draft');
      }
    } catch (err) {
      console.error('Draft generation error:', err);
      if (showToast) showToast(`Generation failed: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReviseParagraph = async () => {
    if (!draftContent) return;
    if (!paraRevisionInstructions.trim()) {
      if (showToast) showToast('Please enter revision instructions for the selected paragraph.', 'info');
      return;
    }

    setIsRevisingPara(true);
    try {
      const res = await api.reviseParagraph({
        fullText: draftContent,
        paragraphIndex: selectedParaIdx,
        instructions: paraRevisionInstructions,
        language
      });

      if (res.success) {
        const updated = res.updatedDraft || res.fullRevisedDraft || (res.data && res.data.updatedDraft);
        setDraftContent(updated);
        setParaRevisionInstructions('');
        setIsDirty(true);
        if (showToast) showToast(res.changeSummary || 'Targeted paragraph revised.', 'success');
      } else {
        throw new Error(res.error || 'Paragraph revision failed');
      }
    } catch (err) {
      console.error('Paragraph revision error:', err);
      if (showToast) showToast(`Paragraph revision failed: ${err.message}`, 'error');
    } finally {
      setIsRevisingPara(false);
    }
  };

  // Save Draft to Persistent Database
  const handleSaveDraft = async () => {
    if (!draftContent) {
      if (showToast) showToast('No draft content to save.', 'warning');
      return;
    }

    setIsSavingDraft(true);
    try {
      if (currentDraftId) {
        // Update existing draft
        const res = await api.updateDraft(currentDraftId, {
          content: draftContent,
          title: `${docType} (${activeMatter?.title || 'Matter'})`,
          evidenceClaims: generatedDraft?.evidenceClaims || [],
          missingPlaceholders: generatedDraft?.missingPlaceholders || []
        });
        if (res.success) {
          setIsDirty(false);
          fetchSavedDrafts();
          if (showToast) showToast('Draft record updated in persistent repository.', 'success');
        }
      } else {
        // Create new draft
        const res = await api.saveDraft({
          title: `${docType} - ${activeMatter?.client || 'Draft'} (${new Date().toLocaleDateString('en-IN')})`,
          content: draftContent,
          matterId: activeMatter?.id || 'mat-ind-001',
          docType,
          language,
          isAiPowered: generatedDraft?.isAiPowered || false,
          provider: generatedDraft?.provider || 'DraftMate Legal Engine',
          evidenceClaims: generatedDraft?.evidenceClaims || [],
          missingPlaceholders: generatedDraft?.missingPlaceholders || [],
          disclaimer: generatedDraft?.disclaimer || 'DRAFT — Subject to Advocate Review.'
        });
        if (res.success && res.data) {
          setCurrentDraftId(res.data.id);
          setIsDirty(false);
          fetchSavedDrafts();
          if (showToast) showToast('Draft saved permanently to matter docket.', 'success');
        }
      }
    } catch (err) {
      if (showToast) showToast(`Failed to save draft: ${err.message}`, 'error');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Load Saved Draft into Workspace
  const handleLoadSavedDraft = (draft) => {
    if (isDirty) {
      const confirmDiscard = window.confirm('You have unsaved changes in your current draft. Do you wish to overwrite with the saved draft?');
      if (!confirmDiscard) return;
    }

    setDraftContent(draft.content || '');
    setDocType(draft.docType || 'Legal Notice');
    setCurrentDraftId(draft.id);
    setGeneratedDraft({
      isAiPowered: draft.isAiPowered,
      provider: draft.provider,
      language: draft.language,
      missingPlaceholders: draft.missingPlaceholders || [],
      evidenceClaims: draft.evidenceClaims || [],
      disclaimer: draft.disclaimer
    });
    setIsDirty(false);
    setShowDraftsModal(false);
    if (showToast) showToast(`Loaded draft "${draft.title}" (Version ${draft.version || 1})`, 'info');
  };

  // Delete Draft with Confirmation
  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    try {
      const res = await api.deleteDraft(draftToDelete.id);
      if (res.success) {
        if (currentDraftId === draftToDelete.id) {
          setCurrentDraftId(null);
        }
        fetchSavedDrafts();
        if (showToast) showToast('Draft deleted from repository.', 'info');
      }
    } catch (err) {
      if (showToast) showToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setDraftToDelete(null);
    }
  };

  // Export Draft to PDF or DOCX
  const handleExport = async (format) => {
    if (!draftContent) {
      if (showToast) showToast('Generate or open a draft before exporting.', 'warning');
      return;
    }

    setShowExportMenu(false);
    setIsExporting(true);
    try {
      const title = `${docType.replace(/\s+/g, '_')}_${(activeMatter?.client || 'Legal').replace(/[^a-zA-Z0-9]/g, '_')}`;
      await api.exportDraft({
        draft: draftContent,
        title,
        format,
        matter: activeMatter || {},
        metadata: {
          docType,
          language,
          court,
          clientName,
          evidenceClaims: generatedDraft?.evidenceClaims || []
        }
      });
      if (showToast) showToast(`Exported ${format.toUpperCase()} draft successfully.`, 'success');
    } catch (err) {
      if (showToast) showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftContent);
    setCopied(true);
    if (showToast) showToast('Draft copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadEditor = () => {
    if (!draftContent) return;
    if (onLoadIntoEditor) {
      const title = `${docType.replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}.txt`;
      onLoadIntoEditor(draftContent, title);
    }
  };

  // Split current draft into paragraphs for targeted selector
  const paragraphs = draftContent ? draftContent.split(/\n\s*\n/).filter(p => p.trim().length > 0) : [];

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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Feather size={12} />
              AI DRAFTING STUDIO
            </span>
            <span className="badge badge-info">Evidence-Backed Pleading & Notice Generator</span>
            <span className="badge font-mono" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34D399', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
              Persistent Storage + Voice
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: '#FFF', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            Indian Legal Drafting & Evidence-Grounded Pleading Studio
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '850px' }}>
            Draft court pleadings, Section 138 notices, bail petitions, and agreements grounded in factual documents. Save drafts to persistent matter dockets, dictate instructions by voice, and export to formal court PDF and DOCX.
          </p>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Saved Drafts Repository Button */}
          <button
            type="button"
            onClick={() => setShowDraftsModal(true)}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FolderOpen size={14} color="var(--gold-primary)" />
            <span>Saved Drafts ({savedDrafts.length})</span>
          </button>

          {/* Language Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'var(--bg-surface)', padding: '0.2rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <Languages size={14} color="var(--gold-primary)" style={{ marginLeft: '0.3rem' }} />
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: language === 'en' ? 'var(--gold-primary)' : 'transparent',
                color: language === 'en' ? '#0A0E17' : 'var(--text-secondary)',
                fontWeight: language === 'en' ? 700 : 400
              }}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: language === 'hi' ? 'var(--gold-primary)' : 'transparent',
                color: language === 'hi' ? '#0A0E17' : 'var(--text-secondary)',
                fontWeight: language === 'hi' ? 700 : 400
              }}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls (380px) + Right Editor & Evidence (1fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.25rem', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Form Parameters & Document Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          
          {/* 1. Template Presets */}
          <div className="legal-card" style={{ padding: '0.85rem' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--gold-light)', fontWeight: 600, display: 'block', marginBottom: '0.45rem' }}>
              Standard Legal Drafting Templates:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleTemplateSelect(tpl)}
                  style={{
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: `1px solid ${selectedTemplateId === tpl.id ? 'var(--gold-primary)' : 'var(--border-subtle)'}`,
                    backgroundColor: selectedTemplateId === tpl.id ? 'rgba(212, 175, 55, 0.1)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, color: selectedTemplateId === tpl.id ? 'var(--gold-light)' : 'var(--text-primary)' }}>
                    {tpl.title}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {tpl.statute}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Source Documents Selector */}
          <div className="legal-card" style={{ padding: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--gold-light)', fontWeight: 600 }}>
                Ground Draft on Source Documents ({selectedDocIds.length}):
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {activeMatter?.title?.slice(0, 20) || 'Active Matter'}
              </span>
            </div>

            {matterDocs.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                No documents uploaded for this matter yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto' }}>
                {matterDocs.map(doc => (
                  <label
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.72rem',
                      padding: '0.35rem 0.5rem',
                      backgroundColor: selectedDocIds.includes(doc.id) ? 'rgba(212, 175, 55, 0.08)' : 'var(--bg-surface)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: `1px solid ${selectedDocIds.includes(doc.id) ? 'var(--border-gold)' : 'transparent'}`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => handleToggleDoc(doc.id)}
                      style={{ accentColor: 'var(--gold-primary)' }}
                    />
                    <FileText size={13} color="var(--gold-primary)" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {doc.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {doc.wordCount || 0}w
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 3. Pleading & Case Parameters Form with Voice Input */}
          <form onSubmit={handleGenerate} className="legal-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--gold-light)', fontWeight: 600 }}>
              Pleading & Notice Parameters:
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Client / Petitioner:</label>
                <input
                  type="text"
                  className="legal-input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{ fontSize: '0.75rem' }}
                  placeholder="e.g. Apex Corp Pvt Ltd"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Opposing Party:</label>
                <input
                  type="text"
                  className="legal-input"
                  value={oppositeParty}
                  onChange={(e) => setOppositeParty(e.target.value)}
                  style={{ fontSize: '0.75rem' }}
                  placeholder="e.g. Bharat Logistics Ltd"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Competent Court / Forum:</label>
                <input
                  type="text"
                  className="legal-input"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  style={{ fontSize: '0.75rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Claim Valuation / Amount:</label>
                <input
                  type="text"
                  className="legal-input"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  style={{ fontSize: '0.75rem' }}
                />
              </div>
            </div>

            {/* Drafting Instructions with Integrated Voice Input Button */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Drafting Instructions:
                </label>
                <VoiceInputButton
                  language={language === 'hi' ? 'hi-IN' : 'en-IN'}
                  onTranscriptAccepted={(text) => setInstructions(prev => prev ? `${prev} ${text}` : text)}
                  buttonLabel="Voice Dictate"
                  placeholder="Speak your legal instructions in English or Hindi..."
                  showToast={showToast}
                />
              </div>
              <textarea
                className="legal-textarea"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Demand payment within 15 days, or enter Hindi instructions like '15 दिनों के भीतर भुगतान की मांग करें'..."
                style={{ fontSize: '0.75rem' }}
              />
            </div>

            {/* Quick Prompt Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {[
                'Demand payment in 15 days',
                'Cite Satender Kumar Antil (2022) 10 SCC 51',
                'Include Perkins Eastman mutual arbitration',
                '15 दिनों में भुगतान की मांग करें'
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setInstructions(prev => prev ? `${prev}. ${chip}` : chip)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}
                >
                  + {chip}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="btn btn-gold"
              style={{ marginTop: '0.4rem', width: '100%', padding: '0.55rem', fontWeight: 600 }}
            >
              <Sparkles size={14} className={isGenerating ? 'spin' : ''} />
              <span>{isGenerating ? 'Drafting from Evidence...' : 'Generate Evidence-Backed Draft'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Generated Draft Editor & Evidence Sidecar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          
          {/* Main Draft Header & Actions */}
          <div className="legal-card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="var(--gold-primary)" />
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {docType} Workspace
              </span>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                {paragraphs.length} Paragraphs
              </span>
              {isDirty && (
                <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                  Unsaved Edits
                </span>
              )}
              {currentDraftId && !isDirty && (
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  Saved in Docket
                </span>
              )}
            </div>

            {/* Action Buttons: Save, Export, Copy, Open in Editor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', position: 'relative' }}>
              {/* Save Draft Button */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!draftContent || isSavingDraft}
                className="btn btn-outline"
                style={{
                  fontSize: '0.72rem',
                  padding: '0.35rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  borderColor: isDirty ? 'var(--gold-primary)' : 'var(--border-subtle)',
                  color: isDirty ? 'var(--gold-light)' : 'var(--text-secondary)'
                }}
                title="Save draft permanently to matter docket"
              >
                {isSavingDraft ? <RefreshCw size={12} className="spin" /> : <Save size={12} />}
                <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
              </button>

              {/* Export Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowExportMenu(prev => !prev)}
                  disabled={!draftContent || isExporting}
                  className="btn btn-outline"
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.35rem 0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    backgroundColor: 'rgba(212, 175, 55, 0.08)'
                  }}
                >
                  <Download size={12} color="var(--gold-primary)" />
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

              {/* Copy */}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!draftContent}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Open in Central Editor */}
              <button
                type="button"
                onClick={handleLoadEditor}
                disabled={!draftContent}
                className="btn btn-gold"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                title="Send working draft to Central Document Editor"
              >
                <span>Open in Central Editor</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Missing Placeholders Warning Banner */}
          {generatedDraft?.missingPlaceholders && generatedDraft.missingPlaceholders.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.09)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              padding: '0.55rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.74rem',
              color: '#FCD34D'
            }}>
              <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
              <div>
                <strong>Missing Facts Protected:</strong> {generatedDraft.missingPlaceholders.length} fields were not found in source documents and have been safely retained as placeholders: {generatedDraft.missingPlaceholders.map(p => p.placeholder).join(', ')}.
              </div>
            </div>
          )}

          {/* Draft Content Editable Area */}
          <div className="legal-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            {isGenerating ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={28} className="spin" color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Synthesizing Evidence-Backed Draft...
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Structuring grounds, cross-referencing statutory benchmarks, and isolating missing facts as placeholders.
                </div>
              </div>
            ) : !draftContent ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Feather size={36} color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Drafting Studio Awaiting Input
                </div>
                <p style={{ fontSize: '0.8rem', marginTop: '0.35rem', maxWidth: '420px', margin: '0.35rem auto 0' }}>
                  Select source documents on the left, choose a pleading or notice type, dictate or type instructions, and click "Generate Evidence-Backed Draft".
                </p>
              </div>
            ) : (
              <textarea
                value={draftContent}
                onChange={(e) => {
                  setDraftContent(e.target.value);
                  setIsDirty(true);
                }}
                className="legal-textarea font-mono"
                style={{
                  width: '100%',
                  height: '380px',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  padding: '1rem',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px'
                }}
              />
            )}
          </div>

          {/* Targeted Paragraph Regeneration Console */}
          {paragraphs.length > 0 && (
            <div className="legal-card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Edit3 size={13} color="var(--gold-primary)" />
                  Targeted Paragraph Regeneration:
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Rewrites selected paragraph only without altering the rest
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={selectedParaIdx}
                  onChange={(e) => setSelectedParaIdx(Number(e.target.value))}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-gold)',
                    borderRadius: '4px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.75rem',
                    outline: 'none'
                  }}
                >
                  {paragraphs.map((p, idx) => (
                    <option key={idx} value={idx}>
                      Paragraph {idx + 1} ({p.slice(0, 30)}...)
                    </option>
                  ))}
                </select>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Revision instructions: e.g. Make appointment mutual, add 30-day notice..."
                    value={paraRevisionInstructions}
                    onChange={(e) => setParaRevisionInstructions(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      outline: 'none',
                      width: '100%',
                      paddingRight: '36px'
                    }}
                  />
                  <div style={{ position: 'absolute', right: '4px' }}>
                    <VoiceInputButton
                      language={language === 'hi' ? 'hi-IN' : 'en-IN'}
                      onTranscriptAccepted={(text) => setParaRevisionInstructions(prev => prev ? `${prev} ${text}` : text)}
                      buttonLabel=""
                      showToast={showToast}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReviseParagraph}
                  disabled={isRevisingPara}
                  className="btn btn-outline-gold"
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <RefreshCw size={12} className={isRevisingPara ? 'spin' : ''} />
                  <span>{isRevisingPara ? 'Revising...' : 'Regenerate Paragraph'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Evidence Sidecar: Claims Grounded to Sources */}
          {generatedDraft?.evidenceClaims && generatedDraft.evidenceClaims.length > 0 && (
            <div className="legal-card" style={{ padding: '0.85rem' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={13} color="var(--gold-primary)" />
                Evidence Grounding & Source Tracking ({generatedDraft.evidenceClaims.length} Claims):
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                {generatedDraft.evidenceClaims.map((claim, idx) => {
                  const isExtracted = claim.status === 'Extracted Evidence';
                  const isPlaceholder = claim.status === 'Unverified Placeholder';

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.45rem 0.65rem',
                        backgroundColor: isPlaceholder ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-surface)',
                        borderRadius: '4px',
                        border: `1px solid ${isPlaceholder ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, color: isPlaceholder ? '#FCD34D' : 'var(--text-primary)' }}>
                          {claim.claimText}
                        </span>
                        <span className={`badge ${isExtracted ? 'badge-success' : isPlaceholder ? 'badge-warning' : 'badge-gold'}`} style={{ fontSize: '0.6rem' }}>
                          {claim.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                        Source: {claim.sourceDocTitle} • {claim.sourceLocation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mandatory Advocate Review Disclaimer */}
          <div style={{
            padding: '0.65rem 0.85rem',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            ⚖️ <strong>Advocate Review Notice</strong>: {generatedDraft?.disclaimer || 'DRAFT — Subject to Advocate Review and Verification. Not a Final Judicial Pleading.'}
          </div>
        </div>
      </div>

      {/* Saved Drafts Repository Modal */}
      {showDraftsModal && (
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
                  Matter Drafts Repository ({savedDrafts.length})
                </h3>
              </div>
              <button
                onClick={() => setShowDraftsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {savedDrafts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FolderOpen size={36} color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>No Saved Drafts Yet</div>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    Generate a legal notice or pleading and click "Save Draft" to store it permanently in this matter docket.
                  </p>
                </div>
              ) : (
                savedDrafts.map(d => (
                  <div
                    key={d.id}
                    className="legal-card"
                    style={{
                      padding: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: currentDraftId === d.id ? 'rgba(212, 175, 55, 0.08)' : 'var(--bg-surface)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{d.docType}</span>
                        <span className="badge badge-outline" style={{ fontSize: '0.65rem' }}>v{d.version || 1}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(d.updatedAt || d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.2rem 0' }}>
                        {d.title}
                      </h4>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {d.wordCount || 0} words • {d.provider || 'Legal Draft'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleLoadSavedDraft(d)}
                        className="btn btn-gold"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                      >
                        Load Draft
                      </button>
                      <button
                        onClick={() => setDraftToDelete(d)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', borderColor: '#EF4444', color: '#F87171' }}
                        title="Delete draft from repository"
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
                onClick={() => setShowDraftsModal(false)}
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
      {draftToDelete && (
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
                Confirm Permanent Deletion
              </h4>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Are you sure you want to permanently delete draft <strong>"{draftToDelete.title}"</strong> from this matter? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDraftToDelete(null)}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDraft}
                className="btn btn-danger"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.9rem', backgroundColor: '#DC2626', borderColor: '#DC2626', color: '#FFF', fontWeight: 600 }}
              >
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
