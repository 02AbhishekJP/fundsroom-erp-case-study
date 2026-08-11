import pool from './pool';
import bcrypt from 'bcryptjs';

const createTablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'sales', 'warehouse', 'accounts')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(20),
  company VARCHAR(150),
  gst VARCHAR(20),
  address TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'inactive')),
  type VARCHAR(20) NOT NULL DEFAULT 'retail' CHECK (type IN ('retail', 'wholesale', 'distributor')),
  follow_up_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-up notes table
CREATE TABLE IF NOT EXISTS follow_up_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  follow_up_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_alert INTEGER NOT NULL DEFAULT 10,
  warehouse_location VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock movement history
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason VARCHAR(200),
  reference_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challans (Sales Orders)
CREATE TABLE IF NOT EXISTS challans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  total_amount DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challan items (line items with product snapshot)
CREATE TABLE IF NOT EXISTS challan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_id UUID NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_sku VARCHAR(50) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(100),
  user_role VARCHAR(20),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challan number sequence (start at 1 for SC-YYYY-00001 format)
CREATE SEQUENCE IF NOT EXISTS challan_seq START WITH 1;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_challans_customer ON challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_challans_status ON challans(status);
CREATE INDEX IF NOT EXISTS idx_challans_number ON challans(challan_number);
CREATE INDEX IF NOT EXISTS idx_challans_created_at ON challans(created_at);
CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON challan_items(challan_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_product ON challan_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
`;

const seedDataSQL = async () => {
  // Check if users already exist
  const existing = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  // Seed users (one per role)
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin User', 'admin@fundsroom.com', $1, 'admin'),
    ('Rahul Kumar', 'sales@fundsroom.com', $1, 'sales'),
    ('Deepak Singh', 'warehouse@fundsroom.com', $1, 'warehouse'),
    ('Priyanka Joshi', 'accounts@fundsroom.com', $1, 'accounts')
  `, [passwordHash]);

  // Get admin user ID
  const adminUser = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const adminId = adminUser.rows[0].id;
  const salesUser = await pool.query("SELECT id FROM users WHERE role = 'sales' LIMIT 1");
  const salesId = salesUser.rows[0].id;

  // Seed customers — electronics distribution clients
  await pool.query(`
    INSERT INTO customers (name, email, phone, company, gst, address, status, type, follow_up_date, notes, created_by) VALUES
    ('Amit Sharma', 'amit@abcelectronics.com', '+91-9876543210', 'ABC Electronics', '27AABCU9603R1ZP', '42 MG Road, Electronic City, Bangalore 560100', 'active', 'wholesale', '2026-08-15', 'Key wholesale client. Orders headsets and speakers regularly.', $1),
    ('Rajesh Gupta', 'rajesh@xyzdistributors.com', '+91-9876543211', 'XYZ Distributors', '07AAGCX2345R1ZQ', '18 Nehru Place, New Delhi 110019', 'active', 'distributor', '2026-08-12', 'National distributor for gaming accessories. High volume orders.', $1),
    ('Sneha Patel', 'sneha@techworld.in', '+91-9876543212', 'Tech World', '24AABCT7890R1ZR', '35 Ring Road, Ahmedabad 380015', 'active', 'wholesale', '2026-08-20', 'Wholesale partner for cables and chargers.', $2),
    ('Vikram Mehta', 'vikram@digitalhub.com', '+91-9876543213', 'Digital Hub', '29AABCD5678R1ZS', '78 Park Street, Kolkata 700016', 'lead', 'retail', '2026-08-18', 'New retail lead from Electronics Expo 2026.', $2),
    ('Neha Reddy', 'neha@primeaccessories.com', '+91-9876543214', 'Prime Accessories', '36AABCP1234R1ZT', '22 Banjara Hills, Hyderabad 500034', 'active', 'distributor', NULL, 'Regional distributor for laptop accessories and monitors.', $1)
  `, [adminId, salesId]);

  // Add follow-up notes for some customers
  const customers = await pool.query("SELECT id FROM customers ORDER BY created_at LIMIT 3");
  if (customers.rows.length >= 3) {
    await pool.query(`
      INSERT INTO follow_up_notes (customer_id, note, follow_up_date, created_by) VALUES
      ($1, 'Discussed Q3 bulk order for JBL headsets. Client interested in 200+ units.', '2026-08-15', $4),
      ($1, 'Sent revised quotation with 12% bulk discount.', NULL, $4),
      ($2, 'Follow-up on gaming accessories catalog. Waiting for category preferences.', '2026-08-12', $5),
      ($3, 'Initial meeting completed. Interested in USB-C cables and chargers.', '2026-08-20', $5)
    `, [customers.rows[0].id, customers.rows[1].id, customers.rows[2].id, adminId, salesId]);
  }

  // Seed products — wholesale electronics
  await pool.query(`
    INSERT INTO products (sku, name, category, description, price, stock_quantity, min_stock_alert, warehouse_location, is_active, image_url) VALUES
    ('JBL-HS-001', 'JBL Tune 760NC Headset', 'Headsets', 'Wireless over-ear noise cancelling headset with JBL Pure Bass sound, 50hr battery', 5999.00, 45, 10, 'Warehouse A - Shelf 1', true, 'https://in.jbl.com/dw/image/v2/AAUJ_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw8374fa6d/JBL_TUNE_770NC_Product%20Image_Hero_Blue.png?sw=537&sfrm=png'),
    ('SONY-HP-001', 'Sony WH-1000XM5 Headphones', 'Headphones', 'Industry-leading noise canceling wireless headphones with Auto NC Optimizer', 24990.00, 18, 8, 'Warehouse A - Shelf 1', true, 'https://m.media-amazon.com/images/I/61vJtKbAssL._SX522_.jpg'),
    ('BOAT-EB-001', 'boAt Airdopes 141 Earbuds', 'Earbuds', 'TWS earbuds with 42H playtime, ENx tech, BEAST mode, IWP', 1299.00, 120, 25, 'Warehouse A - Shelf 2', true, 'https://m.media-amazon.com/images/I/51n8Hok755L._SX522_.jpg'),
    ('LOG-MS-001', 'Logitech G502 HERO Mouse', 'Gaming Mice', 'High performance gaming mouse with HERO 25K sensor, 11 programmable buttons', 3995.00, 35, 10, 'Warehouse B - Shelf 1', true, 'https://m.media-amazon.com/images/I/61mpMH5TzkL._SX522_.jpg'),
    ('LOG-KB-001', 'Logitech MX Keys S Keyboard', 'Keyboards', 'Advanced wireless illuminated keyboard with smart backlighting', 9495.00, 22, 8, 'Warehouse B - Shelf 2', true, 'https://m.media-amazon.com/images/I/61b7L494y9L._SX522_.jpg'),
    ('RED-KB-001', 'Redgear Shadow Amulet Mechanical Keyboard', 'Keyboards', 'RGB mechanical gaming keyboard with Outemu Blue switches', 2499.00, 8, 10, 'Warehouse B - Shelf 2', true, 'https://m.media-amazon.com/images/I/61oI+3xQ7eL._SX522_.jpg'),
    ('JBL-SP-001', 'JBL Charge 5 Bluetooth Speaker', 'Bluetooth Speakers', 'Portable Bluetooth speaker with IP67 waterproof, 20hr playtime', 12999.00, 28, 10, 'Warehouse A - Shelf 3', true, 'https://m.media-amazon.com/images/I/71P+54iL0rL._SX522_.jpg'),
    ('BLUE-MC-001', 'Blue Yeti USB Microphone', 'Microphones', 'Professional multi-pattern USB condenser microphone for streaming', 8999.00, 15, 5, 'Warehouse B - Shelf 3', true, 'https://m.media-amazon.com/images/I/61+oG-W2-aL._SX522_.jpg'),
    ('LOG-WC-001', 'Logitech C920 HD Pro Webcam', 'Webcams', 'Full HD 1080p webcam with stereo audio, auto-focus', 7499.00, 12, 5, 'Warehouse B - Shelf 3', true, 'https://m.media-amazon.com/images/I/71iNwnHT3IL._SX522_.jpg'),
    ('LG-MN-001', 'LG 27UL850-W 4K Monitor', 'Monitors', '27-inch 4K UHD IPS monitor with USB Type-C, HDR10', 32999.00, 6, 3, 'Warehouse C - Shelf 1', true, 'https://m.media-amazon.com/images/I/81I-u3K36wL._SX522_.jpg'),
    ('AMA-CB-001', 'Amazon Basics HDMI Cable 2m', 'HDMI Cables', 'High-speed HDMI 2.0 cable, 4K@60Hz, braided nylon', 399.00, 200, 50, 'Warehouse A - Shelf 4', true, 'https://m.media-amazon.com/images/I/71nO4a16gHL._SX522_.jpg'),
    ('ANK-CB-001', 'Anker USB-C Cable 1.8m', 'USB Cables', 'PowerLine III USB-C to USB-C cable, 60W PD charging', 899.00, 150, 40, 'Warehouse A - Shelf 4', true, 'https://m.media-amazon.com/images/I/61-9x4sC7LL._SX522_.jpg'),
    ('ANK-CH-001', 'Anker 65W Nano II Charger', 'Chargers', 'Ultra-compact GaN II charger with USB-C PD, universal compatibility', 3499.00, 55, 15, 'Warehouse A - Shelf 5', true, 'https://m.media-amazon.com/images/I/61iP+Wc1GfL._SX522_.jpg'),
    ('STL-GP-001', 'SteelSeries QcK Gaming Mouse Pad', 'Gaming Accessories', 'QcK heavy cloth gaming mouse pad, XL size, non-slip rubber base', 1799.00, 40, 12, 'Warehouse B - Shelf 4', true, 'https://m.media-amazon.com/images/I/613kE6Q9yBL._SX522_.jpg'),
    ('RAN-LS-001', 'Rain Design mStand Laptop Stand', 'Laptop Accessories', 'Aluminum laptop stand with cable management, ergonomic viewing angle', 4299.00, 5, 8, 'Warehouse C - Shelf 2', true, 'https://m.media-amazon.com/images/I/51wA1+1-0dL._SX522_.jpg')
  `);

  // Create initial stock movements for all products
  const products = await pool.query("SELECT id, stock_quantity FROM products");
  for (const product of products.rows) {
    await pool.query(
      `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
       VALUES ($1, 'IN', $2, 'Initial stock entry', $3)`,
      [product.id, product.stock_quantity, adminId]
    );
  }

  // Create some sample challans
  const customerList = await pool.query("SELECT id, name FROM customers WHERE status = 'active' ORDER BY created_at LIMIT 3");
  const productList = await pool.query("SELECT id, name, sku, price FROM products LIMIT 5");

  if (customerList.rows.length >= 2 && productList.rows.length >= 4) {
    const year = new Date().getFullYear();

    // Challan 1 — Confirmed (for ABC Electronics)
    const ch1Number = `SC-${year}-00001`;
    const ch1Items = [
      { product: productList.rows[0], qty: 10 }, // JBL Headset x10
      { product: productList.rows[3], qty: 5 },  // Logitech Mouse x5
    ];
    const ch1Total = ch1Items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.qty), 0);

    const ch1 = await pool.query(
      `INSERT INTO challans (challan_number, customer_id, status, total_amount, notes, created_by, confirmed_by, confirmed_at)
       VALUES ($1, $2, 'confirmed', $3, 'Bulk order for Q3', $4, $4, NOW())
       RETURNING id`,
      [ch1Number, customerList.rows[0].id, ch1Total, adminId]
    );

    for (const item of ch1Items) {
      await pool.query(
        `INSERT INTO challan_items (challan_id, product_id, quantity, unit_price, product_name, product_sku, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ch1.rows[0].id, item.product.id, item.qty, item.product.price, item.product.name, item.product.sku, parseFloat(item.product.price) * item.qty]
      );
      // Deduct stock
      await pool.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.qty, item.product.id]);
      await pool.query(
        `INSERT INTO stock_movements (product_id, type, quantity, reason, reference_id, created_by)
         VALUES ($1, 'OUT', $2, $3, $4, $5)`,
        [item.product.id, item.qty, `Challan ${ch1Number} confirmed`, ch1.rows[0].id, adminId]
      );
    }

    // Update sequence to avoid conflicts
    await pool.query("SELECT setval('challan_seq', 3)");

    // Challan 2 — Draft (for XYZ Distributors)
    const ch2Number = `SC-${year}-00002`;
    const ch2Items = [
      { product: productList.rows[2], qty: 20 }, // Boat Earbuds x20
      { product: productList.rows[1], qty: 3 },  // Sony Headphones x3
    ];
    const ch2Total = ch2Items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.qty), 0);

    const ch2 = await pool.query(
      `INSERT INTO challans (challan_number, customer_id, status, total_amount, notes, created_by)
       VALUES ($1, $2, 'draft', $3, 'Pending approval from distributor', $4)
       RETURNING id`,
      [ch2Number, customerList.rows[1].id, ch2Total, salesId]
    );

    for (const item of ch2Items) {
      await pool.query(
        `INSERT INTO challan_items (challan_id, product_id, quantity, unit_price, product_name, product_sku, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ch2.rows[0].id, item.product.id, item.qty, item.product.price, item.product.name, item.product.sku, parseFloat(item.product.price) * item.qty]
      );
    }

    // Challan 3 — Confirmed (for Tech World)
    const ch3Number = `SC-${year}-00003`;
    const ch3Items = [
      { product: productList.rows[4], qty: 2 }, // Logitech Keyboard x2
    ];
    const ch3Total = ch3Items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.qty), 0);

    const ch3 = await pool.query(
      `INSERT INTO challans (challan_number, customer_id, status, total_amount, notes, created_by, confirmed_by, confirmed_at)
       VALUES ($1, $2, 'confirmed', $3, 'Keyboard restock', $4, $4, NOW())
       RETURNING id`,
      [ch3Number, customerList.rows[2].id, ch3Total, salesId]
    );

    for (const item of ch3Items) {
      await pool.query(
        `INSERT INTO challan_items (challan_id, product_id, quantity, unit_price, product_name, product_sku, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ch3.rows[0].id, item.product.id, item.qty, item.product.price, item.product.name, item.product.sku, parseFloat(item.product.price) * item.qty]
      );
      await pool.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.qty, item.product.id]);
      await pool.query(
        `INSERT INTO stock_movements (product_id, type, quantity, reason, reference_id, created_by)
         VALUES ($1, 'OUT', $2, $3, $4, $5)`,
        [item.product.id, item.qty, `Challan ${ch3Number} confirmed`, ch3.rows[0].id, salesId]
      );
    }
  }

  // Seed audit log entries
  await pool.query(`
    INSERT INTO audit_log (user_id, user_name, user_role, action, entity_type, details) VALUES
    ($1, 'Admin User', 'admin', 'SEED_DATABASE', 'system', '{"message": "Initial database seed completed"}')
  `, [adminId]);

  console.log('Database seeded successfully with electronics distribution data');
};

export async function initializeDatabase(): Promise<void> {
  try {
    await pool.query(createTablesSQL);
    console.log('Database tables created successfully');
    await seedDataSQL();
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
