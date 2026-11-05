import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';
import { z } from 'zod';

const router = Router();

const RegisterSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  legalName: z.string().optional(),
  businessType: z.string().default('Private Limited'),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid Indian PAN format (e.g. AABCC1234D)'),
  gstin: z.string().optional(),
  name: z.string().min(2, 'User name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE', 'AUDITOR', 'VIEWER']).default('FINANCE_ADMIN'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register new organization and admin user
router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const validated = RegisterSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ success: false, error: 'A user with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    const org = await prisma.organization.create({
      data: {
        name: validated.companyName,
        legalName: validated.legalName || validated.companyName,
        businessType: validated.businessType,
        pan: validated.pan.toUpperCase(),
        gstin: validated.gstin ? validated.gstin.toUpperCase() : null,
      },
    });

    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: validated.email.toLowerCase(),
        passwordHash,
        name: validated.name,
        role: validated.role,
      },
    });

    await logAuditEvent({
      organizationId: org.id,
      userId: user.id,
      userEmail: user.email,
      action: 'CREATE',
      entityType: 'ORGANIZATION',
      entityId: org.id,
      details: { organizationName: org.name, createdBy: user.email },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
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
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
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
  } catch (err) {
    next(err);
  }
});

// Demo Login (One-click instant login for testing without manual sign up)
router.post('/demo-login', async (req: Request, res: Response, next) => {
  try {
    const demoUser = await prisma.user.findFirst({
      where: { email: 'finance.lead@apexindia.com' },
      include: { organization: true },
    });

    if (!demoUser) {
      return res.status(404).json({
        success: false,
        error: 'Demo data has not been seeded yet. Please run `npm run prisma:seed`.',
      });
    }

    const token = generateToken({
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role as any,
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
  } catch (err) {
    next(err);
  }
});

// Get current profile
router.get('/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
  } catch (err) {
    next(err);
  }
});

export default router;
