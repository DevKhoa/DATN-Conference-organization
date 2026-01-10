require('dotenv').config();
const express = require('express');

//----------------
// Swagger Imports
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

// Middleware Imports
const errorMiddleware = require('./middlewares/error.middleware');

// ----------------
// Conference 
const conferenceRoutes = require('./routes/conference.routes');
// Auth
const authRoutes = require('./routes/auth.routes');

// ----------------
const app = express();

// Middlewares
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ----------------
// Conference
app.use('/conferences', conferenceRoutes);
// Auth
app.use('/auth', authRoutes);         

// ----------------
// Test Route
app.get('/', (req, res) => {
    res.send('Conference API System is running...');
});

// Global Error Handler
app.use(errorMiddleware);

// ----------------
module.exports = app;