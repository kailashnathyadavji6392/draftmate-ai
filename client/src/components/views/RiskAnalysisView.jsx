import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  Sparkles, 
  RefreshCw,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Search,
  Filter,
  Info,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../api/client';

export default function RiskAnalysisView({ 
  currentDocument, 
  documents = [], 
  activeMatter, 
  onSelectDocument,
  onNavigateToEditor,
  showToast 
}) {
  // Determine initially selected document
  const matterDocs = activeMatter 
    ? documents.filter(d => !d.matterId || d.matterId === activeMatter.id)
    : documents;

  const [selectedDocId, setSelectedDocId] = useState(
    currentDocument?.id || (matterDocs.length > 0 ? matterDocs[0].id : '')
  );
  const [analysis, setAnalysis] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Sync when currentDocument prop changes
  useEffect(() => {
    if (currentDocument?.id && currentDocument.id !== selectedDocId) {
      setSelectedDocId(currentDocument.id);
    }
  }, [currentDocument?.id]);

  // Run analysis whenever selected document changes or mounts
  useEffect(() => {
    if (selectedDocId) {
      runRiskScan(selectedDocId);
    } else {
      setAnalysis(null);
    }
  }, [selectedDocId]);

  const activeDoc = documents.find(d => d.id === selectedDocId) || currentDocument;

  const runRiskScan = async (docIdToScan = selectedDocId) => {
    if (!docIdToScan) {
      if (showToast) showToast('Please select a document to scan.', 'info');
      return;
    }

    setIsScanning(true);
    try {
      const doc = documents.find(d => d.id === docIdToScan);
      const res = await api.getRiskRadar({
        documentId: docIdToScan,
        text: doc?.content || undefined,
        metadata: {
          title: doc?.title,
          pages: doc?.pages
        }
      });

      if (res.success) {
        setAnalysis(res.data);
        if (showToast) showToast(`Risk Radar analysis completed: ${res.data.totalFindings} findings identified.`, 'success');
      } else {
        throw new Error(res.error || 'Failed to complete risk scan');
      }
    } catch (err) {
      console.error('Risk scan error:', err);
      if (showToast) showToast(`Risk scan error: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
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

  const handleCopyRevision = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (showToast) showToast('Suggested revision copied to clipboard.', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleJumpToEditor = (finding) => {
    if (onNavigateToEditor) {
      onNavigateToEditor(activeDoc, finding);
    } else if (showToast) {
      showToast(`Locating in editor: ${finding.sourceLocation}`, 'info');
    }
  };

  // Filter findings based on category and search query
  const allFindings = analysis?.findings || [];
  const filteredFindings = allFindings.filter(finding => {
    // Category filter
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'CRITICAL' && finding.riskLevel !== 'Critical') return false;
      if (selectedCategory === 'HIGH' && finding.riskLevel !== 'High') return false;
      if (selectedCategory !== 'CRITICAL' && selectedCategory !== 'HIGH' && finding.category !== selectedCategory) return false;
    }
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = finding.title.toLowerCase().includes(query);
      const matchReason = finding.plainEnglishReason.toLowerCase().includes(query);
      const matchExcerpt = (finding.originalExcerpt || '').toLowerCase().includes(query);
      const matchCategory = finding.category.toLowerCase().includes(query);
      return matchTitle || matchReason || matchExcerpt || matchCategory;
    }
    return true;
  });

  // Extract unique categories for filter pills
  const availableCategories = Array.from(new Set(allFindings.map(f => f.category)));

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
      {/* Top Header & Document Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldAlert size={12} />
              LEGAL RISK RADAR
            </span>
            <span className="badge badge-gold">Indian Jurisprudence Audit</span>
            {analysis?.provider && (
              <span className="badge badge-outline" style={{ fontSize: '0.65rem' }}>
                {analysis.provider}
              </span>
            )}
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#FFF', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            Contract Vulnerability & Statutory Exposure Radar
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '850px' }}>
            Multi-vector clause scrutiny under the Indian Contract Act 1872, Arbitration & Conciliation Act 1996 (Perkins Eastman test), and Bharatiya Sakshya Adhiniyam 2023.
          </p>
        </div>

        {/* Target Document Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} color="var(--gold-primary)" />
            <select
              value={selectedDocId}
              onChange={handleDocumentChange}
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-gold)',
                borderRadius: '6px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                outline: 'none',
                minWidth: '220px',
                cursor: 'pointer'
              }}
            >
              {matterDocs.length === 0 ? (
                <option value="">No documents available</option>
              ) : (
                matterDocs.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} ({doc.category || 'Legal Doc'})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => runRiskScan(selectedDocId)}
            disabled={isScanning || !selectedDocId}
            className="btn btn-gold"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem' }}
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Auditing Clauses...' : 'Rerun Risk Scan'}</span>
          </button>
        </div>
      </div>

      {/* Engine Advisory Banner */}
      {analysis?.configNotice && (
        <div style={{
          backgroundColor: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid var(--border-gold)',
          borderRadius: '6px',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)'
        }}>
          <Info size={16} color="var(--gold-primary)" style={{ flexShrink: 0 }} />
          <span>{analysis.configNotice}</span>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Overall Status */}
        <div className="legal-card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Overall Risk Rating
          </div>
          <div style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            marginTop: '0.35rem',
            color: analysis?.metrics?.critical > 0 ? '#EF4444' : analysis?.metrics?.high > 0 ? '#F59E0B' : '#10B981'
          }}>
            {analysis?.metrics?.overallRiskLevel || (isScanning ? 'Evaluating...' : 'Awaiting Scan')}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {analysis ? `${analysis.totalFindings} identified clause flags` : 'Select document'}
          </div>
        </div>

        {/* Critical Risks */}
        <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid #EF4444' }}>
          <div style={{ fontSize: '0.7rem', color: '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Critical (Precedent Breach)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: '#EF4444' }}>
            {analysis?.metrics?.critical ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Void or unconstitutional
          </div>
        </div>

        {/* High Exposure */}
        <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid #F59E0B' }}>
          <div style={{ fontSize: '0.7rem', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            High Contractual Risk
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: '#F59E0B' }}>
            {analysis?.metrics?.high ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Uncapped liability / notice
          </div>
        </div>

        {/* Medium Vulnerability */}
        <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid #3B82F6' }}>
          <div style={{ fontSize: '0.7rem', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Moderate Vulnerabilities
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: '#3B82F6' }}>
            {analysis?.metrics?.medium ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Statutory ambiguity / evidentiary
          </div>
        </div>

        {/* Analyzed Scope */}
        <div className="legal-card" style={{ padding: '0.85rem', borderLeft: '3px solid var(--gold-primary)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Analyzed Volume
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--gold-primary)' }}>
            {analysis?.wordCount ? `${analysis.wordCount}` : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Words parsed & grounded
          </div>
        </div>
      </div>

      {/* Main Grid: Left Radar Dimensions + Right Findings Dossier */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.25rem', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Multi-Vector Dimensions & Category Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          
          {/* Multi-Vector Exposure Dimensions */}
          <div className="legal-card" style={{ padding: '1.1rem' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ShieldAlert size={15} color="var(--gold-primary)" />
              Multi-Vector Exposure Scores
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {(analysis?.radarMetrics || [
                { dimension: 'Electronic Admissibility (BSA s.63)', score: 20, threshold: 40, status: 'Audited' },
                { dimension: 'Arbitration Neutrality (Perkins Test)', score: 95, threshold: 50, status: 'Critical' },
                { dimension: 'Indemnity Exposure (Contract Act s.73)', score: 85, threshold: 50, status: 'High Exposure' },
                { dimension: 'Limitation & Procedural Timing', score: 20, threshold: 50, status: 'In Time' }
              ]).map((metric, i) => (
                <div key={i} style={{ backgroundColor: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                      {metric.dimension}
                    </span>
                    <span className={`badge ${metric.score > 60 ? 'badge-danger' : metric.score > 30 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                      {metric.score}% • {metric.status}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${metric.score}%`,
                      height: '100%',
                      backgroundColor: metric.score > 60 ? '#EF4444' : metric.score > 30 ? '#F59E0B' : '#10B981',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Legal Precedent References */}
          <div className="legal-card" style={{ padding: '1rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Scale size={14} color="var(--gold-primary)" />
              Indian Jurisprudential Benchmarks
            </div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              • <strong>Perkins Eastman (2020) 12 SCC 767</strong>: Unilateral arbitrator appointment void under Section 12(5).<br/>
              • <strong>Section 73 Contract Act 1872</strong>: Remote/consequential losses non-recoverable unless foreseeable.<br/>
              • <strong>Section 74 Contract Act 1872</strong>: Penalty clauses invalid; only reasonable damages awarded.<br/>
              • <strong>Section 27 Contract Act 1872</strong>: Negative post-termination covenants void ab initio.<br/>
              • <strong>Section 63 BSA 2023</strong>: Electronic records inadmissible without statutory certificate.
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Findings Dossier with Filters and Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          
          {/* Search Bar & Category Filter Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{
                position: 'relative',
                flex: 1
              }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter findings by clause, keyword, or legal basis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                <Filter size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                Filter:
              </span>

              <button
                onClick={() => setSelectedCategory('ALL')}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  border: '1px solid',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === 'ALL' ? 'var(--gold-primary)' : 'var(--bg-surface)',
                  color: selectedCategory === 'ALL' ? '#0A0E17' : 'var(--text-secondary)',
                  borderColor: selectedCategory === 'ALL' ? 'var(--gold-primary)' : 'var(--border-subtle)',
                  fontWeight: selectedCategory === 'ALL' ? 600 : 400
                }}
              >
                All Findings ({allFindings.length})
              </button>

              <button
                onClick={() => setSelectedCategory('CRITICAL')}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  border: '1px solid',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-surface)',
                  color: selectedCategory === 'CRITICAL' ? '#EF4444' : 'var(--text-secondary)',
                  borderColor: selectedCategory === 'CRITICAL' ? '#EF4444' : 'var(--border-subtle)',
                  fontWeight: selectedCategory === 'CRITICAL' ? 600 : 400
                }}
              >
                Critical Only ({allFindings.filter(f => f.riskLevel === 'Critical').length})
              </button>

              <button
                onClick={() => setSelectedCategory('HIGH')}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  border: '1px solid',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === 'HIGH' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-surface)',
                  color: selectedCategory === 'HIGH' ? '#F59E0B' : 'var(--text-secondary)',
                  borderColor: selectedCategory === 'HIGH' ? '#F59E0B' : 'var(--border-subtle)',
                  fontWeight: selectedCategory === 'HIGH' ? 600 : 400
                }}
              >
                High Exposure ({allFindings.filter(f => f.riskLevel === 'High').length})
              </button>

              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    border: '1px solid',
                    cursor: 'pointer',
                    backgroundColor: selectedCategory === cat ? 'rgba(212, 175, 55, 0.2)' : 'var(--bg-surface)',
                    color: selectedCategory === cat ? 'var(--gold-light)' : 'var(--text-secondary)',
                    borderColor: selectedCategory === cat ? 'var(--gold-primary)' : 'var(--border-subtle)',
                    fontWeight: selectedCategory === cat ? 600 : 400
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Findings Cards List */}
          {isScanning ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)'
            }}>
              <RefreshCw size={24} className="animate-spin" color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Auditing Clauses Against Indian Contract Jurisprudence...
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Analyzing Section 73 & 74 exposure, arbitration neutrality (Perkins Eastman test), and electronic evidence compliance.
              </div>
            </div>
          ) : !selectedDocId ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)'
            }}>
              <FileText size={32} color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Document Selected
              </div>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Select an uploaded document from the dropdown above or upload a contract in the Matter Workspace.
              </p>
            </div>
          ) : filteredFindings.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}>
              <ShieldCheck size={36} color="#10B981" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#10B981' }}>
                {allFindings.length === 0 
                  ? 'No Critical Contractual Risks Detected' 
                  : 'No findings match the current filter'}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '480px', margin: '0.35rem auto 0' }}>
                {allFindings.length === 0 
                  ? 'This document satisfies standard Indian contract balance criteria across the 8 scanned risk categories.'
                  : 'Try selecting "All Findings" or clearing the search query to view all identified contractual flags.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {filteredFindings.map((finding, idx) => {
                const isCritical = finding.riskLevel === 'Critical';
                const isHigh = finding.riskLevel === 'High';
                const isMedium = finding.riskLevel === 'Medium';
                
                const borderColor = isCritical 
                  ? 'rgba(239, 68, 68, 0.4)' 
                  : isHigh 
                  ? 'rgba(245, 158, 11, 0.4)' 
                  : 'var(--border-subtle)';

                const badgeClass = isCritical 
                  ? 'badge-danger' 
                  : isHigh 
                  ? 'badge-warning' 
                  : isMedium 
                  ? 'badge-gold' 
                  : 'badge-success';

                return (
                  <div
                    key={finding.id || idx}
                    className="legal-card"
                    style={{
                      padding: '1.1rem',
                      borderLeft: `4px solid ${isCritical ? '#EF4444' : isHigh ? '#F59E0B' : '#3B82F6'}`,
                      borderColor: borderColor,
                      backgroundColor: 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    {/* Header: Title, Category, Level */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.3rem' }}>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                            {finding.riskLevel} Risk
                          </span>
                          <span className="badge badge-outline" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            {finding.category}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {finding.title}
                        </h4>
                      </div>

                      {/* Source Location Pill & View in Editor Action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span 
                          className="badge badge-gold font-mono" 
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                          title="Source location in document text"
                        >
                          📍 {finding.sourceLocation || 'Document Text'}
                        </span>

                        <button
                          onClick={() => handleJumpToEditor(finding)}
                          className="btn btn-outline-gold"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Inspect clause in Central Document Editor"
                        >
                          <span>View in Editor</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Original Clause Excerpt */}
                    {finding.originalExcerpt && (
                      <div style={{
                        padding: '0.6rem 0.85rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                        borderLeft: '2px solid var(--gold-primary)',
                        borderRadius: '0 4px 4px 0',
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        lineHeight: 1.45
                      }}>
                        "{finding.originalExcerpt}"
                      </div>
                    )}

                    {/* Plain English Reason */}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      <strong style={{ color: isCritical ? '#FCA5A5' : isHigh ? '#FCD34D' : 'var(--gold-light)' }}>
                        Why this is risky:
                      </strong>{' '}
                      {finding.plainEnglishReason}
                    </div>

                    {/* Practical Suggested Revision Box */}
                    {finding.suggestedRevision && (
                      <div style={{
                        backgroundColor: 'rgba(212, 175, 55, 0.07)',
                        border: '1px solid rgba(212, 175, 55, 0.25)',
                        borderRadius: '6px',
                        padding: '0.7rem 0.85rem',
                        fontSize: '0.78rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Sparkles size={13} color="var(--gold-primary)" />
                            Practical Suggested Revision:
                          </span>
                          <button
                            onClick={() => handleCopyRevision(finding.id || idx, finding.suggestedRevision)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedId === (finding.id || idx) ? '#10B981' : 'var(--gold-light)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px'
                            }}
                          >
                            {copiedId === (finding.id || idx) ? (
                              <>
                                <Check size={12} color="#10B981" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy Revision</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontStyle: 'normal', lineHeight: 1.45 }}>
                          {finding.suggestedRevision}
                        </div>
                      </div>
                    )}

                    {/* Footer: Confidence & Precedent Citation */}
                    {finding.confidence && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '0.5rem'
                      }}>
                        <span>
                          Standard / Authority: <strong style={{ color: 'var(--text-secondary)' }}>{finding.confidence}</strong>
                        </span>
                        <span style={{ fontStyle: 'italic' }}>
                          DraftMate Advisory Intelligence
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
        ⚖️ <strong>Legal Advisory Notice</strong>: {analysis?.disclaimer || 'This analysis highlights potential contractual exposure and Indian statutory non-compliance. It serves as an assistive tool for advocates and does not constitute a final judicial determination.'}
      </div>
    </div>
  );
}
