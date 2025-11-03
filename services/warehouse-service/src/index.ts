import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import warehouseRoutes from './routes/warehouse.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

// Main application routes
app.use('/api', warehouseRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'warehouse-service' });
});


app.get('/', (req, res) => {
    res.send('Warehouse Service is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Warehouse Service listening on port ${PORT}`);
});