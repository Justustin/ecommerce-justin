import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes';
import transactionRoutes from './routes/transaction.routes';
import adminRoutes from './routes/admin.routes';
import { PaymentRepository } from './repositories/payment.repository';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
// app.use(cors({
//   origin: allowedOrigins,
//   credentials: true
// }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});



// Redirect root to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    docs: '/api-docs'
  });
});

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const paymentRepo = new PaymentRepository();

const enableExpiration = process.env.ENABLE_EXPIRATION_CRON !== 'false';

if (enableExpiration) {
  const expirationSchedule = process.env.EXPIRATION_CRON_SCHEDULE || '0 * * * *';
  
  cron.schedule(expirationSchedule, async () => {
    console.log(`[${new Date().toISOString()}] Checking for expired payments...`);
    try {
      const result = await paymentRepo.expirePendingPayments();
      if (result.count > 0) {
        console.log(`Expired ${result.count} payments`);
      }
    } catch (error) {
      console.error('Expiration check failed:', error);
    }
  });
  
  console.log(`⏰ Payment expiration check scheduled: ${expirationSchedule}`);
}

const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`💳 Payment Service`);
    console.log(`🚀 product-service running on port ${PORT}`);
  console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`📋 Tables: payments, refunds, transaction_ledger`);
  console.log('='.repeat(50));
});