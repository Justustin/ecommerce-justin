import express from 'express';
import { prisma } from '@repo/database';
import dotenv from 'dotenv';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import adminRoutes from './routes/admin.routes';
import logisticsRoutes from './routes/logistics.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Logistics Service API',
      version: '1.0.0',
      description: 'Biteship Integration - Shipping rates, shipment creation, and tracking',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Health', description: 'Service health check' },
      { name: 'Rates', description: 'Get shipping rates from multiple couriers' },
      { name: 'Shipments', description: 'Create and manage shipments' },
      { name: 'Tracking', description: 'Track shipment status' },
      { name: 'Webhooks', description: 'Biteship webhook handlers' },
      { name: 'Admin', description: 'Admin endpoints for shipment management' }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Logistics Service API'
}));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'logistics-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: PORT,
    docs: '/api-docs'
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
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});