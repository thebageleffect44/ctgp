"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
exports.getAuditEvents = getAuditEvents;
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
async function logAuditEvent(params) {
    try {
        return await prisma_js_1.default.auditEvent.create({
            data: {
                organizationId: params.organizationId,
                userId: params.userId,
                userEmail: params.userEmail,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                details: JSON.stringify(params.details),
                ipAddress: params.ipAddress,
            },
        });
    }
    catch (error) {
        console.error('Failed to write immutable audit log:', error);
        // Never crash the primary transaction if logging fails, but alert
    }
}
async function getAuditEvents(organizationId, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
        prisma_js_1.default.auditEvent.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma_js_1.default.auditEvent.count({ where: { organizationId } }),
    ]);
    return {
        items: items.map(item => ({
            ...item,
            details: (() => {
                try {
                    return JSON.parse(item.details);
                }
                catch {
                    return item.details;
                }
            })(),
        })),
        total,
        limit,
        offset,
    };
}
