import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dz-order-secret-key-algeria-2026-production-secured';

export interface AuthUser {
  id: number;
  email: string;
  role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER' | 'ADMIN';
  full_name: string;
  phone: string;
  language: 'ar' | 'fr';
  is_active: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Master Admin Account defined directly in code
export const ADMIN_MASTER = {
  email: (process.env.ADMIN_EMAIL || 'admin@dzorder.dz').trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || 'admin123',
  full_name: 'مدير المنصة الرئيسي / Administrateur Principal',
  phone: '+213 550 00 00 00'
};

export async function ensureMasterAdmin(): Promise<void> {
  try {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [ADMIN_MASTER.email]);
    if (!existing) {
      const hashed = await hashPassword(ADMIN_MASTER.password);
      await db.run(
        `INSERT INTO users (email, password_hash, role, full_name, phone, language, is_active)
         VALUES (?, ?, 'ADMIN', ?, ?, 'ar', 1)`,
        [ADMIN_MASTER.email, hashed, ADMIN_MASTER.full_name, ADMIN_MASTER.phone]
      );
      console.log(`[DZ Order] Master Admin ensured in code: ${ADMIN_MASTER.email}`);
    }
  } catch (err) {
    console.error('Error ensuring master admin:', err);
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.cookies && req.cookies.dz_token);

  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    const user = await db.get<AuthUser>(
      'SELECT id, email, role, full_name, phone, language, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user || !user.is_active) {
      req.user = undefined;
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    req.user = undefined;
    next();
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required / يرجى تسجيل الدخول أولاً',
      code: 'UNAUTHORIZED'
    });
    return;
  }
  next();
}

export function requireRole(...roles: Array<'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER' | 'ADMIN'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required / يرجى تسجيل الدخول أولاً',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions / غير مصرح لك بالوصول',
        code: 'FORBIDDEN'
      });
      return;
    }

    next();
  };
}

export async function logAudit(
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details: string,
  ipAddress?: string
): Promise<void> {
  try {
    await db.run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, details, ipAddress || '127.0.0.1']
    );
  } catch (err) {
    console.error('Audit log failure:', err);
  }
}

export async function createNotification(
  userId: number,
  titleAr: string,
  titleFr: string,
  messageAr: string,
  messageFr: string,
  type: string,
  referenceId?: number
): Promise<void> {
  try {
    await db.run(
      `INSERT INTO notifications (user_id, title_ar, title_fr, message_ar, message_fr, type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, titleAr, titleFr, messageAr, messageFr, type, referenceId || null]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
