import express from 'express';
import { prisma } from '@repo/database';
import dotenv from 'dotenv';
import cors from 'cors';
import adminRoutes from './routes/admin.routes';
import logisticsRoutes from './routes/logistics.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'logistics-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register public routes (CRITICAL FIX: was missing!)
app.use('/api', logisticsRoutes);

// Register admin routes
app.use('/api/admin', adminRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚚 Logistics Service running on http://localhost:${PORT}`);
});