import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Address Service API',
      version: '1.0.0',
      description: 'User address management service',
    },
    servers: [
      { 
        url: 'http://localhost:3009', 
        description: 'Development server' 
      }
    ],
    tags: [
      { name: 'Addresses', description: 'Address management endpoints' }
    ],
    components: {
      schemas: {
        Address: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Address ID'
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID'
            },
            label: {
              type: 'string',
              description: 'Address label (e.g., Home, Office)',
              example: 'Home'
            },
            recipient_name: {
              type: 'string',
              description: 'Recipient name',
              example: 'John Doe'
            },
            phone_number: {
              type: 'string',
              description: 'Phone number',
              example: '081234567890'
            },
            province: {
              type: 'string',
              description: 'Province',
              example: 'DKI Jakarta'
            },
            city: {
              type: 'string',
              description: 'City',
              example: 'Jakarta Pusat'
            },
            district: {
              type: 'string',
              description: 'District',
              example: 'Menteng'
            },
            postal_code: {
              type: 'string',
              description: 'Postal code',
              example: '10310'
            },
            address_line: {
              type: 'string',
              description: 'Full address',
              example: 'Jl. Sudirman No. 123'
            },
            notes: {
              type: 'string',
              description: 'Additional notes',
              example: 'Near the mall'
            },
            is_default: {
              type: 'boolean',
              description: 'Is this the default address',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        CreateAddress: {
          type: 'object',
          required: ['userId', 'label', 'recipientName', 'phoneNumber', 'province', 'city', 'district', 'postalCode', 'addressLine'],
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID'
            },
            label: {
              type: 'string',
              description: 'Address label',
              example: 'Home'
            },
            recipientName: {
              type: 'string',
              description: 'Recipient name',
              example: 'John Doe'
            },
            phoneNumber: {
              type: 'string',
              description: 'Phone number',
              example: '081234567890'
            },
            province: {
              type: 'string',
              description: 'Province',
              example: 'DKI Jakarta'
            },
            city: {
              type: 'string',
              description: 'City',
              example: 'Jakarta Pusat'
            },
            district: {
              type: 'string',
              description: 'District',
              example: 'Menteng'
            },
            postalCode: {
              type: 'string',
              description: 'Postal code',
              example: '10310'
            },
            addressLine: {
              type: 'string',
              description: 'Full address',
              example: 'Jl. Sudirman No. 123'
            },
            notes: {
              type: 'string',
              description: 'Additional notes',
              example: 'Near the mall'
            },
            isDefault: {
              type: 'boolean',
              description: 'Set as default address',
              example: true
            }
          }
        },
        UpdateAddress: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            recipientName: { type: 'string' },
            phoneNumber: { type: 'string' },
            province: { type: 'string' },
            city: { type: 'string' },
            district: { type: 'string' },
            postalCode: { type: 'string' },
            addressLine: { type: 'string' },
            notes: { type: 'string' },
            isDefault: { type: 'boolean' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);