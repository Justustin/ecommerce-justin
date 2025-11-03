import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Logistics Service API',
      version: '1.0.0',
      description: 'API documentation for Pinduoduo Clone Logistics Service with Biteship Integration',
      contact: {
        name: 'API Support',
        email: 'support@pinduoduo.id',
      },
    },
    servers: [
      {
        url: 'http://localhost:3008',
        description: 'Development server',
      },
      {
        url: 'https://api.pinduoduo.id',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Rates',
        description: 'Shipping rate calculation endpoints',
      },
      {
        name: 'Shipments',
        description: 'Shipment management endpoints',
      },
      {
        name: 'Tracking',
        description: 'Shipment tracking endpoints',
      },
      {
        name: 'Webhooks',
        description: 'Webhook endpoints for courier integrations',
      },
    ],
    components: {
      schemas: {
        // ==================== Rate Schemas ====================
        GetRatesRequest: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: {
              type: 'string',
              format: 'uuid',
              description: 'Order ID to calculate shipping for',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            originPostalCode: {
              type: 'integer',
              description: 'Origin postal code',
              example: 12440,
            },
            originLatitude: {
              type: 'number',
              format: 'double',
              description: 'Origin latitude',
              example: -6.2088,
            },
            originLongitude: {
              type: 'number',
              format: 'double',
              description: 'Origin longitude',
              example: 106.8456,
            },
            destinationPostalCode: {
              type: 'integer',
              description: 'Destination postal code',
              example: 40123,
            },
            destinationLatitude: {
              type: 'number',
              format: 'double',
              description: 'Destination latitude',
              example: -6.9147,
            },
            destinationLongitude: {
              type: 'number',
              format: 'double',
              description: 'Destination longitude',
              example: 107.6098,
            },
            couriers: {
              type: 'string',
              description: 'Comma-separated list of courier codes',
              example: 'jne,jnt,sicepat,anteraja',
            },
          },
        },
        CourierRate: {
          type: 'object',
          properties: {
            courier_name: {
              type: 'string',
              example: 'JNE',
            },
            courier_code: {
              type: 'string',
              example: 'jne',
            },
            courier_service_name: {
              type: 'string',
              example: 'Regular',
            },
            courier_service_code: {
              type: 'string',
              example: 'reg',
            },
            description: {
              type: 'string',
              example: 'Layanan reguler JNE',
            },
            duration: {
              type: 'string',
              example: '2-3 days',
            },
            price: {
              type: 'number',
              example: 25000,
            },
            available_for_cash_on_delivery: {
              type: 'boolean',
              example: true,
            },
            available_for_insurance: {
              type: 'boolean',
              example: true,
            },
          },
        },
        RatesResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: true,
                },
                object: {
                  type: 'string',
                  example: 'courier_pricing',
                },
                message: {
                  type: 'string',
                  example: 'Success',
                },
                code: {
                  type: 'integer',
                  example: 200,
                },
                pricing: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/CourierRate',
                  },
                },
              },
            },
          },
        },

        // ==================== Shipment Schemas ====================
        ShipmentItem: {
          type: 'object',
          required: ['name', 'value', 'length', 'width', 'height', 'weight', 'quantity'],
          properties: {
            name: {
              type: 'string',
              description: 'Item name',
              example: 'Running Shoes',
            },
            description: {
              type: 'string',
              description: 'Item description',
              example: 'Black colored size 42',
            },
            value: {
              type: 'number',
              description: 'Item value in IDR',
              example: 500000,
            },
            length: {
              type: 'number',
              description: 'Length in cm',
              example: 30,
            },
            width: {
              type: 'number',
              description: 'Width in cm',
              example: 20,
            },
            height: {
              type: 'number',
              description: 'Height in cm',
              example: 15,
            },
            weight: {
              type: 'number',
              description: 'Weight in grams',
              example: 800,
            },
            quantity: {
              type: 'integer',
              description: 'Quantity',
              example: 1,
            },
          },
        },
        CreateShipmentRequest: {
          type: 'object',
          required: [
            'orderId',
            'courierCompany',
            'courierType',
            'shipperContactName',
            'shipperContactPhone',
            'originContactName',
            'originContactPhone',
            'originAddress',
            'originPostalCode',
            'destinationContactName',
            'destinationContactPhone',
            'destinationAddress',
            'destinationPostalCode',
            'deliveryType',
          ],
          properties: {
            orderId: {
              type: 'string',
              format: 'uuid',
              description: 'Order ID',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            pickupTaskId: {
              type: 'string',
              format: 'uuid',
              description: 'Pickup task ID (optional)',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            courierCompany: {
              type: 'string',
              description: 'Courier company code',
              example: 'jne',
              enum: ['jne', 'jnt', 'sicepat', 'anteraja', 'grab', 'gojek', 'pos'],
            },
            courierType: {
              type: 'string',
              description: 'Service type',
              example: 'reg',
            },
            courierInsurance: {
              type: 'number',
              description: 'Insurance amount in IDR',
              example: 50000,
            },
            shipperContactName: {
              type: 'string',
              description: 'Shipper name',
              example: 'PT Factory Indonesia',
            },
            shipperContactPhone: {
              type: 'string',
              description: 'Shipper phone',
              example: '+6281234567890',
            },
            shipperContactEmail: {
              type: 'string',
              format: 'email',
              description: 'Shipper email',
              example: 'factory@example.com',
            },
            shipperOrganization: {
              type: 'string',
              description: 'Organization name',
              example: 'Factory ABC',
            },
            originContactName: {
              type: 'string',
              description: 'Origin contact name',
              example: 'Warehouse Manager',
            },
            originContactPhone: {
              type: 'string',
              description: 'Origin contact phone',
              example: '+6281234567890',
            },
            originAddress: {
              type: 'string',
              description: 'Full origin address',
              example: 'Jl. Industri No. 123, Tangerang Selatan, Banten',
            },
            originPostalCode: {
              type: 'integer',
              description: 'Origin postal code',
              example: 12440,
            },
            originNote: {
              type: 'string',
              description: 'Additional notes for pickup',
              example: 'Ring the bell twice',
            },
            originLatitude: {
              type: 'number',
              format: 'double',
              example: -6.2088,
            },
            originLongitude: {
              type: 'number',
              format: 'double',
              example: 106.8456,
            },
            destinationContactName: {
              type: 'string',
              description: 'Recipient name',
              example: 'John Doe',
            },
            destinationContactPhone: {
              type: 'string',
              description: 'Recipient phone',
              example: '+6281234567891',
            },
            destinationContactEmail: {
              type: 'string',
              format: 'email',
              description: 'Recipient email',
              example: 'customer@example.com',
            },
            destinationAddress: {
              type: 'string',
              description: 'Full destination address',
              example: 'Jl. Customer No. 456, Bandung, Jawa Barat',
            },
            destinationPostalCode: {
              type: 'integer',
              description: 'Destination postal code',
              example: 40123,
            },
            destinationNote: {
              type: 'string',
              description: 'Delivery notes',
              example: 'Leave at the front door',
            },
            destinationLatitude: {
              type: 'number',
              format: 'double',
              example: -6.9147,
            },
            destinationLongitude: {
              type: 'number',
              format: 'double',
              example: 107.6098,
            },
            deliveryType: {
              type: 'string',
              enum: ['now', 'scheduled'],
              description: 'Delivery type',
              example: 'now',
            },
            deliveryDate: {
              type: 'string',
              format: 'date',
              description: 'Scheduled delivery date (YYYY-MM-DD)',
              example: '2025-10-15',
            },
            deliveryTime: {
              type: 'string',
              description: 'Scheduled delivery time range',
              example: '09:00-12:00',
            },
            orderNote: {
              type: 'string',
              description: 'Order notes',
              example: 'Handle with care',
            },
            items: {
              type: 'array',
              description: 'Array of items (leave empty to auto-populate from order)',
              items: {
                $ref: '#/components/schemas/ShipmentItem',
              },
            },
          },
        },
        Shipment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            order_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            tracking_number: {
              type: 'string',
              example: 'JNE12345678901',
            },
            courier_service: {
              type: 'string',
              example: 'jne',
            },
            service_type: {
              type: 'string',
              example: 'reg',
            },
            status: {
              type: 'string',
              enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
              example: 'pending',
            },
            shipping_cost: {
              type: 'number',
              example: 25000,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-11T10:30:00Z',
            },
          },
        },
        CreateShipmentResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                shipment: {
                  $ref: '#/components/schemas/Shipment',
                },
                biteshipOrder: {
                  type: 'object',
                  description: 'Full Biteship API response',
                },
              },
            },
            message: {
              type: 'string',
              example: 'Shipment created successfully via Biteship',
            },
          },
        },

        // ==================== Status Update Schemas ====================
        UpdateStatusRequest: {
          type: 'object',
          required: ['shipmentId', 'status', 'description'],
          properties: {
            shipmentId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            status: {
              type: 'string',
              enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
              example: 'picked_up',
            },
            description: {
              type: 'string',
              example: 'Package picked up from warehouse',
            },
            location: {
              type: 'string',
              example: 'Jakarta Hub',
            },
            eventTime: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-11T11:00:00Z',
            },
            deliveryPhotoUrl: {
              type: 'string',
              description: 'Photo URL (for delivered status)',
              example: 'https://storage.example.com/proof-123.jpg',
            },
            recipientSignatureUrl: {
              type: 'string',
              description: 'Signature URL (for delivered status)',
              example: 'https://storage.example.com/signature-123.jpg',
            },
            receivedBy: {
              type: 'string',
              description: 'Name of person who received (for delivered status)',
              example: 'John Doe',
            },
          },
        },

        // ==================== Tracking Schemas ====================
        TrackingHistory: {
          type: 'object',
          properties: {
            note: {
              type: 'string',
              example: 'Package picked up',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-11T11:00:00Z',
            },
            status: {
              type: 'string',
              example: 'picked',
            },
          },
        },
        TrackingResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'biteship-order-id-123',
                },
                waybill_id: {
                  type: 'string',
                  example: 'JNE12345678901',
                },
                courier: {
                  type: 'object',
                  properties: {
                    company: {
                      type: 'string',
                      example: 'jne',
                    },
                    name: {
                      type: 'string',
                      example: 'JNE',
                    },
                  },
                },
                status: {
                  type: 'string',
                  example: 'on_transit',
                },
                history: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/TrackingHistory',
                  },
                },
              },
            },
          },
        },

        // ==================== Error Schema ====================
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message description',
            },
          },
        },
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token authentication',
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to route files
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Logistics Service API Docs',
  }));

  // Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`📚 Swagger docs available at http://localhost:${process.env.PORT || 3008}/api-docs`);
}

export default swaggerSpec;