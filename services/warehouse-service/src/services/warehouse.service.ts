import { prisma } from '@repo/database';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { FulfillDemandDTO } from '../types';
import axios from 'axios';

const FACTORY_SERVICE_URL = process.env.FACTORY_SERVICE_URL || 'http://localhost:3003';
const LOGISTICS_SERVICE_URL = process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008';
const WAREHOUSE_POSTAL_CODE = '13910';

export class WarehouseService {
    private repository: WarehouseRepository;

    constructor() {
        this.repository = new WarehouseRepository();
    }

    /**
     * Main logic to handle demand from a completed group buy session.
     */
    async fulfillDemand(data: FulfillDemandDTO) {
        const { productId, variantId, quantity, wholesaleUnit } = data;

        // 1. Check current inventory
        const inventory = await this.repository.findInventory(productId, variantId || null);
        const currentStock = inventory?.available_quantity || 0;

        console.log(`Demand for product ${productId}: ${quantity}. Current stock: ${currentStock}.`);

        if (currentStock >= quantity) {
            console.log("Sufficient stock in warehouse. No purchase order needed.");
            // In a real system, you would reserve this stock. For now, we just log.
            // await prisma.warehouse_inventory.update(...)
            return { message: "Demand fulfilled from existing stock." };
        }

        // 2. If insufficient, calculate how much to order from the factory
        const needed = quantity - currentStock;
        
        // ✅ Round up to the nearest wholesale_unit
        const factoryOrderQuantity = Math.ceil(needed / wholesaleUnit) * wholesaleUnit;
        
        console.log(`Insufficient stock. Need ${needed}, ordering ${factoryOrderQuantity} from factory.`);

        // 3. Get product and factory details to create the purchase order
        const product = await prisma.products.findUnique({
            where: { id: productId },
            include: { factories: true }
        });
        if (!product || !product.factories) {
            throw new Error(`Product or factory not found for productId: ${productId}`);
        }

        const factory = product.factories;
        
        // 4. Calculate Leg 1 (Factory -> Warehouse) shipping cost for the PO
        const shippingCost = await this._calculateBulkShipping(factory, product, factoryOrderQuantity);
        
        // 5. Create the Warehouse Purchase Order
        const unitCost = Number(product.cost_price || product.base_price);
        const totalCost = (unitCost * factoryOrderQuantity) + shippingCost;
        
        const purchaseOrder = await this.repository.createPurchaseOrder({
            factoryId: factory.id,
            productId,
            variantId,
            quantity: factoryOrderQuantity,
            unitCost,
            shippingCost,
            totalCost
        });

        console.log(`Created Purchase Order ${purchaseOrder.po_number} for ${factoryOrderQuantity} units.`);

        return {
            message: "Insufficient stock. Purchase order created.",
            purchaseOrder
        };
    }
    
    private async _calculateBulkShipping(factory: any, product: any, quantity: number): Promise<number> {
        try {
            const payload = {
                originPostalCode: factory.postal_code,
                destinationPostalCode: WAREHOUSE_POSTAL_CODE,
                items: [{
                    name: product.name,
                    value: Number(product.cost_price || product.base_price) * quantity,
                    weight: (product.weight_grams || 500) * quantity,
                    quantity: 1
                }]
            };
            const response = await axios.post(`${LOGISTICS_SERVICE_URL}/api/rates`, payload);
            const rates = response.data.data?.pricing || [];
            if (rates.length === 0) return 50000; // Default fallback
            return rates[0].price;
        } catch (error) {
            console.error("Failed to calculate bulk shipping for PO:", error);
            return 50000; // Return a default fallback on error
        }
    }
}