import { parse } from 'csv-parse/sync';
import prisma from '../db/prisma.js';
import { createInvoice } from './invoiceService.js';
import { logAuditEvent } from './auditService.js';
import Decimal from 'decimal.js';

export interface ColumnMapping {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  principalAmount: string;
  deliveryDate?: string;
  contractualCreditDays?: string;
  supplierPan?: string;
  supplierUdyam?: string;
  supplierMsmeType?: string;
}

export interface CsvPreviewResult {
  headers: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
  suggestedMapping: Partial<ColumnMapping>;
}

export interface CsvValidationRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export interface CsvValidationResult {
  totalRows: number;
  validRowCount: number;
  duplicateRowCount: number;
  errorRowCount: number;
  rows: CsvValidationRow[];
}

export const SAMPLE_CSV_TEMPLATE = `Invoice Number,Supplier Name,Supplier PAN,Udyam Number,MSME Type,Invoice Date,Delivery Date,Agreed Credit Days,Amount
INV-2026-001,Bharat Precision Components,AABCB1234F,UDYAM-MH-01-0012345,MICRO,2026-03-01,2026-03-02,30,125000.00
INV-2026-002,Deccan Engineering Works,AADCD5678G,UDYAM-KA-02-0098765,SMALL,2026-03-10,2026-03-12,45,480000.00
INV-2026-003,Apex Logistics & Services,AAFFA9012K,UDYAM-TN-03-0045612,MICRO,2026-03-15,2026-03-15,15,85000.00
INV-2026-004,Surat Synthetic Textiles,AABCT3456M,,MEDIUM,2026-03-18,2026-03-20,60,320000.00
INV-2026-005,National Steel Traders,AAECN7890P,,NOT_MSME,2026-03-25,2026-03-25,30,950000.00`;

export function previewCsv(csvContent: string): CsvPreviewResult {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    throw new Error('CSV file appears to be empty or has no data rows');
  }

  const headers = Object.keys(records[0]);

  // Guess mappings based on column headers
  const suggested: Partial<ColumnMapping> = {};
  for (const h of headers) {
    const lower = h.toLowerCase();
    if (lower.includes('inv') && (lower.includes('no') || lower.includes('num'))) {
      suggested.invoiceNumber = h;
    } else if (lower.includes('supplier') || lower.includes('vendor') || lower.includes('party')) {
      if (lower.includes('pan')) suggested.supplierPan = h;
      else if (lower.includes('udyam')) suggested.supplierUdyam = h;
      else if (lower.includes('type') || lower.includes('cat')) suggested.supplierMsmeType = h;
      else suggested.supplierName = h;
    } else if (lower.includes('inv') && lower.includes('date')) {
      suggested.invoiceDate = h;
    } else if (lower.includes('deliv') || lower.includes('accept')) {
      suggested.deliveryDate = h;
    } else if (lower.includes('amount') || lower.includes('total') || lower.includes('value')) {
      suggested.principalAmount = h;
    } else if (lower.includes('credit') || lower.includes('term') || lower.includes('days')) {
      suggested.contractualCreditDays = h;
    }
  }

  return {
    headers,
    totalRows: records.length,
    sampleRows: records.slice(0, 5),
    suggestedMapping: suggested,
  };
}

export async function validateCsvData(
  organizationId: string,
  csvContent: string,
  mapping: ColumnMapping
): Promise<CsvValidationResult> {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  // Fetch existing invoice numbers to check duplicates
  const existingInvoices = await prisma.invoice.findMany({
    where: { organizationId },
    select: { invoiceNumber: true },
  });
  const existingInvoiceSet = new Set(existingInvoices.map(i => i.invoiceNumber.toLowerCase().trim()));

  const seenInBatch = new Set<string>();
  const validationRows: CsvValidationRow[] = [];

  let validRowCount = 0;
  let duplicateRowCount = 0;
  let errorRowCount = 0;

  records.forEach((row, idx) => {
    const rowNumber = idx + 1;
    const errors: string[] = [];
    let isDuplicate = false;

    const invNum = row[mapping.invoiceNumber]?.trim();
    const supName = row[mapping.supplierName]?.trim();
    const invDateStr = row[mapping.invoiceDate]?.trim();
    const amtStr = row[mapping.principalAmount]?.trim();

    if (!invNum) errors.push('Missing Invoice Number');
    if (!supName) errors.push('Missing Supplier Name');
    if (!invDateStr) errors.push('Missing Invoice Date');
    if (!amtStr) errors.push('Missing Principal Amount');

    // Check duplicate
    if (invNum) {
      const lowerInv = invNum.toLowerCase();
      if (existingInvoiceSet.has(lowerInv) || seenInBatch.has(lowerInv)) {
        isDuplicate = true;
        duplicateRowCount++;
        errors.push(`Duplicate invoice number '${invNum}' already exists or repeated in file`);
      } else {
        seenInBatch.add(lowerInv);
      }
    }

    // Validate amount
    let amount = 0;
    if (amtStr) {
      try {
        const cleanAmt = amtStr.replace(/[^0-9.-]+/g, '');
        const dec = new Decimal(cleanAmt);
        if (dec.lte(0)) {
          errors.push('Amount must be greater than zero');
        } else {
          amount = dec.toNumber();
        }
      } catch {
        errors.push(`Invalid numeric amount format: '${amtStr}'`);
      }
    }

    // Validate date
    let parsedDate: Date | null = null;
    if (invDateStr) {
      const d = new Date(invDateStr);
      if (isNaN(d.getTime())) {
        errors.push(`Invalid date format for Invoice Date: '${invDateStr}'`);
      } else {
        parsedDate = d;
      }
    }

    // Optional delivery date
    let deliveryDate: Date | null = null;
    if (mapping.deliveryDate && row[mapping.deliveryDate]?.trim()) {
      const delStr = row[mapping.deliveryDate].trim();
      const dd = new Date(delStr);
      if (isNaN(dd.getTime())) {
        errors.push(`Invalid delivery date format: '${delStr}'`);
      } else {
        deliveryDate = dd;
      }
    }

    // Credit days
    let creditDays = 30;
    if (mapping.contractualCreditDays && row[mapping.contractualCreditDays]?.trim()) {
      const parsedDays = parseInt(row[mapping.contractualCreditDays].trim(), 10);
      if (isNaN(parsedDays) || parsedDays < 0) {
        errors.push(`Invalid credit days: '${row[mapping.contractualCreditDays]}'`);
      } else {
        creditDays = parsedDays;
      }
    }

    const isValid = errors.length === 0 && !isDuplicate;
    if (isValid) {
      validRowCount++;
    } else if (!isDuplicate) {
      errorRowCount++;
    }

    validationRows.push({
      rowNumber,
      data: {
        invoiceNumber: invNum,
        supplierName: supName,
        supplierPan: mapping.supplierPan ? row[mapping.supplierPan]?.trim() : null,
        supplierUdyam: mapping.supplierUdyam ? row[mapping.supplierUdyam]?.trim() : null,
        supplierMsmeType: mapping.supplierMsmeType ? (row[mapping.supplierMsmeType]?.trim().toUpperCase() || 'MICRO') : 'MICRO',
        invoiceDate: parsedDate,
        deliveryDate,
        contractualCreditDays: creditDays,
        principalAmount: amount,
      },
      isValid,
      isDuplicate,
      errors,
    });
  });

  return {
    totalRows: records.length,
    validRowCount,
    duplicateRowCount,
    errorRowCount,
    rows: validationRows,
  };
}

export async function commitCsvImport(
  organizationId: string,
  validatedRows: CsvValidationRow[],
  actor?: { userId?: string; userEmail?: string }
) {
  let createdCount = 0;
  const validOnly = validatedRows.filter(r => r.isValid && !r.isDuplicate);

  for (const row of validOnly) {
    const data = row.data;

    // Find or create supplier
    let supplier = await prisma.supplier.findFirst({
      where: {
        organizationId,
        name: { equals: data.supplierName },
      },
    });

    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          organizationId,
          name: data.supplierName,
          pan: data.supplierPan || null,
          udyamNumber: data.supplierUdyam || null,
          msmeType: ['MICRO', 'SMALL', 'MEDIUM', 'NOT_MSME'].includes(data.supplierMsmeType)
            ? data.supplierMsmeType
            : 'MICRO',
          verificationStatus: 'SELF_DECLARED',
        },
      });
    }

    await createInvoice(
      organizationId,
      {
        supplierId: supplier.id,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        deliveryDate: data.deliveryDate,
        hasWrittenAgreement: true,
        contractualCreditDays: data.contractualCreditDays || 30,
        principalAmount: data.principalAmount,
        notes: 'Imported via CSV bulk upload',
      },
      actor
    );

    createdCount++;
  }

  await logAuditEvent({
    organizationId,
    userId: actor?.userId,
    userEmail: actor?.userEmail,
    action: 'CSV_IMPORT',
    entityType: 'INVOICE',
    details: {
      totalRowsProcessed: validatedRows.length,
      acceptedCount: createdCount,
      rejectedCount: validatedRows.length - createdCount,
    },
  });

  return {
    acceptedCount: createdCount,
    totalAttempted: validatedRows.length,
  };
}
