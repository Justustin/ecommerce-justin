module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/apps/customer-web/app/providers.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$query$2d$core$40$5$2e$90$2e$2$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@tanstack+query-core@5.90.2/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$react$2d$query$40$5$2e$90$2e$2_react$40$19$2e$1$2e$0$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@tanstack+react-query@5.90.2_react@19.1.0/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$react$2d$query$2d$devto_30d81ff8362fc1e83f75504da4a92e31$2f$node_modules$2f40$tanstack$2f$react$2d$query$2d$devtools$2f$build$2f$modern$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@tanstack+react-query-devto_30d81ff8362fc1e83f75504da4a92e31/node_modules/@tanstack/react-query-devtools/build/modern/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
;
;
;
// ============================================================================
// REACT QUERY CONFIGURATION
// ============================================================================
/**
 * Create a Query Client with default options
 * This function is called once per user session
 */ function makeQueryClient() {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$query$2d$core$40$5$2e$90$2e$2$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryClient"]({
        defaultOptions: {
            queries: {
                // ============================================================================
                // QUERY DEFAULTS
                // ============================================================================
                /**
         * Stale time: How long data is considered fresh (5 minutes)
         * Fresh data won't refetch automatically
         */ staleTime: 5 * 60 * 1000,
                /**
         * Cache time: How long unused data stays in cache (10 minutes)
         * After this, data is garbage collected
         */ gcTime: 10 * 60 * 1000,
                /**
         * Retry failed requests 2 times before giving up
         * With exponential backoff: 1s, 2s, 4s
         */ retry: 2,
                /**
         * Retry delay with exponential backoff
         */ retryDelay: (attemptIndex)=>Math.min(1000 * 2 ** attemptIndex, 30000),
                /**
         * Refetch on window focus (good for real-time updates)
         * Useful when user comes back to tab
         */ refetchOnWindowFocus: true,
                /**
         * Don't refetch on mount if data is fresh
         * Reduces unnecessary API calls
         */ refetchOnMount: false,
                /**
         * Refetch on network reconnect
         * Ensures data is fresh after coming back online
         */ refetchOnReconnect: true
            },
            mutations: {
                // ============================================================================
                // MUTATION DEFAULTS
                // ============================================================================
                /**
         * Retry mutations once on failure
         * Be conservative with mutations (POST/PUT/DELETE)
         */ retry: 1,
                /**
         * Retry delay for mutations
         */ retryDelay: (attemptIndex)=>Math.min(1000 * 2 ** attemptIndex, 10000)
            }
        }
    });
}
// ============================================================================
// BROWSER vs SERVER SETUP
// ============================================================================
/**
 * Browser: Create query client once and reuse
 * Server: Create new client per request (Next.js SSR)
 */ let browserQueryClient = undefined;
function getQueryClient() {
    if ("TURBOPACK compile-time truthy", 1) {
        // Server: always create new client
        return makeQueryClient();
    } else //TURBOPACK unreachable
    ;
}
function Providers({ children }) {
    /**
   * Use useState to ensure client is created only once per component mount
   * This prevents hydration issues in Next.js 14
   */ const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>getQueryClient());
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$react$2d$query$40$5$2e$90$2e$2_react$40$19$2e$1$2e$0$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: [
            children,
            ("TURBOPACK compile-time value", "development") === 'development' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$react$2d$query$2d$devto_30d81ff8362fc1e83f75504da4a92e31$2f$node_modules$2f40$tanstack$2f$react$2d$query$2d$devtools$2f$build$2f$modern$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ReactQueryDevtools"], {
                initialIsOpen: false,
                position: "bottom",
                buttonPosition: "bottom-right"
            }, void 0, false, {
                fileName: "[project]/apps/customer-web/app/providers.tsx",
                lineNumber: 134,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/customer-web/app/providers.tsx",
        lineNumber: 129,
        columnNumber: 5
    }, this);
} // ============================================================================
 // USAGE EXAMPLES
 // ============================================================================
 /**
 * Example 1: Using in app/layout.tsx
 * 
 * import Providers from './providers';
 * 
 * export default function RootLayout({
 *   children,
 * }: {
 *   children: React.ReactNode;
 * }) {
 *   return (
 *     <html lang="id">
 *       <body>
 *         <Providers>
 *           {children}
 *         </Providers>
 *       </body>
 *     </html>
 *   );
 * }
 */  /**
 * Example 2: Using useQuery in a component
 * 
 * import { useQuery } from '@tanstack/react-query';
 * import { getProducts } from '@/lib/api/products';
 * 
 * function ProductList() {
 *   const { data, isLoading, error } = useQuery({
 *     queryKey: ['products'],
 *     queryFn: () => getProducts({ limit: 12 })
 *   });
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error loading products</div>;
 *   
 *   return (
 *     <div>
 *       {data?.data.map(product => (
 *         <ProductCard key={product.id} product={product} />
 *       ))}
 *     </div>
 *   );
 * }
 */  /**
 * Example 3: Using useMutation for form submission
 * 
 * import { useMutation, useQueryClient } from '@tanstack/react-query';
 * import { joinGroupSession } from '@/lib/api/products';
 * 
 * function JoinGroupButton({ sessionId }) {
 *   const queryClient = useQueryClient();
 *   
 *   const { mutate, isPending } = useMutation({
 *     mutationFn: (data) => joinGroupSession(sessionId, data),
 *     onSuccess: () => {
 *       // Invalidate and refetch group session data
 *       queryClient.invalidateQueries({ queryKey: ['group-session', sessionId] });
 *       toast.success('Berhasil bergabung!');
 *     },
 *     onError: (error) => {
 *       toast.error('Gagal bergabung: ' + error.message);
 *     }
 *   });
 *   
 *   return (
 *     <button 
 *       onClick={() => mutate({ quantity: 1 })}
 *       disabled={isPending}
 *     >
 *       {isPending ? 'Loading...' : 'Gabung Grup'}
 *     </button>
 *   );
 * }
 */  /**
 * Example 4: Prefetching data for faster navigation
 * 
 * import { useQueryClient } from '@tanstack/react-query';
 * import { getProductById } from '@/lib/api/products';
 * 
 * function ProductCard({ product }) {
 *   const queryClient = useQueryClient();
 *   
 *   // Prefetch product details on hover
 *   const handleMouseEnter = () => {
 *     queryClient.prefetchQuery({
 *       queryKey: ['product', product.id],
 *       queryFn: () => getProductById(product.id)
 *     });
 *   };
 *   
 *   return (
 *     <div onMouseEnter={handleMouseEnter}>
 *       <Link href={`/products/${product.slug}`}>
 *         {product.name}
 *       </Link>
 *     </div>
 *   );
 * }
 */  /**
 * Example 5: Optimistic updates for better UX
 * 
 * import { useMutation, useQueryClient } from '@tanstack/react-query';
 * import apiClient from '@/lib/api/client';
 * 
 * function LikeButton({ productId }) {
 *   const queryClient = useQueryClient();
 *   
 *   const { mutate } = useMutation({
 *     mutationFn: () => apiClient.post(`/products/${productId}/like`),
 *     
 *     // Optimistically update UI before API call completes
 *     onMutate: async () => {
 *       // Cancel outgoing refetches
 *       await queryClient.cancelQueries({ queryKey: ['product', productId] });
 *       
 *       // Snapshot current value
 *       const previousProduct = queryClient.getQueryData(['product', productId]);
 *       
 *       // Optimistically update
 *       queryClient.setQueryData(['product', productId], (old: any) => ({
 *         ...old,
 *         likes: (old?.likes || 0) + 1,
 *         isLiked: true
 *       }));
 *       
 *       return { previousProduct };
 *     },
 *     
 *     // Rollback on error
 *     onError: (err, variables, context) => {
 *       queryClient.setQueryData(
 *         ['product', productId],
 *         context?.previousProduct
 *       );
 *     },
 *     
 *     // Refetch after success/error
 *     onSettled: () => {
 *       queryClient.invalidateQueries({ queryKey: ['product', productId] });
 *     }
 *   });
 *   
 *   return <button onClick={() => mutate()}>Like</button>;
 * }
 */  /**
 * Example 6: Dependent queries (wait for first query before second)
 * 
 * import { useQuery } from '@tanstack/react-query';
 * import { getProductById, getActiveGroupSession } from '@/lib/api/products';
 * 
 * function ProductDetail({ productId }) {
 *   // First query: Get product
 *   const { data: product } = useQuery({
 *     queryKey: ['product', productId],
 *     queryFn: () => getProductById(productId)
 *   });
 *   
 *   // Second query: Get active session (only runs after product is loaded)
 *   const { data: session } = useQuery({
 *     queryKey: ['group-session', productId],
 *     queryFn: () => getActiveGroupSession(productId),
 *     enabled: !!product // Only run if product exists
 *   });
 *   
 *   return <div>...</div>;
 * }
 */  /**
 * Example 7: Infinite scroll with useInfiniteQuery
 * 
 * import { useInfiniteQuery } from '@tanstack/react-query';
 * import { getProducts } from '@/lib/api/products';
 * 
 * function InfiniteProductList() {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage
 *   } = useInfiniteQuery({
 *     queryKey: ['products', 'infinite'],
 *     queryFn: ({ pageParam = 1 }) => getProducts({ page: pageParam }),
 *     getNextPageParam: (lastPage) => {
 *       const { page, total_pages } = lastPage.pagination;
 *       return page < total_pages ? page + 1 : undefined;
 *     },
 *     initialPageParam: 1
 *   });
 *   
 *   return (
 *     <div>
 *       {data?.pages.map((page) =>
 *         page.data.map((product) => (
 *           <ProductCard key={product.id} product={product} />
 *         ))
 *       )}
 *       
 *       {hasNextPage && (
 *         <button onClick={() => fetchNextPage()}>
 *           {isFetchingNextPage ? 'Loading...' : 'Load More'}
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 */ 
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/apps/customer-web/lib/store/cart.store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "useCartActions",
    ()=>useCartActions,
    "useCartCount",
    ()=>useCartCount,
    "useCartFactories",
    ()=>useCartFactories,
    "useCartItems",
    ()=>useCartItems,
    "useCartItemsByFactory",
    ()=>useCartItemsByFactory,
    "useCartStore",
    ()=>useCartStore,
    "useCartSubtotal",
    ()=>useCartSubtotal,
    "useHasGroupBuyingItems",
    ()=>useHasGroupBuyingItems,
    "useIsCartEmpty",
    ()=>useIsCartEmpty,
    "useIsInCart",
    ()=>useIsInCart,
    "useIsSingleFactoryCart",
    ()=>useIsSingleFactoryCart,
    "useProductQuantity",
    ()=>useProductQuantity,
    "useValidateCart",
    ()=>useValidateCart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zustand$40$5$2e$0$2e$8_$40$types$2b$react$40$19$2e$2$2e$0_react$40$19$2e$1$2e$0$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zustand@5.0.8_@types+react@19.2.0_react@19.1.0/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zustand$40$5$2e$0$2e$8_$40$types$2b$react$40$19$2e$2$2e$0_react$40$19$2e$1$2e$0$2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zustand@5.0.8_@types+react@19.2.0_react@19.1.0/node_modules/zustand/esm/middleware.mjs [app-ssr] (ecmascript)");
;
;
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate unique key for cart item
 * Includes variant to allow same product with different variants
 */ const getItemKey = (productId, variantId)=>{
    return variantId ? `${productId}-${variantId}` : productId;
};
/**
 * Calculate price for a cart item
 * Considers variant price adjustments
 */ const getItemPrice = (product, variant)=>{
    const basePrice = product.base_price;
    const adjustment = variant?.price_adjustment || 0;
    return basePrice + adjustment;
};
const useCartStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zustand$40$5$2e$0$2e$8_$40$types$2b$react$40$19$2e$2$2e$0_react$40$19$2e$1$2e$0$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])()((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zustand$40$5$2e$0$2e$8_$40$types$2b$react$40$19$2e$2$2e$0_react$40$19$2e$1$2e$0$2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persist"])((set, get)=>({
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
       */ addItem: (product, quantity, variant, groupSession)=>{
            const items = get().items;
            const itemKey = getItemKey(product.id, variant?.id);
            // Check if item already exists in cart
            const existingItemIndex = items.findIndex((item)=>{
                const existingKey = getItemKey(item.product.id, item.variant?.id);
                return existingKey === itemKey;
            });
            if (existingItemIndex !== -1) {
                // Item exists, update quantity
                const updatedItems = [
                    ...items
                ];
                updatedItems[existingItemIndex] = {
                    ...updatedItems[existingItemIndex],
                    quantity: updatedItems[existingItemIndex].quantity + quantity
                };
                set({
                    items: updatedItems
                });
            } else {
                // New item, add to cart
                const newItem = {
                    product,
                    variant,
                    quantity,
                    group_session: groupSession
                };
                set({
                    items: [
                        ...items,
                        newItem
                    ]
                });
            }
        },
        /**
       * Remove item from cart completely
       * 
       * @param productId - Product ID to remove
       * @param variantId - Variant ID (optional)
       */ removeItem: (productId, variantId)=>{
            const items = get().items;
            const itemKey = getItemKey(productId, variantId);
            const updatedItems = items.filter((item)=>{
                const existingKey = getItemKey(item.product.id, item.variant?.id);
                return existingKey !== itemKey;
            });
            set({
                items: updatedItems
            });
        },
        /**
       * Update quantity of an existing item
       * If quantity is 0 or negative, removes the item
       * 
       * @param productId - Product ID
       * @param quantity - New quantity
       * @param variantId - Variant ID (optional)
       */ updateQuantity: (productId, quantity, variantId)=>{
            const items = get().items;
            const itemKey = getItemKey(productId, variantId);
            if (quantity <= 0) {
                // Remove item if quantity is 0 or negative
                get().removeItem(productId, variantId);
                return;
            }
            const updatedItems = items.map((item)=>{
                const existingKey = getItemKey(item.product.id, item.variant?.id);
                if (existingKey === itemKey) {
                    return {
                        ...item,
                        quantity
                    };
                }
                return item;
            });
            set({
                items: updatedItems
            });
        },
        /**
       * Clear all items from cart
       * Used after successful checkout
       */ clearCart: ()=>{
            set({
                items: []
            });
        },
        // ============================================================================
        // COMPUTED GETTERS
        // ============================================================================
        /**
       * Get total number of items in cart (sum of quantities)
       */ getTotalItems: ()=>{
            const items = get().items;
            return items.reduce((total, item)=>total + item.quantity, 0);
        },
        /**
       * Calculate cart subtotal (before shipping/tax)
       */ getSubtotal: ()=>{
            const items = get().items;
            return items.reduce((total, item)=>{
                const price = getItemPrice(item.product, item.variant);
                return total + price * item.quantity;
            }, 0);
        },
        /**
       * Get quantity of a specific item in cart
       * Returns 0 if item not in cart
       */ getItemCount: (productId, variantId)=>{
            const items = get().items;
            const itemKey = getItemKey(productId, variantId);
            const item = items.find((item)=>{
                const existingKey = getItemKey(item.product.id, item.variant?.id);
                return existingKey === itemKey;
            });
            return item?.quantity || 0;
        },
        /**
       * Check if a specific item is in cart
       */ hasItem: (productId, variantId)=>{
            return get().getItemCount(productId, variantId) > 0;
        }
    }), // ============================================================================
// PERSISTENCE CONFIGURATION
// ============================================================================
{
    name: 'cart-storage',
    storage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zustand$40$5$2e$0$2e$8_$40$types$2b$react$40$19$2e$2$2e$0_react$40$19$2e$1$2e$0$2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createJSONStorage"])(()=>localStorage),
    /**
       * Only persist items array
       * Computed values are derived on-demand
       */ partialize: (state)=>({
            items: state.items
        })
}));
const useCartItems = ()=>useCartStore((state)=>state.items);
const useCartCount = ()=>{
    const getTotalItems = useCartStore((state)=>state.getTotalItems);
    return getTotalItems();
};
const useCartSubtotal = ()=>{
    const getSubtotal = useCartStore((state)=>state.getSubtotal);
    return getSubtotal();
};
const useCartActions = ()=>useCartStore((state)=>({
            addItem: state.addItem,
            removeItem: state.removeItem,
            updateQuantity: state.updateQuantity,
            clearCart: state.clearCart
        }));
const useIsInCart = (productId, variantId)=>{
    const hasItem = useCartStore((state)=>state.hasItem);
    return hasItem(productId, variantId);
};
const useProductQuantity = (productId, variantId)=>{
    const getItemCount = useCartStore((state)=>state.getItemCount);
    return getItemCount(productId, variantId);
};
const useIsCartEmpty = ()=>{
    const items = useCartItems();
    return items.length === 0;
};
const useCartFactories = ()=>{
    const items = useCartItems();
    const factoryIds = items.map((item)=>item.product.factory_id);
    return [
        ...new Set(factoryIds)
    ];
};
const useIsSingleFactoryCart = ()=>{
    const factories = useCartFactories();
    return factories.length <= 1;
};
const useCartItemsByFactory = ()=>{
    const items = useCartItems();
    return items.reduce((grouped, item)=>{
        const factoryId = item.product.factory_id;
        if (!grouped[factoryId]) {
            grouped[factoryId] = [];
        }
        grouped[factoryId].push(item);
        return grouped;
    }, {});
};
const useHasGroupBuyingItems = ()=>{
    const items = useCartItems();
    return items.some((item)=>item.group_session !== undefined);
};
const useValidateCart = ()=>{
    const items = useCartItems();
    const errors = [];
    if (items.length === 0) {
        errors.push('Keranjang kosong');
        return errors;
    }
    // Check each item
    items.forEach((item)=>{
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
                errors.push(`${item.product.name} membutuhkan minimal ${item.product.min_order_quantity} unit`);
            }
        }
    });
    return errors;
};
const __TURBOPACK__default__export__ = useCartStore;
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
 */  /**
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
 */  /**
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
 */  /**
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
 */  /**
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
 */ }),
"[project]/apps/customer-web/components/layout/mobile-header.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MobileHeader",
    ()=>MobileHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$customer$2d$web$2f$lib$2f$store$2f$cart$2e$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/customer-web/lib/store/cart.store.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
function MobileHeader() {
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const cartCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$customer$2d$web$2f$lib$2f$store$2f$cart$2e$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCartCount"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "sticky top-0 z-50 bg-white border-b border-gray-200",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 px-3 py-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "flex-shrink-0",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm",
                            children: "BB"
                        }, void 0, false, {
                            fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                            lineNumber: 21,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                        lineNumber: 20,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "search",
                                placeholder: "搜索商品 (Cari Batik...)",
                                value: searchQuery,
                                onChange: (e)=>setSearchQuery(e.target.value),
                                className: "w-full h-9 pl-9 pr-3 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            }, void 0, false, {
                                fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                                lineNumber: 28,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                }, void 0, false, {
                                    fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                                    lineNumber: 41,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                                lineNumber: 35,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                        lineNumber: 27,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/cart",
                        className: "relative flex-shrink-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-6 h-6 text-gray-700",
                                fill: "none",
                                stroke: "currentColor",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 2,
                                    d: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                }, void 0, false, {
                                    fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                                    lineNumber: 58,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                                lineNumber: 52,
                                columnNumber: 11
                            }, this),
                            cartCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center",
                                children: cartCount > 99 ? '99+' : cartCount
                            }, void 0, false, {
                                fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                                lineNumber: 66,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CategoryTabs, {}, void 0, false, {
                fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
// ============================================================================
// CATEGORY TABS
// ============================================================================
function CategoryTabs() {
    const categories = [
        {
            id: 'all',
            name: '物品',
            icon: '🏠'
        },
        {
            id: 'new',
            name: '推荐',
            icon: '⭐'
        },
        {
            id: 'tulis',
            name: '手写',
            icon: '✍️'
        },
        {
            id: 'cap',
            name: '印章',
            icon: '🏷️'
        },
        {
            id: 'group',
            name: '团购',
            icon: '👥'
        },
        {
            id: 'sale',
            name: '特卖',
            icon: '🔥'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex overflow-x-auto scrollbar-hide border-t border-gray-100",
        children: categories.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                href: `/categories/${cat.id}`,
                className: "flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 min-w-[60px]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-xl",
                        children: cat.icon
                    }, void 0, false, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                        lineNumber: 101,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-xs text-gray-700 whitespace-nowrap",
                        children: cat.name
                    }, void 0, false, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                        lineNumber: 102,
                        columnNumber: 11
                    }, this)
                ]
            }, cat.id, true, {
                fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
                lineNumber: 96,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/apps/customer-web/components/layout/mobile-header.tsx",
        lineNumber: 94,
        columnNumber: 5
    }, this);
}
// Hide scrollbar
const styles = `
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}
}),
"[project]/apps/customer-web/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/utils.ts
__turbopack_context__.s([
    "cn",
    ()=>cn,
    "formatIndonesianDate",
    ()=>formatIndonesianDate,
    "formatRupiah",
    ()=>formatRupiah,
    "formatTimeRemaining",
    ()=>formatTimeRemaining
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$3$2e$1$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/tailwind-merge@3.3.1/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$3$2e$1$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}
function formatTimeRemaining(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}j ${minutes}m`; // j = jam (hours)
    }
    if (minutes > 0) {
        return `${minutes}m ${secs}d`; // d = detik (seconds)
    }
    return `${secs}d`;
}
function formatIndonesianDate(date) {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long'
    }).format(date);
}
}),
"[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MobileBottomNav",
    ()=>MobileBottomNav
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$customer$2d$web$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/customer-web/lib/utils.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
function MobileBottomNav() {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const navItems = [
        {
            href: '/',
            label: '首页',
            icon: (active)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$customer$2d$web$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('w-6 h-6', active ? 'text-red-500' : 'text-gray-600'),
                    fill: active ? 'currentColor' : 'none',
                    stroke: active ? 'none' : 'currentColor',
                    viewBox: "0 0 24 24",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 2,
                        d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    }, void 0, false, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                        lineNumber: 25,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                    lineNumber: 19,
                    columnNumber: 9
                }, this)
        },
        {
            href: '/group-buying',
            label: '团购',
            badge: 'HOT',
            icon: (active)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$customer$2d$web$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('w-6 h-6', active ? 'text-red-500' : 'text-gray-600'),
                    fill: active ? 'currentColor' : 'none',
                    stroke: active ? 'none' : 'currentColor',
                    viewBox: "0 0 24 24",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 2,
                        d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    }, void 0, false, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                        lineNumber: 45,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                    lineNumber: 39,
                    columnNumber: 9
                }, this)
        },
        {
            href: '/orders',
            label: '订单',
            icon: (active)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$customer$2d$web$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('w-6 h-6', active ? 'text-red-500' : 'text-gray-600'),
                    fill: active ? 'currentColor' : 'none',
                    stroke: active ? 'none' : 'currentColor',
                    viewBox: "0 0 24 24",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 2,
                        d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    }, void 0, false, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                        lineNumber: 64,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                    lineNumber: 58,
                    columnNumber: 9
                }, this)
        },
        {
            href: '/profile',
            label: '我的',
            icon: (active)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$customer$2d$web$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('w-6 h-6', active ? 'text-red-500' : 'text-gray-600'),
                    fill: active ? 'currentColor' : 'none',
                    stroke: active ? 'none' : 'currentColor',
                    viewBox: "0 0 24 24",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 2,
                        d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    }, void 0, false, {
                        fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                        lineNumber: 83,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                    lineNumber: 77,
                    columnNumber: 9
                }, this)
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        className: "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-around h-16",
            children: navItems.map((item)=>{
                const isActive = pathname === item.href;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    href: item.href,
                    className: "flex flex-col items-center justify-center flex-1 h-full relative",
                    children: [
                        item.badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "absolute top-1 right-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            children: item.badge
                        }, void 0, false, {
                            fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                            lineNumber: 108,
                            columnNumber: 17
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-0.5",
                            children: item.icon(isActive)
                        }, void 0, false, {
                            fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                            lineNumber: 114,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$customer$2d$web$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('text-xs font-medium', isActive ? 'text-red-500' : 'text-gray-600'),
                            children: item.label
                        }, void 0, false, {
                            fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                            lineNumber: 119,
                            columnNumber: 15
                        }, this)
                    ]
                }, item.href, true, {
                    fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
                    lineNumber: 101,
                    columnNumber: 13
                }, this);
            })
        }, void 0, false, {
            fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
            lineNumber: 96,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/customer-web/components/layout/mobile-bottom-nav.tsx",
        lineNumber: 95,
        columnNumber: 5
    }, this);
}
// Add safe area padding for iOS devices
const styles = `
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom);
}
`;
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__083cd077._.js.map