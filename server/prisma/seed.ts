import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  calculateStatutoryDueDate,
  calculateStatutoryInterest,
  assessSection43bExposure,
} from '../src/services/financialMath.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with realistic fictional demo compliance data...');

  // Clean existing demo data if any
  await prisma.auditEvent.deleteMany({});
  await prisma.complianceAlert.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // 1. Create Demo Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Apex Automotive Systems (Sample Demo)',
      legalName: 'Apex Automotive Systems India Private Limited (Sample)',
      businessType: 'Private Limited',
      pan: 'AABCA9876K',
      gstin: '27AABCA9876K1Z5',
      country: 'India',
      operatingState: 'Maharashtra',
      currency: 'INR',
      applicableTaxRate: 0.2517, // 25% + 4% cess (Section 115BAA corporate rate)
      fiscalYearEndMonth: 3,
    },
  });

  // 2. Create Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('DemoPassword123!', salt);

  const adminUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Vikram Joshi (Sample Demo)',
      email: 'finance.lead@apexindia.com',
      passwordHash,
      role: 'FINANCE_ADMIN',
    },
  });

  const apUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Pooja Sharma (Sample Demo)',
      email: 'ap.officer@apexindia.com',
      passwordHash,
      role: 'ACCOUNTS_PAYABLE',
    },
  });

  const auditorUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Rajesh Kulkarni (Sample Demo)',
      email: 'auditor@apexindia.com',
      passwordHash,
      role: 'AUDITOR',
    },
  });

  // 3. Create Fictional Suppliers
  const s1 = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: 'Bharat Precision Components (Sample)',
      pan: 'AABCB1234F',
      udyamNumber: 'UDYAM-MH-01-0012345',
      msmeType: 'MICRO',
      isTrader: false,
      verificationStatus: 'VERIFIED',
      verificationDate: new Date('2025-11-15'),
      contactPerson: 'Suresh Patil',
      contactEmail: 'spatil@bharatprecision.sample',
      contactPhone: '+91 98220 12345',
      address: 'Plot 45, MIDC Bhosari, Pune, MH',
      notes: 'Critical precision CNC machining supplier. Valid Micro Udyam certificate on file.',
    },
  });

  const s2 = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: 'Deccan Springs & Fasteners (Sample)',
      pan: 'AADCD5678G',
      udyamNumber: 'UDYAM-MH-02-0098765',
      msmeType: 'SMALL',
      isTrader: false,
      verificationStatus: 'VERIFIED',
      verificationDate: new Date('2025-10-20'),
      contactPerson: 'Anand Deshmukh',
      contactEmail: 'anand@deccansprings.sample',
      contactPhone: '+91 98221 67890',
      address: 'Sector 12, Pimpri Industrial Area, Pune, MH',
      notes: 'High-tensile suspension springs. Valid Small enterprise Udyam certificate.',
    },
  });

  const s3 = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: 'Western Heavy Castings Ltd (Sample)',
      pan: 'AAACW9988H',
      udyamNumber: 'UDYAM-GJ-03-0044556',
      msmeType: 'MEDIUM',
      isTrader: false,
      verificationStatus: 'VERIFIED',
      verificationDate: new Date('2026-01-10'),
      contactPerson: 'Gautam Patel',
      contactEmail: 'gautam@westerncastings.sample',
      address: 'GIDC Industrial Estate, Vadodara, GJ',
      notes: 'Medium enterprise (Turnover ₹85 Cr). Excluded from MSMED Sec 16 interest and 43B(h) disallowance.',
    },
  });

  const s4 = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: 'Metro Alloy Traders (Sample)',
      pan: 'AABCM6677J',
      udyamNumber: 'UDYAM-MH-01-0033221',
      msmeType: 'MICRO',
      isTrader: true,
      verificationStatus: 'VERIFIED',
      verificationDate: new Date('2025-12-05'),
      contactPerson: 'Ramesh Mehta',
      contactEmail: 'ramesh@metroalloy.sample',
      address: 'Loha Bhavan, Darukhana, Mumbai, MH',
      notes: 'Wholesale raw steel distributor. Registered under Udyam (NIC 46). Excluded from MSMED Section 15/16 benefits as per Ministry OM 2021.',
    },
  });

  const s5 = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: 'Kavita Industrial Packaging (Sample)',
      pan: 'AACCK2233L',
      udyamNumber: null,
      msmeType: 'MICRO',
      isTrader: false,
      verificationStatus: 'UNVERIFIED',
      contactPerson: 'Kavita Nair',
      contactEmail: 'kavita@kavitapack.sample',
      address: 'Plot 88, Rabale MIDC, Navi Mumbai, MH',
      notes: 'Supplier has self-declared Micro status on invoice footer, but Udyam certificate is not yet uploaded/verified.',
    },
  });

  // 4. Create Diverse Invoices Representing Required Compliance Scenarios
  const now = new Date();

  // Helper date function
  const daysAgo = (d: number) => {
    const date = new Date(now.getTime());
    date.setDate(date.getDate() - d);
    return date;
  };

  const daysAhead = (d: number) => {
    const date = new Date(now.getTime());
    date.setDate(date.getDate() + d);
    return date;
  };

  // Scenario 1: A Paid Invoice (Cleared on time via NEFT)
  const inv1Date = daysAgo(60);
  const inv1Deliv = daysAgo(59);
  const inv1DueCalc = calculateStatutoryDueDate({
    invoiceDate: inv1Date,
    deliveryDate: inv1Deliv,
    hasWrittenAgreement: true,
    contractualCreditDays: 30,
  });
  const inv1 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      supplierId: s1.id,
      invoiceNumber: 'INV-2026-089',
      invoiceDate: inv1Date,
      deliveryDate: inv1Deliv,
      acceptanceDate: inv1DueCalc.acceptanceDate,
      hasWrittenAgreement: true,
      contractualCreditDays: 30,
      statutoryLimitDays: 30,
      dueDate: inv1DueCalc.dueDate,
      dueDateSource: 'AGREED_TERM',
      principalAmount: 245000.0,
      amountPaid: 245000.0,
      paymentStatus: 'PAID',
      paymentDate: daysAgo(35),
      applicableBankRate: 6.75,
      statutoryInterestRate: 20.25,
      accruedInterest: 0,
      daysOverdue: 0,
      section43bExposure: 0,
      potentialTaxImpact: 0,
      complianceStatus: 'COMPLIANT',
      notes: 'Paid within 24 days of delivery. Full tax deduction allowable.',
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org.id,
      invoiceId: inv1.id,
      amount: 245000.0,
      paymentDate: daysAgo(35),
      referenceNumber: 'NEFT-HDFC-99882211',
      paymentMode: 'NEFT',
      notes: 'Timely settlement as per agreed 30-day terms',
    },
  });

  // Scenario 2: Unpaid Invoice Not Yet Due (Safely within credit terms)
  const inv2Date = daysAgo(10);
  const inv2Deliv = daysAgo(9);
  const inv2DueCalc = calculateStatutoryDueDate({
    invoiceDate: inv2Date,
    deliveryDate: inv2Deliv,
    hasWrittenAgreement: true,
    contractualCreditDays: 30,
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      supplierId: s2.id,
      invoiceNumber: 'INV-2026-104',
      invoiceDate: inv2Date,
      deliveryDate: inv2Deliv,
      acceptanceDate: inv2DueCalc.acceptanceDate,
      hasWrittenAgreement: true,
      contractualCreditDays: 30,
      statutoryLimitDays: 30,
      dueDate: inv2DueCalc.dueDate,
      dueDateSource: 'AGREED_TERM',
      principalAmount: 380000.0,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
      applicableBankRate: 6.75,
      statutoryInterestRate: 20.25,
      accruedInterest: 0,
      daysOverdue: 0,
      section43bExposure: 0,
      potentialTaxImpact: 0,
      complianceStatus: 'COMPLIANT',
      notes: 'Fresh supply batch. Payment scheduled on approval.',
    },
  });

  // Scenario 3: Approaching Deadline (Due in 3 days - Section 15 attention required)
  const inv3Date = daysAgo(27);
  const inv3Deliv = daysAgo(27);
  const inv3DueCalc = calculateStatutoryDueDate({
    invoiceDate: inv3Date,
    deliveryDate: inv3Deliv,
    hasWrittenAgreement: true,
    contractualCreditDays: 30,
  });
  const inv3 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      supplierId: s1.id,
      invoiceNumber: 'INV-2026-101',
      invoiceDate: inv3Date,
      deliveryDate: inv3Deliv,
      acceptanceDate: inv3DueCalc.acceptanceDate,
      hasWrittenAgreement: true,
      contractualCreditDays: 30,
      statutoryLimitDays: 30,
      dueDate: inv3DueCalc.dueDate,
      dueDateSource: 'AGREED_TERM',
      principalAmount: 520000.0,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
      applicableBankRate: 6.75,
      statutoryInterestRate: 20.25,
      accruedInterest: 0,
      daysOverdue: 0,
      section43bExposure: 0,
      potentialTaxImpact: 0,
      complianceStatus: 'APPROACHING_DEADLINE',
      notes: 'Due in 3 days. Recommend queueing payment run immediately.',
    },
  });

  await prisma.complianceAlert.create({
    data: {
      organizationId: org.id,
      invoiceId: inv3.id,
      alertType: 'APPROACHING_DEADLINE',
      severity: 'HIGH',
      status: 'OPEN',
      ruleVersion: 'MSMED_SEC15_16_V1',
      reason: 'Invoice #INV-2026-101 will breach the 30-day Section 15 limit within 72 hours.',
      recommendedAction: 'Queue NEFT transfer before due date to avoid 20.25% compound statutory interest.',
    },
  });

  // Scenario 4: Overdue Invoice (42 days overdue, compound interest accumulating)
  const inv4Date = daysAgo(72);
  const inv4Deliv = daysAgo(72);
  const inv4DueCalc = calculateStatutoryDueDate({
    invoiceDate: inv4Date,
    deliveryDate: inv4Deliv,
    hasWrittenAgreement: true,
    contractualCreditDays: 30,
  });
  const inv4Interest = calculateStatutoryInterest({
    principalAmount: 850000.0,
    amountPaid: 0,
    dueDate: inv4DueCalc.dueDate,
    msmeType: s1.msmeType,
    isTrader: s1.isTrader,
  });
  const inv4 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      supplierId: s1.id,
      invoiceNumber: 'INV-2026-077',
      invoiceDate: inv4Date,
      deliveryDate: inv4Deliv,
      acceptanceDate: inv4DueCalc.acceptanceDate,
      hasWrittenAgreement: true,
      contractualCreditDays: 30,
      statutoryLimitDays: 30,
      dueDate: inv4DueCalc.dueDate,
      dueDateSource: 'AGREED_TERM',
      principalAmount: 850000.0,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
      applicableBankRate: 6.75,
      statutoryInterestRate: 20.25,
      accruedInterest: inv4Interest.accruedInterest.toNumber(),
      daysOverdue: inv4Interest.daysOverdue,
      section43bExposure: 850000.0,
      potentialTaxImpact: Math.round(850000.0 * 0.2517 * 100) / 100,
      complianceStatus: 'OVERDUE',
      notes: 'Pending commercial quality clearance. Delay exceeds agreed period.',
    },
  });

  await prisma.complianceAlert.create({
    data: {
      organizationId: org.id,
      invoiceId: inv4.id,
      alertType: 'OVERDUE_STATUTORY',
      severity: 'CRITICAL',
      status: 'OPEN',
      ruleVersion: 'MSMED_SEC15_16_V1',
      reason: `Invoice #INV-2026-077 is ${inv4Interest.daysOverdue} days overdue. Statutory Section 16 interest of ₹${inv4Interest.accruedInterest.toFixed(2)} has accrued.`,
      recommendedAction: 'Disburse immediate payment to cap statutory interest.',
    },
  });

  // Scenario 5: High Value Invoice Exceeding 45-day statutory cap & Subject to Section 43B(h) & MCA Form 1
  const inv5Date = daysAgo(115);
  const inv5Deliv = daysAgo(115);
  // Contract said 90 days, but legally capped at 45 days!
  const inv5DueCalc = calculateStatutoryDueDate({
    invoiceDate: inv5Date,
    deliveryDate: inv5Deliv,
    hasWrittenAgreement: true,
    contractualCreditDays: 90, // Contract says 90
  });
  const inv5Interest = calculateStatutoryInterest({
    principalAmount: 1420000.0,
    amountPaid: 0,
    dueDate: inv5DueCalc.dueDate,
    msmeType: s2.msmeType,
    isTrader: s2.isTrader,
  });
  const inv5 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      supplierId: s2.id,
      invoiceNumber: 'INV-2026-042',
      invoiceDate: inv5Date,
      deliveryDate: inv5Deliv,
      acceptanceDate: inv5DueCalc.acceptanceDate,
      hasWrittenAgreement: true,
      contractualCreditDays: 90,
      statutoryLimitDays: 45, // CAPPED AT 45
      dueDate: inv5DueCalc.dueDate,
      dueDateSource: 'STATUTORY_45_DAY_CAP',
      principalAmount: 1420000.0,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
      applicableBankRate: 6.75,
      statutoryInterestRate: 20.25,
      accruedInterest: inv5Interest.accruedInterest.toNumber(),
      daysOverdue: inv5Interest.daysOverdue,
      section43bExposure: 1420000.0,
      potentialTaxImpact: Math.round(1420000.0 * 0.2517 * 100) / 100,
      complianceStatus: 'SEC_43B_EXPOSURE',
      notes: 'Contract credit terms of 90 days legally overridden to 45 days by Section 15. Requires reporting on MCA MSME Form 1.',
    },
  });

  await prisma.complianceAlert.create({
    data: {
      organizationId: org.id,
      invoiceId: inv5.id,
      alertType: 'SECTION_43B_RISK',
      severity: 'CRITICAL',
      status: 'OPEN',
      ruleVersion: 'IT_SEC_43B_H_V1',
      reason: 'Breached 45-day statutory cap. Risk of income tax disallowance of ₹14,20,000 (Tax liability increase: ₹3,57,414).',
      recommendedAction: 'Mandatory inclusion in upcoming MSME Form 1 return and clearance before March 31.',
    },
  });

  // Scenario 6: Incomplete Data Requiring Review (Missing delivery date & unverified Udyam)
  const inv6Date = daysAgo(18);
  const inv6DueCalc = calculateStatutoryDueDate({
    invoiceDate: inv6Date,
    deliveryDate: null, // MISSING DELIVERY DATE
    hasWrittenAgreement: true,
    contractualCreditDays: 30,
  });
  const inv6 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      supplierId: s5.id,
      invoiceNumber: 'INV-2026-112',
      invoiceDate: inv6Date,
      deliveryDate: null,
      acceptanceDate: inv6DueCalc.acceptanceDate,
      hasWrittenAgreement: true,
      contractualCreditDays: 30,
      statutoryLimitDays: 30,
      dueDate: inv6DueCalc.dueDate,
      dueDateSource: 'AGREED_TERM',
      principalAmount: 175000.0,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
      applicableBankRate: 6.75,
      statutoryInterestRate: 20.25,
      accruedInterest: 0,
      daysOverdue: 0,
      section43bExposure: 0,
      potentialTaxImpact: 0,
      complianceStatus: 'INCOMPLETE_DATA',
      notes: 'Goods delivery challan missing. Delivery date defaulted to invoice date. Verification required.',
    },
  });

  await prisma.complianceAlert.create({
    data: {
      organizationId: org.id,
      invoiceId: inv6.id,
      alertType: 'MISSING_DELIVERY_DATE',
      severity: 'MEDIUM',
      status: 'OPEN',
      ruleVersion: 'MSMED_SEC15_16_V1',
      reason: 'Physical delivery date or GRN is unrecorded. Statutory acceptance date defaulted to invoice date.',
      recommendedAction: 'Obtain Goods Receipt Note (GRN) or delivery acknowledgement to fix authoritative timeline.',
    },
  });

  // Scenario 7: Disputed Invoice with Timely Written Objection (Section 2(b) window)
  const inv7Date = daysAgo(25);
  const inv7Deliv = daysAgo(25);
  const inv7ObjDate = daysAgo(20); // Objection raised on day 5 (within 15 days)
  const inv7ObjResDate = daysAgo(10); // Resolved on day 15
  const inv7DueCalc = calculateStatutoryDueDate({
    invoiceDate: inv7Date,
    deliveryDate: inv7Deliv,
    hasWrittenObjection: true,
    objectionDate: inv7ObjDate,
    objectionResolvedDate: inv7ObjResDate,
    hasWrittenAgreement: true,
    contractualCreditDays: 30,
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      supplierId: s1.id,
      invoiceNumber: 'INV-2026-095',
      invoiceDate: inv7Date,
      deliveryDate: inv7Deliv,
      hasWrittenObjection: true,
      objectionDate: inv7ObjDate,
      objectionResolvedDate: inv7ObjResDate,
      acceptanceDate: inv7DueCalc.acceptanceDate,
      hasWrittenAgreement: true,
      contractualCreditDays: 30,
      statutoryLimitDays: 30,
      dueDate: inv7DueCalc.dueDate,
      dueDateSource: 'AGREED_TERM',
      principalAmount: 410000.0,
      amountPaid: 0,
      paymentStatus: 'DISPUTED',
      applicableBankRate: 6.75,
      statutoryInterestRate: 20.25,
      accruedInterest: 0,
      daysOverdue: 0,
      section43bExposure: 0,
      potentialTaxImpact: 0,
      complianceStatus: 'COMPLIANT',
      notes: 'Tolerance dimension issue raised in writing within 5 days of delivery. Resolved by supplier rework.',
    },
  });

  // Log initial audit event
  await prisma.auditEvent.create({
    data: {
      organizationId: org.id,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: 'CREATE',
      entityType: 'ORGANIZATION',
      entityId: org.id,
      details: JSON.stringify({ message: 'Demo organisation and sample compliance dataset seeded successfully' }),
    },
  });

  console.log('✅ Demo database seeded successfully!');
  console.log('Demo Login Credentials:');
  console.log('  Email:    finance.lead@apexindia.com');
  console.log('  Password: DemoPassword123!');
}

main()
  .catch((e) => {
    console.error('Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
