import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  Building2, 
  ShieldCheck, 
  RefreshCw,
  Info,
  UserCheck,
  LogOut
} from 'lucide-react';
import { api } from '../../api/client';

export default function SettingsView({ configStatus, currentUser = null, onConfigUpdated, onLogout, showToast }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isConfigured = configStatus?.aiIntegration?.isConfigured;

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setIsSavingKey(true);
    try {
      const res = await api.updateApiKey(apiKeyInput.trim());
      if (res.success) {
        if (showToast) showToast('Gemini API Key configured and verified successfully!', 'success');
        setApiKeyInput('');
        if (onConfigUpdated) onConfigUpdated();
      }
    } catch (err) {
      if (showToast) showToast(`Configuration error: ${err.message}`, 'error');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      if (onConfigUpdated) await onConfigUpdated();
      if (showToast) showToast('Configuration status refreshed.', 'info');
    } finally {
      setIsRefreshing(false);
    }
  };

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-gold">SYSTEM AUDIT & SETTINGS</span>
            <span className="badge badge-info">Node v{configStatus?.system?.nodeVersion || '24'} • Express API</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#FFF', fontWeight: 700 }}>
            Workbench Configuration & AI Integration
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Configure LLM keys, inspect storage health, and verify Indian jurisdictional presets.
          </p>
        </div>

        <button
          onClick={handleRefreshStatus}
          disabled={isRefreshing}
          className="btn btn-secondary"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Advocate Account Profile Banner */}
      {currentUser && (
        <div className="legal-card" style={{
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4AF37, #996515)',
                color: '#060A12',
                fontWeight: 700,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'AD'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                    {currentUser.name}
                  </h3>
                  <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                    {currentUser.role || 'Advocate'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginTop: '0.2rem' }}>
                  {currentUser.email} • {currentUser.chamberName || 'Private Chamber'} • {currentUser.jurisdiction || 'Supreme Court & High Courts'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                padding: '0.45rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                color: '#34D399'
              }}>
                <UserCheck size={14} />
                <span>Isolated User ID: <code style={{ color: '#ECC86A' }}>{currentUser.id}</code></span>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#F87171',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    fontSize: '0.78rem',
                    padding: '0.45rem 0.85rem'
                  }}
                  title="Sign out of current advocate chamber session"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.1fr', gap: '1.25rem' }}>
        {/* Left: AI Integration Settings */}
        <div className="legal-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Key size={16} color="var(--gold-primary)" />
            Google Gemini API Integration
          </h3>

          {/* Current Status Box */}
          <div style={{
            padding: '1rem',
            backgroundColor: isConfigured ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${isConfigured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              {isConfigured ? (
                <>
                  <CheckCircle2 size={18} color="#10B981" />
                  <strong style={{ color: '#34D399', fontSize: '0.9rem' }}>Gemini 2.0 Flash Connected</strong>
                </>
              ) : (
                <>
                  <AlertCircle size={18} color="#F59E0B" />
                  <strong style={{ color: '#FBBF24', fontSize: '0.9rem' }}>Heuristic Legal Engine Active</strong>
                </>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {configStatus?.aiIntegration?.message}
            </p>
            {configStatus?.aiIntegration?.keyPreview && (
              <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--gold-light)', marginTop: '0.35rem' }}>
                Active Key: {configStatus.aiIntegration.keyPreview}
              </div>
            )}
          </div>

          {/* Key Input Form */}
          <form onSubmit={handleSaveApiKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Set or Update GEMINI_API_KEY
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="password"
                  className="legal-input font-mono"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste AI Studio API Key (AIzaSy...)"
                />
                <button
                  type="submit"
                  disabled={isSavingKey || !apiKeyInput.trim()}
                  className="btn btn-gold"
                >
                  {isSavingKey ? 'Verifying...' : 'Save & Activate'}
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Info size={13} />
              <span>Keys are stored in process environment and persisted locally to .env without exposure.</span>
            </div>
          </form>
        </div>

        {/* Right: Storage & Jurisdictions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Storage Health Card */}
          <div className="legal-card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HardDrive size={15} color="var(--gold-primary)" />
              Document Storage & Parsing Engine
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Upload Directory:</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{configStatus?.storage?.uploadDirectory || 'server/uploads'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Directory Write Status:</span>
                <span style={{ color: configStatus?.storage?.isWritable ? '#34D399' : '#F87171', fontWeight: 600 }}>
                  {configStatus?.storage?.isWritable ? 'Writable & Operational' : 'Read Only / Error'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Max Upload Limit:</span>
                <span style={{ color: 'var(--gold-light)' }}>25 MB per pleading / exhibit</span>
              </div>
            </div>
          </div>

          {/* Supported Jurisdictions */}
          <div className="legal-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={15} color="var(--gold-primary)" />
              Configured Indian Court Rules
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
              {(configStatus?.jurisdictionsSupported || [
                'Supreme Court of India (New Delhi)',
                'High Court of Delhi (Commercial Division)',
                'High Court of Judicature at Bombay',
                'High Court of Karnataka',
                'Arbitral Tribunals under 1996 Act'
              ]).map((j, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={13} color="var(--gold-primary)" />
                  <span>{j}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
