import { Router, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

// GET /api/users — List users (admin only)
router.get(
  '/',
  authorize('admin'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT id, name, email, role, is_active, created_at, updated_at
         FROM users ORDER BY created_at DESC`
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
  }
);

// POST /api/users — Create user (admin only)
router.post(
  '/',
  authorize('admin'),
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'sales', 'warehouse', 'accounts']).withMessage('Invalid role'),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ success: false, message: 'A user with this email already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, is_active, created_at`,
        [name, email, passwordHash, role]
      );

      await logAudit(req.user!, 'CREATE_USER', 'user', result.rows[0].id, { name, email, role });

      res.status(201).json({
        success: true,
        message: 'User created successfully.',
        data: result.rows[0],
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to create user.' });
    }
  }
);

// PUT /api/users/:id — Update user (admin only)
router.put(
  '/:id',
  authorize('admin'),
  validate([
    body('name').optional().trim().notEmpty(),
    body('role').optional().isIn(['admin', 'sales', 'warehouse', 'accounts']),
    body('is_active').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, role, is_active } = req.body;

      const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const result = await pool.query(
        `UPDATE users SET
          name = COALESCE($1, name),
          role = COALESCE($2, role),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
         WHERE id = $4
         RETURNING id, name, email, role, is_active, updated_at`,
        [name, role, is_active, id]
      );

      await logAudit(req.user!, 'UPDATE_USER', 'user', id as string, { name, role, is_active });

      res.json({ success: true, message: 'User updated.', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update user.' });
    }
  }
);

export default router;
