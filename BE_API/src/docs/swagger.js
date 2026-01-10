const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Conference Organization API',
      version: '1.0.0',
      description: 'Backend API for Conference Management System',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local server',
      },
    ],
  },

  // QUAN TRỌNG: trỏ đúng vào routes
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
