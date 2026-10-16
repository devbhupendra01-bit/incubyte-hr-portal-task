const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const EMPLOYEE_SELECT = {
  id: true,
  employeeId: true,
  firstName: true,
  lastName: true,
  department: true,
  designation: true
};

const VALID_SORT_FIELDS = ['paymentDate', 'amount', 'status', 'paymentMonth', 'createdAt'];

async function attachEmployeesToPayments(payments) {
  if (!payments || payments.length === 0) return payments;
  const empIds = [...new Set(payments.map(p => p.employeeId).filter(Boolean))];
  if (empIds.length === 0) return payments.map(p => ({ ...p, employee: null }));

  const employees = await prisma.employee.findMany({
    where: { id: { in: empIds } },
    select: { ...EMPLOYEE_SELECT, email: true }
  });
  const empMap = new Map(employees.map(e => [e.id, e]));

  return payments.map(p => ({
    ...p,
    employee: empMap.get(p.employeeId) || null
  }));
}

router.get('/recent', async (req, res) => {
  try {
    const payments = await prisma.paymentHistory.findMany({
      take: 5,
      orderBy: { paymentDate: 'desc' }
    });
    const enriched = await attachEmployeesToPayments(payments);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch recent payments', error: err.message });
  }
});

router.get('/months', async (req, res) => {
  try {
    const months = await prisma.paymentHistory.groupBy({ by: ['paymentMonth'], orderBy: { paymentMonth: 'desc' } });
    res.json(months.map(m => m.paymentMonth));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment months', error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const groups = await prisma.paymentHistory.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true }
    });

    const summary = { totalRecords: 0, totalAmount: 0, paidCount: 0, paidAmount: 0, pendingCount: 0, pendingAmount: 0, failedCount: 0, failedAmount: 0 };

    groups.forEach(item => {
      const count = item._count._all || 0;
      const amount = item._sum.amount || 0;
      summary.totalRecords += count;
      summary.totalAmount += amount;
      if (item.status === 'Paid') { summary.paidCount = count; summary.paidAmount = amount; }
      else if (item.status === 'Pending') { summary.pendingCount = count; summary.pendingAmount = amount; }
      else if (item.status === 'Failed') { summary.failedCount = count; summary.failedAmount = amount; }
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment summary', error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;
    const { search, month, status, method, sortBy = 'paymentDate', sortOrder = 'desc' } = req.query;

    const where = {};

    if (month && month !== 'all') where.paymentMonth = month;
    if (status && status !== 'all') where.status = status;
    if (method && method !== 'all') where.paymentMethod = method;

    if (search?.trim()) {
      const tokens = search.trim().split(/\s+/).filter(Boolean);
      const matchedEmployees = await prisma.employee.findMany({
        where: {
          AND: tokens.map(token => ({
            OR: [
              { firstName: { contains: token, mode: 'insensitive' } },
              { lastName: { contains: token, mode: 'insensitive' } },
              { employeeId: { contains: token, mode: 'insensitive' } },
              { department: { contains: token, mode: 'insensitive' } },
              { designation: { contains: token, mode: 'insensitive' } }
            ]
          }))
        },
        select: { id: true }
      });
      const matchingIds = matchedEmployees.map(e => e.id);
      where.employeeId = { in: matchingIds };
    }

    const sortField = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'paymentDate';
    const sortDir = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, payments] = await Promise.all([
      prisma.paymentHistory.count({ where }),
      prisma.paymentHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir }
      })
    ]);

    const enriched = await attachEmployeesToPayments(payments);

    res.json({ payments: enriched, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payments', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { employeeId, amount, paymentMonth, paymentDate, paymentMethod, status, remarks } = req.body;

    if (!employeeId || !amount || !paymentMonth) {
      return res.status(400).json({ message: 'employeeId, amount, and paymentMonth are required' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: EMPLOYEE_SELECT
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const payment = await prisma.paymentHistory.create({
      data: {
        employeeId,
        amount: parseFloat(amount),
        paymentMonth,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || 'Bank Transfer',
        status: status || 'Paid',
        remarks: remarks || null
      }
    });

    res.status(201).json({ ...payment, employee });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create payment record', error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!['Paid', 'Pending', 'Failed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Paid, Pending, or Failed' });
    }

    const updated = await prisma.paymentHistory.update({
      where: { id: req.params.id },
      data: { status, ...(remarks !== undefined && { remarks }) }
    });

    const employee = await prisma.employee.findUnique({
      where: { id: updated.employeeId },
      select: EMPLOYEE_SELECT
    });

    res.json({ ...updated, employee });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update payment status', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.paymentHistory.delete({ where: { id: req.params.id } });
    res.json({ message: 'Payment record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete payment record', error: err.message });
  }
});

module.exports = router;
