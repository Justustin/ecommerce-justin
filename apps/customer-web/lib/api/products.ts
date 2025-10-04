import apiClient from './client';
import type {
  Product,
  Category,
  ProductFilters,
  PaginatedResponse,
  ApiResponse,
  GroupBuyingSession,
  JoinGroupFormData,
  ProductReview,
} from '@/types';

// ============================================================================
// PRODUCT ENDPOINTS
// ============================================================================

/**
 * Get list of products with optional filters
 * Supports pagination, search, category filter, price range, etc.
 * 
 * @param filters - ProductFilters object
 * @returns Paginated list of products
 */
export const getProducts = async (
  filters: ProductFilters = {}
): Promise<PaginatedResponse<Product>> => {
  const params = new URLSearchParams();
  
  // Add filters to query params
  if (filters.category_id) params.append('category_id', filters.category_id);
  if (filters.min_price) params.append('min_price', filters.min_price.toString());
  if (filters.max_price) params.append('max_price', filters.max_price.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.factory_id) params.append('factory_id', filters.factory_id);
  if (filters.has_active_group !== undefined) {
    params.append('has_active_group', filters.has_active_group.toString());
  }
  if (filters.search) params.append('search', filters.search);
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  
  // Pagination
  params.append('page', (filters.page || 1).toString());
  params.append('limit', (filters.limit || 20).toString());
  
  const response = await apiClient.get(`/products?${params.toString()}`);
  return response.data;
};

/**
 * Get single product by ID
 * Includes all relations: category, factory, images, variants, active_session, reviews
 * 
 * @param id - Product UUID
 * @returns Product with full details
 */
export const getProductById = async (id: string): Promise<ApiResponse<Product>> => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

/**
 * Get single product by slug (for SEO-friendly URLs)
 * Example: /products/batik-tulis-pekalongan-merah
 * 
 * @param slug - Product URL slug
 * @returns Product with full details
 */
export const getProductBySlug = async (slug: string): Promise<ApiResponse<Product>> => {
  const response = await apiClient.get(`/products/slug/${slug}`);
  return response.data;
};

/**
 * Search products by name or description
 * Full-text search implementation
 * 
 * @param query - Search query string
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 20)
 * @returns Paginated search results
 */
export const searchProducts = async (
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Product>> => {
  return getProducts({ search: query, page, limit });
};

/**
 * Get products from a specific factory
 * Useful for "More from this factory" sections
 * 
 * @param factoryId - Factory UUID
 * @param page - Page number
 * @param limit - Items per page
 * @returns Paginated list of products
 */
export const getProductsByFactory = async (
  factoryId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Product>> => {
  return getProducts({ factory_id: factoryId, page, limit });
};

/**
 * Get featured/trending products for homepage
 * Products with active group buying sessions, sorted by popularity
 * 
 * @param limit - Number of products to return (default: 10)
 * @returns List of featured products
 */
export const getFeaturedProducts = async (
  limit: number = 10
): Promise<ApiResponse<Product[]>> => {
  const response = await apiClient.get(`/products/featured?limit=${limit}`);
  return response.data;
};

// ============================================================================
// CATEGORY ENDPOINTS
// ============================================================================

/**
 * Get all product categories
 * Returns hierarchical structure (parent and child categories)
 * 
 * @returns List of categories
 */
export const getCategories = async (): Promise<ApiResponse<Category[]>> => {
  const response = await apiClient.get('/categories');
  return response.data;
};

/**
 * Get single category by ID
 * 
 * @param id - Category UUID
 * @returns Category details
 */
export const getCategoryById = async (id: string): Promise<ApiResponse<Category>> => {
  const response = await apiClient.get(`/categories/${id}`);
  return response.data;
};

/**
 * Get category by slug
 * Example: /categories/batik-tulis
 * 
 * @param slug - Category slug
 * @returns Category details
 */
export const getCategoryBySlug = async (slug: string): Promise<ApiResponse<Category>> => {
  const response = await apiClient.get(`/categories/slug/${slug}`);
  return response.data;
};

// ============================================================================
// GROUP BUYING SESSION ENDPOINTS
// ============================================================================

/**
 * Get active group buying session for a product
 * Returns null if no active session exists
 * 
 * @param productId - Product UUID
 * @returns Active group buying session or null
 */
export const getActiveGroupSession = async (
  productId: string
): Promise<ApiResponse<GroupBuyingSession | null>> => {
  const response = await apiClient.get(`/products/${productId}/active-session`);
  return response.data;
};

/**
 * Get group buying session details by ID
 * Includes participants list and progress
 * 
 * @param sessionId - Session UUID
 * @returns Group buying session with participants
 */
export const getGroupSessionById = async (
  sessionId: string
): Promise<ApiResponse<GroupBuyingSession>> => {
  const response = await apiClient.get(`/group-sessions/${sessionId}`);
  return response.data;
};

/**
 * Join a group buying session
 * Creates a group participant entry and reserves stock
 * 
 * @param sessionId - Session UUID
 * @param data - Join group form data (quantity, variant)
 * @returns Updated group session with participant info
 */
export const joinGroupSession = async (
  sessionId: string,
  data: JoinGroupFormData
): Promise<ApiResponse<GroupBuyingSession>> => {
  const response = await apiClient.post(`/group-sessions/${sessionId}/join`, {
    quantity: data.quantity,
    variant_id: data.variant_id,
  });
  return response.data;
};

/**
 * Leave a group buying session (before payment)
 * Only allowed if order hasn't been paid yet
 * 
 * @param sessionId - Session UUID
 * @returns Success response
 */
export const leaveGroupSession = async (
  sessionId: string
): Promise<ApiResponse<void>> => {
  const response = await apiClient.post(`/group-sessions/${sessionId}/leave`);
  return response.data;
};

/**
 * Get all active group buying sessions
 * For "Join a Group" or "Active Groups" page
 * 
 * @param page - Page number
 * @param limit - Items per page
 * @returns Paginated list of active group sessions
 */
export const getActiveGroupSessions = async (
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<GroupBuyingSession>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  const response = await apiClient.get(`/group-sessions/active?${params.toString()}`);
  return response.data;
};

// ============================================================================
// PRODUCT REVIEW ENDPOINTS
// ============================================================================

/**
 * Get reviews for a product
 * 
 * @param productId - Product UUID
 * @param page - Page number
 * @param limit - Items per page
 * @returns Paginated list of reviews
 */
export const getProductReviews = async (
  productId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<ProductReview>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  const response = await apiClient.get(`/products/${productId}/reviews?${params.toString()}`);
  return response.data;
};

/**
 * Submit a product review
 * Only allowed after order is delivered
 * 
 * @param orderItemId - Order item UUID
 * @param data - Review data (rating, comment, photos)
 * @returns Created review
 */
export const submitProductReview = async (
  orderItemId: string,
  data: FormData
): Promise<ApiResponse<ProductReview>> => {
  // Use FormData for file uploads (photos/videos)
  const response = await apiClient.post(`/reviews/product/${orderItemId}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate time remaining for a group buying session
 * Returns formatted string like "3j 45m" or "EXPIRED"
 * 
 * @param endTime - Session end time (ISO string)
 * @returns Formatted time remaining
 */
export const calculateTimeRemaining = (endTime: string): string => {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const diff = end - now;
  
  if (diff <= 0) {
    return 'EXPIRED';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}h ${hours % 24}j`;
  }
  
  return `${hours}j ${minutes}m`;
};

/**
 * Calculate group buying progress percentage
 * 
 * @param currentQuantity - Current number of participants
 * @param targetMoq - Minimum order quantity target
 * @returns Percentage (0-100)
 */
export const calculateProgress = (
  currentQuantity: number,
  targetMoq: number
): number => {
  return Math.min(Math.round((currentQuantity / targetMoq) * 100), 100);
};

/**
 * Check if a group buying session is still open for joining
 * 
 * @param session - Group buying session
 * @returns true if can still join
 */
export const canJoinSession = (session: GroupBuyingSession): boolean => {
  const now = new Date().getTime();
  const end = new Date(session.end_time).getTime();
  
  return (
    session.status === 'forming' &&
    now < end &&
    (session.current_quantity || 0) < session.target_moq
  );
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  // Products
  getProducts,
  getProductById,
  getProductBySlug,
  searchProducts,
  getProductsByFactory,
  getFeaturedProducts,
  
  // Categories
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  
  // Group Buying
  getActiveGroupSession,
  getGroupSessionById,
  joinGroupSession,
  leaveGroupSession,
  getActiveGroupSessions,
  
  // Reviews
  getProductReviews,
  submitProductReview,
  
  // Utilities
  calculateTimeRemaining,
  calculateProgress,
  canJoinSession,
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Fetch products for homepage with React Query
 * 
 * import { useQuery } from '@tanstack/react-query';
 * import { getProducts } from '@/lib/api/products';
 * 
 * const { data, isLoading } = useQuery({
 *   queryKey: ['products', { has_active_group: true }],
 *   queryFn: () => getProducts({ has_active_group: true, limit: 12 })
 * });
 */

/**
 * Example 2: Join a group buying session with mutation
 * 
 * import { useMutation } from '@tanstack/react-query';
 * import { joinGroupSession } from '@/lib/api/products';
 * 
 * const { mutate, isPending } = useMutation({
 *   mutationFn: (data: JoinGroupFormData) => 
 *     joinGroupSession(data.session_id, data),
 *   onSuccess: () => {
 *     toast.success('Berhasil bergabung dengan grup!');
 *     router.push('/checkout');
 *   }
 * });
 */

/**
 * Example 3: Search products with debouncing
 * 
 * import { useQuery } from '@tanstack/react-query';
 * import { searchProducts } from '@/lib/api/products';
 * import { useState, useEffect } from 'react';
 * 
 * const [searchQuery, setSearchQuery] = useState('');
 * const [debouncedQuery, setDebouncedQuery] = useState('');
 * 
 * useEffect(() => {
 *   const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
 *   return () => clearTimeout(timer);
 * }, [searchQuery]);
 * 
 * const { data } = useQuery({
 *   queryKey: ['products', 'search', debouncedQuery],
 *   queryFn: () => searchProducts(debouncedQuery),
 *   enabled: debouncedQuery.length > 2
 * });
 */