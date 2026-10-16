import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { formatINR, formatCompactINR } from '../utils/currency';

export default function PaymentHistory({ onViewEmployee }) {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [month, setMonth] = useState('all');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [sortBy, setSortBy] = useState('paymentDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Search Suggestions State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchWrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const suggestionsTimerRef = useRef(null);

  // Filter options
  const [availableMonths, setAvailableMonths] = useState([]);
  const [summary, setSummary] = useState(null);

  // Modal for new payment
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    amount: '',
    paymentMonth: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    status: 'Paid',
    remarks: ''
  });
  const [employeeSearchResults, setEmployeeSearchResults] = useState([]);
  const [empSearchInput, setEmpSearchInput] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Load distinct months and summary stats on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [monthsRes, summaryRes] = await Promise.all([
          api.getPaymentMonths(),
          api.getPaymentSummary()
        ]);
        setAvailableMonths(monthsRes || []);
        setSummary(summaryRes || null);
      } catch (err) {
        console.error('Failed to load payment meta:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch payments with current filters & pagination
  const fetchPayments = useCallback(async (pageToLoad = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPayments({
        page: pageToLoad,
        limit: pagination.limit,
        search,
        month,
        status,
        method,
        sortBy,
        sortOrder
      });
      setPayments(res.payments || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch payment records');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, search, month, status, method, sortBy, sortOrder]);

  useEffect(() => {
    fetchPayments(1);
  }, [search, month, status, method, sortBy, sortOrder, pagination.limit]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    };
  }, []);

  // Live input change with debounced suggestions & debounced table search
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    setActiveSuggestionIndex(-1);

    const trimmed = val.trim();

    // 1. Live suggestions (debounced 160ms)
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    if (trimmed.length >= 1) {
      setLoadingSuggestions(true);
      setShowSuggestions(true);
      suggestionsTimerRef.current = setTimeout(async () => {
        try {
          const results = await api.getEmployeeSuggestions(trimmed);
          setSuggestions(results || []);
        } catch (err) {
          console.error('Failed to fetch suggestions:', err);
        } finally {
          setLoadingSuggestions(false);
        }
      }, 160);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
    }

    // 2. Debounced live table search (400ms)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setSearch(trimmed);
    }, 400);
  };

  // Keyboard navigation for suggestions dropdown
  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  // Select a suggestion item
  const handleSelectSuggestion = (emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.trim();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    setSearchInput(fullName);
    setSearch(fullName);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  };

  // Direct view profile from suggestion item
  const handleViewSuggestion = (e, emp) => {
    e.stopPropagation();
    setShowSuggestions(false);
    if (onViewEmployee) {
      onViewEmployee(emp);
    }
  };

  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    setSearchInput('');
    setSearch('');
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  };

  const handleResetFilters = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    setSearch('');
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setMonth('all');
    setStatus('all');
    setMethod('all');
  };

  const getInitials = (firstName, lastName) => {
    const f = (firstName || '').charAt(0);
    const l = (lastName || '').charAt(0);
    return (f + l).toUpperCase() || 'EMP';
  };

  // Quick status toggle without reload
  const handleStatusChange = async (paymentId, newStatus) => {
    try {
      const updated = await api.updatePaymentStatus(paymentId, newStatus);
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: updated.status } : p));
      showToast(`Payment status updated to ${newStatus}`);

      // Refresh summary in background
      api.getPaymentSummary().then(setSummary).catch(() => {});
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Format YYYY-MM to readable month name (e.g. October 2026)
  const formatMonthLabel = (mStr) => {
    if (!mStr) return '-';
    const parts = mStr.split('-');
    if (parts.length === 2) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    return mStr;
  };

  // Employee search inside modal
  const handleEmpSearch = async (e) => {
    const val = e.target.value;
    setEmpSearchInput(val);
    if (val.trim().length >= 2) {
      try {
        const res = await api.getEmployees({ search: val.trim(), limit: 5 });
        setEmployeeSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setEmployeeSearchResults([]);
    }
  };

  const handleSelectEmp = (emp) => {
    setSelectedEmp(emp);
    setEmployeeSearchResults([]);
    setEmpSearchInput(`${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
    setCreateForm(prev => ({
      ...prev,
      employeeId: emp.id,
      amount: Math.round(emp.salary / 12).toString()
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!createForm.employeeId) {
      setModalError('Please search and select an employee first.');
      return;
    }
    if (!createForm.amount || parseFloat(createForm.amount) <= 0) {
      setModalError('Please enter a valid amount.');
      return;
    }

    setCreating(true);
    try {
      const newPayment = await api.createPayment(createForm);
      // Prepend to current view
      setPayments(prev => [newPayment, ...prev]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      showToast('Payment record added successfully!');
      setCreateModalOpen(false);

      // Reset form
      setCreateForm({
        employeeId: '',
        amount: '',
        paymentMonth: availableMonths[0] || new Date().toISOString().slice(0, 7),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        status: 'Paid',
        remarks: ''
      });
      setSelectedEmp(null);
      setEmpSearchInput('');

      // Refresh meta
      api.getPaymentSummary().then(setSummary).catch(() => {});
    } catch (err) {
      setModalError(err.message || 'Failed to record payment');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="payment-history-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          <span>✓ {toast}</span>
          <button className="toast-close" onClick={() => setToast('')}>✕</button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment History</h1>
          <p className="page-subtitle">
            Disbursement records, transaction methods, and payment reconciliation in INR (₹)
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setModalError('');
              setCreateForm(prev => ({
                ...prev,
                paymentMonth: availableMonths[0] || new Date().toISOString().slice(0, 7)
              }));
              setCreateModalOpen(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Record Payment
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div className="payment-kpi-grid">
          <div className="kpi-mini-card">
            <span className="kpi-mini-label">Total Disbursed</span>
            <span className="kpi-mini-val text-primary">{formatCompactINR(summary.totalAmount)}</span>
            <span className="kpi-mini-sub">{summary.totalRecords.toLocaleString('en-IN')} total transactions</span>
          </div>
          <div className="kpi-mini-card">
            <span className="kpi-mini-label">Paid Transactions</span>
            <span className="kpi-mini-val text-success">{summary.paidCount.toLocaleString('en-IN')}</span>
            <span className="kpi-mini-sub">{formatCompactINR(summary.paidAmount)} disbursed</span>
          </div>
          <div className="kpi-mini-card">
            <span className="kpi-mini-label">Pending Approval</span>
            <span className="kpi-mini-val text-warning">{summary.pendingCount.toLocaleString('en-IN')}</span>
            <span className="kpi-mini-sub">{formatCompactINR(summary.pendingAmount)} pending</span>
          </div>
          <div className="kpi-mini-card">
            <span className="kpi-mini-label">Failed / Issues</span>
            <span className="kpi-mini-val text-danger">{summary.failedCount.toLocaleString('en-IN')}</span>
            <span className="kpi-mini-sub">{formatCompactINR(summary.failedAmount)} rejected</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-panel">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper" ref={searchWrapperRef}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by Employee Name or EMP ID..."
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchInput.trim().length >= 1 && (suggestions.length > 0 || loadingSuggestions)) {
                  setShowSuggestions(true);
                }
              }}
              autoComplete="off"
              aria-label="Search payment records"
            />
            {loadingSuggestions && (
              <span style={{ position: 'absolute', right: searchInput ? '2.1rem' : '0.75rem', display: 'flex', alignItems: 'center' }}>
                <span className="suggestions-spinner" />
              </span>
            )}
            {searchInput && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
                title="Clear search"
              >
                ✕
              </button>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && (
              <div className="search-suggestions-dropdown">
                <div className="suggestions-header">
                  <span>Suggested Employees</span>
                  {suggestions.length > 0 && <span>{suggestions.length} found</span>}
                </div>

                {loadingSuggestions && suggestions.length === 0 ? (
                  <div className="suggestions-loading">
                    <span className="suggestions-spinner" /> Searching records...
                  </div>
                ) : suggestions.length > 0 ? (
                  <>
                    <ul className="suggestions-list">
                      {suggestions.map((emp, idx) => (
                        <li
                          key={emp.id}
                          className={`suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
                          onClick={() => handleSelectSuggestion(emp)}
                          onMouseEnter={() => setActiveSuggestionIndex(idx)}
                        >
                          <div className="suggestion-avatar">
                            {getInitials(emp.firstName, emp.lastName)}
                          </div>
                          <div className="suggestion-content">
                            <div className="suggestion-title">
                              <span>{emp.fullName || `${emp.firstName} ${emp.lastName}`}</span>
                              <span className="suggestion-badge">{emp.employeeId}</span>
                            </div>
                            <div className="suggestion-sub">
                              <span>{emp.department}</span>
                              {emp.designation && <span>• {emp.designation}</span>}
                              {emp.email && <span>• {emp.email}</span>}
                            </div>
                          </div>
                          {onViewEmployee && (
                            <button
                              type="button"
                              className="suggestion-view-btn"
                              onClick={(e) => handleViewSuggestion(e, emp)}
                              title="View full profile"
                            >
                              View
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div
                      className="suggestions-footer"
                      onClick={() => {
                        setShowSuggestions(false);
                        setSearch(searchInput.trim());
                      }}
                    >
                      <span>Press <strong>Enter</strong> to filter payments for &ldquo;{searchInput}&rdquo;</span>
                      <span>↵</span>
                    </div>
                  </>
                ) : (
                  <div className="suggestions-empty">
                    No employees matching &ldquo;{searchInput}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>

        <div className="filter-controls-group">
          {/* Month Filter */}
          <div className="filter-select-wrapper">
            <label className="filter-label">Month:</label>
            <select
              className="form-select form-select-sm"
              value={month}
              onChange={e => setMonth(e.target.value)}
            >
              <option value="all">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-select-wrapper">
            <label className="filter-label">Status:</label>
            <select
              className="form-select form-select-sm"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="filter-select-wrapper">
            <label className="filter-label">Method:</label>
            <select
              className="form-select form-select-sm"
              value={method}
              onChange={e => setMethod(e.target.value)}
            >
              <option value="all">All Methods</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="NEFT">NEFT</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          {(search || month !== 'all' || status !== 'all' || method !== 'all') && (
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading-state">
            <div className="spinner-large" />
            <p>Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="table-error-state">
            <p className="text-danger">{error}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchPayments(pagination.page)}>
              Retry
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <h3>No payment records match your filters</h3>
            <p>Try adjusting your search criteria, clearing month/status filters, or recording a new disbursement.</p>
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Employee ID</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid (₹)</th>
                  <th>Payment Month</th>
                  <th>Payment Date</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const emp = p.employee || {};
                  const dateFormatted = p.paymentDate
                    ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-';

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-employee-name">
                          <span className="avatar-mini">
                            {emp.firstName ? emp.firstName[0] : 'E'}{emp.lastName ? emp.lastName[0] : ''}
                          </span>
                          <div>
                            <div className="font-semibold text-primary-dark">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-muted text-xs">
                              {emp.department || 'General'} &bull; {emp.designation || 'Staff'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="emp-id-badge">{emp.employeeId || '-'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="font-bold text-primary font-mono text-sm">
                          {formatINR(p.amount)}
                        </div>
                      </td>
                      <td>
                        <span className="month-pill">{formatMonthLabel(p.paymentMonth)}</span>
                      </td>
                      <td>
                        <span className="text-secondary text-sm">{dateFormatted}</span>
                      </td>
                      <td>
                        <span className="method-pill">{p.paymentMethod || 'Bank Transfer'}</span>
                      </td>
                      <td>
                        <span className={`status-badge status-${(p.status || '').toLowerCase()}`}>
                          <span className="status-dot" />
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.status === 'Pending' ? (
                          <button
                            className="btn btn-xs btn-outline-success"
                            onClick={() => handleStatusChange(p.id, 'Paid')}
                            title="Mark as Paid"
                          >
                            ✓ Mark Paid
                          </button>
                        ) : p.status === 'Failed' ? (
                          <button
                            className="btn btn-xs btn-outline-warning"
                            onClick={() => handleStatusChange(p.id, 'Pending')}
                            title="Retry Payment"
                          >
                            Retry
                          </button>
                        ) : (
                          <span className="text-muted text-xs">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        <div className="pagination-bar">
          <div className="pagination-info">
            {payments.length > 0 ? (
              <>
                Showing <strong>{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of <strong>{pagination.total.toLocaleString('en-IN')}</strong> payments
              </>
            ) : (
              'No records'
            )}
          </div>

          <div className="pagination-controls">
            <div className="pagination-limit-select">
              <label>Per page:</label>
              <select
                className="form-select form-select-sm"
                value={pagination.limit}
                onChange={e => {
                  const newLimit = parseInt(e.target.value);
                  setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                }}
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="pagination-buttons">
              <button
                className="btn btn-secondary btn-sm pagination-btn"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchPayments(pagination.page - 1)}
                title="Previous Page"
              >
                &larr; Prev
              </button>

              <span className="page-indicator">
                Page <strong>{pagination.page}</strong> of <strong>{Math.max(1, pagination.totalPages)}</strong>
              </span>

              <button
                className="btn btn-secondary btn-sm pagination-btn"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchPayments(pagination.page + 1)}
                title="Next Page"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h3>Record Salary Payment</h3>
                <p className="modal-subtitle">Log employee monthly salary disbursement (INR ₹)</p>
              </div>
              <button className="close-btn" onClick={() => setCreateModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {modalError && (
                  <div className="alert alert-danger">{modalError}</div>
                )}

                <div className="form-group">
                  <label className="form-label">Search & Select Employee *</label>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type name or EMP ID to search..."
                      value={empSearchInput}
                      onChange={handleEmpSearch}
                    />
                  </div>
                  {employeeSearchResults.length > 0 && (
                    <div className="employee-dropdown-results">
                      {employeeSearchResults.map(emp => (
                        <div
                          key={emp.id}
                          className="emp-search-item"
                          onClick={() => handleSelectEmp(emp)}
                        >
                          <div className="font-semibold">{emp.firstName} {emp.lastName} ({emp.employeeId})</div>
                          <div className="text-muted text-xs">
                            {emp.department} &bull; Base: {formatINR(emp.salary)}/yr
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedEmp && (
                    <div className="selected-emp-badge">
                      ✓ Selected: {selectedEmp.firstName} {selectedEmp.lastName} &bull; {selectedEmp.department}
                    </div>
                  )}
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Payment Month *</label>
                    <input
                      type="month"
                      className="form-input"
                      value={createForm.paymentMonth}
                      onChange={e => setCreateForm(prev => ({ ...prev, paymentMonth: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Disbursement Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={createForm.paymentDate}
                      onChange={e => setCreateForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Amount (INR ₹) *</label>
                    <div className="input-with-symbol">
                      <span className="currency-prefix">₹</span>
                      <input
                        type="number"
                        className="form-input has-prefix"
                        min="1"
                        step="100"
                        value={createForm.amount}
                        onChange={e => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                        required
                        placeholder="e.g. 85000"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Method *</label>
                    <select
                      className="form-select"
                      value={createForm.paymentMethod}
                      onChange={e => setCreateForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="NEFT">NEFT</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Status *</label>
                  <select
                    className="form-select"
                    value={createForm.status}
                    onChange={e => setCreateForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Paid">Paid (Immediately Reconciled)</option>
                    <option value="Pending">Pending (Processing)</option>
                    <option value="Failed">Failed (Error / Rejected)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Transaction Ref (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. UTR / Ref # 938291823"
                    value={createForm.remarks}
                    onChange={e => setCreateForm(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Recording...' : 'Save Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
