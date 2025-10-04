import Link from 'next/link';
import Image from 'next/image';
import { ProductGrid, GroupBuyingSection } from '@/components/product/product-grid';
import { Badge } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="pb-20 bg-gray-50"> {/* pb-20 for bottom nav */}
      
      {/* Quick Categories Grid */}
      <QuickCategories />

      {/* Promotional Banners */}
      <PromoBanners />

      {/* Group Buying Flash */}
      <div className="px-3 py-4 bg-gradient-to-r from-purple-500 to-pink-500">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">⚡ 拼团特卖</span>
            <Badge variant="hot" className="text-xs">HOT</Badge>
          </div>
          <Link href="/group-buying" className="text-white text-sm flex items-center gap-1">
            更多
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        
        <ProductGrid
          showGroupBuyingOnly={true}
          itemsPerPage={4}
          columns={{ mobile: 2, tablet: 3, desktop: 4 }}
          showLoadMore={false}
        />
      </div>

      {/* Main Product Grid */}
      <div className="px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">为你推荐</h2>
        </div>
        
        <ProductGrid
          itemsPerPage={20}
          columns={{ mobile: 2, tablet: 3, desktop: 4 }}
        />
      </div>
    </main>
  );
}

// ============================================================================
// QUICK CATEGORIES - Pinduoduo style grid
// ============================================================================

function QuickCategories() {
  const categories = [
    { name: '手写蜡染', icon: '✍️', color: 'from-purple-400 to-purple-500', href: '/categories/batik-tulis' },
    { name: '印章蜡染', icon: '🏷️', color: 'from-blue-400 to-blue-500', href: '/categories/batik-cap' },
    { name: '混合蜡染', icon: '🌟', color: 'from-green-400 to-green-500', href: '/categories/batik-kombinasi' },
    { name: '长布', icon: '📏', color: 'from-orange-400 to-orange-500', href: '/categories/kain-panjang' },
    { name: '婚礼', icon: '💐', color: 'from-pink-400 to-pink-500', href: '/categories/wedding' },
    { name: '企业', icon: '🏢', color: 'from-indigo-400 to-indigo-500', href: '/categories/corporate' },
    { name: '定制', icon: '✨', color: 'from-yellow-400 to-yellow-500', href: '/categories/custom' },
    { name: '团购', icon: '👥', color: 'from-red-400 to-red-500', href: '/group-buying' },
  ];

  return (
    <div className="bg-white px-3 py-4">
      <div className="grid grid-cols-4 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="flex flex-col items-center gap-2"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-sm`}>
              {cat.icon}
            </div>
            <span className="text-xs text-gray-700 text-center leading-tight">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PROMOTIONAL BANNERS - 2 column layout
// ============================================================================

function PromoBanners() {
  const banners = [
    {
      id: 1,
      title: '新人专享',
      subtitle: '首单立减50%',
      color: 'from-red-400 to-orange-400',
      image: '🎁',
      href: '/new-user',
    },
    {
      id: 2,
      title: '限时特卖',
      subtitle: '低至3折起',
      color: 'from-purple-400 to-pink-400',
      image: '⚡',
      href: '/flash-sale',
    },
  ];

  return (
    <div className="px-3 py-4 bg-white">
      <div className="grid grid-cols-2 gap-3">
        {banners.map((banner) => (
          <Link
            key={banner.id}
            href={banner.href}
            className="block"
          >
            <div className={`relative h-32 rounded-2xl bg-gradient-to-br ${banner.color} overflow-hidden shadow-lg`}>
              {/* Pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                }} />
              </div>

              {/* Content */}
              <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-2">{banner.image}</div>
                  <h3 className="text-white font-bold text-base mb-1">
                    {banner.title}
                  </h3>
                  <p className="text-white/90 text-xs">
                    {banner.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}