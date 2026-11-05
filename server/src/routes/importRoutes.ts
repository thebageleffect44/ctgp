import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  previewCsv,
  validateCsvData,
  commitCsvImport,
  SAMPLE_CSV_TEMPLATE,
  ColumnMapping,
} from '../services/csvImportService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// Download sample template CSV (can be accessed with or without auth)
router.get('/sample-template', (req: Request, res: Response) => {
  res.header('Content-Type', 'text/csv');
  res.attachment('MSME_Invoice_Import_Sample.csv');
  res.send(SAMPLE_CSV_TEMPLATE);
});

router.use(authenticate);

// Preview uploaded CSV and suggest column mappings
router.post('/preview', upload.single('file'), async (req: Request, res: Response, next) => {
  try {
    let content: string;
    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    } else if (req.body.csvContent) {
      content = req.body.csvContent;
    } else {
      return res.status(400).json({ success: false, error: 'Please upload a CSV file or provide csvContent.' });
    }

    const preview = previewCsv(content);
    res.json({ success: true, data: preview, rawCsv: content });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to parse CSV file.' });
  }
});

// Validate mapped data
router.post('/validate', async (req: Request, res: Response, next) => {
  try {
    const { csvContent, mapping } = req.body;
    if (!csvContent || !mapping) {
      return res.status(400).json({ success: false, error: 'Missing csvContent or mapping in request body.' });
    }

    const validation = await validateCsvData(
      req.user!.organizationId,
      csvContent,
      mapping as ColumnMapping
    );

    res.json({ success: true, data: validation });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Validation failed.' });
  }
});

// Commit accepted rows into database
router.post('/commit', requireRole(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req: Request, res: Response, next) => {
  try {
    const { validatedRows } = req.body;
    if (!validatedRows || !Array.isArray(validatedRows)) {
      return res.status(400).json({ success: false, error: 'validatedRows array is required.' });
    }

    const result = await commitCsvImport(
      req.user!.organizationId,
      validatedRows,
      { userId: req.user!.id, userEmail: req.user!.email }
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
