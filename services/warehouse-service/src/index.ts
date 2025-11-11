import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import warehouseRoutes from './routes/warehouse.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'warehouse-service' });
});

// Main application routes
app.use('/api', warehouseRoutes);
app.use('/api/admin/warehouse', adminRoutes);

app.get('/', (req, res) => {
    res.send('Warehouse Service is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Warehouse Service listening on port ${PORT}`);
    console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
});