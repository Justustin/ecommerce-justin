import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import walletRoutes from './routes/wallet.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors());
app.use(express.json());

// Main application routes
app.use('/api', walletRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('Wallet Service is running!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wallet-service' });
});


app.listen(PORT, () => {
    console.log(`💰 Wallet Service listening on port ${PORT}`);
});