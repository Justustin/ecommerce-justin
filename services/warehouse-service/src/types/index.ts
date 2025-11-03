export interface FulfillDemandDTO {
    productId: string;
    variantId?: string;
    quantity: number; // The total demand from the group buy session
    wholesaleUnit: number;
}