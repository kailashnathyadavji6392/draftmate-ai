import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Upload, 
  FileText, 
  Calendar, 
  Clock, 
  Scale, 
  User, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  ExternalLink, 
  Shield, 
  FileCheck, 
  Coins,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';

export default function MatterWorkspace({ 
  activeMatter, 
  documents = [], 
  onSelectDocument, 
  onDocumentUploaded, 
  onDocumentDeleted,
  showToast 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!activeMatter) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px'
      }}>
        <Building2 size={36} color="var(--gold-muted)" style={{ margin: '0 auto 0.75rem' }} />
        <h4 style={{ color: 'var(--text-secondary)' }}>No Active Matter Selected</h4>
        <p style={{ fontSize: '0.8rem' }}>Please select or create an Indian litigation matter from the top bar.</p>
      </div>
    );
  }

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      if (showToast) showToast('File exceeds 25MB upload limit.', 'error');
      return;
    }

    // Validate extension
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.md', '.json'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      if (showToast) showToast(`Unsupported file type (${ext}). Please upload PDF, DOCX, or TXT.`, 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgressMsg('Reading file stream & validating size...');

    try {
      setTimeout(() => setUploadProgressMsg('Extracting text and identifying pages...'), 400);
      setTimeout(() => setUploadProgressMsg('Categorizing parties, dates, claims, and BSA citations...'), 900);

      const res = await api.uploadDocument(file, activeMatter.id);
      if (res.success) {
        if (res.data.isScanned) {
          if (showToast) showToast(`Document "${file.name}" uploaded. Note: Scanned PDF detected (no embedded text layer).`, 'warning');
        } else {
          if (showToast) showToast(`Document "${file.name}" uploaded & parsed (${res.data.wordCount} words, ${res.data.extractedFacts?.length || 0} facts).`, 'success');
        }
        if (onDocumentUploaded) onDocumentUploaded(res.data);
      }
    } catch (err) {
      if (showToast) showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Strictly filter documents for the active matter to avoid mixing up cases
  const matterDocs = documents.filter(d => d.matterId === activeMatter.id);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      padding: '1.25rem',
      backgroundColor: 'var(--bg-secondary)',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Matter Summary Card */}
      <div className="legal-card legal-card-gold">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-gold font-mono">{activeMatter.matterNumber}</span>
              <span className="badge badge-info">{activeMatter.matterType}</span>
              <span className={`badge ${activeMatter.priority === 'Critical' ? 'badge-danger' : 'badge-warning'}`}>
                {activeMatter.priority} Priority
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#FFF',
              letterSpacing: '0.02em'
            }}>
              {activeMatter.title}
            </h2>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CNR Number</span>
            <div className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--gold-light)', fontWeight: 600 }}>
              {activeMatter.cnr}
            </div>
          </div>
        </div>

        {/* Matter Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          padding: '0.85rem',
          backgroundColor: 'rgba(6, 10, 18, 0.6)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Court / Tribunal</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeMatter.court}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Presiding Bench / Judge</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeMatter.judge}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Current Stage</span>
            <div style={{ fontWeight: 600, color: 'var(--gold-light)' }}>{activeMatter.stage}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Next Hearing Date</span>
            <div style={{ fontWeight: 600, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={13} />
              {activeMatter.nextHearingDate || 'To be scheduled'}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Client ({activeMatter.clientRole})</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeMatter.client}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Opposing Party & Counsel</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeMatter.oppositeParty} ({activeMatter.opposingCounsel})
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Claim / Relief Valuation</span>
            <div style={{ fontWeight: 600, color: '#34D399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Coins size={13} />
              {activeMatter.claimAmount}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Jurisdiction</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeMatter.jurisdiction}</div>
          </div>
        </div>

        {/* Statutes Involved Tags */}
        {activeMatter.statutesInvolved && (
          <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Governing Acts:</span>
            {activeMatter.statutesInvolved.map((st, i) => (
              <span key={i} className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                {st}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Real Document Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--gold-primary)' : 'var(--border-subtle)'}`,
          borderRadius: '8px',
          padding: '1.5rem',
          backgroundColor: isDragOver ? 'rgba(212, 175, 55, 0.08)' : 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'center'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }} 
          accept=".pdf,.txt,.docx,.doc,.md" 
          style={{ display: 'none' }} 
        />
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.65rem'
        }}>
          <Upload size={20} color="var(--gold-primary)" />
        </div>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
          {isUploading ? (uploadProgressMsg || 'Uploading & Extracting Evidence...') : 'Upload Document to Active Matter Dossier'}
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Supports PDF, Word (DOCX), Plain Text (TXT), Markdown. Max size: 25MB.
        </p>
        {isUploading && (
          <div style={{ width: '220px', height: '4px', backgroundColor: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.65rem' }}>
            <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--gold-primary)', animation: 'pulse 1s infinite' }} />
          </div>
        )}
      </div>

      {/* Matter Documents List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <FileText size={15} color="var(--gold-primary)" />
            Matter Dossier & Exhibits ({matterDocs.length})
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Real extracted evidence facts
          </span>
        </div>

        {matterDocs.length === 0 ? (
          <div style={{
            padding: '1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontSize: '0.8rem'
          }}>
            No documents uploaded yet for this matter. Use the upload zone above to attach pleadings, notices, or contracts.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {matterDocs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <FileText size={18} color="var(--gold-primary)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <span>{doc.documentType}</span>
                        <span>•</span>
                        <span>{doc.wordCount} words</span>
                        <span>•</span>
                        <span>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
                        <span>•</span>
                        <span>{Math.round(doc.sizeBytes / 1024)} KB</span>
                        {doc.extractedFacts?.length > 0 && (
                          <>
                            <span>•</span>
                            <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>
                              {doc.extractedFacts.length} facts extracted
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      onClick={() => onSelectDocument && onSelectDocument(doc)}
                      className="btn btn-gold"
                      style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem' }}
                    >
                      Open in Editor
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Remove document "${doc.title}" from matter dossier?`)) {
                          try {
                            await api.deleteDocument(doc.id);
                            if (onDocumentDeleted) onDocumentDeleted(doc.id);
                            if (showToast) showToast('Document deleted.', 'info');
                          } catch (e) {
                            if (showToast) showToast(`Delete failed: ${e.message}`, 'error');
                          }
                        }
                      }}
                      className="btn btn-danger"
                      style={{ fontSize: '0.72rem', padding: '0.35rem 0.55rem' }}
                      title="Delete Document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Scanned PDF warning notice if applicable */}
                {doc.isScanned && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '4px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.7rem',
                    color: '#FDE68A'
                  }}>
                    <AlertTriangle size={13} color="#F59E0B" style={{ flexShrink: 0 }} />
                    <span>{doc.scanNotice || 'Scanned PDF: Raster image detected without text stream. OCR required for full extraction.'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
