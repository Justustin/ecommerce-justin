import * as React from 'react';
import { cn } from '../../lib/utils';

// ============================================================================
// BASE CARD COMPONENTS - Pinduoduo-inspired design
// ============================================================================

/**
 * Card - Base container with shadow and rounded corners
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl bg-white shadow-md hover:shadow-xl transition-shadow duration-300',
      'border border-gray-100',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

/**
 * CardHeader - Top section of card
 */
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-4 pb-0', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

/**
 * CardContent - Main content area
 */
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-4', className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

/**
 * CardFooter - Bottom section of card
 */
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-4 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// ============================================================================
// PINDUODUO-STYLE BADGES & TAGS
// ============================================================================

/**
 * Badge - Colorful label for product features
 */
export const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    variant?: 'hot' | 'new' | 'sale' | 'group' | 'moq' | 'default';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantStyles = {
    hot: 'bg-gradient-to-r from-red-500 to-orange-500 text-white',
    new: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
    sale: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
    group: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    moq: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900',
    default: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
        'shadow-sm',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';

/**
 * DiscountBadge - Shows discount percentage
 */
export const DiscountBadge: React.FC<{ percent: number }> = ({ percent }) => (
  <div className="absolute top-3 right-3 z-10">
    <div className="relative">
      <div className="bg-gradient-to-br from-red-500 to-red-600 text-white px-2 py-1 rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-xs font-medium leading-none">DISKON</div>
          <div className="text-lg font-bold leading-tight">{percent}%</div>
        </div>
      </div>
      {/* Small triangle pointer */}
      <div className="absolute -bottom-1 right-2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-red-600" />
    </div>
  </div>
);

// ============================================================================
// PRICE DISPLAY - Pinduoduo-style prominent pricing
// ============================================================================

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  showRp?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PriceDisplay - Prominent price with optional strikethrough original price
 */
export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  showRp = true,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-baseline gap-2">
      <div className={cn('font-bold text-red-600', sizeClasses[size])}>
        {showRp && <span className="text-sm mr-0.5">Rp</span>}
        {price.toLocaleString('id-ID')}
      </div>
      {originalPrice && originalPrice > price && (
        <div className="text-sm text-gray-400 line-through">
          Rp {originalPrice.toLocaleString('id-ID')}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// GROUP BUYING PROGRESS BAR
// ============================================================================

interface GroupProgressProps {
  current: number;
  target: number;
  showLabel?: boolean;
}

/**
 * GroupProgress - Visual progress bar for group buying MOQ
 */
export const GroupProgress: React.FC<GroupProgressProps> = ({
  current,
  target,
  showLabel = true,
}) => {
  const percentage = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);

  return (
    <div className="space-y-1.5">
      {/* Progress bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-purple-600 font-semibold">
            {current} / {target} orang
          </span>
          {remaining > 0 && (
            <span className="text-gray-500">
              Kurang {remaining} orang lagi
            </span>
          )}
          {remaining === 0 && (
            <span className="text-green-600 font-semibold">
              ✓ MOQ Tercapai!
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COUNTDOWN TIMER
// ============================================================================

interface CountdownProps {
  endTime: string;
  variant?: 'default' | 'urgent';
}

/**
 * Countdown - Shows time remaining with urgency styling
 */
export const Countdown: React.FC<CountdownProps> = ({
  endTime,
  variant = 'default',
}) => {
  const [timeLeft, setTimeLeft] = React.useState('');
  const [isUrgent, setIsUrgent] = React.useState(false);

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('BERAKHIR');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Mark as urgent if less than 3 hours left
      setIsUrgent(hours < 3);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}h ${hours % 24}j`);
      } else {
        setTimeLeft(`${hours}j ${minutes}m ${seconds}d`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const urgentClass = isUrgent || variant === 'urgent';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold',
        urgentClass
          ? 'bg-red-100 text-red-600 animate-pulse'
          : 'bg-orange-100 text-orange-600'
      )}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{timeLeft}</span>
    </div>
  );
};

// ============================================================================
// SOCIAL PROOF TAGS
// ============================================================================

/**
 * SocialProof - Shows participant count or reviews
 */
export const SocialProof: React.FC<{
  type: 'participants' | 'reviews' | 'sold';
  count: number;
}> = ({ type, count }) => {
  const config = {
    participants: {
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      label: 'bergabung',
      color: 'text-purple-600 bg-purple-50',
    },
    reviews: {
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
      label: 'ulasan',
      color: 'text-yellow-600 bg-yellow-50',
    },
    sold: {
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
            clipRule="evenodd"
          />
        </svg>
      ),
      label: 'terjual',
      color: 'text-green-600 bg-green-50',
    },
  };

  const { icon, label, color } = config[type];

  return (
    <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium', color)}>
      {icon}
      <span>
        {count.toLocaleString('id-ID')} {label}
      </span>
    </div>
  );
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Basic product card
 * 
 * <Card>
 *   <CardHeader>
 *     <Badge variant="hot">HOT</Badge>
 *   </CardHeader>
 *   <CardContent>
 *     <h3>Batik Tulis Pekalongan</h3>
 *     <PriceDisplay price={125000} originalPrice={250000} />
 *   </CardContent>
 * </Card>
 */

/**
 * Example 2: Group buying card with progress
 * 
 * <Card>
 *   <DiscountBadge percent={50} />
 *   <CardContent>
 *     <h3>Batik Cap Premium</h3>
 *     <PriceDisplay price={85000} originalPrice={170000} />
 *     <GroupProgress current={32} target={50} />
 *     <Countdown endTime="2025-01-05T15:00:00Z" />
 *     <SocialProof type="participants" count={32} />
 *   </CardContent>
 * </Card>
 */

/**
 * Example 3: Product with badges and social proof
 * 
 * <Card>
 *   <CardHeader>
 *     <div className="flex gap-2">
 *       <Badge variant="new">BARU</Badge>
 *       <Badge variant="group">GRUP BELI</Badge>
 *     </div>
 *   </CardHeader>
 *   <CardContent>
 *     <h3>Batik Motif Modern</h3>
 *     <PriceDisplay price={95000} size="lg" />
 *     <div className="flex gap-2 mt-2">
 *       <SocialProof type="sold" count={1240} />
 *       <SocialProof type="reviews" count={456} />
 *     </div>
 *   </CardContent>
 * </Card>
 */