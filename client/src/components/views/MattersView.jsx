import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Building2, 
  Scale, 
  ChevronRight, 
  User, 
  Coins,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Archive,
  ArrowLeft,
  ExternalLink,
  Edit,
  ShieldCheck,
  CalendarCheck,
  RotateCcw
} from 'lucide-react';
import { api } from '../../api/client';

export default function MattersView({ 
  matters = [], 
  activeMatter, 
  onSelectMatter, 
  onMatterCreated, 
  onMatterDeleted,
  onMatterUpdated,
  setActiveTab,
  showToast 
}) {
  // Navigation / View State
  const [selectedWorkspaceMatter, setSelectedWorkspaceMatter] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState('overview'); // 'overview', 'documents', 'hearings', 'drafts', 'timeline'

  // Summary KPI stats
  const [matterStats, setMatterStats] = useState({
    totalMatters: matters.length,
    activeMatters: matters.filter(m => m.status === 'Open' || m.status === 'Pending').length,
    upcomingHearings30Days: 0,
    closedMatters: matters.filter(m => m.status === 'Closed' || m.status === 'Archived').length
  });

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL', 'Open', 'Pending', 'On Hold', 'Closed'
  const [selectedCourt, setSelectedCourt] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [sortBy, setSortBy] = useState('updatedAt_desc');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMatter, setEditingMatter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matterToDelete, setMatterToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Workspace Dynamic Data
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [workspaceTimeline, setWorkspaceTimeline] = useState([]);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    matterNumber: '',
    cnr: '',
    court: 'High Court of Delhi',
    matterType: 'Commercial Suit',
    jurisdiction: 'New Delhi, India',
    client: '',
    clientRole: 'Plaintiff',
    oppositeParty: '',
    opposingCounsel: '',
    judge: "Hon'ble Commercial Division Bench",
    priority: 'High',
    status: 'Open',
    claimAmount: '₹ 50,00,000',
    filingDate: new Date().toISOString().slice(0, 10),
    nextHearingDate: '',
    assignedLawyer: 'Lead Advocate',
    summary: '',
    notes: ''
  });

  // Fetch stats on mount
  useEffect(() => {
    loadStats();
  }, [matters]);

  const loadStats = async () => {
    try {
      const res = await api.getMatterStats();
      if (res.success && res.data) {
        setMatterStats(res.data);
      }
    } catch (err) {
      console.warn('Could not load matter stats:', err.message);
    }
  };

  // Load Workspace details when selected
  useEffect(() => {
    if (selectedWorkspaceMatter) {
      loadWorkspaceMatterData(selectedWorkspaceMatter.id);
    }
  }, [selectedWorkspaceMatter]);

  const loadWorkspaceMatterData = async (matterId) => {
    setIsWorkspaceLoading(true);
    try {
      const [matterRes, timelineRes] = await Promise.all([
        api.getMatter(matterId),
        api.getMatterTimeline(matterId)
      ]);

      if (matterRes.success) setWorkspaceDetails(matterRes.data);
      if (timelineRes.success) setWorkspaceTimeline(timelineRes.data || []);
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setIsWorkspaceLoading(false);
    }
  };

  // Real-time Duplicate Check Helper
  const checkDuplicateNumber = async (number, cnr, excludeId) => {
    if (!number && !cnr) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const res = await api.checkDuplicateCaseNumber(number, cnr, excludeId);
      if (res.success && res.isDuplicate && res.existingMatter) {
        setDuplicateWarning(`Notice: Case Number / CNR matches existing matter "${res.existingMatter.title}". You can proceed if this is a linked appeal or counter-claim.`);
      } else {
        setDuplicateWarning(null);
      }
    } catch (_) {
      setDuplicateWarning(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (matter) => {
    setEditingMatter(matter);
    setFormData({
      title: matter.title || '',
      matterNumber: matter.matterNumber || '',
      cnr: matter.cnr || '',
      court: matter.court || 'High Court of Delhi',
      matterType: matter.matterType || 'Commercial Suit',
      jurisdiction: matter.jurisdiction || 'New Delhi, India',
      client: matter.client || '',
      clientRole: matter.clientRole || 'Plaintiff',
      oppositeParty: matter.oppositeParty || '',
      opposingCounsel: matter.opposingCounsel || '',
      judge: matter.judge || "Hon'ble Presiding Bench",
      priority: matter.priority || 'Medium',
      status: matter.status || 'Open',
      claimAmount: matter.claimAmount || '₹ 0',
      filingDate: matter.filingDate || (matter.createdAt ? matter.createdAt.slice(0, 10) : ''),
      nextHearingDate: matter.nextHearingDate || '',
      assignedLawyer: matter.assignedLawyer || 'Lead Advocate',
      summary: matter.summary || '',
      notes: matter.notes || ''
    });
    setDuplicateWarning(null);
    setShowEditModal(true);
  };

  // Submit Create Matter
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.client) {
      if (showToast) showToast('Matter Title and Client Name are required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createMatter(formData);
      if (res.success) {
        if (showToast) showToast(`Matter "${res.data.title}" registered successfully.`, 'success');
        if (onMatterCreated) onMatterCreated(res.data);
        setShowCreateModal(false);
        loadStats();
      }
    } catch (err) {
      if (showToast) showToast(`Creation failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Matter
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingMatter) return;
    setIsSubmitting(true);
    try {
      const res = await api.updateMatter(editingMatter.id, formData);
      if (res.success) {
        if (showToast) showToast(`Matter updated successfully.`, 'success');
        if (onMatterUpdated) onMatterUpdated(res.data);
        setShowEditModal(false);
        if (selectedWorkspaceMatter?.id === editingMatter.id) {
          setSelectedWorkspaceMatter(res.data);
          loadWorkspaceMatterData(res.data.id);
        }
        loadStats();
      }
    } catch (err) {
      if (showToast) showToast(`Update failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Transition (e.g. Close, Reopen, Archive)
  const handleQuickStatusChange = async (matterId, newStatus) => {
    try {
      const res = await api.updateMatterStatus(matterId, newStatus);
      if (res.success) {
        if (showToast) showToast(`Matter status updated to "${newStatus}".`, 'info');
        if (onMatterUpdated) onMatterUpdated(res.data);
        if (selectedWorkspaceMatter?.id === matterId) {
          setSelectedWorkspaceMatter(res.data);
          loadWorkspaceMatterData(matterId);
        }
        loadStats();
      }
    } catch (err) {
      if (showToast) showToast(`Status update failed: ${err.message}`, 'error');
    }
  };

  // Filter & Sort Logic
  const filteredMatters = matters.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (m.title + ' ' + (m.matterNumber || '') + ' ' + (m.cnr || '') + ' ' + (m.client || '') + ' ' + (m.oppositeParty || '') + ' ' + (m.court || ''))
        .toLowerCase()
        .includes(q);

    const matchesStatus = statusTab === 'ALL' 
      ? true 
      : statusTab === 'Closed' 
        ? (m.status === 'Closed' || m.status === 'Archived')
        : m.status?.toLowerCase() === statusTab.toLowerCase();

    const matchesCourt = selectedCourt === 'ALL' || (m.court || '').toLowerCase().includes(selectedCourt.toLowerCase());
    const matchesType = selectedType === 'ALL' || m.matterType === selectedType;
    const matchesPriority = selectedPriority === 'ALL' || m.priority === selectedPriority;

    return matchesSearch && matchesStatus && matchesCourt && matchesType && matchesPriority;
  });

  // Sort
  filteredMatters.sort((a, b) => {
    if (sortBy === 'nextHearingDate_asc') {
      if (!a.nextHearingDate) return 1;
      if (!b.nextHearingDate) return -1;
      return new Date(a.nextHearingDate) - new Date(b.nextHearingDate);
    }
    if (sortBy === 'title_asc') {
      return (a.title || '').localeCompare(b.title || '');
    }
    if (sortBy === 'filingDate_desc') {
      return new Date(b.filingDate || b.createdAt) - new Date(a.filingDate || a.createdAt);
    }
    // default: updatedAt_desc
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Closed':
        return { bg: 'rgba(100, 116, 139, 0.2)', color: '#94A3B8', border: '#64748B' };
      case 'Archived':
        return { bg: 'rgba(100, 116, 139, 0.2)', color: '#94A3B8', border: '#64748B' };
      case 'On Hold':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '#F59E0B' };
      case 'Pending':
        return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '#38BDF8' };
      default: // Open
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '#10B981' };
    }
  };

  // ==========================================
  // RENDER DEDICATED MATTER WORKSPACE VIEW
  // ==========================================
  if (selectedWorkspaceMatter) {
    const currentM = workspaceDetails || selectedWorkspaceMatter;
    const statusStyle = getStatusBadge(currentM.status || 'Open');

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
        {/* Workspace Back Button & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <button
              onClick={() => setSelectedWorkspaceMatter(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', marginBottom: '0.75rem' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Matters Docket</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <span className="badge badge-gold font-mono" style={{ fontSize: '0.75rem' }}>
                {currentM.matterNumber || 'CASE'}
              </span>
              <span className="badge font-mono" style={{ fontSize: '0.7rem', backgroundColor: 'var(--bg-surface)' }}>
                CNR: {currentM.cnr || 'DLHC01...'}
              </span>
              <span style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`,
                fontSize: '0.68rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                fontWeight: 600
              }}>
                {currentM.status || 'Open'}
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                {currentM.matterType}
              </span>
            </div>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: '#FFF', fontWeight: 700, margin: 0 }}>
              {currentM.title}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {currentM.court} • {currentM.client} ({currentM.clientRole || 'Plaintiff'}) v. {currentM.oppositeParty || 'Opposing Party'}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => openEditModal(currentM)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
            >
              <Edit size={14} />
              <span>Edit Matter</span>
            </button>

            {currentM.status !== 'Closed' && currentM.status !== 'Archived' ? (
              <button
                onClick={() => handleQuickStatusChange(currentM.id, 'Closed')}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem' }}
              >
                <CheckCircle2 size={14} color="#94A3B8" />
                <span>Close Matter</span>
              </button>
            ) : (
              <button
                onClick={() => handleQuickStatusChange(currentM.id, 'Open')}
                className="btn btn-outline-gold"
                style={{ fontSize: '0.75rem' }}
              >
                <RotateCcw size={14} />
                <span>Reopen Matter</span>
              </button>
            )}

            {currentM.status !== 'Archived' && (
              <button
                onClick={() => handleQuickStatusChange(currentM.id, 'Archived')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem' }}
                title="Archive Matter"
              >
                <Archive size={14} />
                <span>Archive</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onSelectMatter) onSelectMatter(currentM);
                if (setActiveTab) setActiveTab('editor');
              }}
              className="btn btn-gold"
              style={{ fontSize: '0.75rem' }}
            >
              <FileText size={14} />
              <span>Open in Dossier Editor</span>
            </button>
          </div>
        </div>

        {/* Workspace Quick Stat Highlights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem'
        }}>
          <div className="legal-card" style={{ padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NEXT HEARING DATE</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38BDF8', marginTop: '0.2rem' }}>
              {currentM.nextHearingDate || 'No Hearing Scheduled'}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              {currentM.judge || "Hon'ble Bench"}
            </span>
          </div>

          <div className="legal-card" style={{ padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PLEADINGS & EXHIBITS</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF', marginTop: '0.2rem' }}>
              {currentM.documentsCount || currentM.documents?.length || 0} Documents
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              Linked in evidence repository
            </span>
          </div>

          <div className="legal-card" style={{ padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CLAIM / SUIT VALUE</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-light)', marginTop: '0.2rem' }}>
              {currentM.claimAmount || '₹ 0'}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              Filing Date: {currentM.filingDate || '2026-01-15'}
            </span>
          </div>

          <div className="legal-card" style={{ padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ASSIGNED COUNSEL</span>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#FFF', marginTop: '0.2rem' }}>
              {currentM.assignedLawyer || 'Lead Advocate'}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              Priority: <strong style={{ color: currentM.priority === 'Critical' ? '#EF4444' : 'var(--gold-light)' }}>{currentM.priority || 'Medium'}</strong>
            </span>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.25rem'
        }}>
          {[
            { id: 'overview', label: 'Overview & Notes', icon: Scale },
            { id: 'documents', label: `Documents (${currentM.documents?.length || 0})`, icon: FileText },
            { id: 'hearings', label: `Hearings (${currentM.hearings?.length || 0})`, icon: Calendar },
            { id: 'drafts', label: `AI Drafts (${currentM.drafts?.length || 0})`, icon: Sparkles },
            { id: 'timeline', label: `Activity Timeline (${workspaceTimeline.length})`, icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = workspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setWorkspaceTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px 6px 0 0',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--gold-primary)' : '2px solid transparent',
                  backgroundColor: isActive ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  color: isActive ? 'var(--gold-light)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Icon size={14} color={isActive ? 'var(--gold-primary)' : 'var(--text-muted)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & NOTES */}
        {workspaceTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.25rem' }}>
            <div className="legal-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-light)', margin: 0 }}>
                Matter Synopsis & Core Legal Issues
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {currentM.summary || 'No synopsis provided for this matter yet.'}
              </p>

              {currentM.notes && (
                <div style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold-primary)', marginBottom: '0.3rem' }}>
                    Internal Case Notes & Strategy
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-line' }}>
                    {currentM.notes}
                  </p>
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.85rem',
                fontSize: '0.78rem',
                backgroundColor: 'var(--bg-surface)',
                padding: '0.85rem',
                borderRadius: '6px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Jurisdiction:</span>
                  <div style={{ fontWeight: 500, color: '#FFF' }}>{currentM.jurisdiction || 'New Delhi, India'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Opposing Counsel:</span>
                  <div style={{ fontWeight: 500, color: '#FFF' }}>{currentM.opposingCounsel || 'Counsel on Record'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Current Procedural Stage:</span>
                  <div style={{ fontWeight: 500, color: 'var(--gold-light)' }}>{currentM.stage || 'Pleadings & Injunction'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Filing Date:</span>
                  <div style={{ fontWeight: 500, color: '#FFF' }}>{currentM.filingDate || '2026-01-15'}</div>
                </div>
              </div>
            </div>

            {/* Statutes Card */}
            <div className="legal-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-light)', margin: 0 }}>
                Statutory Provisions Involved
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(currentM.statutesInvolved || ['Code of Civil Procedure 1908', 'Bharatiya Sakshya Adhiniyam 2023']).map((st, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.5rem 0.65rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Scale size={14} color="var(--gold-primary)" />
                    <span>{st}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveTab && setActiveTab('research')}
                className="btn btn-outline-gold"
                style={{ fontSize: '0.75rem', marginTop: 'auto' }}
              >
                <span>Research Statutes on India Code</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENTS DOSSIER */}
        {workspaceTab === 'documents' && (
          <div className="legal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFF', margin: 0 }}>
                Pleadings, Affidavits & Evidence Exhibits
              </h3>
              <button
                onClick={() => {
                  if (onSelectMatter) onSelectMatter(currentM);
                  if (setActiveTab) setActiveTab('editor');
                }}
                className="btn btn-gold"
                style={{ fontSize: '0.75rem' }}
              >
                <Plus size={14} />
                <span>Upload New Pleading</span>
              </button>
            </div>

            {!currentM.documents || currentM.documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '0.95rem', color: '#FFF', marginBottom: '0.3rem' }}>
                  No pleadings or exhibits filed yet
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Upload a plaint, written statement, or contract to start evidence indexing and risk radar.
                </p>
                <button
                  onClick={() => {
                    if (onSelectMatter) onSelectMatter(currentM);
                    if (setActiveTab) setActiveTab('editor');
                  }}
                  className="btn btn-gold"
                  style={{ marginTop: '0.85rem' }}
                >
                  <Plus size={14} /> Upload Pleading
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentM.documents.map(d => (
                  <div
                    key={d.id}
                    onClick={() => {
                      if (onSelectMatter) onSelectMatter(currentM);
                      if (setActiveTab) setActiveTab('editor');
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={18} color="var(--gold-primary)" />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFF' }}>
                          {d.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Filed: {d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                      {d.documentType || 'Pleading'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HEARINGS */}
        {workspaceTab === 'hearings' && (
          <div className="legal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFF', margin: 0 }}>
                Court Hearings & Procedural Docket
              </h3>
              <button
                onClick={() => {
                  if (setActiveTab) setActiveTab('calendar');
                }}
                className="btn btn-gold"
                style={{ fontSize: '0.75rem' }}
              >
                <Plus size={14} />
                <span>Schedule Hearing in Calendar</span>
              </button>
            </div>

            {!currentM.hearings || currentM.hearings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Calendar size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '0.95rem', color: '#FFF', marginBottom: '0.3rem' }}>
                  No hearings scheduled for this matter
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Add upcoming hearing dates to receive automated in-app reminders.
                </p>
                <button
                  onClick={() => {
                    if (setActiveTab) setActiveTab('calendar');
                  }}
                  className="btn btn-gold"
                  style={{ marginTop: '0.85rem' }}
                >
                  <Plus size={14} /> Schedule First Hearing
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {currentM.hearings.map(h => {
                  const hStatus = getStatusBadge(h.status);
                  return (
                    <div
                      key={h.id}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold-light)' }}>
                            {h.date || h.hearingDate?.slice(0, 10)} at {h.time || '10:30'} IST
                          </span>
                          <span style={{
                            backgroundColor: hStatus.bg,
                            color: hStatus.color,
                            border: `1px solid ${hStatus.border}`,
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {h.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#FFF', fontWeight: 600 }}>
                          {h.hearingType} • {h.location || 'Courtroom 4'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {h.notes || 'No procedural notes entered.'}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (setActiveTab) setActiveTab('calendar');
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                      >
                        <span>View in Calendar</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AI DRAFTS */}
        {workspaceTab === 'drafts' && (
          <div className="legal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFF', margin: 0 }}>
                Generated Legal Drafts & Pleadings
              </h3>
              <button
                onClick={() => {
                  if (onSelectMatter) onSelectMatter(currentM);
                  if (setActiveTab) setActiveTab('drafting');
                }}
                className="btn btn-gold"
                style={{ fontSize: '0.75rem' }}
              >
                <Sparkles size={14} />
                <span>Open AI Drafting Studio</span>
              </button>
            </div>

            {!currentM.drafts || currentM.drafts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Sparkles size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '0.95rem', color: '#FFF', marginBottom: '0.3rem' }}>
                  No AI drafts generated for this matter yet
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Draft legal notices, injunction petitions, or contract clauses grounded in this matter's evidence.
                </p>
                <button
                  onClick={() => {
                    if (onSelectMatter) onSelectMatter(currentM);
                    if (setActiveTab) setActiveTab('drafting');
                  }}
                  className="btn btn-gold"
                  style={{ marginTop: '0.85rem' }}
                >
                  <Sparkles size={14} /> Launch AI Drafting Studio
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentM.drafts.map(dr => (
                  <div
                    key={dr.id}
                    onClick={() => {
                      if (onSelectMatter) onSelectMatter(currentM);
                      if (setActiveTab) setActiveTab('drafting');
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFF' }}>
                        {dr.title || 'Legal Draft'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Last modified: {dr.updatedAt ? new Date(dr.updatedAt).toLocaleDateString('en-IN') : 'N/A'}
                      </div>
                    </div>
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                      {dr.documentType || 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ACTIVITY TIMELINE */}
        {workspaceTab === 'timeline' && (
          <div className="legal-card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '1.25rem' }}>
              Chronological Audit & Activity Trail
            </h3>

            {workspaceTimeline.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                No recorded actions yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.5rem' }}>
                {/* Vertical timeline bar */}
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  backgroundColor: 'var(--border-gold)'
                }} />

                {workspaceTimeline.map((item, idx) => (
                  <div key={item.id || idx} style={{ position: 'relative' }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-1.85rem',
                      top: '4px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--gold-primary)',
                      border: '2px solid var(--bg-card)'
                    }} />

                    <div style={{
                      backgroundColor: 'var(--bg-surface)',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--gold-muted)' }}>
                          {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.35rem 0' }}>
                        {item.description}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span className="badge badge-gold" style={{ fontSize: '0.62rem' }}>
                          {item.badge}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Recorded by: {item.actor || 'System'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER MAIN MATTERS DOCKET LIST VIEW
  // ==========================================
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
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-gold">CASE MANAGEMENT</span>
            <span className="badge badge-info">Multi-User Isolated Dockets</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#FFF', fontWeight: 700 }}>
            Litigation & Arbitration Matters
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Indian Supreme Court, High Courts, NCLT, and Commercial Division litigation tracking.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              title: '',
              matterNumber: `CS(COMM)/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
              cnr: `DLHC01${Math.floor(10000000 + Math.random() * 90000000)}`,
              court: 'High Court of Delhi',
              matterType: 'Commercial Suit',
              jurisdiction: 'New Delhi, India',
              client: '',
              clientRole: 'Plaintiff',
              oppositeParty: '',
              opposingCounsel: '',
              judge: "Hon'ble Commercial Division Bench",
              priority: 'High',
              status: 'Open',
              claimAmount: '₹ 50,00,000',
              filingDate: new Date().toISOString().slice(0, 10),
              nextHearingDate: '',
              assignedLawyer: 'Lead Advocate',
              summary: '',
              notes: ''
            });
            setDuplicateWarning(null);
            setShowCreateModal(true);
          }}
          className="btn btn-gold"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Legal Matter</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem'
      }}>
        <div className="legal-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <span>TOTAL MATTERS</span>
            <Briefcase size={15} color="var(--gold-primary)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-serif)', marginTop: '0.2rem' }}>
            {matterStats.totalMatters}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Across all active jurisdictions
          </div>
        </div>

        <div className="legal-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <span>ACTIVE CASES</span>
            <Scale size={15} color="#34D399" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34D399', fontFamily: 'var(--font-serif)', marginTop: '0.2rem' }}>
            {matterStats.activeMatters}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Open & Pending dockets
          </div>
        </div>

        <div 
          className="legal-card" 
          style={{ padding: '0.85rem 1rem', cursor: 'pointer', transition: 'border-color 0.15s ease' }}
          onClick={() => setActiveTab && setActiveTab('calendar')}
          title="Click to view Hearing Calendar"
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <span>HEARINGS IN 30 DAYS</span>
            <Calendar size={15} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#38BDF8', fontFamily: 'var(--font-serif)', marginTop: '0.2rem' }}>
            {matterStats.upcomingHearings30Days}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>Open in Hearing Calendar</span>
            <ChevronRight size={12} />
          </div>
        </div>

        <div className="legal-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <span>CLOSED / ARCHIVED</span>
            <Archive size={15} color="#94A3B8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#94A3B8', fontFamily: 'var(--font-serif)', marginTop: '0.2rem' }}>
            {matterStats.closedMatters}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Concluded & settled matters
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: 'var(--bg-secondary)',
        padding: '0.85rem 1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Status Tab Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-surface)',
            padding: '0.2rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            {[
              { id: 'ALL', label: 'All Matters' },
              { id: 'Open', label: 'Open' },
              { id: 'Pending', label: 'Pending' },
              { id: 'On Hold', label: 'On Hold' },
              { id: 'Closed', label: 'Closed / Archived' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                style={{
                  background: statusTab === tab.id ? 'var(--gold-gradient)' : 'transparent',
                  color: statusTab === tab.id ? '#0B1120' : 'var(--text-secondary)',
                  fontWeight: statusTab === tab.id ? 700 : 500,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredMatters.length}</strong> of {matters.length} matter(s)
          </span>
        </div>

        {/* Search & Dropdown Filters Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="legal-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, case number, client, opposing party or CNR..."
              style={{ paddingLeft: '2.2rem', fontSize: '0.8rem' }}
            />
          </div>

          <select
            value={selectedCourt}
            onChange={(e) => setSelectedCourt(e.target.value)}
            className="legal-select"
            style={{ width: 'auto', fontSize: '0.75rem' }}
          >
            <option value="ALL">All Indian Courts</option>
            <option value="Delhi">High Court of Delhi</option>
            <option value="Bombay">High Court of Judicature at Bombay</option>
            <option value="Karnataka">High Court of Karnataka</option>
            <option value="Supreme">Supreme Court of India</option>
            <option value="NCLT">NCLT / NCLAT</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="legal-select"
            style={{ width: 'auto', fontSize: '0.75rem' }}
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="legal-select"
            style={{ width: 'auto', fontSize: '0.75rem' }}
          >
            <option value="updatedAt_desc">Sort: Recently Updated</option>
            <option value="nextHearingDate_asc">Sort: Soonest Hearing Date</option>
            <option value="filingDate_desc">Sort: Filing Date (Newest)</option>
            <option value="title_asc">Sort: Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Matters Cards Grid */}
      {filteredMatters.length === 0 ? (
        <div className="legal-card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <Briefcase size={38} color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.8 }} />
          <h4 style={{ fontSize: '1.05rem', color: '#FFF', marginBottom: '0.35rem' }}>
            No legal matters found matching criteria
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
            Try adjusting your search query, status filters, or register a new legal matter docket.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-gold"
            style={{ marginTop: '1rem' }}
          >
            <Plus size={15} /> Register New Matter
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1rem'
        }}>
          {filteredMatters.map((matter) => {
            const isSelected = activeMatter?.id === matter.id;
            const statusStyle = getStatusBadge(matter.status || 'Open');

            return (
              <div
                key={matter.id}
                className={`legal-card ${isSelected ? 'legal-card-gold' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)',
                  transition: 'border-color 0.15s ease, transform 0.15s ease'
                }}
                onClick={() => setSelectedWorkspaceMatter(matter)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className="badge badge-gold font-mono" style={{ fontSize: '0.7rem' }}>
                        {matter.matterNumber || 'CASE'}
                      </span>
                      <span style={{
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                        fontSize: '0.62rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        {matter.status || 'Open'}
                      </span>
                    </div>

                    <span className={`badge ${matter.priority === 'Critical' ? 'badge-danger' : matter.priority === 'High' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                      {matter.priority || 'Medium'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                    {matter.title}
                  </h3>

                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.75rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4
                  }}>
                    {matter.summary || 'Matter registered in DraftMate Legal Workbench.'}
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.45rem',
                    fontSize: '0.72rem',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    marginBottom: '0.75rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Court:</span>
                      <div style={{ fontWeight: 500, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {matter.court}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Next Hearing:</span>
                      <div style={{ fontWeight: 600, color: matter.nextHearingDate ? '#38BDF8' : 'var(--text-muted)' }}>
                        {matter.nextHearingDate || 'TBD'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Client:</span>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {matter.client}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Pleadings Filed:</span>
                      <div style={{ fontWeight: 500, color: 'var(--gold-light)' }}>
                        {matter.documentsCount || 0} document(s)
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                    {matter.matterType}
                  </span>

                  <div style={{ display: 'flex', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditModal(matter)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem' }}
                      title="Edit Matter"
                    >
                      <Edit size={12} />
                    </button>

                    <button
                      onClick={() => setSelectedWorkspaceMatter(matter)}
                      className="btn btn-gold"
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                    >
                      <span>Workspace</span>
                      <ChevronRight size={13} />
                    </button>

                    <button
                      onClick={() => setMatterToDelete(matter)}
                      className="btn btn-danger"
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.45rem' }}
                      title="Delete Matter"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MATTER MODAL */}
      {showCreateModal && (
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
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-gold)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gold-light)', margin: 0 }}>
                Register New Indian Legal Matter
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Non-blocking Duplicate Warning Banner */}
            {duplicateWarning && (
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #F59E0B',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: '#FDE68A',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Matter Title * (e.g. Bharat Biotech v. Union of India)
                </label>
                <input
                  type="text"
                  required
                  className="legal-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Apex Bio Pvt Ltd v. Delhi Development Authority"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Case Number / Matter Number
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.matterNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, matterNumber: e.target.value });
                      checkDuplicateNumber(e.target.value, formData.cnr);
                    }}
                    placeholder="e.g. CS(COMM)/2026/184"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    CNR (Case Number Record)
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.cnr}
                    onChange={(e) => {
                      setFormData({ ...formData, cnr: e.target.value });
                      checkDuplicateNumber(formData.matterNumber, e.target.value);
                    }}
                    placeholder="e.g. DLHC010048212026"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Court / Forum
                  </label>
                  <select
                    className="legal-select"
                    value={formData.court}
                    onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                  >
                    <option value="High Court of Delhi">High Court of Delhi</option>
                    <option value="High Court of Judicature at Bombay">High Court of Judicature at Bombay</option>
                    <option value="High Court of Karnataka">High Court of Karnataka</option>
                    <option value="Supreme Court of India">Supreme Court of India</option>
                    <option value="National Company Law Tribunal (NCLT)">NCLT / NCLAT</option>
                    <option value="Arbitral Tribunal (Domestic)">Arbitral Tribunal (Domestic)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Matter Type
                  </label>
                  <select
                    className="legal-select"
                    value={formData.matterType}
                    onChange={(e) => setFormData({ ...formData, matterType: e.target.value })}
                  >
                    <option value="Commercial Suit">Commercial Suit</option>
                    <option value="Anticipatory Bail Application">Anticipatory Bail Application</option>
                    <option value="Section 11 Arbitration Petition">Section 11 Arbitration Petition</option>
                    <option value="Section 138 NI Act Complaint">Section 138 NI Act Complaint</option>
                    <option value="Writ Petition (Civil/Criminal)">Writ Petition</option>
                    <option value="Company Petition (IBC)">Company Petition (IBC)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="legal-input"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder="e.g. Apex Bio Pvt Ltd"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Client Role
                  </label>
                  <select
                    className="legal-select"
                    value={formData.clientRole}
                    onChange={(e) => setFormData({ ...formData, clientRole: e.target.value })}
                  >
                    <option value="Plaintiff">Plaintiff</option>
                    <option value="Defendant">Defendant</option>
                    <option value="Petitioner">Petitioner</option>
                    <option value="Respondent">Respondent</option>
                    <option value="Applicant / Accused">Applicant / Accused</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Opposing Party
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.oppositeParty}
                    onChange={(e) => setFormData({ ...formData, oppositeParty: e.target.value })}
                    placeholder="e.g. Union of India / State"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Jurisdiction / Place of Cause
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.jurisdiction}
                    onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                    placeholder="e.g. New Delhi, India"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Initial Status
                  </label>
                  <select
                    className="legal-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Priority
                  </label>
                  <select
                    className="legal-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Filing Date
                  </label>
                  <input
                    type="date"
                    className="legal-input"
                    value={formData.filingDate}
                    onChange={(e) => setFormData({ ...formData, filingDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Next Hearing Date (Optional, Auto-schedules in Calendar)
                  </label>
                  <input
                    type="date"
                    className="legal-input"
                    value={formData.nextHearingDate}
                    onChange={(e) => setFormData({ ...formData, nextHearingDate: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Assigned Lawyer / Lead Counsel
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.assignedLawyer}
                    onChange={(e) => setFormData({ ...formData, assignedLawyer: e.target.value })}
                    placeholder="e.g. Adv. Rajesh Kumar"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Synopsis & Litigious Claims
                </label>
                <textarea
                  className="legal-textarea"
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Summary of breach of contract, interim injunction grounds, or statutory relief..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-gold"
                >
                  {isSubmitting ? 'Registering Docket...' : 'Register Legal Matter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATTER MODAL */}
      {showEditModal && editingMatter && (
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
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-gold)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gold-light)', margin: 0 }}>
                Edit Matter Docket: {editingMatter.title}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Matter Title *
                </label>
                <input
                  type="text"
                  required
                  className="legal-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Status
                  </label>
                  <select
                    className="legal-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed">Closed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Priority
                  </label>
                  <select
                    className="legal-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="legal-input"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Opposing Party
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.oppositeParty}
                    onChange={(e) => setFormData({ ...formData, oppositeParty: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Court / Forum
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.court}
                    onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Next Hearing Date
                  </label>
                  <input
                    type="date"
                    className="legal-input"
                    value={formData.nextHearingDate}
                    onChange={(e) => setFormData({ ...formData, nextHearingDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Matter Notes & Litigation Strategy
                </label>
                <textarea
                  className="legal-textarea"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Record strategic directions, key citations or compliance requirements..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-gold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {matterToDelete && (
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
              <Trash2 size={20} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Confirm Permanent Matter Deletion
              </h4>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Are you sure you want to permanently delete matter <strong>"{matterToDelete.title}"</strong>? All associated filings, hearings, reminders, and draft files will be permanently purged.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMatterToDelete(null)}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await api.deleteMatter(matterToDelete.id);
                    if (onMatterDeleted) onMatterDeleted(matterToDelete.id);
                    if (showToast) showToast(`Matter "${matterToDelete.title}" and associated dossier deleted.`, 'info');
                    loadStats();
                  } catch (err) {
                    if (showToast) showToast(`Delete failed: ${err.message}`, 'error');
                  } finally {
                    setIsDeleting(false);
                    setMatterToDelete(null);
                  }
                }}
                className="btn btn-danger"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.9rem', backgroundColor: '#DC2626', borderColor: '#DC2626', color: '#FFF', fontWeight: 600 }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Matter Dossier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
