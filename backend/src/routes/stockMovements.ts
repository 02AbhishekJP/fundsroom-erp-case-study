import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/stock-movements — Paginated stock movement timeline
router.get(
  '/',
  authorize('admin', 'warehouse', 'accounts'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const productId = req.query.product_id as string;
      const type = req.query.type as string;

      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramCount = 0;

      if (productId) {
        paramCount++;
        whereConditions.push(`sm.product_id = $${paramCount}`);
        params.push(productId);
      }

      if (type && ['IN', 'OUT'].includes(type)) {
        paramCount++;
        whereConditions.push(`sm.type = $${paramCount}`);
        params.push(type);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM stock_movements sm ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      const dataResult = await pool.query(
        `SELECT sm.*, p.name as product_name, p.sku as product_sku,
                p.stock_quantity as current_stock, u.name as created_by_name
         FROM stock_movements sm
         LEFT JOIN products p ON sm.product_id = p.id
         LEFT JOIN users u ON sm.created_by = u.id
         ${whereClause}
         ORDER BY sm.created_at DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
      );

      res.json({
        success: true,
        data: dataResult.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch stock movements.' });
    }
  }
);

export default router;
