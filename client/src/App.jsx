import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import PaymentHistory from './components/PaymentHistory';
import Reports from './components/Reports';
import SalaryManagement from './components/SalaryManagement';
import Settings from './components/Settings';
import EmployeeModal from './components/EmployeeModal';
import EmployeeDetailsModal from './components/EmployeeDetailsModal';
import AuthModal from './components/AuthModal';
import { getToken, api } from './services/api';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [token, setToken] = useState(getToken());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const employeeListSavedRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    if (!getToken()) setAuthModalOpen(true);

    const handleExpired = () => {
      setToken('');
      setAuthModalOpen(true);
      showToast('Session expired. Please sign in again.');
    };

    const handleChanged = () => setToken(getToken());

    window.addEventListener('auth:expired', handleExpired);
    window.addEventListener('auth:changed', handleChanged);
    return () => {
      window.removeEventListener('auth:expired', handleExpired);
      window.removeEventListener('auth:changed', handleChanged);
    };
  }, []);

  const handleLogout = () => {
    api.logout();
    setToken('');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (newToken) => {
    setToken(newToken);
    showToast('Logged in successfully!');
  };

  const openAddEmployee = () => {
    if (!token) { setAuthModalOpen(true); return; }
    setEmployeeToEdit(null);
    setEmployeeModalOpen(true);
  };

  const openEditEmployee = (emp) => {
    if (!token) { setAuthModalOpen(true); return; }
    setEmployeeToEdit(emp);
    setEmployeeModalOpen(true);
  };

  const renderContent = () => {
    if (!token) {
      return (
        <div className="auth-required-banner">
          <div className="auth-card">
            <div className="auth-card-icon">🔐</div>
            <h3>Authentication Required</h3>
            <p>Please log in to manage records, search the employee directory, and view salary analytics.</p>
            <button className="btn btn-primary" onClick={() => setAuthModalOpen(true)}>
              Sign In / One-Click Demo Login
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigateToPayments={() => setActiveTab('payment-history')} onNavigateToEmployees={() => setActiveTab('employees')} />;
      case 'employees':
        return (
          <EmployeeList
            onAddEmployee={openAddEmployee}
            onEditEmployee={openEditEmployee}
            onViewEmployee={setSelectedEmployee}
            registerSavedCallback={(fn) => { employeeListSavedRef.current = fn; }}
          />
        );
      case 'salary-management':
        return <SalaryManagement onNavigateToEmployees={() => setActiveTab('employees')} />;
      case 'payment-history':
        return <PaymentHistory onViewEmployee={setSelectedEmployee} />;
      default:
        return <Dashboard onNavigateToPayments={() => setActiveTab('payment-history')} onNavigateToEmployees={() => setActiveTab('employees')} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        token={token}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <div className="main-wrapper">
        {toastMessage && (
          <div className="toast-notification">
            <span>✓ {toastMessage}</span>
            <button className="toast-close" onClick={() => setToastMessage('')}>✕</button>
          </div>
        )}
        <main className="content-area">{renderContent()}</main>
      </div>

      <EmployeeModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        employeeToEdit={employeeToEdit}
        onSaved={(saved) => {
          showToast(employeeToEdit ? 'Employee updated successfully!' : 'Employee created successfully!');
          employeeListSavedRef.current?.(saved, Boolean(employeeToEdit));
        }}
      />

      <EmployeeDetailsModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onEdit={openEditEmployee}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
