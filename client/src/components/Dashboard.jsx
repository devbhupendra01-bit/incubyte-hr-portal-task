import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatINR, formatCompactINR } from '../utils/currency';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard({ onNavigateToPayments, onNavigateToEmployees }) {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [deptPayroll, setDeptPayroll] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, trendRes, deptRes, recentRes] = await Promise.all([
        api.getDashboardStats(),
        api.getMonthlyTrend(),
        api.getDeptPayroll(),
        api.getRecentPayments()
      ]);
      setStats(statsRes);
      setTrend(trendRes || []);
      setDeptPayroll(deptRes || []);
      setRecentPayments(recentRes || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading-state">
        <div className="spinner-large" />
        <p className="loading-text">Loading Payroll Dashboard & Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '2rem' }}>
        <h4>Error loading dashboard</h4>
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>Retry</button>
      </div>
    );
  }

  const monthLabels = (trend || []).map(item => {
    const [y, m] = item.month.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  });

  const barChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Paid Amount (₹)',
        data: (trend || []).map(item => item.paidAmount),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 6
      },
      {
        label: 'Pending Amount (₹)',
        data: (trend || []).map(item => item.pendingAmount),
        backgroundColor: 'rgba(245, 158, 11, 0.85)',
        borderColor: '#f59e0b',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: { family: 'inherit', size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return ` ${label}: ${formatINR(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCompactINR(value),
          font: { size: 11 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 11 }
        }
      }
    }
  };

  const deptPalette = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
    '#06b6d4', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ];

  const doughnutData = {
    labels: (deptPayroll || []).map(d => d.department),
    datasets: [
      {
        data: (deptPayroll || []).map(d => d.monthlyPayroll),
        backgroundColor: deptPalette.slice(0, deptPayroll.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: { family: 'inherit', size: 11 },
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const val = data.datasets[0].data[i];
                return {
                  text: `${label} (${formatCompactINR(val)})`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            return ` ${label}: ${formatINR(value)}/mo`;
          }
        }
      }
    },
    cutout: '62%'
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Payroll Dashboard</h1>
          <p className="dashboard-subtitle">
            Real-time compensation overview, payment disbursements, and departmental analytics (INR ₹)
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh Data">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="stats-grid-5">
        <div className="stat-card stat-primary">
          <div className="stat-icon-wrapper blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{(stats?.totalEmployees || 0).toLocaleString('en-IN')}</span>
            <span className="stat-subtext">Active on payroll &bull; India</span>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon-wrapper emerald">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Monthly Payroll</span>
            <span className="stat-value">{formatINR(stats?.totalMonthlyPayroll || 0)}</span>
            <span className="stat-subtext">{formatCompactINR(stats?.totalAnnualPayroll || 0)} annual budget</span>
          </div>
        </div>

        <div className="stat-card stat-indigo">
          <div className="stat-icon-wrapper indigo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Average Annual Salary</span>
            <span className="stat-value">{formatINR(stats?.averageSalary || 0)}</span>
            <span className="stat-subtext">{formatINR(stats?.averageMonthlySalary || 0)} / mo avg</span>
          </div>
        </div>

        <div className="stat-card stat-teal">
          <div className="stat-icon-wrapper green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Paid Salaries ({stats?.currentMonth || 'Current'})</span>
            <div className="stat-split-value">
              <span className="stat-value text-success">{stats?.paidCount || 0}</span>
              <span className="stat-amount-pill">{formatCompactINR(stats?.paidAmount || 0)}</span>
            </div>
            <span className="stat-subtext">Successfully disbursed</span>
          </div>
        </div>

        <div className="stat-card stat-amber">
          <div className="stat-icon-wrapper amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Pending Payments</span>
            <div className="stat-split-value">
              <span className="stat-value text-warning">{stats?.pendingCount || 0}</span>
              <span className="stat-amount-pill warning">{formatCompactINR(stats?.pendingAmount || 0)}</span>
            </div>
            <span className="stat-subtext">Awaiting disbursement</span>
          </div>
        </div>
      </div>

      <div className="dashboard-charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Monthly Salary Disbursements (Last 6 Months)</h3>
              <p className="chart-subtitle">Actual Paid vs Pending payroll amounts processed in INR</p>
            </div>
            <span className="badge badge-blue">Bar Chart</span>
          </div>
          <div className="chart-body" style={{ height: '310px' }}>
            {trend.length > 0 ? (
              <Bar data={barChartData} options={barChartOptions} />
            ) : (
              <div className="empty-chart-notice">No disbursement records found</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Department Payroll Distribution</h3>
              <p className="chart-subtitle">Monthly payroll share across corporate divisions</p>
            </div>
            <span className="badge badge-purple">Pie / Doughnut</span>
          </div>
          <div className="chart-body" style={{ height: '310px' }}>
            {deptPayroll.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <div className="empty-chart-notice">No department payroll data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-table-card">
        <div className="dashboard-table-header">
          <div>
            <h3 className="chart-title">Recent Salary Payments</h3>
            <p className="chart-subtitle">Showing latest 5 processed transactions with employee verification</p>
          </div>
          {onNavigateToPayments && (
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={onNavigateToPayments}
            >
              View All Payments &rarr;
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Amount (₹)</th>
                <th>Payment Date</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    No recent payments recorded.
                  </td>
                </tr>
              ) : (
                recentPayments.map(p => {
                  const emp = p.employee || {};
                  const dateStr = p.paymentDate
                    ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-';

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-employee-name">
                          <span className="avatar-mini">
                            {emp.firstName ? emp.firstName[0] : 'E'}{emp.lastName ? emp.lastName[0] : ''}
                          </span>
                          <span className="font-semibold">{emp.firstName} {emp.lastName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="emp-id-badge">{emp.employeeId || '-'}</span>
                      </td>
                      <td>
                        <span className="badge badge-blue">{emp.department || '-'}</span>
                      </td>
                      <td>
                        <span className="font-bold text-primary">{formatINR(p.amount)}</span>
                      </td>
                      <td className="text-secondary">{dateStr}</td>
                      <td>
                        <span className="method-pill">{p.paymentMethod || 'Bank Transfer'}</span>
                      </td>
                      <td>
                        <span className={`status-badge status-${(p.status || '').toLowerCase()}`}>
                          <span className="status-dot" />
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
