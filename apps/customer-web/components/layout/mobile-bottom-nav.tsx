'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// ============================================================================
// MOBILE BOTTOM NAVIGATION - Pinduoduo style
// ============================================================================

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: '首页',
      icon: (active: boolean) => (
        <svg
          className={cn('w-6 h-6', active ? 'text-red-500' : 'text-gray-600')}
          fill={active ? 'currentColor' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      href: '/group-buying',
      label: '团购',
      badge: 'HOT',
      icon: (active: boolean) => (
        <svg
          className={cn('w-6 h-6', active ? 'text-red-500' : 'text-gray-600')}
          fill={active ? 'currentColor' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      href: '/orders',
      label: '订单',
      icon: (active: boolean) => (
        <svg
          className={cn('w-6 h-6', active ? 'text-red-500' : 'text-gray-600')}
          fill={active ? 'currentColor' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: '我的',
      icon: (active: boolean) => (
        <svg
          className={cn('w-6 h-6', active ? 'text-red-500' : 'text-gray-600')}
          fill={active ? 'currentColor' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              {/* Badge */}
              {item.badge && (
                <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              
              {/* Icon */}
              <div className="mb-0.5">
                {item.icon(isActive)}
              </div>
              
              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-red-500' : 'text-gray-600'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
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