
import express from 'express';
import { router } from './src/routes';
import adminRoutes from './src/routes/admin.routes';
import {startWhatsApp, sendOTP} from './src/whatsappService';

const app = express();
const PORT = 3012

startWhatsApp();

app.use(express.json());
app.use("/whatsapp", router);
app.use("/admin", adminRoutes);


app.listen(PORT, () => {
  console.log(`WhatsApp service running on http://localhost:${PORT}`);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'whatsapp-service' });
});

// setTimeout(async () => {
//     await sendMessage('08119883223', 'Hello!');
// }, 5000);