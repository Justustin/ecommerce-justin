import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Warehouse Service API',
      version: '1.0.0',
      description: 'Warehouse management service for e-commerce platform',
    },
    servers: [
      {
        url: 'http://localhost:3011',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Warehouses',
        description: 'Warehouse management endpoints',
      },
      {
        name: 'Admin',
        description: 'Admin warehouse management endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);