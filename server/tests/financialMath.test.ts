import { describe, it, expect } from 'vitest';
import {
  calculateStatutoryDueDate,
  calculateStatutoryInterest,
  assessSection43bExposure,
  getAgeingBucket,
} from '../src/services/financialMath.js';
import Decimal from 'decimal.js';

describe('Financial Math & Statutory Compliance Rules', () => {
  describe('calculateStatutoryDueDate (MSMED Act Section 15)', () => {
    it('caps contractual credit terms > 45 days to exactly 45 days per Section 15 proviso', () => {
      const result = calculateStatutoryDueDate({
        invoiceDate: new Date('2026-04-01'),
        deliveryDate: new Date('2026-04-01'),
        hasWrittenAgreement: true,
        contractualCreditDays: 90, // Contract says 90 days
      });

      expect(result.effectiveDueDays).toBe(45);
      expect(result.dueDateSource).toBe('STATUTORY_45_DAY_CAP');
      expect(result.isCappedByStatute).toBe(true);
      expect(result.dueDate.toISOString().slice(0, 10)).toBe('2026-05-16');
    });

    it('honors contractual credit terms <= 45 days when written agreement exists', () => {
      const result = calculateStatutoryDueDate({
        invoiceDate: new Date('2026-04-01'),
        deliveryDate: new Date('2026-04-01'),
        hasWrittenAgreement: true,
        contractualCreditDays: 30,
      });

      expect(result.effectiveDueDays).toBe(30);
      expect(result.dueDateSource).toBe('AGREED_TERM');
      expect(result.isCappedByStatute).toBe(false);
      expect(result.dueDate.toISOString().slice(0, 10)).toBe('2026-05-01');
    });

    it('applies statutory default of 15 days when no written agreement exists', () => {
      const result = calculateStatutoryDueDate({
        invoiceDate: new Date('2026-04-01'),
        deliveryDate: new Date('2026-04-01'),
        hasWrittenAgreement: false,
      });

      expect(result.effectiveDueDays).toBe(15);
      expect(result.dueDateSource).toBe('STATUTORY_15_DAY_DEFAULT');
      expect(result.dueDate.toISOString().slice(0, 10)).toBe('2026-04-16');
    });

    it('adjusts acceptance date when written objection is raised and resolved per Section 2(b)', () => {
      const result = calculateStatutoryDueDate({
        invoiceDate: new Date('2026-04-01'),
        deliveryDate: new Date('2026-04-01'),
        hasWrittenObjection: true,
        objectionDate: new Date('2026-04-05'),
        objectionResolvedDate: new Date('2026-04-10'),
        hasWrittenAgreement: true,
        contractualCreditDays: 30,
      });

      expect(result.acceptanceDate.toISOString().slice(0, 10)).toBe('2026-04-10');
      // Due date is 30 days from April 10 -> May 10
      expect(result.dueDate.toISOString().slice(0, 10)).toBe('2026-05-10');
    });
  });

  describe('calculateStatutoryInterest (MSMED Act Section 16)', () => {
    it('correctly calculates compound interest with monthly rests at 3x RBI bank rate (20.25% p.a.)', () => {
      const principal = new Decimal(100000); // ₹1,00,000
      const dueDate = new Date('2026-04-01');
      const calculationDate = new Date('2026-06-30'); // 90 days overdue (approx 3 monthly rests)

      const result = calculateStatutoryInterest({
        principalAmount: principal,
        dueDate,
        calculationDate,
        msmeType: 'MICRO',
        isTrader: false,
      });

      expect(result.isEligibleForStatutoryInterest).toBe(true);
      expect(result.daysOverdue).toBe(90);
      expect(result.statutoryInterestRate.toNumber()).toBe(20.25);
      expect(result.accruedInterest.toNumber()).toBeGreaterThan(5000);
      expect(result.totalPayableWithInterest.toNumber()).toBe(
        principal.plus(result.accruedInterest).toNumber()
      );
    });

    it('returns zero interest for non-overdue invoices', () => {
      const result = calculateStatutoryInterest({
        principalAmount: 50000,
        dueDate: new Date('2026-05-01'),
        calculationDate: new Date('2026-04-15'), // Prior to due date
        msmeType: 'MICRO',
      });

      expect(result.isEligibleForStatutoryInterest).toBe(true);
      expect(result.daysOverdue).toBe(0);
      expect(result.accruedInterest.toNumber()).toBe(0);
    });

    it('denies Section 16 interest if supplier is MEDIUM or NOT_MSME', () => {
      const result = calculateStatutoryInterest({
        principalAmount: 100000,
        dueDate: new Date('2026-04-01'),
        calculationDate: new Date('2026-05-01'),
        msmeType: 'MEDIUM',
      });

      expect(result.isEligibleForStatutoryInterest).toBe(false);
      expect(result.accruedInterest.toNumber()).toBe(0);
      expect(result.ineligibilityReason).toContain('MEDIUM');
    });

    it('denies Section 16 interest if supplier is classified as a Trader under OM 2021', () => {
      const result = calculateStatutoryInterest({
        principalAmount: 100000,
        dueDate: new Date('2026-04-01'),
        calculationDate: new Date('2026-05-01'),
        msmeType: 'SMALL',
        isTrader: true,
      });

      expect(result.isEligibleForStatutoryInterest).toBe(false);
      expect(result.accruedInterest.toNumber()).toBe(0);
      expect(result.ineligibilityReason).toContain('trader');
    });
  });

  describe('assessSection43bExposure (Income-tax Act Section 43B(h))', () => {
    it('identifies overdue invoice to Micro enterprise as subject to Section 43B(h) disallowance risk', () => {
      const result = assessSection43bExposure({
        principalAmount: 200000,
        invoiceDate: new Date('2026-01-15'),
        dueDate: new Date('2026-02-15'),
        asOfDate: new Date('2026-03-01'),
        msmeType: 'MICRO',
        isTrader: false,
        applicableTaxRate: 0.2517, // Corporate tax 25.17%
      });

      expect(result.isApplicable).toBe(true);
      expect(result.isAtRiskOfDisallowance).toBe(true);
      expect(result.exposureAmount.toNumber()).toBe(200000);
      expect(result.potentialTaxImpact.toNumber()).toBe(50340); // 200000 * 0.2517
    });

    it('exempts Medium enterprise suppliers from Section 43B(h) disallowance', () => {
      const result = assessSection43bExposure({
        principalAmount: 500000,
        invoiceDate: new Date('2026-01-15'),
        dueDate: new Date('2026-02-15'),
        asOfDate: new Date('2026-04-05'),
        msmeType: 'MEDIUM',
      });

      expect(result.isApplicable).toBe(false);
      expect(result.exposureAmount.toNumber()).toBe(0);
      expect(result.potentialTaxImpact.toNumber()).toBe(0);
    });

    it('exempts wholesale/retail traders from Section 43B(h)', () => {
      const result = assessSection43bExposure({
        principalAmount: 300000,
        invoiceDate: new Date('2026-01-15'),
        dueDate: new Date('2026-02-15'),
        asOfDate: new Date('2026-04-05'),
        msmeType: 'SMALL',
        isTrader: true,
      });

      expect(result.isApplicable).toBe(false);
      expect(result.exposureAmount.toNumber()).toBe(0);
    });
  });

  describe('getAgeingBucket', () => {
    it('classifies days into standard accounting buckets', () => {
      expect(getAgeingBucket(0)).toBe('Not Overdue');
      expect(getAgeingBucket(10)).toBe('0-15 days');
      expect(getAgeingBucket(25)).toBe('16-30 days');
      expect(getAgeingBucket(40)).toBe('31-45 days');
      expect(getAgeingBucket(60)).toBe('46-90 days');
      expect(getAgeingBucket(120)).toBe('90+ days');
    });
  });
});
