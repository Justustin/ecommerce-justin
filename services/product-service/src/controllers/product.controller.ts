import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';


export class ProductController {
  private service: ProductService;

  constructor() {
    this.service = new ProductService();
  }

  createProduct = async (req: Request, res: Response) => {
    try {
        const product = await this.service.createProduct(req.body);
        res.status(201).json(product);
    } catch (error: any) {
        res.status(400).json({error: error.message})
    }
  }

  getProducts = async (req: Request, res: Response) => {
    try {
      const query = {
        factoryId: req.query.factoryId as string,
        categoryId: req.query.categoryId as string,
        status: req.query.status as any,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };
      const result = await this.service.getProducts(query);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getProductBySlug = async (req: Request, res: Response) => {
    try {
        const product = await this.service.getProductBySlug(req.params.slug);
        res.json(product)
    }catch (error: any){
        res.status(404).json({error: error.message})
    }
  }

  getProductById = async (req: Request, res: Response) => {
    try {
        const product = await this.service.getProductById(req.params.id);
        res.json(product)
    } catch (error: any){
        res.status(404).json({error: error.message})
    }
  }
  getVariantById = async (req: Request, res: Response) => {
    try {
      const variant = await this.service.getVariantById(req.params.variantId);
      res.json({ success: true, data: variant });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  };

  updateProduct = async (req: Request, res: Response) => {
    try {
        const product = await this.service.updateProduct(req.params.id, req.body);
        res.json(product)
    } catch (error: any) {
        res.status(400).json({error: error.message})
    }
  }
  publishProduct = async (req: Request, res: Response) => {
    try {
      const product = await this.service.publishProduct(req.params.id);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteProduct = async (req: Request, res: Response) => {
    try {
      await this.service.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  addImages = async (req: Request, res: Response) => {
    try {
      await this.service.addProductImages(req.params.id, req.body.images);
      res.status(201).json({ message: 'Images added successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  createVariant = async (req: Request, res: Response) => {
    try {
      const variant = await this.service.createVariant({
        ...req.body,
        productId: req.params.id
      });
      res.status(201).json(variant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}