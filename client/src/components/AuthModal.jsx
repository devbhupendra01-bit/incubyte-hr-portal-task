import React, { useState } from 'react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [identifier, setIdentifier] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(identifier, password);
      onAuthSuccess(res.token);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    const demoEmail = 'admin@example.com';
    const demoPass = 'admin123';
    try {
      const res = await api.login(demoEmail, demoPass);
      onAuthSuccess(res.token);
      onClose();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <h3>Admin Sign In</h3>
            <p className="modal-subtitle">
              Sign in to access employee directory &amp; salary management
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Exposed Demo Credentials Card */}
        <div className="demo-credentials-card">
          <div className="demo-credentials-header">
            <span className="demo-badge">DEMO APPLICATION</span>
            <span className="demo-badge-sub">Single Admin User</span>
          </div>
          <div className="demo-cred-list">
            <div className="demo-cred-item">
              <span className="demo-cred-label">Username / Email:</span>
              <code className="demo-cred-val">admin@example.com</code>
            </div>
            <div className="demo-cred-item">
              <span className="demo-cred-label">Password:</span>
              <code className="demo-cred-val">admin123</code>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ paddingTop: '0.75rem' }}>
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                type="text"
                className="form-input"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <button
                type="button"
                className="btn btn-secondary demo-login-btn"
                style={{ width: '100%' }}
                onClick={handleDemoLogin}
                disabled={loading}
              >
                ⚡ One-Click Demo Admin Login
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
