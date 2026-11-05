"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const auth_js_1 = require("../middleware/auth.js");
const auditService_js_1 = require("../services/auditService.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const RegisterSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2, 'Company name is required'),
    legalName: zod_1.z.string().optional(),
    businessType: zod_1.z.string().default('Private Limited'),
    pan: zod_1.z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid Indian PAN format (e.g. AABCC1234D)'),
    gstin: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2, 'User name is required'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE', 'AUDITOR', 'VIEWER']).default('FINANCE_ADMIN'),
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
// Register new organization and admin user
router.post('/register', async (req, res, next) => {
    try {
        const validated = RegisterSchema.parse(req.body);
        const existingUser = await prisma_js_1.default.user.findUnique({
            where: { email: validated.email.toLowerCase() },
        });
        if (existingUser) {
            return res.status(409).json({ success: false, error: 'A user with this email address already exists.' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(validated.password, salt);
        const org = await prisma_js_1.default.organization.create({
            data: {
                name: validated.companyName,
                legalName: validated.legalName || validated.companyName,
                businessType: validated.businessType,
                pan: validated.pan.toUpperCase(),
                gstin: validated.gstin ? validated.gstin.toUpperCase() : null,
            },
        });
        const user = await prisma_js_1.default.user.create({
            data: {
                organizationId: org.id,
                email: validated.email.toLowerCase(),
                passwordHash,
                name: validated.name,
                role: validated.role,
            },
        });
        await (0, auditService_js_1.logAuditEvent)({
            organizationId: org.id,
            userId: user.id,
            userEmail: user.email,
            action: 'CREATE',
            entityType: 'ORGANIZATION',
            entityId: org.id,
            details: { organizationName: org.name, createdBy: user.email },
        });
        const token = (0, auth_js_1.generateToken)({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: org.id,
        });
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organization: {
                    id: org.id,
                    name: org.name,
                    pan: org.pan,
                    gstin: org.gstin,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// Login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);
        const user = await prisma_js_1.default.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { organization: true },
        });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }
        const token = (0, auth_js_1.generateToken)({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
        });
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organization: {
                    id: user.organization.id,
                    name: user.organization.name,
                    pan: user.organization.pan,
                    gstin: user.organization.gstin,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// Demo Login (One-click instant login for testing without manual sign up)
router.post('/demo-login', async (req, res, next) => {
    try {
        const demoUser = await prisma_js_1.default.user.findFirst({
            where: { email: 'finance.lead@apexindia.com' },
            include: { organization: true },
        });
        if (!demoUser) {
            return res.status(404).json({
                success: false,
                error: 'Demo data has not been seeded yet. Please run `npm run prisma:seed`.',
            });
        }
        const token = (0, auth_js_1.generateToken)({
            id: demoUser.id,
            email: demoUser.email,
            name: demoUser.name,
            role: demoUser.role,
            organizationId: demoUser.organizationId,
        });
        res.json({
            success: true,
            token,
            user: {
                id: demoUser.id,
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role,
                organization: {
                    id: demoUser.organization.id,
                    name: demoUser.organization.name,
                    pan: demoUser.organization.pan,
                    gstin: demoUser.organization.gstin,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// Get current profile
router.get('/me', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: req.user.id },
            include: { organization: true },
        });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organization: {
                    id: user.organization.id,
                    name: user.organization.name,
                    businessType: user.organization.businessType,
                    pan: user.organization.pan,
                    gstin: user.organization.gstin,
                    applicableTaxRate: user.organization.applicableTaxRate,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
