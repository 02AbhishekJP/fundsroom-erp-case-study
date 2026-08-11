import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/audit — Paginated audit trail (admin only)
router.get(
  '/',
  authorize('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const entityType = req.query.entity_type as string;
      const action = req.query.action as string;

      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramCount = 0;

      if (entityType) {
        paramCount++;
        whereConditions.push(`entity_type = $${paramCount}`);
        params.push(entityType);
      }

      if (action) {
        paramCount++;
        whereConditions.push(`action ILIKE $${paramCount}`);
        params.push(`%${action}%`);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM audit_log ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      const dataResult = await pool.query(
        `SELECT * FROM audit_log ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
      );

      res.json({
        success: true,
        data: dataResult.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch audit log.' });
    }
  }
);

export default router;
