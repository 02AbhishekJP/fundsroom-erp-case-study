import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/dashboard — Comprehensive summary stats
router.get(
  '/',
  authorize('admin', 'sales', 'warehouse', 'accounts'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const [customers, products, lowStockItems, outOfStockItems, challans, recentChallans, recentMovements, upcomingFollowups] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'lead') as leads,
            COUNT(*) FILTER (WHERE status = 'inactive') as inactive
          FROM customers
        `),
        pool.query(`
          SELECT
            COUNT(*) as total,
            COALESCE(SUM(stock_quantity), 0) as total_stock,
            COUNT(*) FILTER (WHERE stock_quantity <= min_stock_alert AND stock_quantity > 0) as low_stock,
            COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock,
            COALESCE(SUM(stock_quantity * price), 0) as total_value
          FROM products WHERE is_active = true
        `),
        pool.query(`
          SELECT id, name, sku, stock_quantity, min_stock_alert, category, warehouse_location
          FROM products
          WHERE stock_quantity <= min_stock_alert AND stock_quantity > 0 AND is_active = true
          ORDER BY stock_quantity ASC
          LIMIT 10
        `),
        pool.query(`
          SELECT id, name, sku, category, warehouse_location
          FROM products
          WHERE stock_quantity = 0 AND is_active = true
          ORDER BY updated_at DESC
          LIMIT 10
        `),
        pool.query(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'draft') as draft,
            COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            COALESCE(SUM(total_amount) FILTER (WHERE status = 'confirmed'), 0) as total_revenue,
            COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today
          FROM challans
        `),
        pool.query(`
          SELECT ch.id, ch.challan_number, ch.status, ch.total_amount, ch.created_at,
                 c.name as customer_name, c.company as customer_company,
                 u.name as created_by_name
          FROM challans ch
          LEFT JOIN customers c ON ch.customer_id = c.id
          LEFT JOIN users u ON ch.created_by = u.id
          ORDER BY ch.created_at DESC
          LIMIT 8
        `),
        pool.query(`
          SELECT sm.id, sm.type, sm.quantity, sm.reason, sm.created_at,
                 p.name as product_name, p.sku as product_sku,
                 u.name as created_by_name
          FROM stock_movements sm
          LEFT JOIN products p ON sm.product_id = p.id
          LEFT JOIN users u ON sm.created_by = u.id
          ORDER BY sm.created_at DESC
          LIMIT 8
        `),
        pool.query(`
          SELECT id, name, company, follow_up_date, status
          FROM customers
          WHERE follow_up_date IS NOT NULL
            AND follow_up_date >= CURRENT_DATE
            AND follow_up_date <= CURRENT_DATE + INTERVAL '7 days'
          ORDER BY follow_up_date ASC
          LIMIT 5
        `),
      ]);

      res.json({
        success: true,
        data: {
          customers: customers.rows[0],
          products: products.rows[0],
          low_stock_items: lowStockItems.rows,
          out_of_stock_items: outOfStockItems.rows,
          challans: challans.rows[0],
          recent_challans: recentChallans.rows,
          recent_movements: recentMovements.rows,
          upcoming_followups: upcomingFollowups.rows,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.' });
    }
  }
);

// GET /api/dashboard/search — Global search
router.get(
  '/search',
  authorize('admin', 'sales', 'warehouse', 'accounts'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const q = req.query.q as string;
      if (!q || q.length < 2) {
        res.json({ success: true, data: { customers: [], products: [], challans: [] } });
        return;
      }

      const searchParam = `%${q}%`;

      const [customers, products, challans] = await Promise.all([
        pool.query(
          `SELECT id, name, company, status, type
           FROM customers
           WHERE name ILIKE $1 OR company ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
           LIMIT 5`,
          [searchParam]
        ),
        pool.query(
          `SELECT id, name, sku, category, price, stock_quantity
           FROM products
           WHERE name ILIKE $1 OR sku ILIKE $1 OR category ILIKE $1
           LIMIT 5`,
          [searchParam]
        ),
        pool.query(
          `SELECT ch.id, ch.challan_number, ch.status, ch.total_amount, c.name as customer_name
           FROM challans ch
           LEFT JOIN customers c ON ch.customer_id = c.id
           WHERE ch.challan_number ILIKE $1 OR c.name ILIKE $1
           LIMIT 5`,
          [searchParam]
        ),
      ]);

      res.json({
        success: true,
        data: {
          customers: customers.rows,
          products: products.rows,
          challans: challans.rows,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Search failed.' });
    }
  }
);

export default router;
