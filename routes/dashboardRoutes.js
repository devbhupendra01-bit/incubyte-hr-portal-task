const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const totalEmployees = await prisma.employee.count();

    const salaryAgg = await prisma.employee.aggregate({ _sum: { salary: true }, _avg: { salary: true } });
    const totalAnnualPayroll = salaryAgg._sum.salary || 0;
    const totalMonthlyPayroll = Math.round(totalAnnualPayroll / 12);
    const averageSalary = Math.round(salaryAgg._avg.salary || 0);
    const averageMonthlySalary = Math.round(averageSalary / 12);

    const latestPayment = await prisma.paymentHistory.findFirst({
      orderBy: { paymentMonth: 'desc' },
      select: { paymentMonth: true }
    });

    const currentMonth = latestPayment?.paymentMonth || new Date().toISOString().slice(0, 7);

    const [monthStats] = await Promise.all([
      prisma.paymentHistory.groupBy({
        by: ['status'],
        where: { paymentMonth: currentMonth },
        _count: { _all: true },
        _sum: { amount: true }
      })
    ]);

    const summary = { paidCount: 0, paidAmount: 0, pendingCount: 0, pendingAmount: 0, failedCount: 0, failedAmount: 0 };

    monthStats.forEach(item => {
      const count = item._count._all || 0;
      const amount = item._sum.amount || 0;
      if (item.status === 'Paid') { summary.paidCount = count; summary.paidAmount = amount; }
      else if (item.status === 'Pending') { summary.pendingCount = count; summary.pendingAmount = amount; }
      else if (item.status === 'Failed') { summary.failedCount = count; summary.failedAmount = amount; }
    });

    res.json({ totalEmployees, totalAnnualPayroll, totalMonthlyPayroll, averageSalary, averageMonthlySalary, currentMonth, ...summary });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
});

router.get('/monthly-trend', async (req, res) => {
  try {
    const trendData = await prisma.paymentHistory.groupBy({
      by: ['paymentMonth', 'status'],
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { paymentMonth: 'asc' }
    });

    const monthMap = {};
    trendData.forEach(item => {
      const m = item.paymentMonth;
      if (!monthMap[m]) {
        monthMap[m] = { month: m, totalAmount: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0, paidCount: 0, pendingCount: 0, failedCount: 0 };
      }
      const amt = item._sum.amount || 0;
      const count = item._count._all || 0;
      monthMap[m].totalAmount += amt;
      if (item.status === 'Paid') { monthMap[m].paidAmount += amt; monthMap[m].paidCount += count; }
      else if (item.status === 'Pending') { monthMap[m].pendingAmount += amt; monthMap[m].pendingCount += count; }
      else if (item.status === 'Failed') { monthMap[m].failedAmount += amt; monthMap[m].failedCount += count; }
    });

    const result = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch monthly trend', error: err.message });
  }
});

router.get('/dept-payroll', async (req, res) => {
  try {
    const deptStats = await prisma.employee.groupBy({
      by: ['department'],
      _sum: { salary: true },
      _avg: { salary: true },
      _count: { _all: true },
      orderBy: { _sum: { salary: 'desc' } }
    });

    const total = deptStats.reduce((sum, d) => sum + (d._sum.salary || 0), 0);

    res.json(deptStats.map(item => ({
      department: item.department,
      employeeCount: item._count._all,
      annualPayroll: item._sum.salary || 0,
      monthlyPayroll: Math.round((item._sum.salary || 0) / 12),
      averageSalary: Math.round(item._avg.salary || 0),
      percentage: total > 0 ? Math.round(((item._sum.salary || 0) / total) * 1000) / 10 : 0
    })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch department payroll', error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const totalEmployees = await prisma.employee.count();

    const [avgByCurrency, totalByCurrency] = await Promise.all([
      prisma.employee.groupBy({ by: ['currency'], _avg: { salary: true }, _count: { _all: true } }),
      prisma.employee.groupBy({ by: ['currency'], _sum: { salary: true }, _count: { _all: true } })
    ]);

    res.json({
      totalEmployees,
      averageSalaryByCurrency: avgByCurrency.map(item => ({
        currency: item.currency,
        averageSalary: Math.round((item._avg.salary || 0) * 100) / 100,
        employeeCount: item._count._all
      })),
      totalPayrollByCurrency: totalByCurrency.map(item => ({
        currency: item.currency,
        totalPayroll: Math.round((item._sum.salary || 0) * 100) / 100,
        employeeCount: item._count._all
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard summary', error: err.message });
  }
});

router.get('/by-department', async (req, res) => {
  try {
    const report = await prisma.employee.groupBy({
      by: ['department', 'currency'],
      _sum: { salary: true },
      _avg: { salary: true },
      _count: { _all: true },
      _min: { salary: true },
      _max: { salary: true },
      orderBy: { department: 'asc' }
    });

    res.json(report.map(item => ({
      department: item.department,
      currency: item.currency,
      employeeCount: item._count._all,
      totalSalary: Math.round((item._sum.salary || 0) * 100) / 100,
      monthlyPayroll: Math.round((item._sum.salary || 0) / 12),
      averageSalary: Math.round((item._avg.salary || 0) * 100) / 100,
      minSalary: item._min.salary || 0,
      maxSalary: item._max.salary || 0
    })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch department report', error: err.message });
  }
});

router.get('/by-country', async (req, res) => {
  try {
    const report = await prisma.employee.groupBy({
      by: ['country', 'currency'],
      _sum: { salary: true },
      _avg: { salary: true },
      _count: { _all: true },
      _min: { salary: true },
      _max: { salary: true },
      orderBy: { country: 'asc' }
    });

    res.json(report.map(item => ({
      country: item.country,
      currency: item.currency,
      employeeCount: item._count._all,
      totalSalary: Math.round((item._sum.salary || 0) * 100) / 100,
      averageSalary: Math.round((item._avg.salary || 0) * 100) / 100,
      minSalary: item._min.salary || 0,
      maxSalary: item._max.salary || 0
    })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch country report', error: err.message });
  }
});

module.exports = router;
