import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
    role: 'OWNER' | 'FINANCE_ADMIN' | 'ACCOUNTS_PAYABLE' | 'AUDITOR' | 'VIEWER';
    organizationId: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}
export declare function authenticate(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireRole(allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function generateToken(user: AuthenticatedUser): string;
