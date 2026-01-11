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
// User
const userRoutes = require('./routes/user.routes');
// Ticket
const ticketRoutes = require('./routes/ticket.routes');
// Registration
const registrationRoutes = require('./routes/registration.routes');
// Check-in
const checkinRoutes = require('./routes/checkin.routes');

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
// User 
app.use('/users', userRoutes);       
// Ticket  
app.use('/tickets', ticketRoutes);     
// Registration
app.use('/registrations', registrationRoutes); 
// Check-in
app.use('/checkin', checkinRoutes);     

// ----------------
// Test Route
app.get('/', (req, res) => {
    res.send('Conference API System is running...');
});

// Global Error Handler
app.use(errorMiddleware);

// ----------------
module.exports = app;