import { Router } from 'express';
import { param } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

router.get('/addresses', controller.getAllAddresses);
router.get('/addresses/analytics', controller.getAddressAnalytics);
router.delete('/addresses/:id', [param('id').isUUID()], controller.deleteAddress);
router.put('/addresses/:id', [param('id').isUUID()], controller.updateAddress);

export default router;
