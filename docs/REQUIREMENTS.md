# Requirements Document — Employee Salary Management System

**Author:** Abhishek  
**Version:** 1.0  
**Status:** Final

---

## 1. Goal

Replace ACME org's spreadsheet-based salary management with a secure, web-based application that allows the HR Manager to view, manage, and analyse salary data for 10,000 employees across multiple countries and currencies — without the risk of formula errors, version conflicts, or access-control gaps that come with Excel.

---

## 2. User Persona

**Primary User:** HR Manager  
The HR Manager needs to:
- Quickly look up an employee's compensation details
- Add, update, or remove employee records
- Understand how the organisation pays people across departments and countries
- Have confidence that salary figures are accurate and not mixed across incompatible currencies

---

## 3. Scope & Features

### 3.1 Employee Directory

| Feature | Description |
|---|---|
| List employees | Paginated table (default 20/page, configurable up to 100) with server-side rendering — no loading all 10,000 records at once |
| Search | Full-text search across first name, last name, employee ID, and email |
| Filter | Dropdown filters by department and country |
| Sort | Clickable column headers for Employee ID, Name, Department, Country, Salary, Date of Joining |
| Add employee | Modal form with all required fields and validation (duplicate ID/email check) |
| Edit employee | Pre-filled modal to update salary, designation, or any other field |
| View profile | Full employee detail card in a read-only modal |
| Delete employee | Confirmed delete with clear warning; removes from DB and payroll calculations immediately |

### 3.2 Compensation Analytics Dashboard

| Feature | Description |
|---|---|
| Total headcount | Live count of all employees |
| Currency-isolated payroll | Total payroll and average salary grouped strictly per currency — no cross-currency mixing |
| Department breakdown | Headcount, average salary, total payroll, min/max salary per department (by currency) |
| Country breakdown | Same metrics grouped by country and local currency |
| Filter in-page | Client-side filter on department and country report tables |

### 3.3 Authentication

| Feature | Description |
|---|---|
| Login | JWT-based login with email or username |
| Register | New account creation with bcrypt password hashing |
| Session | 4-hour JWT expiry; token stored in localStorage |
| Demo Login | One-click demo button that auto-creates admin@example.com if it doesn't exist — for evaluator convenience |

---

## 4. Deliberately Left Out (and Why)

| Feature | Reasoning |
|---|---|
| Role-based access control (RBAC) | Out of scope for a single-persona tool; the HR Manager is the only user type described |
| Bulk CSV import / export | Adds significant complexity; the seed script handles initial migration; CRUD handles ongoing changes |
| Salary history / audit log | Useful long-term but not part of the core workflow the problem describes |
| Notifications / approval workflows | No multi-stakeholder process implied in the problem statement |
| Multi-tenant support | ACME is a single organisation |
| Payslip generation / PDF export | This is a data management tool, not a payroll processing system |
| Real-time collaboration | Single-user persona; no concurrent editing requirement |
| Mobile-only design | Responsive layout at 768px breakpoint; desktop-first is appropriate for HR tools |

---

## 5. Technical Decisions

### 5.1 Stack

| Layer | Choice | Reason |
|---|---|---|
| Backend | Node.js + Express.js | Fast, JavaScript throughout, well understood |
| Database | PostgreSQL (Neon hosted) | Relational for groupBy aggregates; Neon is free and SSL-enabled |
| ORM | Prisma | Type-safe queries, indexed schema, built-in groupBy for analytics |
| Frontend | React.js + Vite | Component model suits table-heavy UIs; Vite HMR speeds development |
| Auth | JWT + bcryptjs | Stateless; no Redis or session store needed for single-user tool |
| CSS | Vanilla CSS with design tokens | No dependency on a component library; full control |

### 5.2 Performance Approach

- **Server-side pagination**: Only N rows fetched per request; no 10,000-record payloads
- **Database indexes**: On `department`, `country`, `currency`, `email`, `(firstName, lastName)`, and `(department, country)` composite index
- **No DB lookup per auth request**: JWT signature verification proves identity; removed per-request `findUnique` call from auth middleware
- **Parallel dashboard fetches**: All three dashboard API calls run simultaneously via `Promise.all`
- **In-place UI updates**: Add and Edit update React state from the API response directly — no re-fetch; Delete removes the row from state — no re-fetch unless the page becomes empty

### 5.3 Currency Isolation Design Decision

Payroll aggregations group strictly by `currency`. This prevents the conceptually invalid operation of summing USD + INR salaries into a single total. Each currency is reported independently, and the UI displays a separate card per currency.

---

## 6. Acceptance Criteria

- HR Manager can list all 10,000 employees with server-side pagination
- HR Manager can search employees by name, ID, or email
- HR Manager can filter by department and country
- HR Manager can add a new employee; duplicate ID or email is rejected
- HR Manager can edit any employee field
- HR Manager can delete an employee with a confirmation step
- Dashboard shows currency-isolated payroll totals, department and country breakdowns
- All 19 automated tests pass (auth, CRUD, pagination, search, filter, dashboard, delete)
- Application starts with a single `npm start` command after `npm run build`
