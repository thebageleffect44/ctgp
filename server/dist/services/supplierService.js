"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierInputSchema = void 0;
exports.listSuppliers = listSuppliers;
exports.getSupplierById = getSupplierById;
exports.createSupplier = createSupplier;
exports.updateSupplier = updateSupplier;
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const auditService_js_1 = require("./auditService.js");
const zod_1 = require("zod");
exports.SupplierInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Supplier name is required'),
    pan: zod_1.z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid Indian PAN format (e.g. ABCDE1234F)').optional().or(zod_1.z.literal('')),
    udyamNumber: zod_1.z.string().regex(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, 'Invalid Udyam registration format (e.g. UDYAM-MH-01-0012345)').optional().or(zod_1.z.literal('')),
    msmeType: zod_1.z.enum(['MICRO', 'SMALL', 'MEDIUM', 'NOT_MSME', 'UNVERIFIED']).default('MICRO'),
    isTrader: zod_1.z.boolean().default(false),
    verificationStatus: zod_1.z.enum(['VERIFIED', 'SELF_DECLARED', 'UNVERIFIED']).default('SELF_DECLARED'),
    contactPerson: zod_1.z.string().optional().or(zod_1.z.literal('')),
    contactEmail: zod_1.z.string().email('Invalid email address').optional().or(zod_1.z.literal('')),
    contactPhone: zod_1.z.string().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional().or(zod_1.z.literal('')),
    notes: zod_1.z.string().optional().or(zod_1.z.literal('')),
});
async function listSuppliers(organizationId, options = {}) {
    const where = { organizationId };
    if (options.search) {
        where.OR = [
            { name: { contains: options.search } },
            { pan: { contains: options.search } },
            { udyamNumber: { contains: options.search } },
            { contactPerson: { contains: options.search } },
        ];
    }
    if (options.msmeType && options.msmeType !== 'ALL') {
        where.msmeType = options.msmeType;
    }
    if (options.verificationStatus && options.verificationStatus !== 'ALL') {
        where.verificationStatus = options.verificationStatus;
    }
    const suppliers = await prisma_js_1.default.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
            invoices: {
                select: {
                    id: true,
                    principalAmount: true,
                    amountPaid: true,
                    paymentStatus: true,
                    accruedInterest: true,
                    section43bExposure: true,
                    daysOverdue: true,
                },
            },
        },
    });
    return suppliers.map(s => {
        let totalOutstanding = 0;
        let totalOverdue = 0;
        let totalInterest = 0;
        let total43bExposure = 0;
        let overdueCount = 0;
        for (const inv of s.invoices) {
            if (inv.paymentStatus !== 'PAID') {
                const balance = Math.max(0, inv.principalAmount - inv.amountPaid);
                totalOutstanding += balance;
                if (inv.daysOverdue > 0) {
                    totalOverdue += balance;
                    overdueCount++;
                }
                totalInterest += inv.accruedInterest;
                total43bExposure += inv.section43bExposure;
            }
        }
        return {
            ...s,
            invoiceCount: s.invoices.length,
            unpaidInvoiceCount: s.invoices.filter(i => i.paymentStatus !== 'PAID').length,
            overdueInvoiceCount: overdueCount,
            totalOutstanding: Math.round(totalOutstanding * 100) / 100,
            totalOverdue: Math.round(totalOverdue * 100) / 100,
            totalAccruedInterest: Math.round(totalInterest * 100) / 100,
            total43bExposure: Math.round(total43bExposure * 100) / 100,
            invoices: undefined, // remove bloated sublist from directory list
        };
    });
}
async function getSupplierById(organizationId, id) {
    return prisma_js_1.default.supplier.findFirst({
        where: { id, organizationId },
        include: {
            invoices: {
                orderBy: { dueDate: 'asc' },
            },
        },
    });
}
async function createSupplier(organizationId, input, actor) {
    const validated = exports.SupplierInputSchema.parse(input);
    const supplier = await prisma_js_1.default.supplier.create({
        data: {
            organizationId,
            name: validated.name,
            pan: validated.pan ? validated.pan.toUpperCase() : null,
            udyamNumber: validated.udyamNumber ? validated.udyamNumber.toUpperCase() : null,
            msmeType: validated.msmeType,
            isTrader: validated.isTrader,
            verificationStatus: validated.verificationStatus,
            verificationDate: validated.verificationStatus === 'VERIFIED' ? new Date() : null,
            contactPerson: validated.contactPerson || null,
            contactEmail: validated.contactEmail || null,
            contactPhone: validated.contactPhone || null,
            address: validated.address || null,
            notes: validated.notes || null,
        },
    });
    await (0, auditService_js_1.logAuditEvent)({
        organizationId,
        userId: actor?.userId,
        userEmail: actor?.userEmail,
        action: 'CREATE',
        entityType: 'SUPPLIER',
        entityId: supplier.id,
        details: { name: supplier.name, msmeType: supplier.msmeType, udyam: supplier.udyamNumber },
    });
    return supplier;
}
async function updateSupplier(organizationId, id, input, actor) {
    const existing = await prisma_js_1.default.supplier.findFirst({ where: { id, organizationId } });
    if (!existing) {
        throw new Error('Supplier not found');
    }
    const updated = await prisma_js_1.default.supplier.update({
        where: { id },
        data: {
            ...(input.name && { name: input.name }),
            ...(input.pan !== undefined && { pan: input.pan ? input.pan.toUpperCase() : null }),
            ...(input.udyamNumber !== undefined && { udyamNumber: input.udyamNumber ? input.udyamNumber.toUpperCase() : null }),
            ...(input.msmeType && { msmeType: input.msmeType }),
            ...(input.isTrader !== undefined && { isTrader: input.isTrader }),
            ...(input.verificationStatus && {
                verificationStatus: input.verificationStatus,
                verificationDate: input.verificationStatus === 'VERIFIED' ? new Date() : existing.verificationDate,
            }),
            ...(input.contactPerson !== undefined && { contactPerson: input.contactPerson || null }),
            ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail || null }),
            ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone || null }),
            ...(input.address !== undefined && { address: input.address || null }),
            ...(input.notes !== undefined && { notes: input.notes || null }),
        },
    });
    await (0, auditService_js_1.logAuditEvent)({
        organizationId,
        userId: actor?.userId,
        userEmail: actor?.userEmail,
        action: 'UPDATE',
        entityType: 'SUPPLIER',
        entityId: id,
        details: { changes: input },
    });
    return updated;
}
