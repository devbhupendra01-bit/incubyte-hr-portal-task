import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatINR, formatCompactINR } from '../utils/currency';

const DESIGNATION_BANDS = [
  { role: 'Junior', min: 400000, max: 800000, typical: 600000 },
  { role: 'Mid-Level', min: 800000, max: 1500000, typical: 1100000 },
  { role: 'Senior', min: 1500000, max: 2400000, typical: 1950000 },
  { role: 'Lead', min: 2200000, max: 3000000, typical: 2600000 },
  { role: 'Manager', min: 2500000, max: 3500000, typical: 3000000 },
  { role: 'Director', min: 3200000, max: 4500000, typical: 3800000 },
  { role: 'VP', min: 4000000, max: 6000000, typical: 4800000 }
];

export default function SalaryManagement({ onNavigateToEmployees }) {
  const [stats, setStats] = useState(null);
  const [deptPayroll, setDeptPayroll] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick salary update search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newSalary, setNewSalary] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [statsRes, deptRes] = await Promise.all([
          api.getDashboardStats(),
          api.getDeptPayroll()
        ]);
        setStats(statsRes);
        setDeptPayroll(deptRes || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length >= 2) {
      try {
        const res = await api.getEmployees({ search: q.trim(), limit: 6 });
        setSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setNewSalary(emp.salary.toString());
    setSearchResults([]);
    setSearchQuery(`${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
  };

  const handleSalaryUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const salaryVal = parseFloat(newSalary);
    if (isNaN(salaryVal) || salaryVal < 0) {
      alert('Please enter a valid salary amount');
      return;
    }

    setUpdating(true);
    try {
      const updated = await api.updateEmployee(selectedEmployee.id, {
        salary: salaryVal
      });

      setSelectedEmployee(updated);
      showToast(`Salary for ${updated.firstName} ${updated.lastName} updated to ${formatINR(salaryVal)}`);

      // Refresh overview
      api.getDashboardStats().then(setStats).catch(() => {});
      api.getDeptPayroll().then(setDeptPayroll).catch(() => {});
    } catch (err) {
      alert('Failed to update salary: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="reports-loading-state">
        <div className="spinner-large" />
        <p>Loading Compensation & Salary Configuration...</p>
      </div>
    );
  }

  return (
    <div className="salary-mgmt-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          <span>✓ {toast}</span>
          <button className="toast-close" onClick={() => setToast('')}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary Management</h1>
          <p className="page-subtitle">
            Configure compensation structures, designation benchmarks, and individual employee remuneration (INR ₹)
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid-4">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Monthly Payroll</span>
            <span className="stat-value text-primary">{formatINR(stats?.totalMonthlyPayroll || 0)}</span>
            <span className="stat-subtext">Across {stats?.totalEmployees?.toLocaleString('en-IN')} staff members</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Average Annual CTC</span>
            <span className="stat-value">{formatINR(stats?.averageSalary || 0)}</span>
            <span className="stat-subtext">Base compensation average</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Active Currency</span>
            <span className="stat-value font-mono">INR (₹)</span>
            <span className="stat-subtext">Unified standard currency</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Payroll Cadence</span>
            <span className="stat-value text-success">Monthly</span>
            <span className="stat-subtext">Disbursed by 28th of each month</span>
          </div>
        </div>
      </div>

      <div className="salary-content-grid">
        {/* Quick Salary Adjustment Tool */}
        <div className="dashboard-table-card">
          <div className="dashboard-table-header">
            <div>
              <h3 className="chart-title">Quick Employee Salary Adjustment</h3>
              <p className="chart-subtitle">Directly review and adjust remuneration in real-time</p>
            </div>
            <span className="badge badge-green">Instant Sync</span>
          </div>

          <div style={{ padding: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Search Employee by Name or ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Type name (e.g. Amit, Priya, EMP1029)..."
                value={searchQuery}
                onChange={handleSearch}
              />
              {searchResults.length > 0 && (
                <div className="employee-dropdown-results">
                  {searchResults.map(emp => (
                    <div
                      key={emp.id}
                      className="emp-search-item"
                      onClick={() => handleSelectEmployee(emp)}
                    >
                      <div className="font-semibold">{emp.firstName} {emp.lastName} &bull; {emp.employeeId}</div>
                      <div className="text-muted text-xs">
                        {emp.designation} &bull; {emp.department} &bull; Current: {formatINR(emp.salary)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedEmployee ? (
              <form onSubmit={handleSalaryUpdateSubmit} className="salary-adjustment-box">
                <div className="selected-emp-details-card">
                  <div className="avatar-mini">
                    {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0 }}>{selectedEmployee.firstName} {selectedEmployee.lastName}</h4>
                    <span className="text-secondary text-xs">
                      {selectedEmployee.designation} &bull; {selectedEmployee.department} &bull; {selectedEmployee.city || 'India'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="text-muted text-xs block">Current Salary</span>
                    <strong className="text-primary font-mono">{formatINR(selectedEmployee.salary)}</strong>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">New Annual Salary (₹) *</label>
                    <div className="input-with-symbol">
                      <span className="currency-prefix">₹</span>
                      <input
                        type="number"
                        className="form-input has-prefix"
                        min="0"
                        step="1000"
                        value={newSalary}
                        onChange={e => setNewSalary(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">New Monthly Payout (Calculated)</label>
                    <div className="read-only-field">
                      {formatINR(Math.round(Number(newSalary || 0) / 12))} / month
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedEmployee(null);
                      setSearchQuery('');
                    }}
                  >
                    Clear Selection
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={updating}
                  >
                    {updating ? 'Updating...' : 'Save Updated Salary'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="search-prompt-box">
                <p>🔍 Search for an employee above to preview and adjust their compensation record.</p>
              </div>
            )}
          </div>
        </div>

        {/* Corporate Designation Salary Bands */}
        <div className="dashboard-table-card">
          <div className="dashboard-table-header">
            <div>
              <h3 className="chart-title">Designation Benchmark Bands</h3>
              <p className="chart-subtitle">Standardized CTC ranges for company career levels</p>
            </div>
            <span className="badge badge-blue">Policy</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Level / Role</th>
                  <th>Salary Band (Min - Max)</th>
                  <th style={{ textAlign: 'right' }}>Benchmark Midpoint</th>
                </tr>
              </thead>
              <tbody>
                {DESIGNATION_BANDS.map((band, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="designation-pill">{band.role}</span>
                    </td>
                    <td>
                      <span className="text-secondary text-sm">
                        {formatCompactINR(band.min)} – {formatCompactINR(band.max)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-semibold text-primary font-mono text-sm">
                        {formatINR(band.typical)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
