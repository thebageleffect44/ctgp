import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import importRoutes from './routes/importRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import ruleRoutes from './routes/ruleRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security & Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Closing the Payment Gap API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/rules', ruleRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start server if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Closing the Payment Gap API running on http://localhost:${PORT}`);
  });
}

export default app;
