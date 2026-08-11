import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import pool from '../db/pool';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const result = await pool.query(
        'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
        return;
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Login failed.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get user info.' });
  }
});

export default router;
