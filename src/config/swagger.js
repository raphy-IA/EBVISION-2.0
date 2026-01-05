const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EB-Vision 2.0 API',
            version: '1.0.0',
            description: 'API Documentation for EB-Vision 2.0 - Campaign Module Integration',
            contact: {
                name: 'EB-Vision Support',
            },
        },
        servers: [
            {
                url: '/api',
                description: 'Test Server',
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
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js'], // Files containing annotations
};

const specs = swaggerJsdoc(options);

module.exports = specs;
