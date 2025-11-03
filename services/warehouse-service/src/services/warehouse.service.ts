import { prisma } from '@repo/database';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { FulfillDemandDTO } from '../types';
import axios from 'axios';

const FACTORY_SERVICE_URL = process.env.FACTORY_SERVICE_URL || 'http://localhost:3003';
const LOGISTICS_SERVICE_URL = process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008';
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3012';
const WAREHOUSE_POSTAL_CODE = process.env.WAREHOUSE_POSTAL_CODE || '13910';
const WAREHOUSE_ADDRESS = process.env.WAREHOUSE_ADDRESS || 'Laku Warehouse Address';

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

            // CRITICAL FIX: Actually reserve the stock to prevent overselling
            if (!inventory) {
                throw new Error('Inventory record not found');
            }

            await prisma.warehouse_inventory.update({
                where: { id: inventory.id },
                data: {
                    available_quantity: { decrement: quantity },
                    reserved_quantity: { increment: quantity }
                }
            });

            console.log(`Reserved ${quantity} units from warehouse inventory`);
            return {
                message: "Demand fulfilled from existing stock.",
                hasStock: true,
                reserved: quantity,
                inventoryId: inventory.id
            };
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

        // 6. NEW: Send WhatsApp to factory about purchase order
        await this._sendWhatsAppToFactory(factory, product, purchaseOrder, factoryOrderQuantity);

        return {
            message: "Insufficient stock. Purchase order created and factory notified.",
            hasStock: false,
            purchaseOrder,
            grosirUnitsNeeded: Math.ceil(factoryOrderQuantity / wholesaleUnit)
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

    /**
     * NEW: Send WhatsApp message to factory about purchase order
     */
    private async _sendWhatsAppToFactory(factory: any, product: any, purchaseOrder: any, quantity: number) {
        if (!factory.phone_number) {
            console.warn(`Factory ${factory.factory_name} has no phone number. Skipping WhatsApp notification.`);
            return;
        }

        const message = `
🏭 *New Purchase Order - ${factory.factory_name}*

*PO Number:* ${purchaseOrder.po_number}
*Product:* ${product.name}
*Quantity:* ${quantity} units
*Total Value:* Rp ${purchaseOrder.total_cost.toLocaleString('id-ID')}

Please prepare and send to Laku Warehouse.

*Delivery Address:*
${WAREHOUSE_ADDRESS}

Thank you!
        `.trim();

        try {
            await axios.post(
                `${WHATSAPP_SERVICE_URL}/api/whatsapp/send`,
                {
                    phoneNumber: factory.phone_number,
                    message
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            console.log(`WhatsApp sent to factory ${factory.factory_name} (${factory.phone_number})`);
        } catch (error: any) {
            console.error(`Failed to send WhatsApp to factory ${factory.factory_name}:`, error.message);
            // Don't throw - we still want to continue even if WhatsApp fails
        }
    }
}