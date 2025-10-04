import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ============================================================================
      // COLORS - Pinduoduo vibrant + Batik-inspired accents
      // ============================================================================
      colors: {
        // Primary Pinduoduo colors (red-orange gradient)
        primary: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6b6b',
          500: '#ff4757', // Main Pinduoduo red
          600: '#ed2939',
          700: '#c41e3a',
          800: '#a51d2d',
          900: '#881d2a',
        },
        
        // Secondary orange (Pinduoduo accent)
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff6348', // Pinduoduo orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        
        // Group buying purple-pink (excitement/urgency)
        group: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef', // Vibrant purple
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        
        // Batik indigo (traditional batik blue)
        batik: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#4f46e5', // Deep indigo
          600: '#4338ca',
          700: '#3730a3',
          800: '#312e81',
          900: '#1e1b4b',
        },
        
        // Batik brown (traditional earth tones)
        earth: {
          50: '#faf5f0',
          100: '#f5ebe0',
          200: '#e8d5c4',
          300: '#d4b59e',
          400: '#b88f6f',
          500: '#8b6f47', // Traditional batik brown
          600: '#6d5639',
          700: '#5a4730',
          800: '#4a3b29',
          900: '#3d3223',
        },
        
        // Gold accent (batik gold patterns)
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Rich gold
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      
      // ============================================================================
      // ANIMATIONS - Pinduoduo-style effects
      // ============================================================================
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      
      // ============================================================================
      // BACKGROUND GRADIENTS - Pinduoduo signature gradients
      // ============================================================================
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #ff4757 0%, #ff6348 100%)',
        'gradient-group': 'linear-gradient(135deg, #d946ef 0%, #ec4899 100%)',
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-batik': 'linear-gradient(135deg, #4f46e5 0%, #8b6f47 100%)',
        'gradient-gold': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      },
      
      // ============================================================================
      // BOX SHADOWS - Pinduoduo-style depth
      // ============================================================================
      boxShadow: {
        'primary': '0 10px 25px -5px rgba(255, 71, 87, 0.3)',
        'group': '0 10px 25px -5px rgba(217, 70, 239, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      
      // ============================================================================
      // BORDER RADIUS - Pinduoduo rounded style
      // ============================================================================
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      
      // ============================================================================
      // FONT FAMILY - Modern, readable fonts
      // ============================================================================
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Poppins',
          'Inter',
          '-apple-system',
          'sans-serif',
        ],
      },
      
      // ============================================================================
      // SPACING - Extended spacing scale
      // ============================================================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
};

export default config;

// ============================================================================
// COLOR USAGE GUIDE
// ============================================================================

/**
 * PRIMARY COLORS (Pinduoduo signature)
 * - primary-500: Main red (#ff4757) - Primary CTAs, important buttons
 * - accent-500: Orange (#ff6348) - Hover states, secondary CTAs
 * 
 * Example:
 * <button className="bg-primary-500 hover:bg-accent-500">
 *   Gabung Grup
 * </button>
 */

/**
 * GROUP BUYING COLORS (Urgency/Excitement)
 * - group-500: Purple (#d946ef) - Group buying badges, progress bars
 * - Use with pink for gradients: from-group-500 to-pink-500
 * 
 * Example:
 * <div className="bg-gradient-to-r from-group-500 to-pink-500">
 *   GRUP BELI AKTIF
 * </div>
 */

/**
 * BATIK COLORS (Cultural accents)
 * - batik-500: Indigo (#4f46e5) - Traditional batik references
 * - earth-500: Brown (#8b6f47) - Earth tone accents
 * - gold-500: Gold (#f59e0b) - Premium badges, highlights
 * 
 * Example:
 * <div className="border-2 border-batik-500 bg-earth-50">
 *   Batik Tradisional Pekalongan
 * </div>
 */

/**
 * GRADIENT COMBINATIONS
 * 
 * Hero/Primary:
 * bg-gradient-to-br from-primary-500 via-accent-500 to-pink-500
 * 
 * Group Buying:
 * bg-gradient-to-r from-group-500 to-pink-500
 * 
 * Batik Premium:
 * bg-gradient-to-br from-batik-500 to-gold-500
 * 
 * Success:
 * bg-gradient-to-r from-green-500 to-emerald-500
 */

/**
 * ANIMATION EXAMPLES
 * 
 * Shimmer effect (loading, highlights):
 * <div className="relative overflow-hidden">
 *   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
 * </div>
 * 
 * Pulse (urgency):
 * <div className="animate-pulse bg-primary-500">Limited Time!</div>
 * 
 * Wiggle (attention):
 * <div className="animate-wiggle">🔥</div>
 */

/**
 * SHADOW USAGE
 * 
 * Cards:
 * <div className="shadow-card hover:shadow-card-hover">Card</div>
 * 
 * Primary buttons:
 * <button className="shadow-primary">Join Group</button>
 * 
 * Group buying elements:
 * <div className="shadow-group">Group Deal</div>
 */