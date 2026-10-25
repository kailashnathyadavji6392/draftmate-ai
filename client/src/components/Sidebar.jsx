import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Feather, 
  BookOpen, 
  ShieldAlert, 
  CheckCircle2, 
  GitCompare, 
  Settings, 
  Scale,
  Sparkles,
  LogOut,
  Calendar
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  mattersCount = 0, 
  docsCount = 0, 
  upcomingHearingsCount = 0,
  isAiConfigured = false,
  currentUser = null,
  onLogout
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'matters', label: 'Matters', icon: Briefcase, badge: mattersCount },
    { id: 'calendar', label: 'Hearing Calendar', icon: Calendar, badge: upcomingHearingsCount },
    { id: 'documents', label: 'Documents', icon: FileText, badge: docsCount },
    { id: 'drafting', label: 'AI Drafting', icon: Feather, highlight: true },
    { id: 'research', label: 'Legal Research', icon: BookOpen },
    { id: 'risk', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'verification', label: 'Verification', icon: CheckCircle2 },
    { id: 'redline', label: 'Redline Compare', icon: GitCompare },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'relative',
      zIndex: 20
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          background: 'var(--gold-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--gold-glow)'
        }}>
          <Scale size={22} color="#0B1120" strokeWidth={2.4} />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.15rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            Draft<span style={{ color: 'var(--gold-primary)' }}>Mate</span>
          </h1>
          <p style={{
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gold-muted)',
            fontWeight: 600
          }}>
            Evidence Intelligence
          </p>
        </div>
      </div>

      {/* Jurisdiction Pill */}
      <div style={{
        margin: '0.85rem 1rem 0.5rem',
        padding: '0.45rem 0.75rem',
        background: 'rgba(212, 175, 55, 0.06)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.7rem'
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>Jurisdiction</span>
        <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>India (BNS/BNSS/BSA)</span>
      </div>

      {/* Navigation Links */}
      <nav style={{
        flex: 1,
        padding: '0.75rem 0.65rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                border: isActive ? '1px solid var(--border-gold)' : '1px solid transparent',
                backgroundColor: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                color: isActive ? 'var(--gold-light)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon 
                size={18} 
                color={isActive ? 'var(--gold-primary)' : 'var(--text-muted)'} 
                strokeWidth={isActive ? 2.2 : 1.8} 
              />
              <span style={{ flex: 1 }}>{item.label}</span>

              {item.highlight && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  background: 'var(--gold-gradient)',
                  color: '#0B1120',
                  fontWeight: 700
                }}>
                  AI
                </span>
              )}

              {item.badge !== undefined && item.badge > 0 && !item.highlight && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-dark)'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Engine Status Footer */}
      <div style={{
        padding: '0.85rem 1rem',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-primary)',
        fontSize: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>AI Provider</span>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: isAiConfigured ? '#34D399' : '#FBBF24',
            fontWeight: 500
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isAiConfigured ? '#10B981' : '#F59E0B'
            }} />
            {isAiConfigured ? 'Gemini 2.0' : 'Legal Engine'}
          </span>
        </div>
        <div style={{
          fontSize: '0.68rem',
          color: 'var(--text-muted)'
        }}>
          Court Rules: Supreme Court & High Courts
        </div>
      </div>

      {/* Advocate Session & Logout Action */}
      {currentUser && (
        <div style={{
          padding: '0.75rem 0.85rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4AF37, #996515)',
              color: '#060A12',
              fontWeight: 700,
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'AD'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.name}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.email}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sign out of advocate session"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              padding: '0.45rem',
              color: '#F87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}
