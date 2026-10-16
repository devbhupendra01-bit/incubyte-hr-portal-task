import React, { useState } from 'react';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [companySettings, setCompanySettings] = useState({
    companyName: 'Acme Enterprise India Pvt Ltd',
    tanNumber: 'BLRA12938F',
    panNumber: 'AAACA1293F',
    payrollCycle: 'Monthly (Last Working Day)',
    salaryDisbursementDay: '28',
    currency: 'INR (₹)',
    currencyLocale: 'en-IN (Indian Numbering Format)',
    defaultTaxRegime: 'New Tax Regime (FY 2026-27)',
    allowDirectDeposit: true,
    sendEmailPayslips: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompanySettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="settings-container">
      {saved && (
        <div className="toast-notification">
          <span>✓ Organization and payroll settings saved successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System & Payroll Settings</h1>
          <p className="page-subtitle">
            Configure enterprise parameters, statutory compliance details, and default currency rules
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            Save All Changes
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* Left Column: Organization & Currency */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>Enterprise Identity & Currency Configuration</h3>
            <p>Unified INR standard for all financial transactions and reports</p>
          </div>

          <form onSubmit={handleSave} className="settings-form">
            <div className="form-group">
              <label className="form-label">Company Legal Entity Name</label>
              <input
                type="text"
                name="companyName"
                className="form-input"
                value={companySettings.companyName}
                onChange={handleChange}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Corporate PAN</label>
                <input
                  type="text"
                  name="panNumber"
                  className="form-input"
                  value={companySettings.panNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company TAN</label>
                <input
                  type="text"
                  name="tanNumber"
                  className="form-input"
                  value={companySettings.tanNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">System Operating Currency</label>
                <div className="read-only-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🇮🇳</span>
                  <strong>INR (₹) - Indian Rupee</strong>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Number Formatting Format</label>
                <div className="read-only-field">
                  Standard Indian (₹1,25,000 / Lakhs & Crores)
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Disbursement Cycle</label>
                <select
                  name="payrollCycle"
                  className="form-select"
                  value={companySettings.payrollCycle}
                  onChange={handleChange}
                >
                  <option value="Monthly (Last Working Day)">Monthly (Last Working Day)</option>
                  <option value="Bi-Weekly">Bi-Weekly</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Salary Disbursal Day</label>
                <input
                  type="number"
                  name="salaryDisbursementDay"
                  className="form-input"
                  min="1"
                  max="31"
                  value={companySettings.salaryDisbursementDay}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="allowDirectDeposit"
                  checked={companySettings.allowDirectDeposit}
                  onChange={handleChange}
                />
                <span style={{ fontSize: '0.875rem' }}>Enable automated direct deposit batch processing (NEFT/RTGS)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="sendEmailPayslips"
                  checked={companySettings.sendEmailPayslips}
                  onChange={handleChange}
                />
                <span style={{ fontSize: '0.875rem' }}>Dispatch digital salary slips automatically upon reconciliation</span>
              </label>
            </div>

            <div className="help-box" style={{ marginTop: '1.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💡</span>
              <div>
                <strong>Single-Currency Compliance Standard</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  This organization instance is configured exclusively for <strong>INR (₹)</strong> transactions to guarantee full compliance with Indian corporate accounting and statutory payroll standards.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

