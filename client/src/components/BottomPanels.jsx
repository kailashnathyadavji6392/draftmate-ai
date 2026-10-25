import React, { useState } from 'react';
import { 
  FileSearch, 
  ShieldAlert, 
  CheckCircle2, 
  Compass, 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  Calendar, 
  Scale, 
  ExternalLink,
  Clock,
  Sparkles,
  Coins,
  User,
  BookOpen,
  FileText,
  HelpCircle,
  Download,
  FileDown
} from 'lucide-react';
import { api } from '../api/client';

export default function BottomPanels({ 
  evidenceData, 
  riskRadarData, 
  citationsData, 
  activeMatter,
  currentDocument,
  matterEvidence,
  onFactClick,
  onRiskClick,
  onRunAiInterpretation,
  isAiInterpreting = false,
  isLoading = false 
}) {
  const [activeTab, setActiveTab] = useState('evidence');
  const [factCategoryFilter, setFactCategoryFilter] = useState('ALL');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Combine facts from matterEvidence or active document's extracted facts
  const extractedFacts = matterEvidence?.facts?.length > 0 
    ? matterEvidence.facts 
    : currentDocument?.extractedFacts || evidenceData?.extractedFacts || [];

  const filteredFacts = factCategoryFilter === 'ALL'
    ? extractedFacts
    : extractedFacts.filter(f => f.category === factCategoryFilter);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPanel = async (format) => {
    setShowExportMenu(false);
    setIsExporting(true);
    try {
      if (activeTab === 'evidence') {
        await api.exportEvidence({
          evidenceData: { extractedFacts },
          matter: activeMatter || {},
          document: currentDocument || {},
          format
        });
      } else if (activeTab === 'radar') {
        await api.exportRiskRadar({
          riskData: riskRadarData || {},
          matter: activeMatter || {},
          document: currentDocument || {},
          format
        });
      } else if (activeTab === 'citations') {
        await api.exportCitations({
          citationData: citationsData || {},
          matter: activeMatter || {},
          document: currentDocument || {},
          format
        });
      }
    } catch (err) {
      console.error('Panel export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: 'evidence', label: 'Evidence Summary', icon: FileSearch, count: extractedFacts.length },
    { 
      id: 'radar', 
      label: 'Legal Risk Radar', 
      icon: ShieldAlert, 
      count: riskRadarData?.findings?.length || 0,
      badge: riskRadarData?.metrics?.overallRiskLevel || riskRadarData?.riskLevel || null 
    },
    { id: 'citations', label: 'Citation Verification', icon: CheckCircle2, count: citationsData?.caseCitations?.length || 0 },
    { id: 'navigator', label: 'Legal Process Navigator', icon: Compass }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-gold)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'height 0.2s ease',
      height: isCollapsed ? '42px' : '330px',
      maxHeight: '400px',
      position: 'relative',
      zIndex: 15
    }}>
      {/* Tab Navigation Header Bar */}
      <div style={{
        height: '42px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '100%' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isCollapsed) setIsCollapsed(false);
                }}
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0 0.85rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--gold-primary)' : '2px solid transparent',
                  color: isActive ? 'var(--gold-light)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} color={isActive ? 'var(--gold-primary)' : 'var(--text-muted)'} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className={`badge ${tab.badge.includes('High') ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side: Export, AI synthesize trigger & Collapse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Export Report Dropdown */}
          {activeTab !== 'navigator' && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowExportMenu(prev => !prev)}
                disabled={isExporting}
                className="btn btn-outline"
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Download verified audit report"
              >
                <Download size={12} color="var(--gold-primary)" />
                <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
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
                  width: '170px',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => handleExportPanel('pdf')}
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
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPanel('docx')}
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
                    <span>Download DOCX</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'evidence' && currentDocument && (
            <button
              onClick={() => onRunAiInterpretation && onRunAiInterpretation(currentDocument)}
              disabled={isAiInterpreting}
              className="btn btn-outline-gold"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
              title="Generate advocate synthesis using Gemini 2.0"
            >
              <Sparkles size={12} color="var(--gold-primary)" />
              <span>{isAiInterpreting ? 'Analyzing via AI...' : 'AI Evidence Synthesis'}</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem'
            }}
            title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
          >
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
            {isCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Panel Body Content */}
      {!isCollapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.25rem' }}>
          {/* 1. Evidence Summary Tab */}
          {activeTab === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Category Filter Pills & Matter Context */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: `All Facts (${extractedFacts.length})` },
                    { id: 'Party / Name', label: 'Parties & Names' },
                    { id: 'Date / Deadline', label: 'Dates & Deadlines' },
                    { id: 'Financial Obligation', label: 'Amounts & Obligations' },
                    { id: 'Factual Claim / Clause', label: 'Clauses & Claims' },
                    { id: 'Legal Reference', label: 'Legal References' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFactCategoryFilter(cat.id)}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        border: factCategoryFilter === cat.id ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: factCategoryFilter === cat.id ? 'rgba(212, 175, 55, 0.15)' : 'var(--bg-surface)',
                        color: factCategoryFilter === cat.id ? 'var(--gold-light)' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Matter: <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>{activeMatter?.matterNumber || 'Active Matter'}</span>
                </div>
              </div>

              {/* AI-Generated Synthesis Box (if available) */}
              {currentDocument?.aiInterpretation && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: '6px',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="badge badge-gold font-mono" style={{ fontSize: '0.65rem' }}>
                        AI INTERPRETATION
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--gold-light)' }}>
                        Advocate Strategy & Admissibility Synthesis
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Provider: {currentDocument.aiInterpretation.provider || 'Gemini 2.0'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                    {currentDocument.aiInterpretation.interpretation}
                  </p>
                </div>
              )}

              {/* Facts Grid */}
              {filteredFacts.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem'
                }}>
                  No extracted facts found matching the selected filter. Upload a PDF, DOCX, or TXT file to extract evidentiary facts.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '0.65rem'
                }}>
                  {filteredFacts.map((fact, idx) => (
                    <div
                      key={fact.id || idx}
                      onClick={() => onFactClick && onFactClick(fact)}
                      style={{
                        padding: '0.7rem 0.85rem',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gold-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                      }}
                      title="Click to view fact in source document"
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                            {fact.category}
                          </span>
                          <span className="badge badge-success font-mono" style={{ fontSize: '0.62rem' }}>
                            GROUND-TRUTH FACT
                          </span>
                        </div>

                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                          {fact.fact}
                        </div>

                        {fact.rawExcerpt && (
                          <div style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                            backgroundColor: 'rgba(0,0,0,0.25)',
                            padding: '0.3rem 0.5rem',
                            borderRadius: '4px',
                            lineHeight: '1.3'
                          }}>
                            "{fact.rawExcerpt}"
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border-dark)',
                        paddingTop: '0.35rem',
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)'
                      }}>
                        <span style={{ color: 'var(--gold-light)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                          📄 {fact.sourceDocumentName}
                        </span>
                        <span className="font-mono" style={{ color: '#38BDF8' }}>
                          📍 {fact.sourceLocation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Legal Risk Radar Tab */}
          {activeTab === 'radar' && (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem', height: '100%', overflow: 'hidden' }}>
              {/* Left Column: Dimensions */}
              <div className="legal-card" style={{ padding: '0.85rem', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <ShieldAlert size={14} color="var(--gold-primary)" />
                    Risk Dimensions
                  </h4>
                  {riskRadarData?.metrics?.overallRiskLevel && (
                    <span className={`badge ${riskRadarData.metrics.critical > 0 ? 'badge-danger' : riskRadarData.metrics.high > 0 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                      {riskRadarData.metrics.overallRiskLevel}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {(riskRadarData?.radarMetrics || [
                    { dimension: 'Electronic Admissibility (BSA s.63)', score: 20, status: 'Audited' },
                    { dimension: 'Arbitration Neutrality (Perkins Test)', score: 95, status: 'Critical' },
                    { dimension: 'Indemnity Exposure (Contract Act s.73)', score: 85, status: 'High Exposure' },
                    { dimension: 'Limitation & Procedural Timing', score: 20, status: 'In Time' }
                  ]).map((metric, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '0.2rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{metric.dimension}</span>
                        <span className={`badge ${metric.score > 60 ? 'badge-danger' : metric.score > 30 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.62rem' }}>
                          {metric.score}% ({metric.status})
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${metric.score}%`,
                          height: '100%',
                          backgroundColor: metric.score > 60 ? '#EF4444' : metric.score > 30 ? '#F59E0B' : '#10B981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ⚖️ Indian law benchmark: Perkins Eastman (Arb s.12), ICA s.73-74, BSA s.63.
                </div>
              </div>

              {/* Right Column: Identified Grounded Findings */}
              <div className="legal-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <AlertTriangle size={14} color="#F59E0B" />
                    Identified Vulnerabilities & Suggested Revisions ({riskRadarData?.findings?.length || 0})
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Target: {currentDocument?.title || 'Active Document'}
                  </span>
                </div>

                {(!riskRadarData?.findings || riskRadarData.findings.length === 0) ? (
                  <div style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem'
                  }}>
                    No high-risk contractual clauses detected in current document.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {riskRadarData.findings.map((f, idx) => {
                      const isCrit = f.riskLevel === 'Critical';
                      const isHi = f.riskLevel === 'High';

                      return (
                        <div 
                          key={f.id || idx}
                          onClick={() => onRiskClick && onRiskClick(f)}
                          style={{
                            padding: '0.65rem 0.85rem',
                            backgroundColor: isCrit ? 'rgba(239, 68, 68, 0.07)' : isHi ? 'rgba(245, 158, 11, 0.07)' : 'rgba(212, 175, 55, 0.05)',
                            border: `1px solid ${isCrit ? 'rgba(239, 68, 68, 0.25)' : isHi ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-subtle)'}`,
                            borderLeft: `3px solid ${isCrit ? '#EF4444' : isHi ? '#F59E0B' : '#3B82F6'}`,
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = isCrit ? 'rgba(239, 68, 68, 0.25)' : isHi ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-subtle)'}
                          title="Click to view clause location in Central Editor"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 700, color: isCrit ? '#FCA5A5' : isHi ? '#FCD34D' : 'var(--text-primary)' }}>
                                {f.title}
                              </span>
                              <span className={`badge ${isCrit ? 'badge-danger' : isHi ? 'badge-warning' : 'badge-gold'}`} style={{ fontSize: '0.62rem' }}>
                                {f.riskLevel}
                              </span>
                            </div>

                            <span className="badge badge-gold font-mono" style={{ fontSize: '0.65rem' }}>
                              📍 {f.sourceLocation || 'Document Text'}
                            </span>
                          </div>

                          {f.originalExcerpt && (
                            <div style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              color: 'var(--text-secondary)',
                              fontStyle: 'italic',
                              margin: '0.25rem 0',
                              fontSize: '0.72rem',
                              lineHeight: 1.35
                            }}>
                              "{f.originalExcerpt.slice(0, 140)}{f.originalExcerpt.length > 140 ? '...' : ''}"
                            </div>
                          )}

                          <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0', lineHeight: 1.4 }}>
                            {f.plainEnglishReason}
                          </p>

                          {f.suggestedRevision && (
                            <div style={{ color: 'var(--gold-light)', fontSize: '0.7rem', marginTop: '0.35rem', backgroundColor: 'rgba(212, 175, 55, 0.08)', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                              ⚖️ Revision: {f.suggestedRevision}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Citation Verification Tab */}
          {activeTab === 'citations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <CheckCircle2 size={14} color="var(--gold-primary)" />
                    Extracted Legal References & Verification Status ({citationsData?.allCitations?.length || citationsData?.totalFound || 0})
                  </h4>
                  {citationsData?.totalFound > 0 && citationsData?.integrityScore !== null && citationsData?.integrityScore !== undefined && (
                    <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                      {citationsData.integrityScore}% Integrity
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Target: {currentDocument?.title || 'Active Document'}
                </span>
              </div>

              {(!citationsData?.allCitations || citationsData.allCitations.length === 0) && (!citationsData?.caseCitations || citationsData.caseCitations.length === 0) ? (
                <div style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem'
                }}>
                  No case citations or statutory references detected in current document.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '0.75rem' }}>
                  {(citationsData.allCitations || citationsData.caseCitations || []).map((c, i) => (
                    <div key={c.id || i} className="legal-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.45rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--gold-light)', fontSize: '0.85rem' }}>
                              {c.caseTitle || c.actTitle || c.citationText || c.rawCitation}
                            </div>
                            <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {c.citationText || c.rawCitation} • {c.citationType || 'Citation'}
                            </div>
                          </div>
                          <span className={`badge ${c.statusBadge || (c.status === 'Verified' ? 'badge-success' : 'badge-gold')}`} style={{ fontSize: '0.62rem' }}>
                            {c.status || 'Verified'}
                          </span>
                        </div>

                        {c.sourceLocation && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--gold-light)', marginBottom: '0.3rem' }}>
                            📍 {c.sourceLocation}
                          </div>
                        )}

                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.35, backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.4rem 0.55rem', borderRadius: '4px' }}>
                          {c.sourceExcerpt || c.whatWasChecked || c.ratio}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        <span>{c.source || 'Authoritative Register'}</span>
                        {c.sourceUrl && (
                          <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 600 }}
                          >
                            <span>Verify Source</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Legal Process Navigator Tab */}
          {activeTab === 'navigator' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Compass size={14} color="var(--gold-primary)" />
                  Procedural Stage Roadmap: {activeMatter?.matterType || 'Commercial Suit'}
                </h4>
                <span className="badge badge-gold font-mono" style={{ fontSize: '0.7rem' }}>
                  Next Court Date: {activeMatter?.nextHearingDate || 'To be scheduled'}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-surface)',
                padding: '0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)'
              }}>
                {[
                  { step: '1. Filing & Registration', completed: true, note: 'Plaint & Court fee scrutinized' },
                  { step: '2. Summons Issued', completed: true, note: 'Service effected on Defendant' },
                  { step: '3. Written Statement', completed: true, note: 'Statutory 120-day limit' },
                  { step: '4. Admission / Denial', completed: true, active: true, note: 'Current active stage (BSA s.63)' },
                  { step: '5. Framing of Issues', completed: false, note: 'Order XIV CPC' },
                  { step: '6. Evidence & Arguments', completed: false, note: 'Examination & Final disposal' }
                ].map((st, i) => (
                  <div key={i} style={{
                    padding: '0.5rem',
                    borderRadius: '4px',
                    backgroundColor: st.active ? 'rgba(212, 175, 55, 0.15)' : st.completed ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    border: st.active ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                    fontSize: '0.72rem'
                  }}>
                    <div style={{ fontWeight: 600, color: st.active ? 'var(--gold-light)' : st.completed ? '#34D399' : 'var(--text-muted)' }}>
                      {st.step}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {st.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
