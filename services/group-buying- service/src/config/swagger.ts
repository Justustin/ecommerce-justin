import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Group Buying Service API',
      version: '1.0.0',
      description: 'Group buying session management for e-commerce platform',
    },
    servers: [
      {
        url: 'http://localhost:3004',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Group Buying Sessions',
        description: 'Group buying session management endpoints',
      },
      {
        name: 'Participants',
        description: 'Session participant management',
      },
      {
        name: 'Production',
        description: 'Factory production tracking',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);