import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant, GroupBuyingSession } from '@/types';

// ============================================================================
// CART STORE STATE INTERFACE
// ============================================================================

interface CartState {
  // State
  items: CartItem[];
  
  // Actions
  addItem: (
    product: Product,
    quantity: number,
    variant?: ProductVariant,
    groupSession?: GroupBuyingSession
  ) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  
  // Computed getters
  getTotalItems: () => number;
  getSubtotal: () => number;
  getItemCount: (productId: string, variantId?: string) => number;
  hasItem: (productId: string, variantId?: string) => boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique key for cart item
 * Includes variant to allow same product with different variants
 */
const getItemKey = (productId: string, variantId?: string): string => {
  return variantId ? `${productId}-${variantId}` : productId;
};

/**
 * Calculate price for a cart item
 * Considers variant price adjustments
 */
const getItemPrice = (product: Product, variant?: ProductVariant): number => {
  const basePrice = product.base_price;
  const adjustment = variant?.price_adjustment || 0;
  return basePrice + adjustment;
};

// ============================================================================
// CREATE CART STORE
// ============================================================================

/**
 * Zustand store for shopping cart management
 * 
 * Features:
 * - Persists to localStorage automatically
 * - Tracks products, variants, quantities
 * - Associates items with group buying sessions
 * - Calculates totals
 * - Prevents duplicate items (updates quantity instead)
 * 
 * Storage key: 'cart-storage'
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // INITIAL STATE
      // ============================================================================
      
      items: [],
      
      // ============================================================================
      // ACTIONS
      // ============================================================================
      
      /**
       * Add item to cart
       * If item already exists, increases quantity
       * 
       * @param product - Product to add
       * @param quantity - Quantity to add (default: 1)
       * @param variant - Product variant (optional)
       * @param groupSession - Group buying session (optional)
       */
      addItem: (product, quantity, variant, groupSession) => {
        const items = get().items;
        const itemKey = getItemKey(product.id, variant?.id);
        
        // Check if item already exists in cart
        const existingItemIndex = items.findIndex((item) => {
          const existingKey = getItemKey(item.product.id, item.variant?.id);
          return existingKey === itemKey;
        });
        
        if (existingItemIndex !== -1) {
          // Item exists, update quantity
          const updatedItems = [...items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity,
          };
          
          set({ items: updatedItems });
        } else {
          // New item, add to cart
          const newItem: CartItem = {
            product,
            variant,
            quantity,
            group_session: groupSession,
          };
          
          set({ items: [...items, newItem] });
        }
      },
      
      /**
       * Remove item from cart completely
       * 
       * @param productId - Product ID to remove
       * @param variantId - Variant ID (optional)
       */
      removeItem: (productId, variantId) => {
        const items = get().items;
        const itemKey = getItemKey(productId, variantId);
        
        const updatedItems = items.filter((item) => {
          const existingKey = getItemKey(item.product.id, item.variant?.id);
          return existingKey !== itemKey;
        });
        
        set({ items: updatedItems });
      },
      
      /**
       * Update quantity of an existing item
       * If quantity is 0 or negative, removes the item
       * 
       * @param productId - Product ID
       * @param quantity - New quantity
       * @param variantId - Variant ID (optional)
       */
      updateQuantity: (productId, quantity, variantId) => {
        const items = get().items;
        const itemKey = getItemKey(productId, variantId);
        
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          get().removeItem(productId, variantId);
          return;
        }
        
        const updatedItems = items.map((item) => {
          const existingKey = getItemKey(item.product.id, item.variant?.id);
          
          if (existingKey === itemKey) {
            return { ...item, quantity };
          }
          
          return item;
        });
        
        set({ items: updatedItems });
      },
      
      /**
       * Clear all items from cart
       * Used after successful checkout
       */
      clearCart: () => {
        set({ items: [] });
      },
      
      // ============================================================================
      // COMPUTED GETTERS
      // ============================================================================
      
      /**
       * Get total number of items in cart (sum of quantities)
       */
      getTotalItems: () => {
        const items = get().items;
        return items.reduce((total, item) => total + item.quantity, 0);
      },
      
      /**
       * Calculate cart subtotal (before shipping/tax)
       */
      getSubtotal: () => {
        const items = get().items;
        
        return items.reduce((total, item) => {
          const price = getItemPrice(item.product, item.variant);
          return total + (price * item.quantity);
        }, 0);
      },
      
      /**
       * Get quantity of a specific item in cart
       * Returns 0 if item not in cart
       */
      getItemCount: (productId, variantId) => {
        const items = get().items;
        const itemKey = getItemKey(productId, variantId);
        
        const item = items.find((item) => {
          const existingKey = getItemKey(item.product.id, item.variant?.id);
          return existingKey === itemKey;
        });
        
        return item?.quantity || 0;
      },
      
      /**
       * Check if a specific item is in cart
       */
      hasItem: (productId, variantId) => {
        return get().getItemCount(productId, variantId) > 0;
      },
    }),
    
    // ============================================================================
    // PERSISTENCE CONFIGURATION
    // ============================================================================
    {
      name: 'cart-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      
      /**
       * Only persist items array
       * Computed values are derived on-demand
       */
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

// ============================================================================
// SELECTOR HOOKS (Performance Optimization)
// ============================================================================

/**
 * Hook to get only cart items
 * Prevents re-renders when other state changes
 */
export const useCartItems = () => useCartStore((state) => state.items);

/**
 * Hook to get total item count
 */
export const useCartCount = () => {
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  return getTotalItems();
};

/**
 * Hook to get cart subtotal
 */
export const useCartSubtotal = () => {
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  return getSubtotal();
};

/**
 * Hook to get only cart actions (doesn't cause re-renders)
 */
export const useCartActions = () => useCartStore((state) => ({
  addItem: state.addItem,
  removeItem: state.removeItem,
  updateQuantity: state.updateQuantity,
  clearCart: state.clearCart,
}));

/**
 * Hook to check if specific product is in cart
 */
export const useIsInCart = (productId: string, variantId?: string): boolean => {
  const hasItem = useCartStore((state) => state.hasItem);
  return hasItem(productId, variantId);
};

/**
 * Hook to get quantity of specific product in cart
 */
export const useProductQuantity = (productId: string, variantId?: string): number => {
  const getItemCount = useCartStore((state) => state.getItemCount);
  return getItemCount(productId, variantId);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if cart is empty
 */
export const useIsCartEmpty = (): boolean => {
  const items = useCartItems();
  return items.length === 0;
};

/**
 * Get all unique factories in cart
 * Useful for calculating per-factory shipping costs
 */
export const useCartFactories = (): string[] => {
  const items = useCartItems();
  const factoryIds = items.map((item) => item.product.factory_id);
  return [...new Set(factoryIds)];
};

/**
 * Check if all items in cart are from same factory
 * Some features might require single-factory orders
 */
export const useIsSingleFactoryCart = (): boolean => {
  const factories = useCartFactories();
  return factories.length <= 1;
};

/**
 * Get items grouped by factory
 * Useful for split shipments
 */
export const useCartItemsByFactory = (): Record<string, CartItem[]> => {
  const items = useCartItems();
  
  return items.reduce((grouped, item) => {
    const factoryId = item.product.factory_id;
    
    if (!grouped[factoryId]) {
      grouped[factoryId] = [];
    }
    
    grouped[factoryId].push(item);
    
    return grouped;
  }, {} as Record<string, CartItem[]>);
};

/**
 * Check if cart contains any group buying items
 */
export const useHasGroupBuyingItems = (): boolean => {
  const items = useCartItems();
  return items.some((item) => item.group_session !== undefined);
};

/**
 * Validate cart items before checkout
 * Returns array of validation errors
 */
export const useValidateCart = (): string[] => {
  const items = useCartItems();
  const errors: string[] = [];
  
  if (items.length === 0) {
    errors.push('Keranjang kosong');
    return errors;
  }
  
  // Check each item
  items.forEach((item) => {
    // Check stock availability
    if (item.product.status !== 'active') {
      errors.push(`${item.product.name} tidak tersedia`);
    }
    
    // Check variant stock if applicable
    if (item.variant && !item.variant.is_active) {
      errors.push(`${item.product.name} - ${item.variant.variant_name} tidak tersedia`);
    }
    
    // Check MOQ for group buying
    if (item.group_session) {
      if (item.quantity < item.product.min_order_quantity) {
        errors.push(
          `${item.product.name} membutuhkan minimal ${item.product.min_order_quantity} unit`
        );
      }
    }
  });
  
  return errors;
};

// ============================================================================
// EXPORT DEFAULT STORE
// ============================================================================

export default useCartStore;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Add product to cart from product page
 * 
 * import { useCartActions } from '@/lib/store/cart.store';
 * 
 * function ProductPage({ product, activeSession }) {
 *   const { addItem } = useCartActions();
 *   const [quantity, setQuantity] = useState(1);
 *   
 *   const handleAddToCart = () => {
 *     addItem(product, quantity, undefined, activeSession);
 *     toast.success('Produk ditambahkan ke keranjang!');
 *   };
 *   
 *   return (
 *     <button onClick={handleAddToCart}>
 *       Tambah ke Keranjang
 *     </button>
 *   );
 * }
 */

/**
 * Example 2: Display cart count in header
 * 
 * import { useCartCount } from '@/lib/store/cart.store';
 * 
 * function CartBadge() {
 *   const count = useCartCount();
 *   
 *   if (count === 0) return null;
 *   
 *   return (
 *     <div className="relative">
 *       <ShoppingCartIcon />
 *       <span className="absolute -top-2 -right-2">
 *         {count}
 *       </span>
 *     </div>
 *   );
 * }
 */

/**
 * Example 3: Cart page with item management
 * 
 * import { useCartItems, useCartActions, useCartSubtotal } from '@/lib/store/cart.store';
 * 
 * function CartPage() {
 *   const items = useCartItems();
 *   const { updateQuantity, removeItem } = useCartActions();
 *   const subtotal = useCartSubtotal();
 *   
 *   return (
 *     <div>
 *       {items.map((item) => (
 *         <div key={item.product.id}>
 *           <h3>{item.product.name}</h3>
 *           <input
 *             type="number"
 *             value={item.quantity}
 *             onChange={(e) => updateQuantity(
 *               item.product.id,
 *               parseInt(e.target.value),
 *               item.variant?.id
 *             )}
 *           />
 *           <button onClick={() => removeItem(item.product.id, item.variant?.id)}>
 *             Hapus
 *           </button>
 *         </div>
 *       ))}
 *       <div>Subtotal: Rp {subtotal.toLocaleString()}</div>
 *     </div>
 *   );
 * }
 */

/**
 * Example 4: Checkout - validate and clear cart
 * 
 * import { useValidateCart, useCartActions } from '@/lib/store/cart.store';
 * import { useRouter } from 'next/navigation';
 * 
 * function CheckoutButton() {
 *   const errors = useValidateCart();
 *   const { clearCart } = useCartActions();
 *   const router = useRouter();
 *   
 *   const handleCheckout = async () => {
 *     if (errors.length > 0) {
 *       errors.forEach(error => toast.error(error));
 *       return;
 *     }
 *     
 *     // Process checkout...
 *     const success = await processOrder();
 *     
 *     if (success) {
 *       clearCart();
 *       router.push('/order-success');
 *     }
 *   };
 *   
 *   return (
 *     <button onClick={handleCheckout}>
 *       Lanjut ke Pembayaran
 *     </button>
 *   );
 * }
 */

/**
 * Example 5: Check if product is in cart
 * 
 * import { useIsInCart, useProductQuantity } from '@/lib/store/cart.store';
 * 
 * function ProductCard({ product }) {
 *   const isInCart = useIsInCart(product.id);
 *   const quantity = useProductQuantity(product.id);
 *   
 *   return (
 *     <div>
 *       {isInCart ? (
 *         <span>Sudah di keranjang ({quantity})</span>
 *       ) : (
 *         <button>Tambah ke Keranjang</button>
 *       )}
 *     </div>
 *   );
 * }
 */