const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../server');
const prisma = require('../lib/prisma');

let server;
let baseUrl;
let authToken;
let testEmployeeId;
let createdEmployeeUuid;

// Helper to make JSON HTTP requests to test server
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Employee Salary Management System - Automated Test Suite', () => {
  before(async () => {
    await prisma.$connect();

    // Find or create test user for auth token
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: 'test_admin_' + Date.now(),
          email: `test_admin_${Date.now()}@example.com`,
          password: 'hashedpassword123'
        }
      });
    }

    authToken = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (createdEmployeeUuid) {
      await prisma.employee.deleteMany({
        where: { id: createdEmployeeUuid }
      });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });

  describe('1. Authentication & Security', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request('GET', '/api/employees');
      assert.strictEqual(res.status, 401);
    });

    it('should accept requests with valid JWT bearer token', async () => {
      const res = await request('GET', '/api/employees?limit=1', null, {
        Authorization: `Bearer ${authToken}`
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data);
      assert.ok(res.body.pagination);
    });
  });

  describe('2. Employee Management (CRUD & Validation)', () => {
    it('should reject employee creation with missing required fields', async () => {
      const res = await request('POST', '/api/employees', {
        firstName: 'John'
      }, {
        Authorization: `Bearer ${authToken}`
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.message, 'Validation failed');
      assert.ok(Array.isArray(res.body.errors));
      assert.ok(res.body.errors.length > 0);
    });

    it('should reject employee creation with negative salary', async () => {
      const res = await request('POST', '/api/employees', {
        employeeId: 'TEST_' + Date.now(),
        firstName: 'John',
        lastName: 'Doe',
        email: `john.doe.${Date.now()}@test.com`,
        department: 'Engineering',
        designation: 'Senior',
        country: 'United States',
        salary: -5000,
        currency: 'USD',
        dateOfJoining: '2023-01-15'
      }, {
        Authorization: `Bearer ${authToken}`
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.errors.some(e => e.includes('salary')));
    });

    it('should successfully create a new employee with valid data', async () => {
      testEmployeeId = 'EMP_TEST_' + Date.now().toString().slice(-5);
      const newEmp = {
        employeeId: testEmployeeId,
        firstName: 'Alexander',
        lastName: 'Hamilton',
        email: `alex.hamilton.${Date.now()}@example.com`,
        phone: '+15551234567',
        department: 'Finance',
        designation: 'Director',
        country: 'United States',
        city: 'New York',
        salary: 135000,
        currency: 'USD',
        dateOfJoining: '2021-06-01'
      };

      const res = await request('POST', '/api/employees', newEmp, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.employeeId, testEmployeeId);
      assert.strictEqual(res.body.salary, 135000);
      assert.strictEqual(res.body.currency, 'USD');
      createdEmployeeUuid = res.body.id;
    });

    it('should reject duplicate employeeId creation with 409', async () => {
      const duplicateEmp = {
        employeeId: testEmployeeId,
        firstName: 'Duplicate',
        lastName: 'User',
        email: `different.email.${Date.now()}@example.com`,
        department: 'Finance',
        designation: 'Senior',
        country: 'United States',
        salary: 90000,
        currency: 'USD',
        dateOfJoining: '2022-01-01'
      };

      const res = await request('POST', '/api/employees', duplicateEmp, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 409);
    });

    it('should fetch single employee details by ID', async () => {
      const res = await request('GET', `/api/employees/${createdEmployeeUuid}`, null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.id, createdEmployeeUuid);
      assert.strictEqual(res.body.firstName, 'Alexander');
    });

    it('should update employee salary and designation', async () => {
      const updatedSalary = 155000;
      const res = await request('PUT', `/api/employees/${createdEmployeeUuid}`, {
        salary: updatedSalary,
        designation: 'VP'
      }, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.salary, updatedSalary);
      assert.strictEqual(res.body.designation, 'VP');
    });

    it('should reject salary update if salary is negative', async () => {
      const res = await request('PUT', `/api/employees/${createdEmployeeUuid}`, {
        salary: -1000
      }, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.message, 'Validation failed');
    });
  });

  describe('3. Search, Filter, and Server-Side Pagination', () => {
    it('should paginate employees correctly with page and limit', async () => {
      const limit = 15;
      const res = await request('GET', `/api/employees?page=1&limit=${limit}`, null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.pagination.page, 1);
      assert.strictEqual(res.body.pagination.limit, limit);
      assert.strictEqual(res.body.data.length, limit);
      assert.ok(res.body.pagination.total >= 1000);
      assert.strictEqual(res.body.pagination.totalPages, Math.ceil(res.body.pagination.total / limit));
    });

    it('should search employee by employeeId', async () => {
      const res = await request('GET', `/api/employees?search=${testEmployeeId}`, null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.strictEqual(res.body.data[0].employeeId, testEmployeeId);
    });

    it('should search employee by first name', async () => {
      const res = await request('GET', '/api/employees?search=Alexander', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.some(e => e.firstName.toLowerCase().includes('alexander')));
    });

    it('should filter employees by department', async () => {
      const res = await request('GET', '/api/employees?department=Finance&limit=10', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length > 0);
      assert.ok(res.body.data.every(e => e.department === 'Finance'));
    });

    it('should filter employees by country', async () => {
      const res = await request('GET', '/api/employees?country=India&limit=10', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length > 0);
      assert.ok(res.body.data.every(e => e.country === 'India'));
      assert.ok(res.body.data.every(e => e.currency === 'INR'));
    });

    it('should fetch distinct filter options for department and country', async () => {
      const res = await request('GET', '/api/employees/filters', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.departments));
      assert.ok(Array.isArray(res.body.countries));
      assert.ok(res.body.departments.includes('Engineering'));
      assert.ok(res.body.countries.includes('United States'));
    });
  });

  describe('4. Dashboard Salary Calculations & Currency Isolation', () => {
    it('should return total employees and currency-isolated metrics', async () => {
      const res = await request('GET', '/api/dashboard/summary', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.totalEmployees >= 1000);
      assert.ok(Array.isArray(res.body.averageSalaryByCurrency));
      assert.ok(Array.isArray(res.body.totalPayrollByCurrency));

      // Check each currency summary
      for (const item of res.body.averageSalaryByCurrency) {
        assert.ok(typeof item.currency === 'string');
        assert.ok(item.averageSalary > 0);
        assert.ok(item.employeeCount > 0);
      }

      // Check total payroll per currency without combining
      for (const item of res.body.totalPayrollByCurrency) {
        assert.ok(typeof item.currency === 'string');
        assert.ok(item.totalPayroll > 0);
        assert.ok(item.employeeCount > 0);
      }
    });

    it('should return department-wise salary report grouped by currency', async () => {
      const res = await request('GET', '/api/dashboard/by-department', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);

      const first = res.body[0];
      assert.ok(first.department);
      assert.ok(first.currency);
      assert.ok(first.totalSalary > 0);
      assert.ok(first.averageSalary > 0);
      assert.ok(first.employeeCount > 0);
      assert.ok(first.minSalary <= first.maxSalary);
    });

    it('should return country-wise salary report grouped by currency', async () => {
      const res = await request('GET', '/api/dashboard/by-country', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);

      const first = res.body[0];
      assert.ok(first.country);
      assert.ok(first.currency);
      assert.ok(first.totalSalary > 0);
      assert.ok(first.averageSalary > 0);
      assert.ok(first.employeeCount > 0);
    });
  });

  describe('5. Employee Deletion', () => {
    it('should delete employee and return 404 when queried again', async () => {
      const delRes = await request('DELETE', `/api/employees/${createdEmployeeUuid}`, null, {
        Authorization: `Bearer ${authToken}`
      });
      assert.strictEqual(delRes.status, 200);

      const getRes = await request('GET', `/api/employees/${createdEmployeeUuid}`, null, {
        Authorization: `Bearer ${authToken}`
      });
      assert.strictEqual(getRes.status, 404);
      createdEmployeeUuid = null; // Cleaned up
    });
  });

  describe('6. Payment History & Transactions', () => {
    let createdPaymentId = null;

    it('should fetch paginated payment history', async () => {
      const res = await request('GET', '/api/payments?page=1&limit=10', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.payments));
      assert.ok(res.body.pagination);
      assert.ok(res.body.pagination.total >= 3000);
      assert.strictEqual(res.body.payments.length, 10);
      assert.ok(res.body.payments[0].employee);
      assert.ok(res.body.payments[0].amount > 0);
    });

    it('should filter payments by status', async () => {
      const res = await request('GET', '/api/payments?status=Paid&limit=10', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.payments.length > 0);
      assert.ok(res.body.payments.every(p => p.status === 'Paid'));
    });

    it('should fetch recent 5 payments for dashboard table', async () => {
      const res = await request('GET', '/api/payments/recent', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 5);
      assert.ok(res.body[0].employee);
      assert.ok(res.body[0].employee.employeeId);
    });

    it('should fetch payment summary statistics', async () => {
      const res = await request('GET', '/api/payments/summary', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.totalRecords >= 3000);
      assert.ok(res.body.totalAmount > 0);
      assert.ok(res.body.paidCount > 0);
    });

    it('should create and update a payment record', async () => {
      // Find an employee to attach payment to
      const empRes = await request('GET', '/api/employees?limit=1', null, {
        Authorization: `Bearer ${authToken}`
      });
      const emp = empRes.body.data[0];

      const createRes = await request('POST', '/api/payments', {
        employeeId: emp.id,
        amount: 85000,
        paymentMonth: '2026-11',
        paymentMethod: 'UPI',
        status: 'Pending'
      }, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(createRes.status, 201);
      assert.strictEqual(createRes.body.amount, 85000);
      assert.strictEqual(createRes.body.status, 'Pending');
      createdPaymentId = createRes.body.id;

      // Update status to Paid
      const updateRes = await request('PATCH', `/api/payments/${createdPaymentId}/status`, {
        status: 'Paid',
        remarks: 'Processed via UPI'
      }, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.status, 'Paid');

      // Clean up
      await request('DELETE', `/api/payments/${createdPaymentId}`, null, {
        Authorization: `Bearer ${authToken}`
      });
    });
  });

  describe('7. INR Dashboard & Chart Endpoints', () => {
    it('should return INR dashboard stats with employee, payroll, and payment metrics', async () => {
      const res = await request('GET', '/api/dashboard/stats', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.totalEmployees >= 1000);
      assert.ok(res.body.totalMonthlyPayroll > 0);
      assert.ok(res.body.averageSalary > 0);
      assert.ok(typeof res.body.paidCount === 'number');
      assert.ok(typeof res.body.pendingCount === 'number');
    });

    it('should return monthly payment trends for the last 6 months', async () => {
      const res = await request('GET', '/api/dashboard/monthly-trend', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length <= 6);
      assert.ok(res.body.length > 0);
      assert.ok(res.body[0].month);
      assert.ok(typeof res.body[0].totalAmount === 'number');
    });

    it('should return department payroll distribution for pie chart', async () => {
      const res = await request('GET', '/api/dashboard/dept-payroll', null, {
        Authorization: `Bearer ${authToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);
      assert.ok(res.body[0].department);
      assert.ok(res.body[0].monthlyPayroll > 0);
      assert.ok(res.body[0].percentage > 0);
    });
  });
});

