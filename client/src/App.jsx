import React, { useState, useEffect, useRef } from 'react';
import { api } from './api/client';

// Core Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MatterWorkspace from './components/MatterWorkspace';
import DocumentEditor from './components/DocumentEditor';
import BottomPanels from './components/BottomPanels';
import AuthView from './components/auth/AuthView';

// Views
import DashboardView from './components/views/DashboardView';
import MattersView from './components/views/MattersView';
import DocumentsView from './components/views/DocumentsView';
import DraftingView from './components/views/DraftingView';
import ResearchView from './components/views/ResearchView';
import RiskAnalysisView from './components/views/RiskAnalysisView';
import VerificationView from './components/views/VerificationView';
import RedlineView from './components/views/RedlineView';
import SettingsView from './components/views/SettingsView';
import CalendarView from './components/views/CalendarView';

import { X, CheckCircle, AlertCircle, Info, Upload, Sparkles, FileText, Scale } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [matters, setMatters] = useState([]);
  const [activeMatter, setActiveMatter] = useState(null);
  const [hearings, setHearings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [matterEvidence, setMatterEvidence] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiInterpreting, setIsAiInterpreting] = useState(false);

  // Bottom dock analysis data state
  const [evidenceData, setEvidenceData] = useState(null);
  const [riskRadarData, setRiskRadarData] = useState(null);
  const [citationsData, setCitationsData] = useState(null);

  // Global Toast State
  const [toasts, setToasts] = useState([]);

  // Quick upload modal state
  const [showQuickUpload, setShowQuickUpload] = useState(false);
  const fileUploadInputRef = useRef(null);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Check user session on initial mount and re-verify on browser back-forward navigation
  useEffect(() => {
    checkAuthSession();

    const handlePageNavigation = (event) => {
      // Re-validate session whenever the page is revealed or popped from history
      checkAuthSession();
    };

    window.addEventListener('pageshow', handlePageNavigation);
    window.addEventListener('popstate', handlePageNavigation);

    return () => {
      window.removeEventListener('pageshow', handlePageNavigation);
      window.removeEventListener('popstate', handlePageNavigation);
    };
  }, []);

  const checkAuthSession = async () => {
    setIsAuthChecking(true);
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setCurrentUser(res.user);
        await loadInitialData();
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    await loadInitialData();
  };

  const handleLogout = async () => {
    try {
      const res = await api.logout();
      if (!res || !res.success) {
        throw new Error(res?.error || 'Server rejected logout request');
      }

      // ONLY after server-side logout succeeds:
      setCurrentUser(null);
      setMatters([]);
      setActiveMatter(null);
      setHearings([]);
      setReminders([]);
      setDocuments([]);
      setCurrentDocument(null);
      setMatterEvidence(null);
      setEvidenceData(null);
      setRiskRadarData(null);
      setCitationsData(null);
      setActiveTab('dashboard');

      showToast('Logged out of advocate session successfully.', 'info');
    } catch (err) {
      console.error('Logout failed:', err);
      showToast(`Logout failed: ${err.message || 'Server connection error'}. Please try again.`, 'error');
    }
  };

  const loadHearingsAndReminders = async () => {
    try {
      const [hearingsRes, remindersRes] = await Promise.all([
        api.getHearings(),
        api.getReminders()
      ]);
      if (hearingsRes?.success) setHearings(hearingsRes.data || []);
      if (remindersRes?.success) setReminders(remindersRes.data || []);
    } catch (err) {
      console.warn('Could not load hearings/reminders:', err.message);
    }
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [mattersRes, docsRes, cfgRes, hearingsRes, remindersRes] = await Promise.all([
        api.getMatters(),
        api.getDocuments(),
        api.getConfigStatus(),
        api.getHearings(),
        api.getReminders()
      ]);

      if (mattersRes.success && mattersRes.data.length > 0) {
        setMatters(mattersRes.data);
        const firstMatter = mattersRes.data[0];
        setActiveMatter(firstMatter);
        loadMatterEvidence(firstMatter.id);
      } else {
        setMatters([]);
        setActiveMatter(null);
        setMatterEvidence(null);
      }

      if (hearingsRes?.success) {
        setHearings(hearingsRes.data || []);
      }
      if (remindersRes?.success) {
        setReminders(remindersRes.data || []);
      }

      if (docsRes.success && docsRes.data.length > 0) {
        setDocuments(docsRes.data);
        setCurrentDocument(docsRes.data[0]);
        runDocumentAnalysis(docsRes.data[0]);
      } else {
        setDocuments([]);
        setCurrentDocument(null);
        setCitationsData(null);
        setRiskRadarData(null);
        setEvidenceData(null);
      }

      if (cfgRes.success) {
        setConfigStatus(cfgRes);
      }
    } catch (err) {
      console.error('Initial data loading error:', err);
      showToast(`Notice: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMatterEvidence = async (matterId) => {
    try {
      const res = await api.getMatterEvidence(matterId);
      if (res.success) {
        setMatterEvidence(res.data);
      }
    } catch (err) {
      console.warn('Could not load matter evidence:', err.message);
    }
  };

  const runDocumentAnalysis = async (doc) => {
    if (!doc || !doc.content) return;
    try {
      const [citeRes, riskRes, evRes] = await Promise.all([
        api.verifyCitations(doc.content),
        api.getRiskRadar({ text: doc.content }),
        api.getEvidenceSummary({ text: doc.content })
      ]);

      if (citeRes.success) setCitationsData(citeRes.data);
      if (riskRes.success) setRiskRadarData(riskRes.data);
      if (evRes.success) setEvidenceData(evRes.data);
    } catch (err) {
      console.error('Document analysis error:', err);
    }
  };

  const handleSelectDocument = (doc) => {
    setCurrentDocument(doc);
    runDocumentAnalysis(doc);
    setActiveTab('editor');
  };

  const handleSelectMatter = (matter) => {
    setActiveMatter(matter);
    loadMatterEvidence(matter.id);
    const relatedDoc = documents.find(d => d.matterId === matter.id);
    if (relatedDoc) {
      setCurrentDocument(relatedDoc);
      runDocumentAnalysis(relatedDoc);
    }
    setActiveTab('editor');
  };

  const handleDocumentUploaded = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
    setCurrentDocument(newDoc);
    runDocumentAnalysis(newDoc);
    if (activeMatter) loadMatterEvidence(activeMatter.id);
    showToast(`Document "${newDoc.title}" added to dossier.`, 'success');
  };

  const handleDocumentDeleted = (docId) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
    if (currentDocument?.id === docId) {
      const remaining = documents.filter(d => d.id !== docId);
      setCurrentDocument(remaining.length > 0 ? remaining[0] : null);
    }
    if (activeMatter) loadMatterEvidence(activeMatter.id);
  };

  const handleLoadDraftIntoEditor = (draftContent, title) => {
    const newDoc = {
      id: `draft-${Date.now()}`,
      matterId: activeMatter?.id || 'mat-ind-001',
      title: title || 'Generated_Pleading.txt',
      content: draftContent,
      documentType: 'Legal Pleading',
      wordCount: draftContent.split(/\s+/).length,
      sizeBytes: draftContent.length
    };
    setDocuments(prev => [newDoc, ...prev]);
    setCurrentDocument(newDoc);
    runDocumentAnalysis(newDoc);
    setActiveTab('editor');
    showToast('Draft loaded into Central Editor with Smart Redline view ready.', 'success');
  };

  // Fact click handler: opens source document and indicates location
  const handleFactClick = (fact) => {
    if (!fact) return;
    const targetDoc = documents.find(d => d.id === fact.sourceDocumentId) || 
                      documents.find(d => d.title === fact.sourceDocumentName);

    if (targetDoc) {
      setCurrentDocument(targetDoc);
      runDocumentAnalysis(targetDoc);
      setActiveTab('editor');
      showToast(`Navigated to fact in ${targetDoc.title} (${fact.sourceLocation})`, 'info');
    } else {
      showToast(`Fact extracted from: ${fact.sourceDocumentName} (${fact.sourceLocation})`, 'info');
    }
  };

  // Risk finding click handler: opens source document and focuses location in editor
  const handleRiskClick = (finding) => {
    if (!finding) return;
    setActiveTab('editor');
    showToast(`Inspecting clause: ${finding.title} (${finding.sourceLocation || 'Document Text'})`, 'info');
  };

  const handleNavigateToEditorFromRisk = (targetDoc, finding) => {
    if (targetDoc) {
      setCurrentDocument(targetDoc);
      runDocumentAnalysis(targetDoc);
    }
    setActiveTab('editor');
    if (finding) {
      showToast(`Inspecting clause: ${finding.title} (${finding.sourceLocation || 'Document Text'})`, 'info');
    }
  };

  // AI Interpretation runner
  const handleRunAiInterpretation = async (doc) => {
    if (!doc) return;
    setIsAiInterpreting(true);
    try {
      const res = await api.interpretDocumentWithAI(doc.id, activeMatter);
      if (res.success) {
        if (!res.data.isAiPowered && res.data.status === 'MISSING_KEY') {
          showToast('GEMINI_API_KEY is not configured. Go to Settings to configure your key.', 'warning');
        } else {
          showToast('AI evidence synthesis generated via Gemini 2.0 Flash.', 'success');
        }

        // Update document object with interpretation
        const updated = { ...doc, aiInterpretation: res.data };
        setCurrentDocument(updated);
        setDocuments(prev => prev.map(d => d.id === doc.id ? updated : d));
      }
    } catch (err) {
      showToast(`AI analysis error: ${err.message}`, 'error');
    } finally {
      setIsAiInterpreting(false);
    }
  };

  // 1. Session verification splash screen
  if (isAuthChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#060A12',
        color: '#D4AF37',
        fontFamily: 'Inter, -apple-system, sans-serif'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          marginBottom: '1.25rem'
        }}>
          <Scale size={36} color="#D4AF37" />
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
          DraftMate Evidence Intelligence
        </div>
        <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.45rem' }}>
          Securing session & isolating advocate workspace...
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Render Multi-User Auth Portal
  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} showToast={showToast} />;
  }

  // 3. Authenticated State: Render Complete Legal Tech Workbench
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      {/* 1. Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mattersCount={matters.length}
        docsCount={documents.length}
        upcomingHearingsCount={hearings.filter(h => (h.status === 'Scheduled' || h.status === 'In Progress') && new Date(h.date || h.hearingDate) >= new Date(new Date().toISOString().slice(0, 10))).length}
        isAiConfigured={configStatus?.aiIntegration?.isConfigured}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Top Header */}
        <Header
          matters={matters}
          activeMatter={activeMatter}
          setActiveMatter={(m) => {
            setActiveMatter(m);
            loadMatterEvidence(m.id);
            const related = documents.find(d => d.matterId === m.id);
            if (related) {
              setCurrentDocument(related);
              runDocumentAnalysis(related);
            }
          }}
          onNewMatterClick={() => setActiveTab('matters')}
          onUploadClick={() => setShowQuickUpload(true)}
          onSettingsClick={() => setActiveTab('settings')}
          configStatus={configStatus}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* View Switcher Container */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <DashboardView
              matters={matters}
              documents={documents}
              hearings={hearings}
              reminders={reminders}
              activeMatter={activeMatter}
              evidenceData={evidenceData}
              onSelectMatter={handleSelectMatter}
              onSelectDocument={handleSelectDocument}
              setActiveTab={setActiveTab}
              configStatus={configStatus}
            />
          )}

          {/* Matters View */}
          {activeTab === 'matters' && (
            <MattersView
              matters={matters}
              activeMatter={activeMatter}
              onSelectMatter={handleSelectMatter}
              onMatterCreated={(newM) => {
                setMatters(prev => [newM, ...prev]);
                setActiveMatter(newM);
                loadMatterEvidence(newM.id);
                loadHearingsAndReminders();
              }}
              onMatterUpdated={(updatedM) => {
                setMatters(prev => prev.map(m => m.id === updatedM.id ? updatedM : m));
                if (activeMatter?.id === updatedM.id) setActiveMatter(updatedM);
                loadHearingsAndReminders();
              }}
              onMatterDeleted={(id) => {
                setMatters(prev => prev.filter(m => m.id !== id));
                if (activeMatter?.id === id) {
                  const rem = matters.filter(m => m.id !== id);
                  setActiveMatter(rem.length > 0 ? rem[0] : null);
                }
                loadHearingsAndReminders();
              }}
              setActiveTab={setActiveTab}
              showToast={showToast}
            />
          )}

          {/* Calendar View */}
          {activeTab === 'calendar' && (
            <CalendarView
              matters={matters}
              activeMatter={activeMatter}
              onSelectMatter={(m) => {
                handleSelectMatter(m);
                setActiveTab('matters');
              }}
              setActiveTab={setActiveTab}
              showToast={showToast}
            />
          )}

          {/* Documents View */}
          {activeTab === 'documents' && (
            <DocumentsView
              documents={documents}
              onSelectDocument={handleSelectDocument}
              onUploadClick={() => setShowQuickUpload(true)}
              onDocumentDeleted={handleDocumentDeleted}
              showToast={showToast}
            />
          )}

          {/* AI Drafting View */}
          {activeTab === 'drafting' && (
            <DraftingView
              activeMatter={activeMatter}
              documents={documents}
              currentDocument={currentDocument}
              onLoadIntoEditor={handleLoadDraftIntoEditor}
              onSettingsClick={() => setActiveTab('settings')}
              showToast={showToast}
            />
          )}

          {/* Legal Research View */}
          {activeTab === 'research' && (
            <ResearchView showToast={showToast} />
          )}

          {/* Risk Analysis View */}
          {activeTab === 'risk' && (
            <RiskAnalysisView
              currentDocument={currentDocument}
              documents={documents}
              activeMatter={activeMatter}
              onSelectDocument={handleSelectDocument}
              onNavigateToEditor={handleNavigateToEditorFromRisk}
              showToast={showToast}
            />
          )}

          {/* Verification View */}
          {activeTab === 'verification' && (
            <VerificationView
              currentDocument={currentDocument}
              documents={documents}
              activeMatter={activeMatter}
              onSelectDocument={handleSelectDocument}
              onNavigateToEditor={handleNavigateToEditorFromRisk}
              showToast={showToast}
            />
          )}

          {/* Redline Compare View */}
          {activeTab === 'redline' && (
            <RedlineView
              documents={documents}
              currentDocument={currentDocument}
              activeMatter={activeMatter}
              onLoadIntoEditor={handleLoadDraftIntoEditor}
              showToast={showToast}
            />
          )}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <SettingsView
              configStatus={configStatus}
              currentUser={currentUser}
              onConfigUpdated={loadInitialData}
              onLogout={handleLogout}
              showToast={showToast}
            />
          )}

          {/* Central Document Editor & Matter Workspace View */}
          {activeTab === 'editor' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', flex: 1, overflow: 'hidden' }}>
                {/* Left pane: Matter Workspace with upload zone & document dossier */}
                <MatterWorkspace
                  activeMatter={activeMatter}
                  documents={documents}
                  onSelectDocument={handleSelectDocument}
                  onDocumentUploaded={handleDocumentUploaded}
                  onDocumentDeleted={handleDocumentDeleted}
                  showToast={showToast}
                />

                {/* Center pane: Central Document Editor with Smart Redline toggle */}
                <DocumentEditor
                  currentDocument={currentDocument}
                  onSaveContent={(id, newContent) => {
                    setDocuments(prev => prev.map(d => d.id === id ? { ...d, content: newContent } : d));
                    runDocumentAnalysis({ ...currentDocument, content: newContent });
                  }}
                  onRunAnalysis={(doc) => runDocumentAnalysis(doc)}
                  showToast={showToast}
                />
              </div>

              {/* Bottom Panels: Evidence Summary with Clickable Facts & Source Tracking */}
              <BottomPanels
                evidenceData={evidenceData}
                riskRadarData={riskRadarData}
                citationsData={citationsData}
                activeMatter={activeMatter}
                currentDocument={currentDocument}
                matterEvidence={matterEvidence}
                onFactClick={handleFactClick}
                onRiskClick={handleRiskClick}
                onRunAiInterpretation={handleRunAiInterpretation}
                isAiInterpreting={isAiInterpreting}
              />
            </div>
          )}
        </div>
      </div>

      {/* Global Quick Upload Modal */}
      {showQuickUpload && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
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
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--gold-light)' }}>
                Upload Legal Document / Exhibit
              </h3>
              <button
                onClick={() => setShowQuickUpload(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Target Matter: <strong style={{ color: 'var(--text-primary)' }}>{activeMatter?.title || 'General Repository'}</strong>
            </p>

            <div
              onClick={() => fileUploadInputRef.current?.click()}
              style={{
                border: '2px dashed var(--gold-primary)',
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'rgba(212, 175, 55, 0.05)',
                cursor: 'pointer'
              }}
            >
              <input
                type="file"
                ref={fileUploadInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.txt,.docx,.doc,.md"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    try {
                      const res = await api.uploadDocument(file, activeMatter?.id);
                      if (res.success) {
                        handleDocumentUploaded(res.data);
                        setShowQuickUpload(false);
                      }
                    } catch (err) {
                      showToast(`Upload failed: ${err.message}`, 'error');
                    }
                  }
                }}
              />
              <Upload size={32} color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                Choose file from computer
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                PDF, Word (.docx), Plain Text (.txt), Markdown (.md)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notifications Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast" style={{
            borderColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : 'var(--gold-primary)'
          }}>
            {toast.type === 'success' && <CheckCircle size={16} color="#10B981" />}
            {toast.type === 'error' && <AlertCircle size={16} color="#EF4444" />}
            {toast.type === 'info' && <Info size={16} color="var(--gold-primary)" />}
            <span style={{ fontSize: '0.8rem', color: '#FFF' }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
