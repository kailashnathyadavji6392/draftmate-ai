import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Search, 
  Trash2, 
  Eye, 
  ExternalLink, 
  FileCheck, 
  Clock, 
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../api/client';

export default function DocumentsView({ 
  documents = [], 
  onSelectDocument, 
  onUploadClick, 
  onDocumentDeleted,
  showToast 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = (doc.title + ' ' + (doc.documentType || '')).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || (doc.documentType && doc.documentType.toLowerCase().includes(typeFilter.toLowerCase()));
    return matchesSearch && matchesType;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#FFF', fontWeight: 700 }}>
            Document Dossier & Evidence Repository
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Central repository for verified legal pleadings, electronic exhibits, contracts, and witness statements.
          </p>
        </div>

        <button onClick={onUploadClick} className="btn btn-gold">
          <Upload size={16} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="legal-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or type..."
            style={{ paddingLeft: '2.2rem' }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="legal-select"
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="ALL">All Document Types</option>
          <option value="Commercial Agreement">Commercial Agreement</option>
          <option value="Anticipatory Bail">Anticipatory Bail Application</option>
          <option value="Plaint">Plaint / Pleading</option>
          <option value="Legal Notice">Legal Notice</option>
          <option value="Certificate">Electronic Evidence Certificate</option>
        </select>
      </div>

      {/* Documents Table */}
      <div className="legal-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Document Name</th>
              <th style={{ padding: '0.85rem 1rem' }}>Type</th>
              <th style={{ padding: '0.85rem 1rem' }}>Volume</th>
              <th style={{ padding: '0.85rem 1rem' }}>Hash / BSA Sec 63</th>
              <th style={{ padding: '0.85rem 1rem' }}>Uploaded Date</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No documents found matching the search criteria.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr
                  key={doc.id}
                  style={{ borderBottom: '1px solid var(--border-dark)', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <FileText size={16} color="var(--gold-primary)" />
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                          {doc.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ID: {doc.id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                      {doc.documentType || 'Pleading'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    {doc.wordCount} words • {Math.round(doc.sizeBytes / 1024)} KB
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--gold-light)' }} title={doc.sha256Hash || 'SHA-256 Calculated'}>
                      <ShieldCheck size={13} color="#10B981" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {doc.sha256Hash ? `${doc.sha256Hash.substring(0, 10)}...` : 'Verified'}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => onSelectDocument && onSelectDocument(doc)}
                        className="btn btn-gold"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                      >
                        <Eye size={12} />
                        <span>Open</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete document "${doc.title}"?`)) {
                            try {
                              await api.deleteDocument(doc.id);
                              if (onDocumentDeleted) onDocumentDeleted(doc.id);
                              if (showToast) showToast('Document deleted.', 'info');
                            } catch (err) {
                              if (showToast) showToast(`Delete failed: ${err.message}`, 'error');
                            }
                          }
                        }}
                        className="btn btn-danger"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
