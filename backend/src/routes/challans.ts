import { Router, Response } from 'express';
import { body } from 'express-validator';
import pool from '../db/pool';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../middleware/audit';

const router = Router();

// All challan routes require authentication
router.use(authenticate);

// GET /api/challans — List challans with pagination and filters
router.get(
  '/',
  authorize('admin', 'sales', 'accounts'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;
      const status = req.query.status as string;
      const customerId = req.query.customer_id as string;
      const search = req.query.search as string;

      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramCount = 0;

      if (status && ['draft', 'confirmed', 'cancelled'].includes(status)) {
        paramCount++;
        whereConditions.push(`ch.status = $${paramCount}`);
        params.push(status);
      }

      if (customerId) {
        paramCount++;
        whereConditions.push(`ch.customer_id = $${paramCount}`);
        params.push(customerId);
      }

      if (search) {
        paramCount++;
        whereConditions.push(
          `(ch.challan_number ILIKE $${paramCount} OR c.name ILIKE $${paramCount} OR c.company ILIKE $${paramCount})`
        );
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM challans ch LEFT JOIN customers c ON ch.customer_id = c.id ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      const dataResult = await pool.query(
        `SELECT ch.*, c.name as customer_name, c.company as customer_company,
                u.name as created_by_name,
                cu.name as confirmed_by_name,
                cau.name as cancelled_by_name
         FROM challans ch
         LEFT JOIN customers c ON ch.customer_id = c.id
         LEFT JOIN users u ON ch.created_by = u.id
         LEFT JOIN users cu ON ch.confirmed_by = cu.id
         LEFT JOIN users cau ON ch.cancelled_by = cau.id
         ${whereClause}
         ORDER BY ch.created_at DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
      );

      res.json({
        success: true,
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching challans:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch challans.' });
    }
  }
);

// GET /api/challans/:id — Single challan with items
router.get(
  '/:id',
  authorize('admin', 'sales', 'accounts', 'warehouse'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const challanResult = await pool.query(
        `SELECT ch.*, c.name as customer_name, c.company as customer_company,
                c.email as customer_email, c.phone as customer_phone,
                u.name as created_by_name,
                cu.name as confirmed_by_name,
                cau.name as cancelled_by_name
         FROM challans ch
         LEFT JOIN customers c ON ch.customer_id = c.id
         LEFT JOIN users u ON ch.created_by = u.id
         LEFT JOIN users cu ON ch.confirmed_by = cu.id
         LEFT JOIN users cau ON ch.cancelled_by = cau.id
         WHERE ch.id = $1`,
        [id]
      );

      if (challanResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Challan not found.' });
        return;
      }

      const itemsResult = await pool.query(
        `SELECT ci.*, p.stock_quantity as current_stock, p.is_active as product_active
         FROM challan_items ci
         LEFT JOIN products p ON ci.product_id = p.id
         WHERE ci.challan_id = $1
         ORDER BY ci.product_name`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...challanResult.rows[0],
          items: itemsResult.rows,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch challan.' });
    }
  }
);

// POST /api/challans — Create a draft challan
router.post(
  '/',
  authorize('admin', 'sales'),
  validate([
    body('customer_id').isUUID().withMessage('Valid customer ID is required'),
    body('notes').optional({ nullable: true }).trim(),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').isUUID().withMessage('Valid product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { customer_id, notes, items } = req.body;

      // Check for duplicate product IDs
      const productIds = items.map((item: any) => item.product_id);
      const uniqueIds = new Set(productIds);
      if (uniqueIds.size !== productIds.length) {
        res.status(400).json({
          success: false,
          message: 'Duplicate products in challan. Each product can only appear once.',
        });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verify customer exists and is active
        const customerCheck = await client.query(
          'SELECT id, name, status FROM customers WHERE id = $1',
          [customer_id]
        );
        if (customerCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ success: false, message: 'Customer not found.' });
          return;
        }
        if (customerCheck.rows[0].status === 'inactive') {
          await client.query('ROLLBACK');
          res.status(400).json({ success: false, message: 'Cannot create challan for inactive customer.' });
          return;
        }

        // Generate challan number: SC-YYYY-NNNNN
        const year = new Date().getFullYear();
        const seqResult = await client.query("SELECT nextval('challan_seq') as seq");
        const seqNum = String(seqResult.rows[0].seq).padStart(5, '0');
        const challanNumber = `SC-${year}-${seqNum}`;

        // Fetch product details for snapshot and calculate total
        let totalAmount = 0;
        const itemDetails: any[] = [];

        for (const item of items) {
          const product = await client.query(
            'SELECT id, name, sku, price, stock_quantity, is_active FROM products WHERE id = $1',
            [item.product_id]
          );

          if (product.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({
              success: false,
              message: `Product with ID ${item.product_id} not found.`,
            });
            return;
          }

          const p = product.rows[0];
          if (!p.is_active) {
            await client.query('ROLLBACK');
            res.status(400).json({
              success: false,
              message: `Product "${p.name}" (${p.sku}) is inactive and cannot be added to a challan.`,
            });
            return;
          }

          const lineTotal = parseFloat(p.price) * item.quantity;
          totalAmount += lineTotal;

          itemDetails.push({
            product_id: p.id,
            quantity: item.quantity,
            unit_price: p.price,
            product_name: p.name,
            product_sku: p.sku,
            total_price: lineTotal,
          });
        }

        // Create challan
        const challanResult = await client.query(
          `INSERT INTO challans (challan_number, customer_id, status, total_amount, notes, created_by)
           VALUES ($1, $2, 'draft', $3, $4, $5)
           RETURNING *`,
          [challanNumber, customer_id, totalAmount, notes || null, req.user!.id]
        );

        const challanId = challanResult.rows[0].id;

        // Insert challan items (product snapshot)
        for (const item of itemDetails) {
          await client.query(
            `INSERT INTO challan_items (challan_id, product_id, quantity, unit_price, product_name, product_sku, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [challanId, item.product_id, item.quantity, item.unit_price, item.product_name, item.product_sku, item.total_price]
          );
        }

        await client.query('COMMIT');

        // Log audit
        await logAudit(req.user!, 'CREATE_CHALLAN', 'challan', challanId, {
          challan_number: challanNumber,
          customer: customerCheck.rows[0].name,
          total_amount: totalAmount,
          items_count: items.length,
        });

        // Fetch the complete challan with items
        const fullChallan = await pool.query(
          `SELECT ch.*, c.name as customer_name, c.company as customer_company
           FROM challans ch
           LEFT JOIN customers c ON ch.customer_id = c.id
           WHERE ch.id = $1`,
          [challanId]
        );

        const fullItems = await pool.query(
          'SELECT * FROM challan_items WHERE challan_id = $1',
          [challanId]
        );

        res.status(201).json({
          success: true,
          message: `Challan ${challanNumber} created as draft.`,
          data: {
            ...fullChallan.rows[0],
            items: fullItems.rows,
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating challan:', error);
      res.status(500).json({ success: false, message: 'Failed to create challan.' });
    }
  }
);

// PUT /api/challans/:id — Update a draft challan
router.put(
  '/:id',
  authorize('admin', 'sales'),
  validate([
    body('notes').optional({ nullable: true }).trim(),
    body('items').optional().isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').optional().isUUID().withMessage('Valid product ID is required'),
    body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const challan = await client.query(
        'SELECT * FROM challans WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );

      if (challan.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Challan not found.' });
        return;
      }

      if (challan.rows[0].status !== 'draft') {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: `Cannot edit a challan with status "${challan.rows[0].status}". Only draft challans can be edited.`,
        });
        return;
      }

      const { notes, items } = req.body;

      if (items && items.length > 0) {
        // Check for duplicate product IDs
        const productIds = items.map((item: any) => item.product_id);
        const uniqueIds = new Set(productIds);
        if (uniqueIds.size !== productIds.length) {
          await client.query('ROLLBACK');
          res.status(400).json({
            success: false,
            message: 'Duplicate products in challan.',
          });
          return;
        }

        // Delete existing items
        await client.query('DELETE FROM challan_items WHERE challan_id = $1', [req.params.id]);

        // Re-insert items
        let totalAmount = 0;
        for (const item of items) {
          const product = await client.query(
            'SELECT id, name, sku, price, is_active FROM products WHERE id = $1',
            [item.product_id]
          );

          if (product.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ success: false, message: `Product ${item.product_id} not found.` });
            return;
          }

          const p = product.rows[0];
          if (!p.is_active) {
            await client.query('ROLLBACK');
            res.status(400).json({ success: false, message: `Product "${p.name}" is inactive.` });
            return;
          }

          const lineTotal = parseFloat(p.price) * item.quantity;
          totalAmount += lineTotal;

          await client.query(
            `INSERT INTO challan_items (challan_id, product_id, quantity, unit_price, product_name, product_sku, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [req.params.id, p.id, item.quantity, p.price, p.name, p.sku, lineTotal]
          );
        }

        await client.query(
          'UPDATE challans SET total_amount = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3',
          [totalAmount, notes, req.params.id]
        );
      } else if (notes !== undefined) {
        await client.query(
          'UPDATE challans SET notes = $1, updated_at = NOW() WHERE id = $2',
          [notes, req.params.id]
        );
      }

      await client.query('COMMIT');

      // Return updated challan
      const updated = await pool.query(
        `SELECT ch.*, c.name as customer_name FROM challans ch
         LEFT JOIN customers c ON ch.customer_id = c.id WHERE ch.id = $1`,
        [req.params.id]
      );
      const updatedItems = await pool.query(
        'SELECT * FROM challan_items WHERE challan_id = $1 ORDER BY product_name',
        [req.params.id]
      );

      res.json({
        success: true,
        message: 'Challan updated.',
        data: { ...updated.rows[0], items: updatedItems.rows },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating challan:', error);
      res.status(500).json({ success: false, message: 'Failed to update challan.' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/challans/:id/confirm — Confirm challan and deduct stock (CRITICAL TRANSACTION)
router.put(
  '/:id/confirm',
  authorize('admin', 'sales'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the challan row for update
      const challanResult = await client.query(
        'SELECT * FROM challans WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );

      if (challanResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Challan not found.' });
        return;
      }

      const challan = challanResult.rows[0];

      if (challan.status !== 'draft') {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: `Cannot confirm a challan with status "${challan.status}". Only draft challans can be confirmed.`,
        });
        return;
      }

      // Fetch all items for this challan
      const itemsResult = await client.query(
        'SELECT * FROM challan_items WHERE challan_id = $1',
        [req.params.id]
      );

      if (itemsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: 'Cannot confirm a challan with no items.',
        });
        return;
      }

      // Check stock availability for ALL items first (collect all errors)
      const insufficientStock: Array<{
        product_name: string;
        product_sku: string;
        available: number;
        requested: number;
        shortage: number;
      }> = [];

      for (const item of itemsResult.rows) {
        // Lock the product row to prevent concurrent modifications
        const productResult = await client.query(
          'SELECT id, name, sku, stock_quantity, is_active FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          insufficientStock.push({
            product_name: item.product_name,
            product_sku: item.product_sku,
            available: 0,
            requested: item.quantity,
            shortage: item.quantity,
          });
          continue;
        }

        const product = productResult.rows[0];

        if (product.stock_quantity < item.quantity) {
          insufficientStock.push({
            product_name: product.name,
            product_sku: product.sku,
            available: product.stock_quantity,
            requested: item.quantity,
            shortage: item.quantity - product.stock_quantity,
          });
        }
      }

      // If any stock is insufficient, rollback and return ALL errors at once
      if (insufficientStock.length > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: 'Cannot confirm challan due to insufficient stock.',
          errors: insufficientStock,
        });
        return;
      }

      // All stock checks passed — deduct stock and create movement records
      const stockChanges: Array<{ product_id: string; product_name: string; quantity: number; previous: number; current: number }> = [];

      for (const item of itemsResult.rows) {
        const before = await client.query('SELECT stock_quantity FROM products WHERE id = $1', [item.product_id]);
        const previousStock = before.rows[0].stock_quantity;

        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2',
          [item.quantity, item.product_id]
        );

        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, reason, reference_id, created_by)
           VALUES ($1, 'OUT', $2, $3, $4, $5)`,
          [
            item.product_id,
            item.quantity,
            `Challan ${challan.challan_number} confirmed`,
            challan.id,
            req.user!.id,
          ]
        );

        stockChanges.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          previous: previousStock,
          current: previousStock - item.quantity,
        });
      }

      // Update challan status
      await client.query(
        "UPDATE challans SET status = 'confirmed', confirmed_by = $1, confirmed_at = NOW(), updated_at = NOW() WHERE id = $2",
        [req.user!.id, req.params.id]
      );

      await client.query('COMMIT');

      // Log audit
      await logAudit(req.user!, 'CONFIRM_CHALLAN', 'challan', challan.id, {
        challan_number: challan.challan_number,
        stock_changes: stockChanges,
      });

      // Return the confirmed challan with stock change details
      const updatedChallan = await pool.query(
        `SELECT ch.*, c.name as customer_name, c.company as customer_company, u.name as created_by_name
         FROM challans ch
         LEFT JOIN customers c ON ch.customer_id = c.id
         LEFT JOIN users u ON ch.created_by = u.id
         WHERE ch.id = $1`,
        [req.params.id]
      );

      // Check for low-stock warnings
      const lowStockWarnings = [];
      for (const change of stockChanges) {
        const product = await pool.query(
          'SELECT name, sku, stock_quantity, min_stock_alert FROM products WHERE id = $1',
          [change.product_id]
        );
        if (product.rows.length > 0) {
          const p = product.rows[0];
          if (p.stock_quantity <= p.min_stock_alert) {
            lowStockWarnings.push({
              product_name: p.name,
              product_sku: p.sku,
              current_stock: p.stock_quantity,
              min_stock: p.min_stock_alert,
              is_out_of_stock: p.stock_quantity === 0,
            });
          }
        }
      }

      res.json({
        success: true,
        message: `Challan ${challan.challan_number} confirmed. Stock has been deducted.`,
        data: {
          ...updatedChallan.rows[0],
          stock_changes: stockChanges,
          low_stock_warnings: lowStockWarnings,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error confirming challan:', error);
      res.status(500).json({ success: false, message: 'Failed to confirm challan.' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/challans/:id/cancel — Cancel a challan (draft OR confirmed)
// If confirmed → restores stock
router.put(
  '/:id/cancel',
  authorize('admin', 'sales'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const challanResult = await client.query(
        'SELECT * FROM challans WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );

      if (challanResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Challan not found.' });
        return;
      }

      const challan = challanResult.rows[0];

      if (challan.status === 'cancelled') {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: 'Challan is already cancelled.',
        });
        return;
      }

      // If confirmed, restore stock
      const stockRestorations: Array<{ product_name: string; quantity: number; previous: number; current: number }> = [];

      if (challan.status === 'confirmed') {
        const itemsResult = await client.query(
          'SELECT * FROM challan_items WHERE challan_id = $1',
          [req.params.id]
        );

        for (const item of itemsResult.rows) {
          // Lock product row
          const product = await client.query(
            'SELECT id, name, stock_quantity FROM products WHERE id = $1 FOR UPDATE',
            [item.product_id]
          );

          if (product.rows.length > 0) {
            const previousStock = product.rows[0].stock_quantity;

            await client.query(
              'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2',
              [item.quantity, item.product_id]
            );

            await client.query(
              `INSERT INTO stock_movements (product_id, type, quantity, reason, reference_id, created_by)
               VALUES ($1, 'IN', $2, $3, $4, $5)`,
              [
                item.product_id,
                item.quantity,
                `Challan ${challan.challan_number} cancelled — stock restored`,
                challan.id,
                req.user!.id,
              ]
            );

            stockRestorations.push({
              product_name: item.product_name,
              quantity: item.quantity,
              previous: previousStock,
              current: previousStock + item.quantity,
            });
          }
        }
      }

      // Update challan status
      await client.query(
        "UPDATE challans SET status = 'cancelled', cancelled_by = $1, cancelled_at = NOW(), updated_at = NOW() WHERE id = $2",
        [req.user!.id, req.params.id]
      );

      await client.query('COMMIT');

      // Log audit
      await logAudit(req.user!, 'CANCEL_CHALLAN', 'challan', challan.id, {
        challan_number: challan.challan_number,
        previous_status: challan.status,
        stock_restored: challan.status === 'confirmed',
        stock_restorations: stockRestorations,
      });

      const message = challan.status === 'confirmed'
        ? `Challan ${challan.challan_number} cancelled. Stock has been restored.`
        : `Challan ${challan.challan_number} cancelled.`;

      res.json({
        success: true,
        message,
        data: {
          challan_number: challan.challan_number,
          previous_status: challan.status,
          stock_restored: challan.status === 'confirmed',
          stock_restorations: stockRestorations,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error cancelling challan:', error);
      res.status(500).json({ success: false, message: 'Failed to cancel challan.' });
    } finally {
      client.release();
    }
  }
);

export default router;
