import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { WarehouseService } from '../services/warehouse.service';

export class WarehouseController {
    private service: WarehouseService;

    constructor() {
        this.service = new WarehouseService();
    }

    fulfillDemand = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const result = await this.service.fulfillDemand(req.body);
            res.status(200).json({ success: true, ...result });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
}