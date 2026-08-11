import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initializeDatabase } from './db/init';
import { errorHandler, notFound } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import challanRoutes from './routes/challans';
import dashboardRoutes from './routes/dashboard';
import stockMovementRoutes from './routes/stockMovements';
import userRoutes from './routes/users';
import auditRoutes from './routes/audit';

const app = express();

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Fundsroom ERP API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize database tables and seed data
    await initializeDatabase();
    console.log('Database initialized successfully');

    app.listen(config.port, () => {
      console.log(`\n🚀 Fundsroom ERP API Server`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   URL: http://localhost:${config.port}`);
      console.log(`   Health: http://localhost:${config.port}/api/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
