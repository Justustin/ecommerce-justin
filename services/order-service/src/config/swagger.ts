// services/order-service/src/config/swagger.ts

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order Service API',
      version: '1.0.0',
      description: 'Multi-vendor order management and fulfillment service',
    },
    servers: [
      { 
        url: 'http://localhost:3005', 
        description: 'Development server' 
      }
    ],
    tags: [
      { name: 'Orders', description: 'Order management endpoints' }
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);