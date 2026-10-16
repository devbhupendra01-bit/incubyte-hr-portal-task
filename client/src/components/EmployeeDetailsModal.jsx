import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency, formatINR } from '../utils/currency';

export default function EmployeeDetailsModal({ employee, onClose, onEdit }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!employee) {
      setDetails(null);
      setError('');
      return;
    }

    const empId = typeof employee === 'string' ? employee : (employee.id || employee.employeeId);
    const hasFullData = typeof employee === 'object' && employee.dateOfJoining && employee.salary !== undefined;

    if (hasFullData) setDetails(employee);
    else setDetails(typeof employee === 'object' ? employee : null);

    if (!empId) return;

    if (!hasFullData) setLoading(true);

    api.getEmployee(empId)
      .then(res => { if (res) { setDetails(res); setError(''); } })
      .catch(() => { if (typeof employee === 'string') setError('Could not load employee details.'); })
      .finally(() => setLoading(false));
  }, [employee]);

  if (!employee) return null;

  const emp = details || (typeof employee === 'object' ? employee : {});
  const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
  const validDate = joinDate && !isNaN(joinDate.getTime());
  const tenure = validDate ? Math.max(0, (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1) : null;
  const salary = typeof emp.salary === 'number' ? emp.salary : parseFloat(emp.salary) || 0;
  const monthlySalary = Math.round(salary / 12);
  const initials = `${(emp.firstName || '').charAt(0)}${(emp.lastName || '').charAt(0)}`.toUpperCase() || 'EMP';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Employee Profile</h3>
            {emp.employeeId && <span className="emp-id-badge" style={{ marginTop: '0.25rem' }}>{emp.employeeId}</span>}
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <div className="modal-body">
          {loading && !details ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
              <div className="suggestions-spinner" style={{ width: '28px', height: '28px', margin: '0 auto 0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading employee details...</p>
            </div>
          ) : error && !details ? (
            <div className="alert alert-danger" style={{ margin: '1rem 0' }}>{error}</div>
          ) : (
            <>
              <div className="profile-header-card">
                <div className="profile-avatar">{initials}</div>
                <div className="profile-info">
                  <h4>{emp.firstName || 'Employee'} {emp.lastName || ''}</h4>
                  <p className="profile-role">{emp.designation || 'Staff'} {emp.department ? `• ${emp.department}` : ''}</p>
                  <p className="profile-email">{emp.email || 'No email specified'}</p>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Annual Salary</span>
                  <span className="detail-value" style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '1.15rem' }}>
                    {formatCurrency(salary)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Monthly Payroll</span>
                  <span className="detail-value" style={{ color: '#059669', fontWeight: '600' }}>
                    {formatINR(monthlySalary)} / month
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">
                    {emp.country === 'India' ? '🇮🇳 ' : '🌍 '}
                    {emp.city ? `${emp.city}, ` : ''}{emp.country || 'India'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date of Joining</span>
                  <span className="detail-value">
                    {validDate ? joinDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tenure</span>
                  <span className="detail-value">{tenure !== null ? `${tenure} Years` : '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{emp.phone || 'Not specified'}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="detail-label">System Record ID</span>
                  <span className="detail-value" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    {emp.id || emp.employeeId || '—'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {onEdit && (
            <button className="btn btn-primary" disabled={loading || !emp.id} onClick={() => { onClose(); onEdit(emp); }}>
              Edit Employee
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
