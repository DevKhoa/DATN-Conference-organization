const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

const conferenceRoutes = require('./routes/conference.routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/conferences', conferenceRoutes);
app.use(errorMiddleware);

module.exports = app;
