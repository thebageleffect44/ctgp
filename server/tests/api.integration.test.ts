import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import prisma from '../src/db/prisma.js';

let authToken: string;
let organizationId: string;
let otherOrgToken: string;
let otherOrgId: string;
let testSupplierId: string;

describe('API Integration & Tenant Isolation Suite', () => {
  beforeAll(async () => {
    // 1. Log in with demo account
    const loginRes = await request(app)
      .post('/api/auth/demo-login')
      .send();

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    authToken = loginRes.body.token;
    organizationId = loginRes.body.user.organization.id;

    // 2. Create another organization to test cross-tenant isolation
    const uniqueEmail = `admin_${Date.now()}@competitor.sample`;
    const otherRes = await request(app)
      .post('/api/auth/register')
      .send({
        companyName: 'Isolated Competitor Pvt Ltd',
        pan: 'BBCDE5678K',
        name: 'Competitor Admin',
        email: uniqueEmail,
        password: 'Password123!',
        role: 'FINANCE_ADMIN',
      });

    expect(otherRes.status).toBe(201);
    otherOrgToken = otherRes.body.token;
    otherOrgId = otherRes.body.user.organization.id;

    // Get an existing supplier for tests
    const sup = await prisma.supplier.findFirst({
      where: { organizationId },
    });
    testSupplierId = sup!.id;
  });

  describe('Healthcheck', () => {
    it('returns healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Dashboard & Metrics', () => {
    it('fetches real calculated metrics for authenticated org', async () => {
      const res = await request(app)
        .get('/api/compliance/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.kpis.totalOutstanding).toBeGreaterThan(0);
      expect(res.body.data.kpis.totalAccruedInterest).toBeGreaterThan(0);
      expect(res.body.data.ageingBuckets).toBeDefined();
    });

    it('returns zeroes for an empty new organization', async () => {
      const res = await request(app)
        .get('/api/compliance/metrics')
        .set('Authorization', `Bearer ${otherOrgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis.totalOutstanding).toBe(0);
      expect(res.body.data.kpis.unpaidCount).toBe(0);
    });
  });

  describe('Tenant Data Isolation & Cross-Tenant Security', () => {
    it('prevents user from Org B from viewing invoices belonging to Org A', async () => {
      // Find an invoice from Org A
      const orgAInvoice = await prisma.invoice.findFirst({
        where: { organizationId },
      });

      // Attempt to fetch it using Org B token
      const res = await request(app)
        .get(`/api/invoices/${orgAInvoice!.id}`)
        .set('Authorization', `Bearer ${otherOrgToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('prevents user from Org B from creating invoice linked to Org A supplier', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .send({
          supplierId: testSupplierId, // belongs to Org A
          invoiceNumber: 'INV-ATTACK-001',
          invoiceDate: '2026-04-01',
          principalAmount: 50000,
        });

      expect(res.status).toBe(500); // Supplier not found in your organization
    });
  });

  describe('Invoice CRUD & Business Rules', () => {
    const testInvoiceNum = `INV-TEST-${Date.now()}`;

    it('creates invoice and automatically applies statutory caps and interest calculations', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: testSupplierId,
          invoiceNumber: testInvoiceNum,
          invoiceDate: '2026-04-01',
          deliveryDate: '2026-04-01',
          hasWrittenAgreement: true,
          contractualCreditDays: 60, // Exceeds 45 days!
          principalAmount: 150000,
          notes: 'Test invoice with 60 day term',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statutoryLimitDays).toBe(45); // Capped at 45 days
      expect(res.body.data.dueDateSource).toBe('STATUTORY_45_DAY_CAP');
    });

    it('records payment and recalculates outstanding balance and status', async () => {
      const created = await prisma.invoice.findFirst({
        where: { invoiceNumber: testInvoiceNum, organizationId },
      });

      const res = await request(app)
        .post(`/api/invoices/${created!.id}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 150000,
          paymentDate: '2026-04-20',
          referenceNumber: 'UTR-TEST-12345',
          paymentMode: 'NEFT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.paymentStatus).toBe('PAID');
      expect(res.body.data.invoice.amountPaid).toBe(150000);
    });

    it('rejects invoice with negative or zero principal amount', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: testSupplierId,
          invoiceNumber: 'INV-INVALID-AMT',
          invoiceDate: '2026-04-01',
          principalAmount: -500,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('CSV Import Workflow', () => {
    it('previews and auto-detects column headers from CSV content', async () => {
      const sampleCsv = `Invoice Number,Supplier Name,Invoice Date,Amount
INV-CSV-001,Bharat Precision Components,2026-03-01,75000
INV-CSV-002,Deccan Springs & Fasteners,2026-03-02,95000`;

      const res = await request(app)
        .post('/api/import/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ csvContent: sampleCsv });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRows).toBe(2);
      expect(res.body.data.suggestedMapping.invoiceNumber).toBe('Invoice Number');
    });

    it('validates CSV rows and detects duplicates', async () => {
      // One new invoice and one that repeats INV-2026-089 (already seeded)
      const testCsv = `Invoice Number,Supplier Name,Invoice Date,Amount
INV-2026-089,Bharat Precision Components,2026-01-01,10000
INV-NEW-UNIQUE-99,Bharat Precision Components,2026-01-01,20000`;

      const res = await request(app)
        .post('/api/import/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          csvContent: testCsv,
          mapping: {
            invoiceNumber: 'Invoice Number',
            supplierName: 'Supplier Name',
            invoiceDate: 'Invoice Date',
            principalAmount: 'Amount',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalRows).toBe(2);
      expect(res.body.data.duplicateRowCount).toBe(1);
      expect(res.body.data.validRowCount).toBe(1);
    });
  });

  describe('Reports and Statutory Exports', () => {
    it('generates MSME Form 1 preparation schedule and exports CSV', async () => {
      const res = await request(app)
        .get('/api/reports/msme-form-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records).toBeInstanceOf(Array);
      expect(res.body.data.meta.thresholdCriteria).toContain('45 days');

      // Test CSV format export
      const csvRes = await request(app)
        .get('/api/reports/msme-form-1?format=csv')
        .set('Authorization', `Bearer ${authToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.header['content-type']).toContain('text/csv');
      expect(csvRes.text).toContain('supplierName,supplierPan');
    });

    it('generates Section 43B(h) disallowance schedule and exports CSV', async () => {
      const res = await request(app)
        .get('/api/reports/section-43b')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records.length).toBeGreaterThan(0);
      expect(res.body.data.meta.totalTaxImpact).toBeGreaterThan(0);
    });
  });

  describe('Immutable Audit Trail', () => {
    it('returns recorded audit events for the organization', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
    });
  });
});
