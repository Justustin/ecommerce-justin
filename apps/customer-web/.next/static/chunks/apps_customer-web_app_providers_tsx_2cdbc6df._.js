(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/customer-web/app/providers.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$query$2d$core$40$5$2e$90$2e$2$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@tanstack+query-core@5.90.2/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$react$2d$query$40$5$2e$90$2e$2_react$40$19$2e$1$2e$0$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@tanstack+react-query@5.90.2_react@19.1.0/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$react$2d$query$2d$devto_30d81ff8362fc1e83f75504da4a92e31$2f$node_modules$2f40$tanstack$2f$react$2d$query$2d$devtools$2f$build$2f$modern$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@tanstack+react-query-devto_30d81ff8362fc1e83f75504da4a92e31/node_modules/@tanstack/react-query-devtools/build/modern/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.4_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
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
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$query$2d$core$40$5$2e$90$2e$2$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
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
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        // Browser: reuse existing client
        if (!browserQueryClient) {
            browserQueryClient = makeQueryClient();
        }
        return browserQueryClient;
    }
}
function Providers(param) {
    let { children } = param;
    _s();
    /**
   * Use useState to ensure client is created only once per component mount
   * This prevents hydration issues in Next.js 14
   */ const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "Providers.useState": ()=>getQueryClient()
    }["Providers.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$react$2d$query$40$5$2e$90$2e$2_react$40$19$2e$1$2e$0$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: [
            children,
            ("TURBOPACK compile-time value", "development") === 'development' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$4_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$tanstack$2b$react$2d$query$2d$devto_30d81ff8362fc1e83f75504da4a92e31$2f$node_modules$2f40$tanstack$2f$react$2d$query$2d$devtools$2f$build$2f$modern$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ReactQueryDevtools"], {
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
_s(Providers, "xWzZ3DtKXbYlVX/K0rEF3F2kgkk=");
_c = Providers;
var _c;
__turbopack_context__.k.register(_c, "Providers");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_customer-web_app_providers_tsx_2cdbc6df._.js.map