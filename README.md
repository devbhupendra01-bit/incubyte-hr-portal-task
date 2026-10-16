# Employee Salary Management System

A web-based Employee Salary Management System for an organisation with 10,000 employees. Built for the HR Manager persona to replace spreadsheet-based salary tracking with a structured, performant, and queryable interface.

**Stack:** React.js · Node.js/Express.js · PostgreSQL (Prisma ORM) · JWT Auth

---

## 📄 Artifacts

| Document | Description |
|---|---|
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Goal, scope, features, deliberate exclusions, acceptance criteria |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System diagram, data model, API design, performance decisions, trade-offs |
| [`docs/AI_UTILIZATION.md`](docs/AI_UTILIZATION.md) | Comprehensive report on how AI was utilized throughout the development lifecycle |

---

## 🛠 Technology Stack

- **Frontend**: React.js (JavaScript, Vite, Vanilla CSS design system)
- **Backend**: Node.js (Express.js v5)
- **Database & ORM**: PostgreSQL with Prisma ORM (`@prisma/client`, `@prisma/adapter-pg`)
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs
- **Testing**: Node.js native test runner (`node:test`, `node:assert`)

---


## 📁 Project Structure

```
├── docs/                       # Assessment artifacts
│   ├── REQUIREMENTS.md         # Requirements document (goal, scope, exclusions)
│   └── ARCHITECTURE.md         # Architecture diagram, data model, trade-offs
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Navigation bar & authentication switch
│   │   │   ├── Dashboard.jsx            # Currency-isolated payroll & compensation analytics
│   │   │   ├── EmployeeList.jsx         # Employee directory with search, filter, pagination
│   │   │   ├── EmployeeModal.jsx        # Create / edit employee modal with validation
│   │   │   ├── EmployeeDetailsModal.jsx # Full profile view modal
│   │   │   └── AuthModal.jsx            # Sign In / Register / One-Click Demo login
│   │   ├── services/
│   │   │   └── api.js                   # API client service with token handling
│   │   ├── App.jsx                      # Main app controller
│   │   ├── App.css                      # Layout & component styling
│   │   └── index.css                    # Design system, tokens, typography
│   └── vite.config.js                   # Vite configuration with /api proxy
├── lib/
│   └── prisma.js               # Prisma Client singleton
├── middleware/
│   └── authMiddleware.js       # JWT Bearer authentication verification
├── prisma/
│   ├── schema.prisma           # Prisma schema with indexed queries
│   └── seed.js                 # Database seed script for 10,000 employees
├── routes/
│   ├── authRoutes.js           # /api/auth (register, login)
│   ├── employeeRoutes.js       # /api/employees (CRUD, search, filter, pagination)
│   └── dashboardRoutes.js      # /api/dashboard (currency-isolated summaries & reports)
├── tests/
│   └── salary_and_employee.test.js  # 19 automated tests for all features
├── .env.example                # Environment variable template
├── package.json                # Project dependencies and npm scripts
├── server.js                   # Express server entry point & SPA static host
└── README.md                   # Setup guide and API documentation
```

---

## ⚙️ Environment Variables

Create or configure `.env` in the root directory:

```env
PORT=3000
JWT_SECRET=supersecretjwtkey_salary_mgmt_2026
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>?sslmode=require
```

---

## 🚀 Setup & Running Instructions

### 1. Install Dependencies
Install root dependencies and client dependencies:
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
npm --prefix client install
```

### 2. Push Database Schema
Synchronize the PostgreSQL schema:
```bash
npm run db:push
```

### 3. Seed Database (10,000 Employees)
Generate 10,000 employee records with realistic multi-currency salaries across departments and countries:
```bash
npm run seed
```

### 4. Run Automated Tests
Execute the 19 automated tests covering CRUD, search, pagination, salary updates, and currency-isolated payroll calculations:
```bash
npm test
```

### 5. Build and Run the Application

#### Option A: Unified Full-Stack Server (Recommended)
Build the frontend and run the Express server (serves both API on `/api` and the React UI on `/`):
```bash
# Build client
npm run build

# Start server
npm start
```
Open **`http://localhost:3000`** in your browser.

#### Option B: Independent Development Servers
Run the backend and Vite dev server simultaneously:
```bash
# Terminal 1: Backend API (port 3000)
npm run dev

# Terminal 2: React Vite Dev Server (port 5173 with proxy)
npm run dev:client
```
Open **`http://localhost:5173`** in your browser.

---

## 📊 Key Features

### 1. Employee Management
- **Directory Table**: Clean, responsive table showing employee ID, full name, email, department, role, location, formatted salary, and date of joining.
- **Search**: Real-time search across first name, last name, employee ID, and email.
- **Filters**: Dynamic department and country dropdown filters.
- **Sorting**: Click any sortable column header (Employee ID, Name, Department, Country, Salary, Date of Joining).
- **Server-Side Pagination**: Efficient pagination handling 10,000+ records with configurable page size (10, 20, 50, 100).
- **CRUD Operations**: Modal to create new employees, view full profile cards, edit records, and delete records with confirmation.

### 2. Dashboard & Compensation Analytics
- **Strict Currency Isolation**: Payroll totals and averages are calculated per currency (USD, GBP, INR, EUR, CAD, AUD, JPY, SGD) without invalid currency mixing.
- **Summary Cards**: Total employees, active currencies, department count, and global presence.
- **Department-Wise Breakdown**: Detailed table showing headcount, average salary, total payroll, min and max salary per department.
- **Country-Wise Breakdown**: Regional salary report with local currency isolation.

### 3. Authentication
- JWT bearer token authentication with password hashing using bcryptjs.
- One-Click **Demo Admin Login** button in the UI for effortless evaluation.

---

## 📡 API Reference

All protected endpoints require `Authorization: Bearer <token>`.

### Authentication
- `POST /api/auth/register` — Register a user (`username`, `email`, `password`)
- `POST /api/auth/login` — Sign in and get a JWT token

### Employees
- `GET /api/employees` — List employees with query params:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `search` (name, ID, email)
  - `department` (filter by department)
  - `country` (filter by country)
  - `sortBy` & `sortOrder` (`asc` / `desc`)
- `GET /api/employees/filters` — Get distinct departments and countries
- `GET /api/employees/:id` — Get single employee record
- `POST /api/employees` — Create new employee record
- `PUT /api/employees/:id` — Update employee record
- `DELETE /api/employees/:id` — Remove employee record

### Dashboard
- `GET /api/dashboard/summary` — Total employees, currency-wise average salary, and total payroll
- `GET /api/dashboard/by-department` — Department-wise compensation aggregation
- `GET /api/dashboard/by-country` — Country-wise compensation aggregation
