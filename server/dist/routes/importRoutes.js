"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_js_1 = require("../middleware/auth.js");
const csvImportService_js_1 = require("../services/csvImportService.js");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});
// Download sample template CSV (can be accessed with or without auth)
router.get('/sample-template', (req, res) => {
    res.header('Content-Type', 'text/csv');
    res.attachment('MSME_Invoice_Import_Sample.csv');
    res.send(csvImportService_js_1.SAMPLE_CSV_TEMPLATE);
});
router.use(auth_js_1.authenticate);
// Preview uploaded CSV and suggest column mappings
router.post('/preview', upload.single('file'), async (req, res, next) => {
    try {
        let content;
        if (req.file) {
            content = req.file.buffer.toString('utf-8');
        }
        else if (req.body.csvContent) {
            content = req.body.csvContent;
        }
        else {
            return res.status(400).json({ success: false, error: 'Please upload a CSV file or provide csvContent.' });
        }
        const preview = (0, csvImportService_js_1.previewCsv)(content);
        res.json({ success: true, data: preview, rawCsv: content });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to parse CSV file.' });
    }
});
// Validate mapped data
router.post('/validate', async (req, res, next) => {
    try {
        const { csvContent, mapping } = req.body;
        if (!csvContent || !mapping) {
            return res.status(400).json({ success: false, error: 'Missing csvContent or mapping in request body.' });
        }
        const validation = await (0, csvImportService_js_1.validateCsvData)(req.user.organizationId, csvContent, mapping);
        res.json({ success: true, data: validation });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Validation failed.' });
    }
});
// Commit accepted rows into database
router.post('/commit', (0, auth_js_1.requireRole)(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req, res, next) => {
    try {
        const { validatedRows } = req.body;
        if (!validatedRows || !Array.isArray(validatedRows)) {
            return res.status(400).json({ success: false, error: 'validatedRows array is required.' });
        }
        const result = await (0, csvImportService_js_1.commitCsvImport)(req.user.organizationId, validatedRows, { userId: req.user.id, userEmail: req.user.email });
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
