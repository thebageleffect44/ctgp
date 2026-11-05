# Closing the Payment Gap

> A compliance-driven B2B fintech SaaS platform for managing supplier payments, statutory deadlines, and regulatory exposure under India's **MSMED Act, 2006 (Sections 15 & 16)** and **Income-tax Act, 1961 (Section 43B(h))**.

---

## 1. Executive Summary & Business Context

Delayed payments to India's Micro and Small Enterprises (MSEs) tie up an estimated ₹8.1 to ₹10.7 lakh crore in working capital. While India's legal architecture grants MSE suppliers robust statutory rights, enterprise finance and accounts payable teams frequently struggle to track these obligations across hundreds of vendor ledgers.

**Closing the Payment Gap** automates buyer-side compliance:
- **MSMED Act Section 15 Enforcement**: Automatically caps contractual credit terms exceeding 45 days down to the statutory 45-day ceiling, defaults unagreed invoices to 15 days, and tracks the 15-day dispute/objection window under Section 2(b).
- **MSMED Act Section 16 Interest Engine**: Computes mandatory compound interest with monthly rests at 3× the Reserve Bank of India (RBI) Bank Rate (currently 20.25% p.a.) using decimal-safe arithmetic.
- **Section 43B(h) Tax Disallowance Tracker**: Real-time calculation of corporate tax disallowance exposure for delayed dues to Micro and Small manufacturers/service providers unpaid as of fiscal year end.
- **MCA MSME Form 1 Preparation**: Instant generation and CSV export of half-yearly reporting returns for specified companies with dues outstanding over 45 days.

---

## 2. Technology Stack & Architecture

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Router v6
- **Backend**: Node.js, Express, TypeScript, Zod request validation, Multer (CSV upload), Decimal.js (safe financial math)
- **Database & ORM**: PostgreSQL (production) / SQLite (zero-config local dev), Prisma ORM with versioned migrations
- **Testing**: Vitest, Supertest (Unit & Integration tests)
- **Security**: Multi-tenant database isolation, JWT authentication, Role-Based Access Control (RBAC), bcryptjs password hashing, tamper-evident immutable audit logging

---

## 3. Project Directory Structure

```
closing-the-payment-gap/
├── docker-compose.yml              # PostgreSQL 16 container definition
├── .env.example                    # Global environment configuration template
├── package.json                    # Root workspace orchestration scripts
├── README.md                       # Complete documentation & run guide
│
├── server/                         # Express & TypeScript REST API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                        # Local server environment (configured with dev.db)
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma schema (SQLite dev engine)
│   │   ├── schema.postgres.prisma  # PostgreSQL production schema
│   │   ├── migrations/             # Versioned SQL migration DDL
│   │   └── seed.ts                 # Fictional Indian enterprise compliance seed script
│   ├── src/
│   │   ├── config/                 # Env constants and RBI rate defaults
│   │   ├── db/prisma.ts            # Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT verification, tenant isolation, RBAC
│   │   │   └── errorHandler.ts     # Standardized JSON error response handler
│   │   ├── services/
│   │   │   ├── rules/
│   │   │   │   └── ruleRegistry.ts # Versioned statutory legal rules & RBI rates
│   │   │   ├── financialMath.ts    # Decimal.js compound interest & tax exposure math
│   │   │   ├── invoiceService.ts   # Invoices CRUD, statutory deadline & interest engine
│   │   │   ├── supplierService.ts  # Vendor directory, PAN/Udyam verification
│   │   │   ├── complianceService.ts# Dashboard metrics, ageing analysis, alert workflows
│   │   │   ├── reportService.ts    # MSME Form 1 & Section 43B(h) schedules, CSV generator
│   │   │   ├── csvImportService.ts # Bulk CSV parser, mapping, validation & duplicate checks
│   │   │   └── auditService.ts     # Immutable audit trail logger
│   │   ├── routes/                 # Express API routes (/auth, /invoices, /suppliers, etc.)
│   │   └── server.ts               # Application bootstrap
│   └── tests/
│       ├── financialMath.test.ts   # 12 Unit tests for statutory math & Section 15 caps
│       └── api.integration.test.ts # 13 API integration & cross-tenant security tests
│
└── client/                         # React 18 SPA (Vite + Tailwind CSS)
    ├── package.json
    ├── vite.config.ts              # Vite dev server with /api proxy to port 5000
    ├── tailwind.config.js          # Custom B2B fintech typography and color palette
    ├── index.html
    └── src/
        ├── components/             # Reusable UI (Navbar, StatCards, Badges, Modals)
        ├── context/                # AuthContext (JWT, user state, one-click demo login)
        ├── utils/formatters.ts     # Indian currency (₹ Lakh/Crore) & date formatters
        ├── services/api.ts         # Type-safe fetch API wrapper
        ├── pages/
        │   ├── Dashboard.tsx       # Executive KPIs, ageing buckets, urgent risk alerts
        │   ├── Invoices.tsx        # Filterable invoice ledger, add/pay modals, details
        │   ├── Suppliers.tsx       # Vendor directory, Udyam tracking, trader flags
        │   ├── Compliance.tsx      # Deadline monitoring, workflow action workbench
        │   ├── Reports.tsx         # MSME Form 1 & Sec 43B(h) schedules, CSV/print export
        │   ├── CsvImport.tsx       # 4-Step interactive CSV bulk import workflow
        │   ├── AuditTrail.tsx      # Immutable event log with actor timestamps & diffs
        │   ├── RulesInfo.tsx       # Legal explainability & statutory formula breakdown
        │   └── Login.tsx           # Authentication & Instant Demo Access
        ├── App.tsx                 # Protected client routes & layout
        └── main.tsx                # Client entrypoint
```

---

## 4. Quick Start & Local Run Commands

The repository is pre-configured so that you can run it on your MacBook immediately with **zero external service setup required**.

### Step 1: Install Dependencies
From the repository root:
```bash
cd closing-the-payment-gap
npm run install:all
```

### Step 2: Initialize Database and Seed Fictional Demo Data
```bash
cd server
npx prisma db push
npx tsx prisma/seed.ts
cd ..
```

### Step 3: Run Automated Tests
Verify all 25 unit and integration tests:
```bash
npm test
```

### Step 4: Start Development Servers
Open two terminal windows (or tabs):

**Terminal 1 — Backend API (Port 5000):**
```bash
npm run dev:server
```

**Terminal 2 — Frontend UI (Port 5173):**
```bash
npm run dev:client
```

Open your browser to: **`http://localhost:5173`**

---

## 5. Preloaded Demo Credentials

Click the **"Enter Demo Workspace as Finance Admin"** button on the sign-in page for instant one-click access, or use:

| Role | Email | Password |
|---|---|---|
| **Finance Admin** | `finance.lead@apexindia.com` | `DemoPassword123!` |
| **Accounts Payable** | `ap.officer@apexindia.com` | `DemoPassword123!` |
| **Auditor** | `auditor@apexindia.com` | `DemoPassword123!` |

*Demo Organization: Apex Automotive Systems India Pvt Ltd (PAN: AABCA9876K)*

---

## 6. Production PostgreSQL Deployment

To switch from the local SQLite engine to PostgreSQL in Docker:
```bash
# 1. Start PostgreSQL 16 container
docker compose up -d

# 2. Update server/.env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/payment_gap_compliance?schema=public"

# 3. Apply versioned migrations and seed
cd server
npx prisma migrate deploy --schema prisma/schema.postgres.prisma
npx tsx prisma/seed.ts
```

---

## 7. Overview of Implemented Features

### A. Executive Dashboard
- Live calculated KPIs: Total Outstanding, Overdue Invoices, Approaching Deadlines, Accrued Section 16 Interest, and Section 43B(h) Tax Disallowance Exposure.
- Visual ageing analysis breakdown across standard accounting buckets (0-15 days, 16-30 days, 31-45 days, 46-90 days, 90+ days).
- Critical risk alert banner flagging immediate cash tax exposure at corporate rate (25.17%).

### B. Invoice Management
- Multi-field search, status filtering, and supplier filtering.
- Automated Section 15 validation: Credit terms > 45 days are legally overridden and capped at 45 days.
- Section 2(b) objection tracking: If written objection was raised within 15 days of delivery, acceptance date shifts to the date the objection was resolved.
- Payment recording workflow with automatic recalculation of overdue days and interest.
- Detailed audit view modal displaying exact statutory determination reasoning.

### C. Supplier Directory
- Categorisation by MSME type (`MICRO`, `SMALL`, `MEDIUM`, `NOT_MSME`, `UNVERIFIED`).
- **Trader Exclusion Toggle**: Accounts for Ministry of MSME OM No. 2/1(5)/2021-P&G/Policy (wholesale/retail traders under NIC 45-47 are excluded from Sections 15/16 and Section 43B(h)).
- Verification status tracking (Udyam Verified vs Self-Declared).
- Aggregated vendor exposure and overdue counters.

### D. Deadline & Compliance Monitoring
- Actionable alert workbench: Open, Acknowledged, Assigned, and Resolved statuses.
- Human review workflows: Assign tasks to team members and record resolution notes with UTR payment proof.

### E. Statutory Reports & Exports
- **MSME Form 1 Preparation Schedule**: Displays dues to Micro and Small suppliers exceeding 45 days in MCA-prescribed format. Downloadable as CSV.
- **Section 43B(h) Tax Disallowance Schedule**: Highlights invoices at risk of fiscal year-end tax add-back. Downloadable as CSV.
- **Invoices Ledger Export**: Full multi-column CSV export.
- **Print View**: Clean, print-optimised layout for audit documentation.

### F. Bulk CSV Import Workflow
- 4-step wizard: Upload -> Column Mapping -> Backend Validation & Duplicate Detection -> Commit.
- Downloadable sample CSV template.
- Identifies invalid amounts, malformed dates, and duplicate invoice numbers before persisting.

### G. Immutable Audit Trail
- Records timestamp, actor email, action type, entity type, entity ID, and event payload.
- Restricted to authorised compliance officers and auditors.

### H. Statutory Rules & Rates
- Interactive documentation of Sections 15, 16, 23 of MSMED Act, Section 43B(h) of Income-tax Act, and MCA Order 2019.
- Live Reserve Bank of India (RBI) Bank Rate tracking (Current: 6.75% -> Statutory 3×: 20.25% p.a.).

---

## 8. Automated Test Results

The test suite covers unit math, statutory edge cases, request validation, CSV parsing, and multi-tenant isolation.

Run tests:
```bash
npm test
```

### Test Summary (25/25 Passing):
```
 ✓ tests/financialMath.test.ts (12 tests)
   ✓ calculateStatutoryDueDate (MSMED Act Section 15)
     ✓ caps contractual credit terms > 45 days to exactly 45 days per Section 15 proviso
     ✓ honors contractual credit terms <= 45 days when written agreement exists
     ✓ applies statutory default of 15 days when no written agreement exists
     ✓ adjusts acceptance date when written objection is raised and resolved per Section 2(b)
   ✓ calculateStatutoryInterest (MSMED Act Section 16)
     ✓ correctly calculates compound interest with monthly rests at 3x RBI bank rate (20.25% p.a.)
     ✓ returns zero interest for non-overdue invoices
     ✓ denies Section 16 interest if supplier is MEDIUM or NOT_MSME
     ✓ denies Section 16 interest if supplier is classified as a Trader under OM 2021
   ✓ assessSection43bExposure (Income-tax Act Section 43B(h))
     ✓ identifies overdue invoice to Micro enterprise as subject to Section 43B(h) disallowance risk
     ✓ exempts Medium enterprise suppliers from Section 43B(h) disallowance
     ✓ exempts wholesale/retail traders from Section 43B(h)
   ✓ getAgeingBucket
     ✓ classifies days into standard accounting buckets

 ✓ tests/api.integration.test.ts (13 tests)
   ✓ Healthcheck endpoint returns healthy status
   ✓ Fetches real calculated metrics for authenticated org
   ✓ Returns zeroes for an empty new organization
   ✓ Tenant Isolation: Prevents user from Org B from viewing invoices belonging to Org A
   ✓ Tenant Isolation: Prevents user from Org B from creating invoice linked to Org A supplier
   ✓ Creates invoice and automatically applies statutory caps and interest calculations
   ✓ Records payment and recalculates outstanding balance and status
   ✓ Rejects invoice with negative or zero principal amount
   ✓ CSV Import: Previews and auto-detects column headers
   ✓ CSV Import: Validates CSV rows and detects duplicate invoice numbers
   ✓ Reports: Generates MSME Form 1 preparation schedule and exports CSV
   ✓ Reports: Generates Section 43B(h) disallowance schedule and exports CSV
   ✓ Audit: Returns recorded audit events for the organization
```

---

## 9. Architectural Accommodations for Module B: Supplier Claim Engine

The architecture was intentionally structured to allow the addition of **Module B (Supplier Claim Engine)** without altering existing buyer compliance tables:

```mermaid
flowchart LR
    subgraph SharedCore ["Shared Core Engine"]
        Rules[Versioned Rules Service: MSMED Sec 15/16, IT 43B-h]
        Math[Decimal.js Compound Interest & Ageing Engine]
        RBI[RBI Bank Rate Registry]
    end

    subgraph ModuleA ["Module A: Buyer Compliance Tracker (Current)"]
        BuyerOrg[Buyer Organization]
        VendorDir[Supplier Directory]
        APInvoices[Inbound Purchase Invoices]
        Form1[MSME Form 1 & 43B(h) Reports]
    end

    subgraph ModuleB ["Module B: Supplier Claim Engine (Future)"]
        SupplierOrg[Supplier Organization]
        OutboundInvoices[Outbound Sales Invoices]
        EvidenceVault[Contract & Delivery Challan Vault]
        ODRClaimPack[MSME ODR / Samadhaan Claim Pack Generator]
        EscalationReminders[Controlled Automated Reminders]
    end

    SharedCore --> ModuleA
    SharedCore --> ModuleB
```

### Specific Extensibility Touchpoints:
1. **Shared Rules Engine**: `src/services/financialMath.ts` and `src/services/rules/ruleRegistry.ts` can calculate overdue claims from the supplier's perspective without modification.
2. **Entity Role Generalization**: `Organization` model has an extensible `businessType` field. A future migration can add `tenantType: 'BUYER' | 'SUPPLIER' | 'BOTH'`.
3. **Claim Pack Document Generator**: A new service `claimPackService.ts` can consume the invoice and evidence records to generate statutory claim statements for the MSME Online Dispute Resolution (ODR) portal.
4. **Document References**: The `supportingDocRef` field on the `Invoice` entity is prepared to integrate with S3/GCS or local document vaults for delivery challans, purchase orders, and communication proofs.

---

## 10. Known Limitations & Unresolved Legal Assumptions

1. **Udyam API Integration**: The Indian government's Udyam portal does not offer a public, unauthenticated REST API for automated registration number validation. Suppliers are currently verified through manual verification marking or user self-declaration.
2. **Court & Facilitation Council Discretion**: Under Section 18 of the MSMED Act, references go to the state Micro and Small Enterprises Facilitation Council (MSEFC). While Section 16 interest is legally mandatory, councils occasionally conciliate compromises on accrued interest.
3. **Fiscal Year End Timing**: Section 43B(h) disallowance applies to invoices outstanding as of March 31. During the course of the fiscal year, overdue invoices are flagged as *Disallowance Risk*; definitive disallowance crystallises only at year-end.
