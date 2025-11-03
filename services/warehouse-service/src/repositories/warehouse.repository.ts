import { prisma } from '@repo/database';

export class WarehouseRepository {

    async findInventory(productId: string, variantId: string | null) {
        return prisma.warehouse_inventory.findUnique({
            where: {
                product_id_variant_id: {
                    product_id: productId,
                    variant_id: variantId || "null",
                }
            }
        });
    }
    
    async createPurchaseOrder(data: {
        factoryId: string;
        productId: string;
        variantId?: string;
        quantity: number;
        unitCost: number;
        shippingCost: number;
        totalCost: number;
    }) {
        const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        
        return prisma.warehouse_purchase_orders.create({
            data: {
                po_number: poNumber,
                factory_id: data.factoryId,
                product_id: data.productId,
                variant_id: data.variantId,
                quantity: data.quantity,
                unit_cost: data.unitCost,
                shipping_cost: data.shippingCost,
                total_cost: data.totalCost,
                status: 'pending_approval' // Or 'pending'
            }
        });
    }
}