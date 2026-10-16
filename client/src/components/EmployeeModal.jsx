import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance', 'Operations', 'Product', 'Design', 'Legal', 'Customer Support'];
const DESIGNATIONS = ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Manager', 'Director', 'VP'];
const INDIAN_CITIES = ['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Noida', 'Gurgaon', 'Jaipur', 'Chandigarh'];

const DEFAULT_FORM = {
  employeeId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: 'Engineering',
  designation: 'Senior',
  country: 'India',
  city: 'Bangalore',
  salary: '1200000',
  currency: 'INR',
  dateOfJoining: new Date().toISOString().split('T')[0]
};

export default function EmployeeModal({ isOpen, onClose, employeeToEdit, onSaved }) {
  const isEdit = Boolean(employeeToEdit);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    if (employeeToEdit) {
      setFormData({
        employeeId: employeeToEdit.employeeId || '',
        firstName: employeeToEdit.firstName || '',
        lastName: employeeToEdit.lastName || '',
        email: employeeToEdit.email || '',
        phone: employeeToEdit.phone || '',
        department: employeeToEdit.department || 'Engineering',
        designation: employeeToEdit.designation || 'Senior',
        country: 'India',
        city: employeeToEdit.city || 'Bangalore',
        salary: employeeToEdit.salary !== undefined ? employeeToEdit.salary : '',
        currency: 'INR',
        dateOfJoining: employeeToEdit.dateOfJoining
          ? new Date(employeeToEdit.dateOfJoining).toISOString().split('T')[0]
          : DEFAULT_FORM.dateOfJoining
      });
    } else {
      setFormData({ ...DEFAULT_FORM, employeeId: `EMP${Math.floor(10000 + Math.random() * 90000)}` });
    }
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const salaryNum = parseFloat(formData.salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      setError('Salary must be a valid number (0 or greater).');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData, country: 'India', currency: 'INR', salary: salaryNum };
      const saved = isEdit
        ? await api.updateEmployee(employeeToEdit.id, payload)
        : await api.createEmployee(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save employee record');
    } finally {
      setLoading(false);
    }
  };

  const monthlyCalc = formData.salary ? Math.round(Number(formData.salary) / 12) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3>{isEdit ? 'Edit Employee Record' : 'Add New Employee'}</h3>
            <p className="modal-subtitle">Employee details and salary compensation (INR)</p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Employee ID *</label>
                <input type="text" name="employeeId" className="form-input" value={formData.employeeId} onChange={handleChange} required disabled={isEdit} placeholder="e.g. EMP10492" />
              </div>
              <div className="form-group">
                <label className="form-label">Work Email *</label>
                <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required placeholder="employee@company.com" />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input type="text" name="firstName" className="form-input" value={formData.firstName} onChange={handleChange} required placeholder="First name" />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input type="text" name="lastName" className="form-input" value={formData.lastName} onChange={handleChange} required placeholder="Last name" />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select name="department" className="form-select" value={formData.department} onChange={handleChange} required>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Designation *</label>
                <select name="designation" className="form-select" value={formData.designation} onChange={handleChange} required>
                  {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">City</label>
                <select name="city" className="form-select" value={formData.city} onChange={handleChange}>
                  {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Country / Currency</label>
                <div className="inr-badge-input">
                  <span>🇮🇳 India</span>
                  <span className="currency-badge">INR (₹)</span>
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Annual Salary (INR ₹) *</label>
                <div className="input-with-symbol">
                  <span className="currency-prefix">₹</span>
                  <input type="number" name="salary" className="form-input has-prefix" min="0" step="1000" value={formData.salary} onChange={handleChange} required placeholder="e.g. 1200000" />
                </div>
                {formData.salary && (
                  <div className="salary-calc-preview">
                    {formatINR(formData.salary)}/year &bull; approx. {formatINR(monthlyCalc)}/month
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input type="tel" name="phone" className="form-input" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date of Joining</label>
              <input type="date" name="dateOfJoining" className="form-input" value={formData.dateOfJoining} onChange={handleChange} required />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
