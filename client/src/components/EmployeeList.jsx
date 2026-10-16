import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';

export default function EmployeeList({ onAddEmployee, onEditEmployee, onViewEmployee, registerSavedCallback }) {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [department, setDepartment] = useState('');
  const [country, setCountry] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Search Autocomplete / Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchWrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const suggestionsTimerRef = useRef(null);

  // Filter options from API
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableCountries, setAvailableCountries] = useState([]);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEmpForDelete, setSelectedEmpForDelete] = useState(null);

  // Load filter options once
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const filters = await api.getFilters();
        setAvailableDepartments(filters.departments || []);
        setAvailableCountries(filters.countries || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadFilterOptions();
  }, []);

  // Register with App a callback to handle create/edit without a full refetch.
  // create: prepend the new employee, bump total count.
  // edit:   replace the matching row in-place with the server-confirmed record.
  useEffect(() => {
    if (!registerSavedCallback) return;
    registerSavedCallback((savedEmployee, isEdit) => {
      if (isEdit) {
        // Replace matching row in-place — preserve page, scroll position, filters.
        setEmployees(prev =>
          prev.map(emp => emp.id === savedEmployee.id ? savedEmployee : emp)
        );
      } else {
        // Prepend to current view and bump total.
        // Slice to keep page size so pagination count stays accurate.
        setEmployees(prev => {
          const updated = [savedEmployee, ...prev];
          return updated.slice(0, pagination.limit);
        });
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerSavedCallback, pagination.limit]);

  // Fetch employees
  const fetchEmployees = useCallback(async (pageToLoad = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getEmployees({
        page: pageToLoad,
        limit: pagination.limit,
        search,
        department,
        country,
        sortBy,
        sortOrder
      });
      setEmployees(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, search, department, country, sortBy, sortOrder]);

  useEffect(() => {
    fetchEmployees(1);
  }, [search, department, country, sortBy, sortOrder, pagination.limit]);


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

  // Live input change with debounced suggestion fetch & debounced table search
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

  // Handle Search Submit (pressing Enter without an active suggestion, or clicking Search)
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

  // Handle Reset all filters
  const handleResetFilters = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    setSearchInput('');
    setSearch('');
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setDepartment('');
    setCountry('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const getInitials = (firstName, lastName) => {
    const f = (firstName || '').charAt(0);
    const l = (lastName || '').charAt(0);
    return (f + l).toUpperCase() || 'EMP';
  };

  // Handle Sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Handle Delete
  const confirmDelete = (emp) => {
    setSelectedEmpForDelete(emp);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmpForDelete) return;
    const idToDelete = selectedEmpForDelete.id;
    setDeletingId(idToDelete);
    try {
      await api.deleteEmployee(idToDelete);
      setDeleteConfirmOpen(false);
      setSelectedEmpForDelete(null);

      const newTotal = pagination.total - 1;
      const remainingOnPage = employees.length - 1;

      if (remainingOnPage === 0 && pagination.page > 1) {
        // Page is now empty — go back one page to keep pagination correct
        fetchEmployees(pagination.page - 1);
      } else {
        // Remove the row in-place — no API call needed
        setEmployees(prev => prev.filter(emp => emp.id !== idToDelete));
        setPagination(prev => ({
          ...prev,
          total: newTotal,
          totalPages: Math.max(1, Math.ceil(newTotal / prev.limit))
        }));
      }
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
      setDeleteConfirmOpen(false);
    } finally {
      setDeletingId(null);
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) {
      return <span className="sort-indicator neutral">↕</span>;
    }
    return <span className="sort-indicator active">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="page-container">
      {/* Header and Add Action */}
      <div className="section-header">
        <div>
          <h2>Employee Directory</h2>
          <p className="section-desc">
            {pagination.total > 0
              ? `${pagination.total.toLocaleString()} employees · search, filter, sort, and paginate.`
              : 'Manage employee compensation records.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={onAddEmployee}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Employee
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper" ref={searchWrapperRef}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by full name, ID, or email..."
              className="form-input search-input"
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchInput.trim().length >= 1 && (suggestions.length > 0 || loadingSuggestions)) {
                  setShowSuggestions(true);
                }
              }}
              autoComplete="off"
              aria-label="Search employees"
            />
            {loadingSuggestions && (
              <span style={{ position: 'absolute', right: searchInput ? '2.1rem' : '0.75rem', display: 'flex', alignItems: 'center' }}>
                <span className="suggestions-spinner" />
              </span>
            )}
            {searchInput && (
              <button type="button" className="search-clear-btn" onClick={handleClearSearch} title="Clear search">
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
                    <span className="suggestions-spinner" /> Searching directory...
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
                              title="View full details"
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
                      <span>Press <strong>Enter</strong> to show all results</span>
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
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        <div className="filter-selects">
          <select className="form-select" value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">All Departments</option>
            {availableDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select className="form-select" value={country} onChange={e => setCountry(e.target.value)}>
            <option value="">All Countries</option>
            {availableCountries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(search || department || country || sortBy !== 'createdAt') && (
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters} title="Reset filters">
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><strong>Error:</strong> {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: '600', fontSize: '1rem', lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Employee Table */}
      <div className="card-panel" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('employeeId')} className="sortable-th">
                  Employee ID {renderSortIcon('employeeId')}
                </th>
                <th onClick={() => handleSort('firstName')} className="sortable-th">
                  Employee {renderSortIcon('firstName')}
                </th>
                <th onClick={() => handleSort('department')} className="sortable-th">
                  Department {renderSortIcon('department')}
                </th>
                <th>Designation</th>
                <th onClick={() => handleSort('country')} className="sortable-th">
                  Location {renderSortIcon('country')}
                </th>
                <th onClick={() => handleSort('salary')} className="sortable-th" style={{ textAlign: 'right' }}>
                  Salary {renderSortIcon('salary')}
                </th>
                <th onClick={() => handleSort('dateOfJoining')} className="sortable-th">
                  Joined {renderSortIcon('dateOfJoining')}
                </th>
                <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem' }}>
                    <div className="spinner"></div>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.75rem', fontSize: '0.8125rem' }}>Loading employee records…</p>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="1.5" style={{ marginBottom: '0.75rem' }}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <p style={{ color: 'var(--color-text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>No employees found</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className={deletingId === emp.id ? 'row-deleting' : ''}>
                    <td>
                      <span className="emp-id-badge">{emp.employeeId}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', lineHeight: '1.3' }}>
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                        {emp.email}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{emp.department}</span>
                    </td>
                    <td>
                      <span className="designation-pill">{emp.designation}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>{emp.country}</div>
                      {emp.city && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{emp.city}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                        {formatCurrency(emp.salary, emp.currency)}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                        {emp.currency}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {new Date(emp.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="row-actions">
                        <button className="action-btn" title="View Details" onClick={() => onViewEmployee(emp)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button className="action-btn" title="Edit Employee" onClick={() => onEditEmployee(emp)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="action-btn action-btn-danger"
                          title="Delete Employee"
                          onClick={() => confirmDelete(emp)}
                          disabled={deletingId === emp.id}
                        >
                          {deletingId === emp.id ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.7s linear infinite' }}>
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Controls */}
        <div className="pagination-bar">
          <div className="pagination-info">
            {employees.length > 0
              ? <>Showing <strong>{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of <strong>{pagination.total.toLocaleString()}</strong> employees</>
              : 'No results'
            }
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
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="pagination-buttons">
              <button className="btn btn-secondary btn-sm pagination-btn" disabled={pagination.page <= 1 || loading} onClick={() => fetchEmployees(1)} title="First Page">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
              <button className="btn btn-secondary btn-sm pagination-btn" disabled={pagination.page <= 1 || loading} onClick={() => fetchEmployees(pagination.page - 1)} title="Previous Page">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <span className="page-indicator">
                Page <strong>{pagination.page}</strong> of <strong>{Math.max(1, pagination.totalPages)}</strong>
              </span>

              <button className="btn btn-secondary btn-sm pagination-btn" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => fetchEmployees(pagination.page + 1)} title="Next Page">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button className="btn btn-secondary btn-sm pagination-btn" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => fetchEmployees(pagination.totalPages)} title="Last Page">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && selectedEmpForDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-danger-light)', border: '1px solid var(--color-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Delete Employee</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>This action cannot be undone</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setDeleteConfirmOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '0.75rem' }}>
              <div style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '0.875rem' }}>
                <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {selectedEmpForDelete.firstName} {selectedEmpForDelete.lastName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                  {selectedEmpForDelete.employeeId} · {selectedEmpForDelete.email || selectedEmpForDelete.department}
                </div>
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', lineHeight: '1.5' }}>
                Permanently deleting this employee will remove all their records from the database and payroll calculations.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={deletingId !== null}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteEmployee} disabled={deletingId !== null}>
                {deletingId ? (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.7s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Deleting…</>
                ) : (
                  'Delete Employee'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

