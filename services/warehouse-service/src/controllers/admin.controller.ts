import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@repo/database';

export class AdminController {
  /**
   * Admin: View all inventory
   */
  getAllInventory = async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        productId,
        lowStock
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (productId) {
        where.product_id = productId as string;
      }

      if (lowStock === 'true') {
        where.available_quantity = {
          lte: prisma.warehouse_inventory.fields.reserved_quantity
        };
      }

      const [inventory, total] = await Promise.all([
        prisma.warehouse_inventory.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            products: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            },
            product_variants: {
              select: {
                id: true,
                variant_name: true,
                sku: true
              }
            }
          },
          orderBy: { updated_at: 'desc' }
        }),
        prisma.warehouse_inventory.count({ where })
      ]);

      res.json({
        message: 'Inventory retrieved successfully',
        data: inventory,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Admin: View product inventory
   */
  getProductInventory = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      const inventory = await prisma.warehouse_inventory.findMany({
        where: { product_id: productId },
        include: {
          products: true,
          product_variants: true
        }
      });

      res.json({
        message: 'Product inventory retrieved successfully',
        data: inventory
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  /**
   * Admin: Manual stock adjustment
   */
  adjustStock = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        productId,
        variantId,
        adjustmentType,
        quantity,
        reason,
        notes
      } = req.body;

      // Find existing inventory
      const existing = await prisma.warehouse_inventory.findUnique({
        where: {
          product_id_variant_id: {
            product_id: productId,
            variant_id: variantId || 'null'
          }
        }
      });

      let newQuantity: number;
      if (adjustmentType === 'add') {
        newQuantity = (existing?.available_quantity || 0) + quantity;
      } else if (adjustmentType === 'remove') {
        newQuantity = Math.max(0, (existing?.available_quantity || 0) - quantity);
      } else {
        // set
        newQuantity = quantity;
      }

      // Upsert inventory
      const inventory = await prisma.warehouse_inventory.upsert({
        where: {
          product_id_variant_id: {
            product_id: productId,
            variant_id: variantId || 'null'
          }
        },
        update: {
          available_quantity: newQuantity,
          updated_at: new Date()
        },
        create: {
          product_id: productId,
          variant_id: variantId || 'null',
          available_quantity: newQuantity,
          reserved_quantity: 0
        }
      });

      // TODO: Create audit log entry
      // await prisma.warehouse_audit_log.create({...})

      res.json({
        message: 'Stock adjusted successfully',
        data: {
          inventory,
          adjustment: {
            type: adjustmentType,
            quantity,
            reason,
            notes
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Manual reserve stock
   */
  reserveStock = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId } = req.params;
      const { variantId, quantity, reason, referenceId } = req.body;

      const inventory = await prisma.warehouse_inventory.findUnique({
        where: {
          product_id_variant_id: {
            product_id: productId,
            variant_id: variantId || 'null'
          }
        }
      });

      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }

      if (inventory.available_quantity < quantity) {
        return res.status(400).json({
          error: 'Insufficient stock',
          available: inventory.available_quantity,
          requested: quantity
        });
      }

      const updated = await prisma.warehouse_inventory.update({
        where: {
          product_id_variant_id: {
            product_id: productId,
            variant_id: variantId || 'null'
          }
        },
        data: {
          available_quantity: inventory.available_quantity - quantity,
          reserved_quantity: inventory.reserved_quantity + quantity,
          updated_at: new Date()
        }
      });

      res.json({
        message: 'Stock reserved successfully',
        data: {
          inventory: updated,
          reservation: {
            quantity,
            reason,
            referenceId
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Release reservation
   */
  releaseReservation = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId } = req.params;
      const { variantId, quantity, reason, referenceId } = req.body;

      const inventory = await prisma.warehouse_inventory.findUnique({
        where: {
          product_id_variant_id: {
            product_id: productId,
            variant_id: variantId || 'null'
          }
        }
      });

      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }

      if (inventory.reserved_quantity < quantity) {
        return res.status(400).json({
          error: 'Insufficient reserved stock',
          reserved: inventory.reserved_quantity,
          requested: quantity
        });
      }

      const updated = await prisma.warehouse_inventory.update({
        where: {
          product_id_variant_id: {
            product_id: productId,
            variant_id: variantId || 'null'
          }
        },
        data: {
          available_quantity: inventory.available_quantity + quantity,
          reserved_quantity: inventory.reserved_quantity - quantity,
          updated_at: new Date()
        }
      });

      res.json({
        message: 'Reservation released successfully',
        data: {
          inventory: updated,
          release: {
            quantity,
            reason,
            referenceId
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: List all purchase orders
   */
  getAllPurchaseOrders = async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        factoryId
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (factoryId) {
        where.factory_id = factoryId as string;
      }

      const [orders, total] = await Promise.all([
        prisma.warehouse_purchase_orders.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            factories: {
              select: {
                id: true,
                factory_name: true,
                city: true
              }
            },
            products: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            },
            product_variants: {
              select: {
                id: true,
                variant_name: true,
                sku: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.warehouse_purchase_orders.count({ where })
      ]);

      res.json({
        message: 'Purchase orders retrieved successfully',
        data: orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Admin: View PO details
   */
  getPurchaseOrderDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const order = await prisma.warehouse_purchase_orders.findUnique({
        where: { id },
        include: {
          factories: true,
          products: true,
          product_variants: true
        }
      });

      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      res.json({
        message: 'Purchase order retrieved successfully',
        data: order
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  /**
   * Admin: Update PO status
   */
  updatePurchaseOrderStatus = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      const order = await prisma.warehouse_purchase_orders.update({
        where: { id },
        data: {
          status,
          notes: notes || undefined,
          updated_at: new Date()
        }
      });

      res.json({
        message: 'Purchase order status updated successfully',
        data: order
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Mark PO as received
   */
  receivePurchaseOrder = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { receivedItems, receivedDate, receivedBy } = req.body;

      // Update PO status
      const order = await prisma.warehouse_purchase_orders.update({
        where: { id },
        data: {
          status: 'received',
          received_date: new Date(receivedDate),
          updated_at: new Date()
        },
        include: {
          products: true,
          product_variants: true
        }
      });

      // Update inventory for each received item
      for (const item of receivedItems) {
        const netReceived = item.quantityReceived - (item.quantityDamaged || 0);

        await prisma.warehouse_inventory.upsert({
          where: {
            product_id_variant_id: {
              product_id: order.product_id,
              variant_id: item.variantId || 'null'
            }
          },
          update: {
            available_quantity: {
              increment: netReceived
            },
            updated_at: new Date()
          },
          create: {
            product_id: order.product_id,
            variant_id: item.variantId || 'null',
            available_quantity: netReceived,
            reserved_quantity: 0
          }
        });
      }

      res.json({
        message: 'Purchase order received successfully',
        data: {
          order,
          receivedItems,
          receivedBy
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Cancel PO
   */
  cancelPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { reason, refundRequired } = req.body;

      const order = await prisma.warehouse_purchase_orders.update({
        where: { id },
        data: {
          status: 'cancelled',
          notes: reason,
          updated_at: new Date()
        }
      });

      res.json({
        message: 'Purchase order cancelled successfully',
        data: {
          order,
          cancellation: {
            reason,
            refundRequired
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: View audit log
   * TODO: Implement warehouse_audit_log table
   */
  getAuditLog = async (req: Request, res: Response) => {
    try {
      res.status(501).json({
        message: 'Audit log not yet implemented',
        note: 'Requires warehouse_audit_log table'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Admin: Initiate cycle count
   * TODO: Implement cycle count functionality
   */
  initiateCycleCount = async (req: Request, res: Response) => {
    try {
      res.status(501).json({
        message: 'Cycle count not yet implemented',
        note: 'Requires cycle count workflow'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: View discrepancies
   * TODO: Implement discrepancy tracking
   */
  getDiscrepancies = async (req: Request, res: Response) => {
    try {
      res.status(501).json({
        message: 'Discrepancy tracking not yet implemented',
        note: 'Requires discrepancy detection logic'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // ========================================================================
  // WAREHOUSE LOCATIONS (Two-Leg Shipping)
  // ========================================================================

  /**
   * Admin: Create warehouse location
   */
  createWarehouse = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        addressLine,
        city,
        province,
        postalCode,
        notes
      } = req.body;

      const warehouse = await prisma.warehouses.create({
        data: {
          name,
          address_line: addressLine,
          city,
          province: province || null,
          postal_code: postalCode,
          notes: notes || null
        }
      });

      res.status(201).json({
        message: 'Warehouse created successfully',
        data: warehouse
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: List all warehouse locations
   */
  listWarehouses = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [warehouses, total] = await Promise.all([
        prisma.warehouses.findMany({
          skip,
          take: Number(limit),
          include: {
            _count: {
              select: {
                factories: true,
                group_buying_sessions: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.warehouses.count()
      ]);

      res.json({
        message: 'Warehouses retrieved successfully',
        data: warehouses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Admin: Get warehouse location details
   */
  getWarehouseDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const warehouse = await prisma.warehouses.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              factories: true,
              group_buying_sessions: true
            }
          },
          factories: {
            select: {
              id: true,
              factory_name: true,
              city: true
            }
          }
        }
      });

      if (!warehouse) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      res.json({
        message: 'Warehouse retrieved successfully',
        data: warehouse
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Admin: Update warehouse location
   */
  updateWarehouse = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const {
        name,
        addressLine,
        city,
        province,
        postalCode,
        notes
      } = req.body;

      const updateData: any = {
        updated_at: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (addressLine !== undefined) updateData.address_line = addressLine;
      if (city !== undefined) updateData.city = city;
      if (province !== undefined) updateData.province = province;
      if (postalCode !== undefined) updateData.postal_code = postalCode;
      if (notes !== undefined) updateData.notes = notes;

      const warehouse = await prisma.warehouses.update({
        where: { id },
        data: updateData
      });

      res.json({
        message: 'Warehouse updated successfully',
        data: warehouse
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Warehouse not found' });
      }
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Delete warehouse location
   */
  deleteWarehouse = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if warehouse is assigned to any factories
      const factoryCount = await prisma.factories.count({
        where: { default_warehouse_id: id }
      });

      if (factoryCount > 0) {
        return res.status(400).json({
          error: `Cannot delete warehouse. It is assigned to ${factoryCount} factory(ies). Please reassign factories first.`
        });
      }

      // Check if warehouse is used in any active group buying sessions
      const sessionCount = await prisma.group_buying_sessions.count({
        where: {
          warehouse_id: id,
          status: {
            in: ['forming', 'moq_reached']
          }
        }
      });

      if (sessionCount > 0) {
        return res.status(400).json({
          error: `Cannot delete warehouse. It is used in ${sessionCount} active group buying session(s).`
        });
      }

      await prisma.warehouses.delete({
        where: { id }
      });

      res.json({
        message: 'Warehouse deleted successfully'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Warehouse not found' });
      }
      res.status(400).json({ error: error.message });
    }
  };
}
