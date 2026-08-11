import { Router, Response } from 'express';
import { body } from 'express-validator';
import pool from '../db/pool';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

// GET /api/products — List with pagination, search, filters
router.get(
  '/',
  authorize('admin', 'sales', 'warehouse', 'accounts'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const lowStock = req.query.low_stock as string;
      const outOfStock = req.query.out_of_stock as string;
      const activeOnly = req.query.active_only as string;

      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereConditions.push(
          `(name ILIKE $${paramCount} OR sku ILIKE $${paramCount} OR category ILIKE $${paramCount})`
        );
        params.push(`%${search}%`);
      }

      if (category) {
        paramCount++;
        whereConditions.push(`category = $${paramCount}`);
        params.push(category);
      }

      if (lowStock === 'true') {
        whereConditions.push('stock_quantity <= min_stock_alert AND stock_quantity > 0');
      }

      if (outOfStock === 'true') {
        whereConditions.push('stock_quantity = 0');
      }

      if (activeOnly === 'true') {
        whereConditions.push('is_active = true');
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM products ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      const dataResult = await pool.query(
        `SELECT * FROM products ${whereClause}
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
      console.error('Error fetching products:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch products.' });
    }
  }
);

// GET /api/products/categories — Get unique categories
router.get(
  '/categories',
  authorize('admin', 'sales', 'warehouse', 'accounts'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT category, COUNT(*) as count,
                SUM(stock_quantity) as total_stock,
                COUNT(*) FILTER (WHERE stock_quantity <= min_stock_alert) as low_stock_count
         FROM products WHERE category IS NOT NULL
         GROUP BY category ORDER BY category`
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
    }
  }
);

// GET /api/products/:id — Single product with stock movements
router.get(
  '/:id',
  authorize('admin', 'sales', 'warehouse', 'accounts'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (productResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      const movementsResult = await pool.query(
        `SELECT sm.*, u.name as created_by_name
         FROM stock_movements sm
         LEFT JOIN users u ON sm.created_by = u.id
         WHERE sm.product_id = $1
         ORDER BY sm.created_at DESC
         LIMIT 50`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...productResult.rows[0],
          stock_movements: movementsResult.rows,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch product.' });
    }
  }
);

// POST /api/products — Create product
router.post(
  '/',
  authorize('admin', 'warehouse'),
  validate([
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock must be non-negative'),
    body('min_stock_alert').optional().isInt({ min: 0 }).withMessage('Min stock must be non-negative'),
    body('category').optional({ nullable: true }).trim(),
    body('description').optional({ nullable: true }).trim(),
    body('warehouse_location').optional({ nullable: true }).trim(),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { sku, name, category, description, price, stock_quantity, min_stock_alert, warehouse_location, image_url } = req.body;

      const result = await pool.query(
        `INSERT INTO products (sku, name, category, description, price, stock_quantity, min_stock_alert, warehouse_location, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [sku, name, category || null, description || null, price, stock_quantity || 0, min_stock_alert || 10, warehouse_location || null, image_url || null]
      );

      if (stock_quantity && stock_quantity > 0) {
        await pool.query(
          `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
           VALUES ($1, 'IN', $2, 'Initial stock entry', $3)`,
          [result.rows[0].id, stock_quantity, req.user!.id]
        );
      }

      await logAudit(req.user!, 'CREATE_PRODUCT', 'product', result.rows[0].id, { name, sku, price });

      res.status(201).json({ success: true, message: 'Product created successfully.', data: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(409).json({ success: false, message: 'A product with this SKU already exists.' });
        return;
      }
      console.error('Error creating product:', error);
      res.status(500).json({ success: false, message: 'Failed to create product.' });
    }
  }
);

// PUT /api/products/:id — Update product
router.put(
  '/:id',
  authorize('admin', 'warehouse'),
  validate([
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('min_stock_alert').optional().isInt({ min: 0 }),
    body('is_active').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, category, description, price, min_stock_alert, warehouse_location, is_active, image_url } = req.body;

      const existing = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      const result = await pool.query(
        `UPDATE products SET
          name = COALESCE($1, name),
          category = COALESCE($2, category),
          description = COALESCE($3, description),
          price = COALESCE($4, price),
          min_stock_alert = COALESCE($5, min_stock_alert),
          warehouse_location = COALESCE($6, warehouse_location),
          is_active = COALESCE($7, is_active),
          image_url = COALESCE($8, image_url),
          updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [name, category, description, price, min_stock_alert, warehouse_location, is_active, image_url, id]
      );

      await logAudit(req.user!, 'UPDATE_PRODUCT', 'product', id as string, { name, price, is_active });

      res.json({ success: true, message: 'Product updated successfully.', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update product.' });
    }
  }
);

// POST /api/products/:id/stock — Manual stock adjustment (IN/OUT)
router.post(
  '/:id/stock',
  authorize('admin', 'warehouse'),
  validate([
    body('type').isIn(['IN', 'OUT']).withMessage('Type must be IN or OUT'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('reason').optional().trim(),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { type, quantity, reason } = req.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const product = await client.query(
          'SELECT id, stock_quantity, name FROM products WHERE id = $1 FOR UPDATE',
          [id]
        );

        if (product.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ success: false, message: 'Product not found.' });
          return;
        }

        const currentStock = product.rows[0].stock_quantity;

        if (type === 'OUT' && currentStock < quantity) {
          await client.query('ROLLBACK');
          res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product.rows[0].name}". Available: ${currentStock}, Requested: ${quantity}.`,
          });
          return;
        }

        const newStock = type === 'IN' ? currentStock + quantity : currentStock - quantity;

        await client.query(
          'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
          [newStock, id]
        );

        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, type, quantity, reason || `Manual ${type} adjustment`, req.user!.id]
        );

        await client.query('COMMIT');

        await logAudit(req.user!, 'STOCK_ADJUSTMENT', 'product', id as string, {
          product_name: product.rows[0].name,
          type, quantity, previousStock: currentStock, newStock
        });

        res.json({
          success: true,
          message: `Stock ${type === 'IN' ? 'added' : 'removed'} successfully.`,
          data: { product_id: id, previous_stock: currentStock, new_stock: newStock },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      res.status(500).json({ success: false, message: 'Failed to adjust stock.' });
    }
  }
);

export default router;
