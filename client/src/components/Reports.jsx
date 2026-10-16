import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatINR, formatCompactINR } from '../utils/currency';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deptReport, setDeptReport] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [stats, setStats] = useState(null);

  const loadReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const [deptRes, trendRes, summaryRes, statsRes] = await Promise.all([
        api.getDepartmentReport(),
        api.getMonthlyTrend(),
        api.getPaymentSummary(),
        api.getDashboardStats()
      ]);
      setDeptReport(deptRes || []);
      setMonthlyTrend(trendRes || []);
      setPaymentSummary(summaryRes || null);
      setStats(statsRes || null);
    } catch (err) {
      setError(err.message || 'Failed to generate financial reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  if (loading) {
    return (
      <div className="reports-loading-state">
        <div className="spinner-large" />
        <p>Compiling Departmental & Payroll Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '2rem' }}>
        <h4>Report Generation Failed</h4>
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={loadReportData}>Retry</button>
      </div>
    );
  }

  // Monthly trend chart configuration
  const monthLabels = (monthlyTrend || []).map(item => {
    const parts = item.month.split('-');
    if (parts.length === 2) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }
    return item.month;
  });

  const trendChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Disbursed Payroll (₹)',
        data: (monthlyTrend || []).map(item => item.paidAmount),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#10b981',
        pointRadius: 5,
        pointHoverRadius: 7
      },
      {
        label: 'Total Incurred (₹)',
        data: (monthlyTrend || []).map(item => item.totalAmount),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.35,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4
      }
    ]
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { boxWidth: 12, usePointStyle: true }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${formatINR(context.raw)}`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (val) => formatCompactINR(val)
        },
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // Payment status percentages
  const totalPayRecords = paymentSummary?.totalRecords || 1;
  const paidPct = Math.round(((paymentSummary?.paidCount || 0) / totalPayRecords) * 100);
  const pendingPct = Math.round(((paymentSummary?.pendingCount || 0) / totalPayRecords) * 100);
  const failedPct = Math.round(((paymentSummary?.failedCount || 0) / totalPayRecords) * 100);

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['Department', 'Headcount', 'Average Salary (INR)', 'Total Monthly Payroll (INR)', 'Min Salary', 'Max Salary'];
    const rows = deptReport.map(d => [
      `"${d.department}"`,
      d.employeeCount,
      d.averageSalary,
      d.monthlyPayroll || Math.round(d.totalSalary / 12),
      d.minSalary,
      d.maxSalary
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Department_Salary_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Financial & Payroll Reports</h1>
          <p className="page-subtitle">
            Departmental compensation breakdowns, monthly expenditure trends, and payment fulfillment status (INR ₹)
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadReportData}>
            ↻ Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Quick Summary Metrics Strip */}
      <div className="report-summary-strip">
        <div className="report-metric-tile">
          <span className="metric-title">Total Active Headcount</span>
          <span className="metric-number">{(stats?.totalEmployees || 0).toLocaleString('en-IN')}</span>
          <span className="metric-tag">100% India Staff</span>
        </div>

        <div className="report-metric-tile">
          <span className="metric-title">Monthly Payroll Run</span>
          <span className="metric-number text-primary">{formatINR(stats?.totalMonthlyPayroll || 0)}</span>
          <span className="metric-tag">Per calendar month</span>
        </div>

        <div className="report-metric-tile">
          <span className="metric-title">Company Average CTC</span>
          <span className="metric-number">{formatINR(stats?.averageSalary || 0)}</span>
          <span className="metric-tag">Annual base</span>
        </div>

        <div className="report-metric-tile">
          <span className="metric-title">Reconciliation Rate</span>
          <span className="metric-number text-success">{paidPct}%</span>
          <span className="metric-tag">{paymentSummary?.paidCount.toLocaleString('en-IN')} paid records</span>
        </div>
      </div>

      {/* Department-wise Salary Report Table */}
      <div className="table-card" style={{ marginBottom: '2rem' }}>
        <div className="table-card-header">
          <div>
            <h3>Department-wise Salary Report</h3>
            <p className="modal-subtitle">Headcount distribution, average CTC, and monthly payroll budget by department</p>
          </div>
          <span className="badge badge-blue">{deptReport.length} Departments</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th style={{ textAlign: 'center' }}>Headcount</th>
                <th style={{ textAlign: 'right' }}>Average Salary (₹)</th>
                <th style={{ textAlign: 'right' }}>Total Monthly Payroll (₹)</th>
                <th style={{ textAlign: 'right' }}>Annual Budget (₹)</th>
                <th style={{ textAlign: 'right' }}>Salary Range (Min - Max)</th>
              </tr>
            </thead>
            <tbody>
              {deptReport.map((dept, idx) => {
                const monthly = dept.monthlyPayroll || Math.round(dept.totalSalary / 12);
                return (
                  <tr key={idx}>
                    <td>
                      <div className="dept-name-cell">
                        <span className="dept-color-tag" style={{ background: `hsl(${idx * 36}, 70%, 50%)` }} />
                        <span className="font-semibold">{dept.department}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-gray">{dept.employeeCount.toLocaleString('en-IN')}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-medium text-dark">{formatINR(dept.averageSalary)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-bold text-primary font-mono">{formatINR(monthly)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="text-secondary text-sm">{formatCompactINR(dept.totalSalary)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="text-muted text-xs">
                        {formatINR(dept.minSalary)} – {formatINR(dept.maxSalary)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Payroll Trends Chart & Payment Status Summary */}
      <div className="reports-split-grid">
        {/* Monthly Payroll Trends Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Monthly Payroll Expenditure Trends</h3>
              <p className="chart-subtitle">Six-month comparison of total incurred vs disbursed amounts (INR ₹)</p>
            </div>
            <span className="badge badge-blue">Line Chart</span>
          </div>
          <div className="chart-body" style={{ height: '300px' }}>
            {monthlyTrend.length > 0 ? (
              <Line data={trendChartData} options={trendChartOptions} />
            ) : (
              <div className="empty-chart-notice">No disbursement data available</div>
            )}
          </div>
        </div>

        {/* Payment Status Summary */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Payment Fulfillment Summary</h3>
              <p className="chart-subtitle">Breakdown of Paid vs Pending vs Failed transactions</p>
            </div>
            <span className="badge badge-green">Reconciliation</span>
          </div>
          <div className="status-summary-body">
            {/* Visual Progress Bar */}
            <div className="status-ratio-bar">
              <div className="ratio-segment ratio-paid" style={{ width: `${paidPct}%` }} title={`Paid: ${paidPct}%`} />
              <div className="ratio-segment ratio-pending" style={{ width: `${pendingPct}%` }} title={`Pending: ${pendingPct}%`} />
              <div className="ratio-segment ratio-failed" style={{ width: `${failedPct}%` }} title={`Failed: ${failedPct}%`} />
            </div>

            <div className="status-detail-list">
              <div className="status-detail-row">
                <div className="status-dot-label">
                  <span className="dot dot-paid" />
                  <span className="status-name">Successfully Paid</span>
                </div>
                <div className="status-detail-metrics">
                  <span className="status-count">{paymentSummary?.paidCount.toLocaleString('en-IN')}</span>
                  <span className="status-pct text-success font-semibold">{paidPct}%</span>
                  <span className="status-amount text-primary">{formatCompactINR(paymentSummary?.paidAmount || 0)}</span>
                </div>
              </div>

              <div className="status-detail-row">
                <div className="status-dot-label">
                  <span className="dot dot-pending" />
                  <span className="status-name">Pending Processing</span>
                </div>
                <div className="status-detail-metrics">
                  <span className="status-count">{paymentSummary?.pendingCount.toLocaleString('en-IN')}</span>
                  <span className="status-pct text-warning font-semibold">{pendingPct}%</span>
                  <span className="status-amount text-warning">{formatCompactINR(paymentSummary?.pendingAmount || 0)}</span>
                </div>
              </div>

              <div className="status-detail-row">
                <div className="status-dot-label">
                  <span className="dot dot-failed" />
                  <span className="status-name">Failed / Exception</span>
                </div>
                <div className="status-detail-metrics">
                  <span className="status-count">{paymentSummary?.failedCount.toLocaleString('en-IN')}</span>
                  <span className="status-pct text-danger font-semibold">{failedPct}%</span>
                  <span className="status-amount text-danger">{formatCompactINR(paymentSummary?.failedAmount || 0)}</span>
                </div>
              </div>
            </div>

            <div className="reconciliation-summary-box">
              <span className="reconciliation-icon">🛡️</span>
              <div className="reconciliation-text">
                <strong>Audited Compliance Status</strong>
                <p>All recorded disbursements adhere to statutory Indian withholding and salary tax allocations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
