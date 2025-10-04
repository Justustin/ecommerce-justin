import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Service API',
      version: '1.0.0',
      description: 'E-Commerce Product Management API for Group Buying Platform',
      contact: {
        name: 'API Support',
        email: 'dev@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            factory_id: { type: 'string', format: 'uuid' },
            category_id: { type: 'string', format: 'uuid' },
            sku: { type: 'string', example: 'BTK-001' },
            name: { type: 'string', example: 'Batik Pekalongan Premium' },
            slug: { type: 'string', example: 'batik-pekalongan-premium' },
            description: { type: 'string', example: 'High quality batik fabric' },
            status: { type: 'string', enum: ['draft', 'active', 'inactive'], default: 'draft' },
            primary_image_url: { type: 'string', nullable: true },
            base_price: { type: 'number', example: 150000 },
            cost_price: { type: 'number', example: 100000, nullable: true },
            min_order_quantity: { type: 'integer', example: 50 },
            group_duration_hours: { type: 'integer', example: 48 },
            weight_grams: { type: 'integer', example: 200, nullable: true },
            length_cm: { type: 'number', nullable: true },
            width_cm: { type: 'number', nullable: true },
            height_cm: { type: 'number', nullable: true },
            stock_quantity: { type: 'integer', example: 1000 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            published_at: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        CreateProduct: {
          type: 'object',
          required: ['factoryId', 'categoryId', 'sku', 'name', 'basePrice', 'moq'],
          properties: {
            factoryId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            sku: { type: 'string', example: 'BTK-001' },
            name: { type: 'string', example: 'Batik Pekalongan Premium' },
            description: { type: 'string', example: 'High quality batik fabric from Pekalongan' },
            basePrice: { type: 'number', example: 150000 },
            costPrice: { type: 'number', example: 100000 },
            moq: { type: 'integer', example: 50 },
            groupDurationHours: { type: 'integer', example: 48 },
            stockQuantity: { type: 'integer', example: 1000 },
            weight: { type: 'integer', example: 200 },
            lengthCm: { type: 'number', example: 200 },
            widthCm: { type: 'number', example: 115 },
            heightCm: { type: 'number', example: 2 },
            primaryImageUrl: { type: 'string' }
          }
        },
        UpdateProduct: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            basePrice: { type: 'number' },
            costPrice: { type: 'number' },
            moq: { type: 'integer' },
            stockQuantity: { type: 'integer' },
            weight: { type: 'integer' },
            lengthCm: { type: 'number' },
            widthCm: { type: 'number' },
            heightCm: { type: 'number' },
            status: { type: 'string', enum: ['draft', 'active', 'inactive'] },
            primaryImageUrl: { type: 'string' },
            groupDurationHours: { type: 'integer' }
          }
        },
        ProductVariant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            product_id: { type: 'string', format: 'uuid' },
            sku: { type: 'string', example: 'BTK-001-RED' },
            variant_name: { type: 'string', example: 'Red Pattern' },
            price_adjustment: { type: 'number', example: 10000 },
            stock_quantity: { type: 'integer', example: 200 },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        CreateVariant: {
          type: 'object',
          required: ['productId', 'sku', 'variantName', 'priceAdjustment', 'stockQuantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            sku: { type: 'string', example: 'BTK-001-RED' },
            variantName: { type: 'string', example: 'Red Pattern' },
            priceAdjustment: { type: 'number', example: 10000 },
            stockQuantity: { type: 'integer', example: 200 }
          }
        },
        Category: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                parent_id: { type: 'string', format: 'uuid', nullable: true },
                name: { type: 'string', example: 'Batik & Textiles' },
                slug: { type: 'string', example: 'batik-textiles' },
                icon_url: { type: 'string', nullable: true },
                display_order: { type: 'integer', default: 0 },
                is_active: { type: 'boolean', default: true },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
            }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'] // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);