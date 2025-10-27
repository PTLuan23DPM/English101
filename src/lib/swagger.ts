import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'English101 API Documentation',
        version: '1.0.0',
        description: 'Complete API documentation for the English101 learning platform',
        contact: {
          name: 'English101 Team',
          email: 'support@english101.com',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://english101.com',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          DashboardStats: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  image: { type: 'string', nullable: true },
                },
              },
              stats: {
                type: 'object',
                properties: {
                  streak: { type: 'number' },
                  completedUnits: { type: 'number' },
                  inProgressUnits: { type: 'number' },
                  totalAttempts: { type: 'number' },
                  avgScore: { type: 'number' },
                },
              },
              skillsBreakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    skill: { type: 'string' },
                    completed: { type: 'number' },
                    avgScore: { type: 'number' },
                  },
                },
              },
            },
          },
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication endpoints',
        },
        {
          name: 'Dashboard',
          description: 'Dashboard and user statistics',
        },
        {
          name: 'Users',
          description: 'User management',
        },
      ],
    },
  });
  return spec;
};

