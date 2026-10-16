# Architecture & Design Notes

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React)                      │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────────┐   │
│  │ Navbar   │ │  Dashboard   │ │  EmployeeList      │   │
│  │ (Auth)   │ │  (Analytics) │ │  (Directory+CRUD)  │   │
│  └──────────┘ └──────────────┘ └────────────────────┘   │
│              services/api.js (fetch + JWT header)        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (REST API)
                         │ /api/*
┌────────────────────────▼────────────────────────────────┐
│              Express.js Server (server.js)               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  authMiddleware.js (JWT verify — no DB lookup)      │ │
│  └──────────────────────────────────────────────────── │ │
│  ┌───────────────┐ ┌────────────────┐ ┌─────────────┐  │ │
│  │ authRoutes.js │ │employeeRoutes  │ │ dashboard   │  │ │
│  │ /api/auth     │ │ /api/employees │ │ Routes.js   │  │ │
│  └───────────────┘ └────────────────┘ └─────────────┘  │ │
│              Prisma ORM (lib/prisma.js)                  │
└────────────────────────┬────────────────────────────────┘
                         │ pg (SSL)
┌────────────────────────▼────────────────────────────────┐
│           PostgreSQL — Neon Serverless                   │
│   User table · Employee table (6 indexes)               │
└─────────────────────────────────────────────────────────┘
```

---

## Data Model

### User
```
id          UUID (PK)
username    String (unique)
email       String (unique)
password    String (bcrypt hash)
createdAt   DateTime
updatedAt   DateTime
```

### Employee
```
id            UUID (PK)
employeeId    String (unique)       — HR-assigned ID like "EMP12345"
firstName     String
lastName      String
email         String (unique)
phone         String (nullable)
department    String
designation   String
country       String
city          String (nullable)
salary        Float                 — Annual salary in local currency
currency      String                — ISO 4217 code (USD, INR, GBP…)
dateOfJoining DateTime
createdAt     DateTime
updatedAt     DateTime

Indexes:
  @@index([department])
  @@index([country])
  @@index([currency])
  @@index([firstName, lastName])
  @@index([email])
  @@index([department, country])
```

---

## API Design

### Authentication
```
POST /api/auth/register   — {username, email, password}
POST /api/auth/login      — {email, password} → {token}
```

### Employees
```
GET  /api/employees?page&limit&search&department&country&sortBy&sortOrder
     → {data: Employee[], pagination: {page, limit, total, totalPages}}

GET  /api/employees/filters
     → {departments: string[], countries: string[]}

GET  /api/employees/:id   → Employee

POST /api/employees       — {employeeId, firstName, lastName, email,
                             department, designation, country, city,
                             salary, currency, dateOfJoining, phone}
                          → Employee (list-view fields only — no re-fetch needed)

PUT  /api/employees/:id   — (same fields as POST, partial OK)
                          → Employee (list-view fields only)

DELETE /api/employees/:id → {message: string}
                          — Catches Prisma P2025 for 404; no pre-flight findUnique
```

### Dashboard
```
GET /api/dashboard/summary       → {totalEmployees, averageSalaryByCurrency[], totalPayrollByCurrency[]}
GET /api/dashboard/by-department → DeptReport[]
GET /api/dashboard/by-country    → CountryReport[]
```

---

## Frontend State Management

React component state only — no Redux or external state library. The data flow for CRUD operations avoids re-fetching:

```
Add Employee:
  EmployeeModal.onSaved(newEmployee)
    → App calls employeeListSavedRef.current(newEmployee, false)
      → EmployeeList prepends newEmployee to employees[], total++

Edit Employee:
  EmployeeModal.onSaved(updatedEmployee)
    → App calls employeeListSavedRef.current(updatedEmployee, true)
      → EmployeeList replaces matching row by id, no network call

Delete Employee:
  EmployeeList.handleDeleteEmployee()
    → api.deleteEmployee(id)
    → filter(emp => emp.id !== id), total--
    → Only re-fetches if page becomes empty (navigate to page-1)
```

---

## Performance Decisions

| Decision | Impact |
|---|---|
| Server-side pagination | API returns ≤100 rows; never serialises all 10,000 |
| 6 DB indexes on Employee table | Fast WHERE + ORDER BY for search, filter, sort |
| JWT-only auth (no DB lookup per request) | Removes 1 Neon round-trip per API call |
| POST/PUT return select-only fields | Response is 12 fields, not the full record |
| In-place state updates on add/edit/delete | Zero extra API calls for 95% of mutations |
| Parallel Promise.all on dashboard | 3 DB queries run simultaneously |

---

## Trade-offs

| Trade-off | Decision | Reason |
|---|---|---|
| SQLite vs PostgreSQL | PostgreSQL | Neon gives free hosted SSL DB; groupBy aggregates work identically; production-realistic |
| Session store vs JWT | JWT | No Redis needed; stateless; acceptable for single-user internal tool |
| Component library vs vanilla CSS | Vanilla CSS | Full control over the design system; no bundle bloat from unused components |
| TypeScript vs JavaScript | JavaScript | Faster iteration; tests are deterministic regardless; Prisma provides query safety |
| Optimistic UI vs server-confirmed | Server-confirmed | The API returns the created/updated record; state is set from that, not guessed |
| Re-fetch on delete vs in-place | In-place (except empty-page) | Zero extra DB round-trips in 95% of cases; only re-fetch when pagination is affected |
