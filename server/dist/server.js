"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const invoiceRoutes_js_1 = __importDefault(require("./routes/invoiceRoutes.js"));
const supplierRoutes_js_1 = __importDefault(require("./routes/supplierRoutes.js"));
const complianceRoutes_js_1 = __importDefault(require("./routes/complianceRoutes.js"));
const reportRoutes_js_1 = __importDefault(require("./routes/reportRoutes.js"));
const importRoutes_js_1 = __importDefault(require("./routes/importRoutes.js"));
const auditRoutes_js_1 = __importDefault(require("./routes/auditRoutes.js"));
const ruleRoutes_js_1 = __importDefault(require("./routes/ruleRoutes.js"));
const errorHandler_js_1 = require("./middleware/errorHandler.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Security & Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/invoices', invoiceRoutes_js_1.default);
app.use('/api/suppliers', supplierRoutes_js_1.default);
app.use('/api/compliance', complianceRoutes_js_1.default);
app.use('/api/reports', reportRoutes_js_1.default);
app.use('/api/import', importRoutes_js_1.default);
app.use('/api/audit', auditRoutes_js_1.default);
app.use('/api/rules', ruleRoutes_js_1.default);
// Error Handling Middleware
app.use(errorHandler_js_1.errorHandler);
// Start server if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Closing the Payment Gap API running on http://localhost:${PORT}`);
    });
}
exports.default = app;
