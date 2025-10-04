import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// BUTTON VARIANTS - Pinduoduo-inspired design
// ============================================================================

const buttonVariants = {
  variant: {
    // Primary: Bold gradient (Pinduoduo's signature red-orange gradient)
    primary: 
      'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg ' +
      'hover:from-red-600 hover:to-orange-600 active:scale-95 ' +
      'disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed',
    
    // Group: Special gradient for group buying actions (purple-pink for excitement)
    group: 
      'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg ' +
      'hover:from-purple-600 hover:to-pink-600 active:scale-95 ' +
      'animate-pulse disabled:from-gray-300 disabled:to-gray-400 disabled:animate-none',
    
    // Success: Green gradient for completed actions
    success: 
      'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg ' +
      'hover:from-green-600 hover:to-emerald-600 active:scale-95',
    
    // Secondary: Lighter, less prominent
    secondary: 
      'bg-gradient-to-r from-orange-100 to-red-100 text-red-600 border border-red-200 ' +
      'hover:from-orange-200 hover:to-red-200 active:scale-95',
    
    // Outline: Bordered style
    outline: 
      'bg-white text-red-500 border-2 border-red-500 ' +
      'hover:bg-red-50 active:scale-95',
    
    // Ghost: Minimal style
    ghost: 
      'bg-transparent text-gray-700 hover:bg-gray-100 active:scale-95',
    
    // Link: Text-only style
    link: 
      'bg-transparent text-red-500 underline-offset-4 hover:underline',
  },
  
  size: {
    sm: 'h-9 px-4 text-sm rounded-lg',
    md: 'h-11 px-6 text-base rounded-xl',
    lg: 'h-14 px-8 text-lg rounded-2xl font-semibold',
    xl: 'h-16 px-10 text-xl rounded-2xl font-bold', // Extra large for main CTAs
  },
  
  fullWidth: {
    true: 'w-full',
    false: 'w-auto',
  },
};

// ============================================================================
// BUTTON PROPS INTERFACE
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

/**
 * Pinduoduo-inspired Button Component
 * 
 * Features:
 * - Bold gradients for primary actions
 * - Special "group" variant for group buying
 * - Loading states with spinner
 * - Icon support (left/right)
 * - Scale animation on click
 * - Multiple sizes
 * - Full width option
 * 
 * @example
 * <Button variant="primary" size="lg" fullWidth>
 *   Gabung Grup Sekarang!
 * </Button>
 * 
 * @example
 * <Button variant="group" leftIcon={<UsersIcon />}>
 *   32 orang sudah gabung
 * </Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
          
          // Variant styles
          buttonVariants.variant[variant],
          
          // Size styles
          buttonVariants.size[size],
          
          // Full width
          fullWidth && buttonVariants.fullWidth.true,
          
          // Custom className
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {/* Left icon */}
        {!isLoading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* Button text */}
        <span>{children}</span>
        
        {/* Right icon */}
        {rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// SPECIALIZED BUTTON COMPONENTS
// ============================================================================

/**
 * GroupBuyButton - Special button for joining group buying sessions
 * Includes participant count and urgency styling
 */
export const GroupBuyButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'variant'> & { participantCount?: number }
>(({ participantCount, children, ...props }, ref) => {
  return (
    <Button ref={ref} variant="group" {...props}>
      {participantCount !== undefined && (
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
          {participantCount} orang
        </span>
      )}
      {children}
    </Button>
  );
});

GroupBuyButton.displayName = 'GroupBuyButton';

/**
 * AddToCartButton - Specialized button for add to cart actions
 */
export const AddToCartButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'variant' | 'leftIcon'>
>((props, ref) => {
  return (
    <Button
      ref={ref}
      variant="primary"
      leftIcon={
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      }
      {...props}
    />
  );
});

AddToCartButton.displayName = 'AddToCartButton';

/**
 * CheckoutButton - Large, prominent button for checkout
 */
export const CheckoutButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'>
>((props, ref) => {
  return (
    <Button
      ref={ref}
      variant="primary"
      size="xl"
      fullWidth
      {...props}
    />
  );
});

CheckoutButton.displayName = 'CheckoutButton';

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Primary CTA button
 * 
 * <Button variant="primary" size="lg" fullWidth>
 *   Daftar Sekarang - Gratis!
 * </Button>
 */

/**
 * Example 2: Group buying button with participant count
 * 
 * <GroupBuyButton 
 *   participantCount={32}
 *   onClick={handleJoinGroup}
 *   isLoading={isJoining}
 * >
 *   Gabung Grup
 * </GroupBuyButton>
 */

/**
 * Example 3: Add to cart button
 * 
 * <AddToCartButton
 *   onClick={handleAddToCart}
 *   isLoading={isAdding}
 * >
 *   Tambah ke Keranjang
 * </AddToCartButton>
 */

/**
 * Example 4: Button with icons
 * 
 * <Button 
 *   variant="secondary"
 *   leftIcon={<ShareIcon />}
 *   rightIcon={<ChevronRightIcon />}
 * >
 *   Bagikan ke Teman
 * </Button>
 */

/**
 * Example 5: Success state button
 * 
 * <Button variant="success" disabled>
 *   <CheckIcon className="w-5 h-5" />
 *   Sudah Bergabung
 * </Button>
 */

/**
 * Example 6: Checkout button (specialized)
 * 
 * <CheckoutButton onClick={handleCheckout}>
 *   Bayar Sekarang - Rp {total.toLocaleString()}
 * </CheckoutButton>
 */