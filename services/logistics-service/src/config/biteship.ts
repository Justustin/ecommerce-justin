export const biteshipConfig = {
  apiKey: process.env.BITESHIP_API_KEY || '',
  baseUrl: process.env.BITESHIP_BASE_URL || 'https://api.biteship.com/v1',
  environment: process.env.BITESHIP_ENV || 'production', // 'production' or 'development'
};

// Validate configuration
if (!biteshipConfig.apiKey) {
  console.warn('⚠️  BITESHIP_API_KEY not set in environment variables');
}