import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import pool from '../db/pool';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../middleware/audit';

const router = Router();

router.use(authenticate);

// GET /api/customers — List with pagination, search, and filter
router.get(
  '/',
  authorize('admin', 'sales', 'accounts'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const type = req.query.type as string;

      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereConditions.push(
          `(c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount} OR c.phone ILIKE $${paramCount} OR c.company ILIKE $${paramCount})`
        );
        params.push(`%${search}%`);
      }

      if (status && ['lead', 'active', 'inactive'].includes(status)) {
        paramCount++;
        whereConditions.push(`c.status = $${paramCount}`);
        params.push(status);
      }

      if (type && ['retail', 'wholesale', 'distributor'].includes(type)) {
        paramCount++;
        whereConditions.push(`c.type = $${paramCount}`);
        params.push(type);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const countQuery = `SELECT COUNT(*) FROM customers c ${whereClause}`;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT c.*, u.name as created_by_name
        FROM customers c
        LEFT JOIN users u ON c.created_by = u.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      const dataResult = await pool.query(dataQuery, [...params, limit, offset]);

      res.json({
        success: true,
        data: dataResult.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
    }
  }
);

// GET /api/customers/:id — Single customer with follow-up notes
router.get(
  '/:id',
  authorize('admin', 'sales', 'accounts'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const customerResult = await pool.query(
        `SELECT c.*, u.name as created_by_name
         FROM customers c
         LEFT JOIN users u ON c.created_by = u.id
         WHERE c.id = $1`,
        [id]
      );

      if (customerResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Customer not found.' });
        return;
      }

      const notesResult = await pool.query(
        `SELECT fn.*, u.name as created_by_name
         FROM follow_up_notes fn
         LEFT JOIN users u ON fn.created_by = u.id
         WHERE fn.customer_id = $1
         ORDER BY fn.created_at DESC`,
        [id]
      );

      // Get challan history
      const challansResult = await pool.query(
        `SELECT ch.id, ch.challan_number, ch.status, ch.total_amount, ch.created_at
         FROM challans ch
         WHERE ch.customer_id = $1
         ORDER BY ch.created_at DESC
         LIMIT 20`,
        [id]
      );

      // Get purchase stats
      const statsResult = await pool.query(
        `SELECT
           COUNT(*) as total_challans,
           COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_challans,
           COALESCE(SUM(total_amount) FILTER (WHERE status = 'confirmed'), 0) as total_spent
         FROM challans WHERE customer_id = $1`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...customerResult.rows[0],
          follow_up_notes: notesResult.rows,
          challans: challansResult.rows,
          stats: statsResult.rows[0],
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch customer.' });
    }
  }
);

// POST /api/customers — Create customer
router.post(
  '/',
  authorize('admin', 'sales'),
  validate([
    body('name').trim().notEmpty().withMessage('Customer name is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Valid email required'),
    body('phone').optional({ checkFalsy: true }).trim().matches(/^\\d{10}$/).withMessage('Phone number must be exactly 10 digits'),
    body('company').optional({ nullable: true }).trim(),
    body('gst').optional({ checkFalsy: true }).trim().isLength({ min: 12, max: 12 }).withMessage('GST number must be exactly 12 characters or left empty'),
    body('address').optional({ nullable: true }).trim(),
    body('status').optional().isIn(['lead', 'active', 'inactive']).withMessage('Status must be lead, active, or inactive'),
    body('type').optional().isIn(['retail', 'wholesale', 'distributor']).withMessage('Type must be retail, wholesale, or distributor'),
    body('follow_up_date').optional({ nullable: true }).isISO8601().withMessage('Valid date required'),
    body('notes').optional({ nullable: true }).trim(),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email, phone, company, gst, address, status, type, follow_up_date, notes } = req.body;

      // Check duplicate phone
      if (phone) {
        const duplicate = await pool.query('SELECT id FROM customers WHERE phone = $1', [phone]);
        if (duplicate.rows.length > 0) {
          res.status(409).json({ success: false, message: 'A customer with this phone number already exists.' });
          return;
        }
      }

      const result = await pool.query(
        `INSERT INTO customers (name, email, phone, company, gst, address, status, type, follow_up_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [name, email || null, phone || null, company || null, gst || null, address || null,
         status || 'lead', type || 'retail', follow_up_date || null, notes || null, req.user!.id]
      );

      await logAudit(req.user!, 'CREATE_CUSTOMER', 'customer', result.rows[0].id, { name, company });

      res.status(201).json({
        success: true,
        message: 'Customer created successfully.',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ success: false, message: 'Failed to create customer.' });
    }
  }
);

// PUT /api/customers/:id — Update customer
router.put(
  '/:id',
  authorize('admin', 'sales'),
  validate([
    body('name').optional().trim().notEmpty().withMessage('Customer name cannot be empty'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Valid email required'),
    body('phone').optional({ checkFalsy: true }).trim().matches(/^\\d{10}$/).withMessage('Phone number must be exactly 10 digits'),
    body('gst').optional({ checkFalsy: true }).trim().isLength({ min: 12, max: 12 }).withMessage('GST number must be exactly 12 characters or left empty'),
    body('status').optional().isIn(['lead', 'active', 'inactive']),
    body('type').optional().isIn(['retail', 'wholesale', 'distributor']),
    body('follow_up_date').optional({ nullable: true }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, email, phone, company, gst, address, status, type, follow_up_date, notes } = req.body;

      const existing = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Customer not found.' });
        return;
      }

      // Check duplicate phone (if changing)
      if (phone) {
        const duplicate = await pool.query('SELECT id FROM customers WHERE phone = $1 AND id != $2', [phone, id]);
        if (duplicate.rows.length > 0) {
          res.status(409).json({ success: false, message: 'A customer with this phone number already exists.' });
          return;
        }
      }

      const result = await pool.query(
        `UPDATE customers SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          company = COALESCE($4, company),
          gst = COALESCE($5, gst),
          address = COALESCE($6, address),
          status = COALESCE($7, status),
          type = COALESCE($8, type),
          follow_up_date = COALESCE($9, follow_up_date),
          notes = COALESCE($10, notes),
          updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [name, email, phone, company, gst, address, status, type, follow_up_date, notes, id]
      );

      await logAudit(req.user!, 'UPDATE_CUSTOMER', 'customer', id as string, { name, status });

      res.json({ success: true, message: 'Customer updated successfully.', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update customer.' });
    }
  }
);

// POST /api/customers/:id/notes — Add follow-up note
router.post(
  '/:id/notes',
  authorize('admin', 'sales'),
  validate([
    body('note').trim().notEmpty().withMessage('Note content is required'),
    body('follow_up_date').optional({ nullable: true }).isISO8601().withMessage('Valid date required'),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { note, follow_up_date } = req.body;

      const customer = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
      if (customer.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Customer not found.' });
        return;
      }

      const result = await pool.query(
        `INSERT INTO follow_up_notes (customer_id, note, follow_up_date, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, note, follow_up_date || null, req.user!.id]
      );

      // Update customer follow_up_date if provided
      if (follow_up_date) {
        await pool.query(
          'UPDATE customers SET follow_up_date = $1, updated_at = NOW() WHERE id = $2',
          [follow_up_date, id]
        );
      }

      res.status(201).json({ success: true, message: 'Follow-up note added.', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to add note.' });
    }
  }
);

// GET /api/customers/:id/challans — Customer challan history
router.get(
  '/:id/challans',
  authorize('admin', 'sales', 'accounts'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT ch.*, u.name as created_by_name
         FROM challans ch
         LEFT JOIN users u ON ch.created_by = u.id
         WHERE ch.customer_id = $1
         ORDER BY ch.created_at DESC`,
        [id]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch challans.' });
    }
  }
);

// DELETE /api/customers/:id — Delete customer
router.delete(
  '/:id',
  authorize('admin', 'sales'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const existing = await pool.query('SELECT name FROM customers WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Customer not found.' });
        return;
      }
      
      await pool.query('DELETE FROM customers WHERE id = $1', [id]);
      await logAudit(req.user!, 'DELETE_CUSTOMER', 'customer', id, { name: existing.rows[0].name });
      
      res.json({ success: true, message: 'Customer deleted successfully.' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ success: false, message: 'Failed to delete customer. Cannot delete customers with existing sales challans.' });
    }
  }
);

export default router;
