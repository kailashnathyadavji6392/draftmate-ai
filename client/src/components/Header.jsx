import React from 'react';
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Calendar,
  LogOut,
  UserCheck
} from 'lucide-react';

export default function Header({ 
  matters = [], 
  activeMatter = null, 
  setActiveMatter, 
  onNewMatterClick, 
  onUploadClick, 
  onSettingsClick,
  configStatus,
  currentUser = null,
  onLogout
}) {
  const isAiOnline = configStatus?.aiIntegration?.isConfigured;

  // Extract advocate initials for avatar badge
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'relative',
      zIndex: 10
    }}>
      {/* Active Matter Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '0.4rem 0.85rem'
        }}>
          <Building2 size={16} color="var(--gold-primary)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Matter
            </span>
            <select
              value={activeMatter?.id || ''}
              onChange={(e) => {
                const found = matters.find(m => m.id === e.target.value);
                if (found) setActiveMatter(found);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                minWidth: '220px',
                maxWidth: '380px',
                textOverflow: 'ellipsis'
              }}
            >
              {matters.length === 0 && <option value="">No Matters Loaded</option>}
              {matters.map((m) => (
                <option key={m.id} value={m.id} style={{ background: '#0F172A', color: '#FFF' }}>
                  {m.matterNumber}: {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeMatter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-gold font-mono" style={{ fontSize: '0.72rem' }}>
              CNR: {activeMatter.cnr || 'Pending'}
            </span>
            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
              {activeMatter.court}
            </span>
          </div>
        )}
      </div>

      {/* Right Controls & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* AI Provider Status Pill */}
        <button
          onClick={onSettingsClick}
          style={{
            background: isAiOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${isAiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            borderRadius: '20px',
            padding: '0.35rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: isAiOnline ? '#34D399' : '#FBBF24',
            transition: 'all 0.2s ease'
          }}
          title={isAiOnline ? 'Gemini 2.0 API Connected' : 'Click to configure Gemini API Key in Settings'}
        >
          {isAiOnline ? (
            <>
              <CheckCircle2 size={13} color="#10B981" />
              <span>Gemini AI Connected</span>
            </>
          ) : (
            <>
              <AlertCircle size={13} color="#F59E0B" />
              <span>Heuristic Mode (Add API Key)</span>
            </>
          )}
        </button>

        {/* Quick Upload Button */}
        <button 
          onClick={onUploadClick}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
        >
          <Upload size={14} color="var(--gold-primary)" />
          <span>Upload Doc</span>
        </button>

        {/* New Matter Button */}
        <button 
          onClick={onNewMatterClick}
          className="btn btn-gold"
          style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem' }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>New Matter</span>
        </button>

        {/* User Account Profile & Logout */}
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            paddingLeft: '0.85rem',
            borderLeft: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '0.3rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4AF37, #996515)',
                color: '#060A12',
                fontWeight: 700,
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                letterSpacing: '0.02em'
              }}>
                {initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#F8FAFC', lineHeight: 1.1 }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#94A3B8', lineHeight: 1.1 }}>
                  {currentUser.email}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="btn btn-ghost"
              style={{
                padding: '0.45rem 0.65rem',
                color: '#F87171',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem'
              }}
              title="Sign Out of Advocate Session"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
