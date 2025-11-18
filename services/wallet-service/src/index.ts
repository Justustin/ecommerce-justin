import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import walletRoutes from './routes/wallet.routes';
import webhookRoutes from './routes/webhook.routes';
import { swaggerSpec } from './config/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors());
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Wallet Service API Docs'
}));

// Main application routes
app.use('/api', walletRoutes);
app.use('/api/webhooks', webhookRoutes);

app.get('/', (req, res) => {
    res.send('Wallet Service is running! Visit <a href="/api-docs">/api-docs</a> for API documentation.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wallet-service' });
});


app.listen(PORT, () => {
    console.log(`🚀 Wallet Service listening on port ${PORT}`);
});