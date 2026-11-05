/**
 * Statutory Compliance Rule Registry
 * 
 * Provides versioned rules, citations, effective dates, and legal parameters
 * for Indian MSME payment compliance (MSMED Act 2006, Income-tax Act Section 43B(h), MCA Form 1).
 */

export interface RuleDefinition {
  ruleId: string;
  name: string;
  actName: string;
  sectionReference: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  description: string;
  parameters: Record<string, any>;
  applicableEntities: string[];
  caveats: string[];
}

export const RULE_REGISTRY: Record<string, RuleDefinition> = {
  MSMED_SEC15_PAYMENT_TIMELINES: {
    ruleId: 'MSMED_SEC15_PAYMENT_TIMELINES',
    name: 'Statutory Payment Time Limits',
    actName: 'Micro, Small and Medium Enterprises Development Act, 2006',
    sectionReference: 'Section 15 read with Section 2(b)',
    version: '1.0.0',
    effectiveFrom: '2006-10-02',
    description: 'Buyer must pay Micro/Small supplier on or before agreed date, not exceeding 45 days. If no written agreement, within 15 days.',
    parameters: {
      maxAgreedCreditDays: 45,
      defaultCreditDaysWithoutAgreement: 15,
      objectionWindowDays: 15,
    },
    applicableEntities: ['MICRO', 'SMALL'],
    caveats: [
      'Applies only to Micro and Small enterprises holding valid Udyam registration at the time of supply.',
      'Contractual credit terms exceeding 45 days are legally void and capped at 45 days.',
      'Where an objection in writing is raised within 15 days of delivery, the acceptance date shifts to the date when the supplier resolves the objection.',
    ],
  },

  MSMED_SEC16_COMPOUND_INTEREST: {
    ruleId: 'MSMED_SEC16_COMPOUND_INTEREST',
    name: 'Statutory Delayed Payment Compound Interest',
    actName: 'Micro, Small and Medium Enterprises Development Act, 2006',
    sectionReference: 'Section 16',
    version: '1.0.0',
    effectiveFrom: '2006-10-02',
    description: 'Mandatory compound interest with monthly rests at 3 times the RBI Bank Rate for delayed payments to Micro and Small enterprises.',
    parameters: {
      rbiBankRateMultiplier: 3,
      currentRbiBankRatePercent: 6.75, // Current RBI Bank Rate as per latest policy
      statutoryInterestRatePercent: 20.25, // 3 * 6.75%
      compoundingFrequency: 'MONTHLY_RESTS',
    },
    applicableEntities: ['MICRO', 'SMALL'],
    caveats: [
      'Statutory interest is mandatory and overrides any contractual waiver or lower agreed rate.',
      'Under MSMED Act Section 23, interest paid or payable under Section 16 is NOT allowed as a tax deduction under the Income-tax Act, 1961.',
    ],
  },

  IT_SEC_43B_H_TAX_DISALLOWANCE: {
    ruleId: 'IT_SEC_43B_H_TAX_DISALLOWANCE',
    name: 'Disallowance of Delayed Payments to Micro & Small Enterprises',
    actName: 'Income-tax Act, 1961',
    sectionReference: 'Section 43B(h)',
    version: '1.0.0',
    effectiveFrom: '2023-04-01', // Applicable from FY 2023-24 (AY 2024-25)
    description: 'Any sum payable to an MSE beyond the Section 15 deadline is disallowed as a business expense in the year of accrual and allowed only in the year of actual payment.',
    parameters: {
      fiscalYearEndMonth: 3, // March 31
      appliesToMedium: false,
      appliesToTraders: false, // Excluded per OM 2/1(5)/2021-P&G/Policy
      provisoSection43BApplicable: false, // Filing ITR due date does NOT save delayed payment
    },
    applicableEntities: ['MICRO', 'SMALL'],
    caveats: [
      'Medium enterprises (investment up to ₹50 Cr, turnover up to ₹250 Cr) are completely exempt from Section 43B(h).',
      'Wholesale and Retail traders (NIC codes 45, 46, 47) registered under Udyam are NOT covered under Section 43B(h) as per Ministry OM dated 02/07/2021.',
      'If payment is made on or before the due date under Section 15 of MSMED Act, deduction is allowed even if paid after March 31 of the financial year.',
    ],
  },

  MCA_MSME_FORM_1_REPORTING: {
    ruleId: 'MCA_MSME_FORM_1_REPORTING',
    name: 'Specified Companies Half-Yearly Return of Delayed MSME Dues',
    actName: 'Companies Act, 2013 read with Specified Companies Order, 2019',
    sectionReference: 'Section 405',
    version: '1.0.0',
    effectiveFrom: '2019-01-22',
    description: 'Companies that get supplies from micro and small enterprises and whose payments exceed 45 days must file half-yearly return MSME Form 1 to MCA.',
    parameters: {
      thresholdDaysOverdue: 45,
      h1Period: { fromMonth: 4, toMonth: 9, filingDeadlineMonth: 10, filingDeadlineDay: 31 }, // Oct 31
      h2Period: { fromMonth: 10, toMonth: 3, filingDeadlineMonth: 4, filingDeadlineDay: 30 }, // April 30
    },
    applicableEntities: ['COMPANIES_PURCHASING_FROM_MSE'],
    caveats: [
      'Applies to all companies incorporated under Companies Act, 2013 with dues exceeding 45 days.',
      'Requires vendor-wise outstanding amount and detailed reason for delay.',
    ],
  },
};

/**
 * Historical and current RBI Bank Rate Registry
 */
export interface RbiBankRateEntry {
  effectiveDate: string;
  ratePercent: number;
  statutoryRatePercent: number; // 3 * ratePercent
  notificationRef: string;
}

export const RBI_BANK_RATES: RbiBankRateEntry[] = [
  {
    effectiveDate: '2023-02-08',
    ratePercent: 6.75,
    statutoryRatePercent: 20.25,
    notificationRef: 'RBI/2022-2023/178 DOR.RET.REC.94/12.01.001/2022-23',
  },
  {
    effectiveDate: '2022-12-07',
    ratePercent: 6.50,
    statutoryRatePercent: 19.50,
    notificationRef: 'RBI/2022-2023/151 DOR.RET.REC.87/12.01.001/2022-23',
  },
  {
    effectiveDate: '2022-09-30',
    ratePercent: 6.15,
    statutoryRatePercent: 18.45,
    notificationRef: 'RBI/2022-2023/124 DOR.RET.REC.73/12.01.001/2022-23',
  },
];

/**
 * Returns the effective RBI bank rate for a given date
 */
export function getEffectiveBankRate(targetDate: Date = new Date()): RbiBankRateEntry {
  const targetIso = targetDate.toISOString().slice(0, 10);
  for (const entry of RBI_BANK_RATES) {
    if (targetIso >= entry.effectiveDate) {
      return entry;
    }
  }
  // Default fallback to latest known rate
  return RBI_BANK_RATES[0];
}
