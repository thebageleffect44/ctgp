"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
function errorHandler(err, req, res, next) {
    console.error(`[Error] ${req.method} ${req.url}:`, err);
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }
    // Handle unique constraint violations
    if (err.code === 'P2002') {
        return res.status(409).json({
            success: false,
            error: 'A record with this identifier already exists.',
            fields: err.meta?.target,
        });
    }
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : (process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message || 'Internal server error');
    res.status(statusCode).json({
        success: false,
        error: message,
    });
}
