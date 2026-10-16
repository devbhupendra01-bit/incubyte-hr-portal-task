import React, { useState } from 'react';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    )
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    id: 'salary-management',
    label: 'Salary Management',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    )
  },
  {
    id: 'payment-history',
    label: 'Payment History',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    )
  }
];

export default function Sidebar({ activeTab, setActiveTab, token, onOpenAuth, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="mobile-header">
        <button className="mobile-hamburger-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle Navigation Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
        <div className="mobile-brand">
          <div className="brand-icon">₹</div>
          <span className="brand-title">ESMS India</span>
        </div>
        {token ? (
          <button className="btn btn-sm btn-outline-danger" onClick={onLogout}>Logout</button>
        ) : (
          <button className="btn btn-sm btn-primary" onClick={onOpenAuth}>Sign In</button>
        )}
      </header>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand-wrapper">
          <div className="brand-logo-container">
            <div className="brand-symbol">₹</div>
            <div className="brand-text-block">
              <span className="brand-name">PayPulse</span>
              <span className="brand-badge">INR Payroll</span>
            </div>
          </div>
          <div className="currency-pill">
            <span className="dot online-dot" />
            <span>INR (₹)</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">MAIN NAVIGATION</div>
          <ul className="nav-menu">
            {NAV_ITEMS.map(item => (
              <li key={item.id} className="nav-item">
                <button className={`nav-link ${activeTab === item.id ? 'active' : ''}`} onClick={() => handleSelect(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {activeTab === item.id && <span className="active-indicator" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          {token ? (
            <div className="user-profile-widget">
              <div className="user-avatar">AD</div>
              <div className="user-meta">
                <span className="user-name">Payroll Admin</span>
                <span className="user-role">Administrator</span>
              </div>
              <button className="logout-icon-btn" onClick={onLogout} title="Sign Out" aria-label="Sign Out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="sidebar-auth-cta">
              <p className="auth-hint">Sign in to manage employees &amp; run payroll</p>
              <button className="btn btn-primary btn-sm btn-block" onClick={onOpenAuth}>Sign In</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
