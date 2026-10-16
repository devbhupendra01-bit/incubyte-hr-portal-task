const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const EMPLOYEE_LIST_SELECT = {
  id: true,
  employeeId: true,
  firstName: true,
  lastName: true,
  email: true,
  department: true,
  designation: true,
  country: true,
  city: true,
  salary: true,
  currency: true,
  dateOfJoining: true
};

const VALID_SORT_FIELDS = [
  'firstName', 'lastName', 'employeeId', 'department',
  'country', 'salary', 'dateOfJoining', 'createdAt'
];

function buildSearchConditions(query) {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  return tokens.map(token => ({
    OR: [
      { firstName: { contains: token, mode: 'insensitive' } },
      { lastName: { contains: token, mode: 'insensitive' } },
      { employeeId: { contains: token, mode: 'insensitive' } },
      { email: { contains: token, mode: 'insensitive' } },
      { department: { contains: token, mode: 'insensitive' } },
      { designation: { contains: token, mode: 'insensitive' } }
    ]
  }));
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { search, department, country, sortBy, sortOrder } = req.query;

    const where = {};

    if (search?.trim()) {
      where.AND = buildSearchConditions(search);
    }

    if (department) {
      where.AND ? where.AND.push({ department }) : (where.department = department);
    }

    if (country) {
      where.AND ? where.AND.push({ country }) : (where.country = country);
    }

    const orderField = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({ where, skip, take: limit, orderBy: { [orderField]: orderDir }, select: EMPLOYEE_LIST_SELECT }),
      prisma.employee.count({ where })
    ]);

    res.json({ data: employees, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch employees', error: err.message });
  }
});

router.get('/filters', async (req, res) => {
  try {
    const [departments, countries] = await Promise.all([
      prisma.employee.findMany({ select: { department: true }, distinct: ['department'], orderBy: { department: 'asc' } }),
      prisma.employee.findMany({ select: { country: true }, distinct: ['country'], orderBy: { country: 'asc' } })
    ]);

    res.json({
      departments: departments.map(d => d.department),
      countries: countries.map(c => c.country)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch filters', error: err.message });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const employees = await prisma.employee.findMany({
      where: { AND: buildSearchConditions(q) },
      take: 8,
      orderBy: { firstName: 'asc' },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        designation: true,
        city: true,
        country: true,
        salary: true,
        currency: true
      }
    });

    res.json(employees.map(emp => ({ ...emp, fullName: `${emp.firstName} ${emp.lastName}`.trim() })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch suggestions', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const param = req.params.id;
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id: param }, { employeeId: param }] }
    });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch employee', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { employeeId, firstName, lastName, email, phone, department, designation, country, city, salary, currency, dateOfJoining } = req.body;

    const errors = [];
    if (!employeeId) errors.push('Employee ID is required');
    if (!firstName) errors.push('First name is required');
    if (!lastName) errors.push('Last name is required');
    if (!email) errors.push('Email is required');
    if (!department) errors.push('Department is required');
    if (!designation) errors.push('Designation is required');
    if (!country) errors.push('Country is required');
    if (salary === undefined || salary === null || salary < 0) errors.push('Valid salary is required');
    if (!currency) errors.push('Currency is required');
    if (!dateOfJoining) errors.push('Date of joining is required');

    if (errors.length > 0) return res.status(400).json({ message: 'Validation failed', errors });

    const [existingById, existingByEmail] = await Promise.all([
      prisma.employee.findUnique({ where: { employeeId }, select: { id: true } }),
      prisma.employee.findUnique({ where: { email }, select: { id: true } })
    ]);

    if (existingById) return res.status(409).json({ message: 'Employee ID already exists' });
    if (existingByEmail) return res.status(409).json({ message: 'Email already exists' });

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        department,
        designation,
        country,
        city: city || null,
        salary: parseFloat(salary),
        currency,
        dateOfJoining: new Date(dateOfJoining)
      },
      select: EMPLOYEE_LIST_SELECT
    });

    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create employee', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Employee not found' });

    const { firstName, lastName, email, phone, department, designation, country, city, salary, currency, dateOfJoining } = req.body;

    const errors = [];
    if (firstName !== undefined && !firstName) errors.push('First name cannot be empty');
    if (lastName !== undefined && !lastName) errors.push('Last name cannot be empty');
    if (email !== undefined && !email) errors.push('Email cannot be empty');
    if (salary !== undefined && (salary === null || salary < 0)) errors.push('Valid salary is required');
    if (currency !== undefined && !currency) errors.push('Currency cannot be empty');

    if (errors.length > 0) return res.status(400).json({ message: 'Validation failed', errors });

    if (email && email !== existing.email) {
      const taken = await prisma.employee.findUnique({ where: { email }, select: { id: true } });
      if (taken) return res.status(409).json({ message: 'Email already exists' });
    }

    const data = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone || null;
    if (department !== undefined) data.department = department;
    if (designation !== undefined) data.designation = designation;
    if (country !== undefined) data.country = country;
    if (city !== undefined) data.city = city || null;
    if (salary !== undefined) data.salary = parseFloat(salary);
    if (currency !== undefined) data.currency = currency;
    if (dateOfJoining !== undefined) data.dateOfJoining = new Date(dateOfJoining);

    const employee = await prisma.employee.update({ where: { id: req.params.id }, data });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update employee', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;
    await prisma.paymentHistory.deleteMany({ where: { employeeId } });
    await prisma.employee.delete({ where: { id: employeeId } });
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Employee not found' });
    res.status(500).json({ message: 'Failed to delete employee', error: err.message });
  }
});

module.exports = router;
