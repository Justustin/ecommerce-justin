'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Product, GroupBuyingSession } from '@/types';
import {
  Card,
  CardContent,
  Badge,
  DiscountBadge,
  PriceDisplay,
  GroupProgress,
  Countdown,
  SocialProof,
} from '@/components/ui/card';
import { Button, GroupBuyButton, AddToCartButton } from '@/components/ui/button';
import { useCartActions } from '@/lib/store/cart.store';

// ============================================================================
// PRODUCT CARD PROPS
// ============================================================================

interface ProductCardProps {
  product: Product;
  showGroupBuying?: boolean;
  className?: string;
  onAddToCart?: (product: Product) => void;
  onJoinGroup?: (product: Product, session: GroupBuyingSession) => void;
}

// ============================================================================
// PRODUCT CARD COMPONENT
// ============================================================================

/**
 * ProductCard - Complete Pinduoduo-style product card
 * 
 * Features:
 * - Product image with hover zoom
 * - Discount badge
 * - Category/feature badges
 * - Prominent pricing
 * - Group buying progress (if active session)
 * - Countdown timer
 * - Social proof (participants, reviews, sold count)
 * - CTA buttons (Add to Cart or Join Group)
 * - Click to product detail page
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  showGroupBuying = true,
  className,
  onAddToCart,
  onJoinGroup,
}) => {
  const { addItem } = useCartActions();
  const [isImageLoaded, setIsImageLoaded] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);

  // Get active group buying session
  const activeSession = showGroupBuying ? product.active_session : undefined;
  const hasActiveGroup = !!activeSession;

  // Calculate discount percentage
  const discountPercent = product.cost_price && product.cost_price > product.base_price
    ? Math.round(((product.cost_price - product.base_price) / product.cost_price) * 100)
    : 0;

  // Mobile-optimized: smaller, denser card

  // Handle add to cart
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    
    setIsAdding(true);
    try {
      if (onAddToCart) {
        onAddToCart(product);
      } else {
        addItem(product, 1, undefined, activeSession);
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Handle join group
  const handleJoinGroup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (activeSession && onJoinGroup) {
      onJoinGroup(product, activeSession);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="block">
      <Card className={cn('group cursor-pointer overflow-hidden', className)}>
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {/* Discount Badge */}
          {discountPercent > 0 && <DiscountBadge percent={discountPercent} />}

          {/* Product Image with zoom effect */}
          <Image
            src={product.primary_image_url || '/placeholder-product.jpg'}
            alt={product.name}
            fill
            className={cn(
              'object-cover transition-all duration-500',
              'group-hover:scale-110',
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setIsImageLoaded(true)}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />

          {/* Loading skeleton */}
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
          )}

          {/* Badges overlay at bottom */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
            {hasActiveGroup && <Badge variant="group">GRUP BELI</Badge>}
            {product.status === 'active' && !hasActiveGroup && (
              <Badge variant="hot">READY STOCK</Badge>
            )}
            {product.published_at &&
              new Date(product.published_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                <Badge variant="new">BARU</Badge>
              )}
          </div>
        </div>

        {/* Product Info */}
        <CardContent className="space-y-3">
          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[3rem] group-hover:text-red-600 transition-colors">
            {product.name}
          </h3>

          {/* Factory Name */}
          {product.factory && (
            <p className="text-xs text-gray-500 truncate">
              {product.factory.factory_name}
            </p>
          )}

          {/* Group Buying Section */}
          {hasActiveGroup && activeSession && (
            <div className="space-y-2 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              {/* Progress Bar */}
              <GroupProgress
                current={activeSession.current_quantity || 0}
                target={activeSession.target_moq}
                showLabel={true}
              />

              {/* Countdown Timer */}
              <Countdown endTime={activeSession.end_time} />
            </div>
          )}

          {/* Price */}
          <div className="pt-2">
            <PriceDisplay
              price={hasActiveGroup ? activeSession!.group_price : product.base_price}
              originalPrice={product.cost_price}
              size="md"
            />
            {hasActiveGroup && (
              <p className="text-xs text-gray-500 mt-1">
                Harga normal: Rp {product.base_price.toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap gap-2">
            {hasActiveGroup && activeSession && activeSession.current_quantity && (
              <SocialProof
                type="participants"
                count={activeSession.current_quantity}
              />
            )}
            {product.total_reviews && product.total_reviews > 0 && (
              <SocialProof type="reviews" count={product.total_reviews} />
            )}
            {product.average_rating && (
              <div className="inline-flex items-center gap-1 text-xs text-yellow-600">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-semibold">{product.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* MOQ Info */}
          {product.min_order_quantity > 1 && (
            <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
              MOQ: {product.min_order_quantity} pcs
            </div>
          )}

          {/* CTA Buttons */}
          <div className="pt-2 space-y-2">
            {hasActiveGroup && activeSession ? (
              <GroupBuyButton
                participantCount={activeSession.current_quantity}
                onClick={handleJoinGroup}
                fullWidth
                size="md"
              >
                Gabung Grup
              </GroupBuyButton>
            ) : (
              <AddToCartButton
                onClick={handleAddToCart}
                isLoading={isAdding}
                fullWidth
                size="md"
              >
                {isAdding ? 'Menambahkan...' : 'Tambah ke Keranjang'}
              </AddToCartButton>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// ============================================================================
// COMPACT VARIANT - For lists/sidebars
// ============================================================================

interface ProductCardCompactProps {
  product: Product;
  onClick?: () => void;
}

/**
 * ProductCardCompact - Horizontal layout for lists
 */
export const ProductCardCompact: React.FC<ProductCardCompactProps> = ({
  product,
  onClick,
}) => {
  const discountPercent = product.cost_price && product.cost_price > product.base_price
    ? Math.round(((product.cost_price - product.base_price) / product.cost_price) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`} onClick={onClick}>
      <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex gap-3 p-3">
          {/* Image */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={product.primary_image_url || '/placeholder-product.jpg'}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="80px"
            />
            {discountPercent > 0 && (
              <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                -{discountPercent}%
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-2 group-hover:text-red-600 transition-colors">
              {product.name}
            </h4>
            <div className="mt-1">
              <PriceDisplay price={product.base_price} size="sm" />
            </div>
            {product.average_rating && (
              <div className="flex items-center gap-1 mt-1 text-xs text-yellow-600">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{product.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

// ============================================================================
// SKELETON LOADER
// ============================================================================

/**
 * ProductCardSkeleton - Loading placeholder
 */
export const ProductCardSkeleton: React.FC = () => {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <CardContent className="space-y-3">
        <div className="h-12 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-2/3" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
          <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
        </div>
        <div className="h-11 bg-gray-200 rounded-xl animate-pulse" />
      </CardContent>
    </Card>
  );
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Basic product card
 * 
 * <ProductCard product={product} />
 */

/**
 * Example 2: Product card with custom handlers
 * 
 * <ProductCard
 *   product={product}
 *   onAddToCart={(product) => {
 *     toast.success(`${product.name} ditambahkan ke keranjang!`);
 *   }}
 *   onJoinGroup={(product, session) => {
 *     router.push(`/group-buying/${session.id}`);
 *   }}
 * />
 */

/**
 * Example 3: Grid of products
 * 
 * <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 *   {products.map((product) => (
 *     <ProductCard key={product.id} product={product} />
 *   ))}
 * </div>
 */

/**
 * Example 4: Loading state
 * 
 * <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 *   {isLoading ? (
 *     Array.from({ length: 8 }).map((_, i) => (
 *       <ProductCardSkeleton key={i} />
 *     ))
 *   ) : (
 *     products.map((product) => (
 *       <ProductCard key={product.id} product={product} />
 *     ))
 *   )}
 * </div>
 */

/**
 * Example 5: Compact list view
 * 
 * <div className="space-y-3">
 *   {products.map((product) => (
 *     <ProductCardCompact key={product.id} product={product} />
 *   ))}
 * </div>
 */