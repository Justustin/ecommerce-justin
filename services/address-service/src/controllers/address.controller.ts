import { Request, Response } from 'express';
import { AddressService } from '../services/address.service';

export class AddressController {
  private service: AddressService;

  constructor() {
    this.service = new AddressService();
  }

  createAddress = async (req: Request, res: Response) => {
    try {
      const address = await this.service.createAddress(req.body);
      res.status(201).json({
        success: true,
        data: address
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getAddress = async (req: Request, res: Response) => {
    try {
      const address = await this.service.getAddress(req.params.id);
      res.json({
        success: true,
        data: address
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  };

  getUserAddresses = async (req: Request, res: Response) => {
    try {
      const addresses = await this.service.getUserAddresses(req.params.userId);
      res.json({
        success: true,
        data: addresses
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getDefaultAddress = async (req: Request, res: Response) => {
    try {
      const address = await this.service.getDefaultAddress(req.params.userId);
      res.json({
        success: true,
        data: address
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  };

  updateAddress = async (req: Request, res: Response) => {
    try {
      const address = await this.service.updateAddress(req.params.id, req.body);
      res.json({
        success: true,
        data: address
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  setDefaultAddress = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const address = await this.service.setDefaultAddress(req.params.id, userId);
      res.json({
        success: true,
        data: address
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  deleteAddress = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      await this.service.deleteAddress(req.params.id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}