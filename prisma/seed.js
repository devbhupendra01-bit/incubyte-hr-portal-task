const prisma = require('../lib/prisma');

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance', 'Operations', 'Product', 'Design', 'Legal', 'Customer Support'];
const DESIGNATIONS = ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Manager', 'Director', 'VP'];

// INR-only: All employees are based in India with Indian cities
const CITIES = ['Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Noida', 'Gurgaon', 'Chandigarh'];

// INR annual salary ranges (₹4,00,000 to ₹40,00,000)
const SALARY_MIN = 400000;
const SALARY_MAX = 4000000;

const FIRST_NAMES = ['Amit', 'Priya', 'Raj', 'Sunita', 'Vikram', 'Anita', 'Rahul', 'Neha', 'Sanjay', 'Pooja', 'Arun', 'Deepa', 'Suresh', 'Kavita', 'Manish', 'Ritu', 'Ajay', 'Meera', 'Rohit', 'Swati', 'Kiran', 'Asha', 'Nitin', 'Rekha', 'Ashish', 'Sonal', 'Vivek', 'Geeta', 'Prakash', 'Nisha', 'Harish', 'Jyoti', 'Aditya', 'Pallavi', 'Sachin', 'Divya', 'Gaurav', 'Archana', 'Manoj', 'Shruti', 'Vishal', 'Aarti', 'Pankaj', 'Bhavna', 'Naveen', 'Komal', 'Sandeep', 'Varsha', 'Hemant', 'Anjali'];
const LAST_NAMES = ['Kumar', 'Sharma', 'Singh', 'Patel', 'Gupta', 'Verma', 'Joshi', 'Reddy', 'Nair', 'Rao', 'Mehta', 'Shah', 'Mishra', 'Iyer', 'Agarwal', 'Chauhan', 'Bose', 'Das', 'Pillai', 'Menon', 'Desai', 'Kulkarni', 'Chopra', 'Saxena', 'Malhotra', 'Kapoor', 'Banerjee', 'Mukherjee', 'Sinha', 'Pandey', 'Tiwari', 'Yadav', 'Dubey', 'Chandra', 'Jain', 'Sethi', 'Bhat', 'Hegde', 'Nayak', 'Patil'];

const PAYMENT_METHODS = ['Bank Transfer', 'UPI', 'Cheque', 'NEFT'];
const PAYMENT_STATUSES_WEIGHTS = [
  { status: 'Paid', weight: 80 },
  { status: 'Pending', weight: 15 },
  { status: 'Failed', weight: 5 }
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.status;
  }
  return items[items.length - 1].status;
}

function generateEmployee(index) {
  return {
    employeeId: `EMP${String(index + 1).padStart(5, '0')}`,
    firstName: randomElement(FIRST_NAMES),
    lastName: randomElement(LAST_NAMES),
    email: `employee${index + 1}@company.com`,
    phone: `+91${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
    department: randomElement(DEPARTMENTS),
    designation: randomElement(DESIGNATIONS),
    country: 'India',
    city: randomElement(CITIES),
    salary: randomBetween(SALARY_MIN, SALARY_MAX),
    currency: 'INR',
    dateOfJoining: randomDate(2015, 2025)
  };
}

async function seed() {
  console.log('Seeding 10,000 employees (INR-only)...');
  const startTime = Date.now();

  // Clear existing payment history and employees
  await prisma.paymentHistory.deleteMany();
  await prisma.employee.deleteMany();
  console.log('Cleared existing data');

  // Insert employees in batches of 500
  const BATCH_SIZE = 500;
  const TOTAL = 10000;

  for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, TOTAL); j++) {
      batch.push(generateEmployee(j));
    }
    await prisma.employee.createMany({ data: batch });
    console.log(`  Inserted ${Math.min(i + BATCH_SIZE, TOTAL)} / ${TOTAL} employees`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Employee seeding complete! ${TOTAL} employees created in ${elapsed}s`);

  // Generate payment history for recent 6 months
  console.log('Generating payment history for last 6 months...');

  // Pick a random sample of 500 employees for payment history demonstration
  const sampleEmployees = await prisma.employee.findMany({
    take: 500,
    select: { id: true, salary: true },
    orderBy: { employeeId: 'asc' }
  });

  const now = new Date();
  const months = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    months.push({
      label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      year: d.getFullYear(),
      month: d.getMonth()
    });
  }

  let paymentCount = 0;
  for (const monthInfo of months) {
    const paymentBatch = [];
    for (const emp of sampleEmployees) {
      const monthlySalary = Math.round(emp.salary / 12);
      const status = weightedRandom(PAYMENT_STATUSES_WEIGHTS);
      const payDay = randomBetween(1, 28);
      const paymentDate = new Date(monthInfo.year, monthInfo.month, payDay);

      paymentBatch.push({
        employeeId: emp.id,
        amount: monthlySalary,
        paymentMonth: monthInfo.label,
        paymentDate: paymentDate,
        paymentMethod: randomElement(PAYMENT_METHODS),
        status: status,
        remarks: status === 'Failed' ? 'Bank account verification failed' : null
      });
    }

    // Insert payments in sub-batches
    const PAY_BATCH_SIZE = 250;
    for (let i = 0; i < paymentBatch.length; i += PAY_BATCH_SIZE) {
      const subBatch = paymentBatch.slice(i, i + PAY_BATCH_SIZE);
      await prisma.paymentHistory.createMany({ data: subBatch });
    }
    paymentCount += paymentBatch.length;
    console.log(`  Payment records for ${monthInfo.label}: ${paymentBatch.length}`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Seeding complete! ${TOTAL} employees + ${paymentCount} payment records in ${totalElapsed}s`);
}

seed()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
