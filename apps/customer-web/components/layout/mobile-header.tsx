'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCartCount } from '@/lib/store/cart.store';

// ============================================================================
// MOBILE HEADER - Pinduoduo style
// ============================================================================

export function MobileHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const cartCount = useCartCount();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Search Bar */}
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
            BB
          </div>
        </Link>

        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="search"
            placeholder="搜索商品 (Cari Batik...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Cart Icon */}
        <Link href="/cart" className="relative flex-shrink-0">
          <svg
            className="w-6 h-6 text-gray-700"
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
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Category Tabs - Horizontal Scroll */}
      <CategoryTabs />
    </header>
  );
}

// ============================================================================
// CATEGORY TABS
// ============================================================================

function CategoryTabs() {
  const categories = [
    { id: 'all', name: '物品', icon: '🏠' },
    { id: 'new', name: '推荐', icon: '⭐' },
    { id: 'tulis', name: '手写', icon: '✍️' },
    { id: 'cap', name: '印章', icon: '🏷️' },
    { id: 'group', name: '团购', icon: '👥' },
    { id: 'sale', name: '特卖', icon: '🔥' },
  ];

  return (
    <div className="flex overflow-x-auto scrollbar-hide border-t border-gray-100">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/categories/${cat.id}`}
          className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 min-w-[60px]"
        >
          <span className="text-xl">{cat.icon}</span>
          <span className="text-xs text-gray-700 whitespace-nowrap">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
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