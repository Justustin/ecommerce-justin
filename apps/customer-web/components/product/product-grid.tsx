'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
// Update the import path if the alias is not configured or the file is elsewhere
import { getProducts } from '../../lib/api/products';
import type { ProductFilters, Product } from '@/types';
import { ProductCard, ProductCardSkeleton } from './product-card';
import { Button } from '@/components/ui/button';

// ============================================================================
// PRODUCT GRID PROPS
// ============================================================================

interface ProductGridProps {
  filters?: ProductFilters;
  initialProducts?: Product[];
  showGroupBuyingOnly?: boolean;
  itemsPerPage?: number;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  emptyMessage?: string;
  showLoadMore?: boolean;
}

// ============================================================================
// PRODUCT GRID COMPONENT
// ============================================================================

/**
 * ProductGrid - Responsive grid of products with React Query
 * 
 * Features:
 * - Fetches products using React Query
 * - Responsive grid layout (2-4 columns)
 * - Loading skeletons
 * - Empty state
 * - Error handling
 * - Pagination with "Load More" button
 * - Optimistic updates
 */
export const ProductGrid: React.FC<ProductGridProps> = ({
  filters = {},
  initialProducts,
  showGroupBuyingOnly = false,
  itemsPerPage = 12,
  columns = {
    mobile: 2,
    tablet: 3,
    desktop: 4,
  },
  emptyMessage = 'Belum ada produk tersedia',
  showLoadMore = true,
}) => {
  const [page, setPage] = React.useState(1);

  // Merge filters with pagination
  const queryFilters: ProductFilters = {
    ...filters,
    has_active_group: showGroupBuyingOnly || filters.has_active_group,
    page,
    limit: itemsPerPage,
  };

  // Fetch products with React Query
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['products', queryFilters],
    queryFn: () => getProducts(queryFilters),
    placeholderData: initialProducts ? {
      success: true,
      data: initialProducts,
      pagination: {
        page: 1,
        limit: itemsPerPage,
        total: initialProducts.length,
        total_pages: 1,
      },
    } : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const products = data?.data || [];
  const pagination = data?.pagination;
  const hasNextPage = pagination ? pagination.page < pagination.total_pages : false;

  // Grid column classes
  const gridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  const gridClass = [
    gridCols[columns.mobile || 2],
    `md:${gridCols[columns.tablet || 3]}`,
    `lg:${gridCols[columns.desktop || 4]}`,
  ].join(' ');

  // Handle load more
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [JSON.stringify(filters)]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <div className={`grid ${gridClass} gap-4 md:gap-6`}>
        {Array.from({ length: itemsPerPage }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center max-w-md">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Gagal Memuat Produk
          </h3>
          <p className="text-gray-600 mb-6">
            {(error as any)?.message || 'Terjadi kesalahan saat memuat produk. Silakan coba lagi.'}
          </p>

          <Button
            onClick={() => window.location.reload()}
            variant="primary"
            size="md"
          >
            Muat Ulang
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // EMPTY STATE
  // ============================================================================

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center max-w-md">
          {/* Empty Icon */}
          <div className="mx-auto w-20 h-20 mb-4 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Produk Tidak Ditemukan
          </h3>
          <p className="text-gray-600">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SUCCESS STATE - SHOW PRODUCTS
  // ============================================================================

  return (
    <div className="space-y-8">
      {/* Product Grid */}
      <div className={`grid ${gridClass} gap-4 md:gap-6`}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showGroupBuying={showGroupBuyingOnly}
          />
        ))}
      </div>

      {/* Load More Button */}
      {showLoadMore && hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            isLoading={isFetching}
            disabled={isFetching}
          >
            {isFetching ? 'Memuat...' : 'Muat Lebih Banyak'}
          </Button>
        </div>
      )}

      {/* Pagination Info */}
      {pagination && (
        <div className="text-center text-sm text-gray-500">
          Menampilkan {products.length} dari {pagination.total} produk
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FEATURED PRODUCTS SECTION
// ============================================================================

interface FeaturedProductsProps {
  title?: string;
  subtitle?: string;
  limit?: number;
}

/**
 * FeaturedProducts - Section for homepage with title
 */
export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  title = 'Produk Pilihan',
  subtitle = 'Produk terpopuler dengan harga terbaik',
  limit = 8,
}) => {
  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-gray-600">{subtitle}</p>
          )}
        </div>

        {/* Products Grid */}
        <ProductGrid
          itemsPerPage={limit}
          showLoadMore={false}
        />
      </div>
    </section>
  );
};

// ============================================================================
// GROUP BUYING SECTION
// ============================================================================

/**
 * GroupBuyingSection - Special section for active group buying
 */
export const GroupBuyingSection: React.FC = () => {
  return (
    <section className="py-8 md:py-12 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full font-bold text-lg mb-4">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            GRUP BELI AKTIF
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Gabung Sekarang, Hemat Lebih Banyak!
          </h2>
          <p className="text-gray-600">
            Bergabunglah dengan grup pembelian untuk mendapatkan harga termurah
          </p>
        </div>

        {/* Products Grid - Only show active group buying */}
        <ProductGrid
          showGroupBuyingOnly={true}
          itemsPerPage={8}
        />
      </div>
    </section>
  );
};

// ============================================================================
// CATEGORY SECTION
// ============================================================================

interface CategoryProductsProps {
  categoryId: string;
  categoryName: string;
  limit?: number;
}

/**
 * CategoryProducts - Products filtered by category
 */
export const CategoryProducts: React.FC<CategoryProductsProps> = ({
  categoryId,
  categoryName,
  limit = 8,
}) => {
  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            {categoryName}
          </h2>
          <a
            href={`/categories/${categoryId}`}
            className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
          >
            Lihat Semua
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Products Grid */}
        <ProductGrid
          filters={{ category_id: categoryId }}
          itemsPerPage={limit}
          showLoadMore={false}
        />
      </div>
    </section>
  );
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Basic product grid
 * 
 * <ProductGrid />
 */

/**
 * Example 2: Grid with filters
 * 
 * <ProductGrid
 *   filters={{
 *     category_id: 'batik-tulis',
 *     min_price: 50000,
 *     max_price: 200000,
 *     sort_by: 'price_asc'
 *   }}
 * />
 */

/**
 * Example 3: Only group buying products
 * 
 * <ProductGrid showGroupBuyingOnly={true} />
 */

/**
 * Example 4: Featured products section on homepage
 * 
 * <FeaturedProducts
 *   title="Batik Terpopuler"
 *   subtitle="Produk batik pilihan dengan kualitas terbaik"
 *   limit={12}
 * />
 */

/**
 * Example 5: Group buying section
 * 
 * <GroupBuyingSection />
 */

/**
 * Example 6: Category-specific products
 * 
 * <CategoryProducts
 *   categoryId="batik-cap"
 *   categoryName="Batik Cap"
 *   limit={8}
 * />
 */

/**
 * Example 7: Custom grid columns
 * 
 * <ProductGrid
 *   columns={{
 *     mobile: 1,
 *     tablet: 2,
 *     desktop: 3
 *   }}
 * />
 */