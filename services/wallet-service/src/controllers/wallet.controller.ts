
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { WalletService } from '../services/wallet.service';

export class WalletController {
    private service: WalletService;

    constructor() {
        this.service = new WalletService();
    }

    getBalance = async (req: Request, res: Response) => {
        try {
            const wallet = await this.service.getBalance(req.params.userId);
            res.status(200).json({ success: true, data: wallet });
        } catch (error: any) {
            res.status(404).json({ success: false, error: error.message });
        }
    };

    creditTransaction = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const transaction = await this.service.credit(req.body);
            res.status(201).json({ success: true, data: transaction });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
    
    requestWithdrawal = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const withdrawal = await this.service.requestWithdrawal(req.body);
            res.status(201).json({ success: true, data: withdrawal });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
}