require('dotenv').config();
const express = require('express');

//----------------
// Swagger Imports
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger'); 

// ----------------
// Middlewares
const errorMiddleware = require('./middlewares/error.middleware');
// ----------------
// Conference 
const conferenceRoutes = require('./routes/conference.routes');
// Review
const reviewRoutes = require('./routes/review.routes');
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
// Session
const sessionRoutes = require('./routes/sessionRoutes');
// Agenda
const agendaRoutes = require('./routes/agendaRoutes');
// ----------------
const app = express();

// Middlewares
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/conferences', conferenceRoutes);
app.use('/', reviewRoutes);
app.use(errorMiddleware);

// ----------------
module.exports = app;