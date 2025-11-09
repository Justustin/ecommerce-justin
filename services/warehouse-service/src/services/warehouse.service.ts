import { prisma } from '@repo/database';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { FulfillDemandDTO, FulfillBundleDemandDTO } from '../types';
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

    /**
     * NEW: Bundle-based demand fulfillment
     * Handles all variants together considering factory bundle constraints and warehouse tolerance
     *
     * Algorithm:
     * 1. Get bundle configuration (how many of each variant per bundle)
     * 2. Get warehouse tolerance (max excess per variant)
     * 3. Check current inventory for all variants
     * 4. Calculate bundles needed based on demand
     * 5. Check if warehouse tolerance allows this many bundles
     * 6. Reserve stock if available, or create PO for complete bundles
     */
    async fulfillBundleDemand(data: FulfillBundleDemandDTO) {
        const { productId, sessionId, variantDemands } = data;

        console.log(`\n========================================`);
        console.log(`Bundle-based demand fulfillment for product ${productId}`);
        console.log(`Session: ${sessionId}`);
        console.log(`Variant demands:`, variantDemands);
        console.log(`========================================\n`);

        // 1. Get bundle configuration and warehouse tolerance
        const [bundleConfigs, warehouseTolerances] = await Promise.all([
            prisma.grosir_bundle_config.findMany({
                where: { product_id: productId }
            }),
            prisma.grosir_warehouse_tolerance.findMany({
                where: { product_id: productId }
            })
        ]);

        if (bundleConfigs.length === 0) {
            throw new Error(`No bundle configuration found for product ${productId}. Please configure bundle settings first.`);
        }

        if (warehouseTolerances.length === 0) {
            throw new Error(`No warehouse tolerance found for product ${productId}. Please configure tolerance settings first.`);
        }

        console.log(`Bundle configs:`, bundleConfigs.map(b => ({
            variant: b.variant_id || 'base',
            unitsPerBundle: b.units_per_bundle
        })));

        console.log(`Warehouse tolerances:`, warehouseTolerances.map(t => ({
            variant: t.variant_id || 'base',
            maxExcess: t.max_excess_units
        })));

        // 2. Get current inventory for all variants
        const inventoryPromises = variantDemands.map(vd =>
            this.repository.findInventory(productId, vd.variantId)
        );
        const inventories = await Promise.all(inventoryPromises);

        const inventoryMap = new Map<string, any>();
        inventories.forEach((inv, idx) => {
            const key = variantDemands[idx].variantId || 'null';
            inventoryMap.set(key, inv);
        });

        console.log(`\nCurrent inventory:`, Array.from(inventoryMap.entries()).map(([key, inv]) => ({
            variant: key,
            available: inv?.available_quantity || 0,
            reserved: inv?.reserved_quantity || 0
        })));

        // 3. Calculate bundles needed for each variant
        const bundlesNeededMap = new Map<string, number>();
        for (const vd of variantDemands) {
            const key = vd.variantId || 'null';
            const bundleConfig = bundleConfigs.find(bc =>
                (bc.variant_id || 'null') === key
            );

            if (!bundleConfig) {
                throw new Error(`Bundle config not found for variant ${key}`);
            }

            const currentInventory = inventoryMap.get(key);
            const currentStock = currentInventory?.available_quantity || 0;
            const netDemand = Math.max(0, vd.quantity - currentStock);

            if (netDemand > 0) {
                const bundlesNeeded = Math.ceil(netDemand / bundleConfig.units_per_bundle);
                bundlesNeededMap.set(key, bundlesNeeded);
            } else {
                bundlesNeededMap.set(key, 0);
            }
        }

        // 4. Find maximum bundles needed (what factory must produce)
        const maxBundlesNeeded = Math.max(...Array.from(bundlesNeededMap.values()), 0);

        console.log(`\nBundles needed per variant:`, Array.from(bundlesNeededMap.entries()));
        console.log(`Maximum bundles needed: ${maxBundlesNeeded}`);

        if (maxBundlesNeeded === 0) {
            // All variants have sufficient stock
            console.log(`\n✅ All variants have sufficient stock. Reserving from warehouse...`);

            // Reserve stock for all variants
            for (const vd of variantDemands) {
                const key = vd.variantId || 'null';
                const inventory = inventoryMap.get(key);

                if (!inventory) {
                    throw new Error(`Inventory not found for variant ${key}`);
                }

                await prisma.warehouse_inventory.update({
                    where: { id: inventory.id },
                    data: {
                        available_quantity: { decrement: vd.quantity },
                        reserved_quantity: { increment: vd.quantity }
                    }
                });

                console.log(`Reserved ${vd.quantity} units of variant ${key}`);
            }

            return {
                message: "All demand fulfilled from existing stock",
                hasStock: true,
                bundlesOrdered: 0,
                variantsReserved: variantDemands.map(vd => ({
                    variantId: vd.variantId,
                    quantity: vd.quantity,
                    reserved: true
                }))
            };
        }

        // 5. Calculate excess for each variant if we produce maxBundlesNeeded bundles
        const excessMap = new Map<string, number>();
        let constrainingVariant: string | null = null;
        let maxBundlesAllowed = maxBundlesNeeded;

        for (const bundleConfig of bundleConfigs) {
            const key = bundleConfig.variant_id || 'null';
            const tolerance = warehouseTolerances.find(t =>
                (t.variant_id || 'null') === key
            );

            if (!tolerance) {
                console.warn(`No tolerance found for variant ${key}, skipping constraint check`);
                continue;
            }

            const demand = variantDemands.find(vd =>
                (vd.variantId || 'null') === key
            )?.quantity || 0;

            const willProduce = maxBundlesNeeded * bundleConfig.units_per_bundle;
            const excess = willProduce - demand;
            excessMap.set(key, excess);

            console.log(`Variant ${key}: will produce ${willProduce}, demand ${demand}, excess ${excess}, tolerance ${tolerance.max_excess_units}`);

            // Check if this variant violates tolerance
            if (excess > tolerance.max_excess_units) {
                const maxAllowedForThisVariant = demand + tolerance.max_excess_units;
                const bundlesAllowed = Math.floor(maxAllowedForThisVariant / bundleConfig.units_per_bundle);

                console.log(`⚠️  Variant ${key} exceeds tolerance! Max allowed bundles: ${bundlesAllowed}`);

                if (bundlesAllowed < maxBundlesAllowed) {
                    maxBundlesAllowed = bundlesAllowed;
                    constrainingVariant = key;
                }
            }
        }

        const finalBundlesToOrder = maxBundlesAllowed;

        console.log(`\n📦 Final decision: Order ${finalBundlesToOrder} bundles from factory`);
        if (constrainingVariant) {
            console.log(`   Constrained by variant: ${constrainingVariant}`);
        }

        // 6. Get product and factory details
        const product = await prisma.products.findUnique({
            where: { id: productId },
            include: { factories: true }
        });

        if (!product || !product.factories) {
            throw new Error(`Product or factory not found for productId: ${productId}`);
        }

        const factory = product.factories;

        // 7. Calculate total units and cost for the PO
        const totalUnitsInBundle = bundleConfigs.reduce((sum, bc) => sum + bc.units_per_bundle, 0);
        const totalUnitsToOrder = finalBundlesToOrder * totalUnitsInBundle;

        const shippingCost = await this._calculateBulkShipping(factory, product, totalUnitsToOrder);
        const unitCost = Number(product.cost_price || product.base_price);
        const totalCost = (unitCost * totalUnitsToOrder) + shippingCost;

        // 8. Create Purchase Order (one PO for all variants)
        // We'll store the primary variant or null
        const primaryVariant = bundleConfigs[0]?.variant_id || null;

        const purchaseOrder = await this.repository.createPurchaseOrder({
            factoryId: factory.id,
            productId,
            variantId: primaryVariant,
            quantity: totalUnitsToOrder,
            unitCost,
            shippingCost,
            totalCost
        });

        console.log(`\n✅ Created Purchase Order ${purchaseOrder.po_number}`);
        console.log(`   Total units: ${totalUnitsToOrder} (${finalBundlesToOrder} bundles x ${totalUnitsInBundle} units/bundle)`);
        console.log(`   Total cost: Rp ${totalCost.toLocaleString('id-ID')}`);

        // 9. Send WhatsApp to factory
        const bundleBreakdown = bundleConfigs.map(bc =>
            `${bc.units_per_bundle} units of ${bc.variant_id || 'base product'}`
        ).join(', ');

        await this._sendFactoryWhatsAppForBundle(
            factory,
            product,
            purchaseOrder,
            finalBundlesToOrder,
            bundleBreakdown
        );

        // 10. Calculate what will be added to inventory when PO arrives
        const inventoryAdditions = bundleConfigs.map(bc => {
            const key = bc.variant_id || 'null';
            const willReceive = finalBundlesToOrder * bc.units_per_bundle;
            const demand = variantDemands.find(vd => (vd.variantId || 'null') === key)?.quantity || 0;
            const excess = willReceive - demand;

            return {
                variantId: bc.variant_id,
                willReceive,
                demand,
                excess
            };
        });

        console.log(`\n📊 Inventory when PO arrives:`, inventoryAdditions);
        console.log(`========================================\n`);

        return {
            message: `Purchase order created for ${finalBundlesToOrder} factory bundles`,
            hasStock: false,
            bundlesOrdered: finalBundlesToOrder,
            totalUnitsOrdered: totalUnitsToOrder,
            purchaseOrder,
            constrainingVariant,
            inventoryAdditions
        };
    }

    /**
     * Send WhatsApp to factory with bundle details
     */
    private async _sendFactoryWhatsAppForBundle(
        factory: any,
        product: any,
        purchaseOrder: any,
        bundles: number,
        bundleBreakdown: string
    ) {
        if (!factory.phone_number) {
            console.warn(`Factory ${factory.factory_name} has no phone number. Skipping WhatsApp notification.`);
            return;
        }

        const message = `
🏭 *New Bundle Purchase Order - ${factory.factory_name}*

*PO Number:* ${purchaseOrder.po_number}
*Product:* ${product.name}

*Bundle Order:*
${bundles} complete bundles
Each bundle contains: ${bundleBreakdown}

*Total Units:* ${purchaseOrder.quantity}
*Total Value:* Rp ${purchaseOrder.total_cost.toLocaleString('id-ID')}

*Delivery Address:*
${WAREHOUSE_ADDRESS}

Please prepare and send to Laku Warehouse.

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

            console.log(`✅ WhatsApp sent to factory ${factory.factory_name} (${factory.phone_number})`);
        } catch (error: any) {
            console.error(`❌ Failed to send WhatsApp to factory ${factory.factory_name}:`, error.message);
            // Don't throw - we still want to continue even if WhatsApp fails
        }
    }
}