// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service API',
      version: '1.0.0',
      description: 'Push notifications and WhatsApp messaging service for Pinduoduo Clone',
      contact: {
        name: 'API Support',
        email: 'support@pinduoduo-clone.com'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3007',
        description: 'Notification Service'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);