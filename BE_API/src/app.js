require('dotenv').config();
const express = require('express');
const path = require('path');

//----------------
// Swagger Imports
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

// ----------------
// Middlewares
const errorMiddleware = require('./middlewares/error.middleware');

// ----------------
// Route Imports
const conferenceRoutes = require('./routes/conference.routes');
// Review (From Main)
const reviewRoutes = require('./routes/review.routes');
// Auth
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const ticketRoutes = require('./routes/ticket.routes');
const registrationRoutes = require('./routes/registration.routes');
const checkinRoutes = require('./routes/checkin.routes');
// Location
const locationRoutes = require('./routes/locationRoutes');
// Session
const sessionRoutes = require('./routes/sessionRoutes');
// Agenda
const agendaRoutes = require('./routes/agendaRoutes');
// Proceedings
const proceedingRoutes = require('./routes/proceedings.routes');
// CMS
const cmsRoutes = require('./routes/cmsRoutes');
// Email
const emailRoutes = require('./routes/emailRoutes');
// Notification
const notificationRoutes = require('./routes/notificationRoutes');
//Stat
const statRoutes = require('./routes/statsRoutes');
// Payment
const paymentRoutes = require('./routes/payment.routes');

// ----------------
const app = express();

// 1. Global Middlewares
app.use(express.json());

// Cấu hình Static Folder cho thư mục public
app.use(express.static(path.join(__dirname, '../public')));

// 2. Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ----------------
// 3. Application Routes

// Routes từ Main (Giữ lại Review và Proceedings)
app.use('/conferences', conferenceRoutes);
app.use('/', reviewRoutes);
app.use('/', proceedingRoutes);
app.use('/locations', locationRoutes); // 
app.use('/sessions', sessionRoutes);
app.use('/agenda', agendaRoutes);
app.use('/cms', cmsRoutes);
app.use('/emails', emailRoutes);
app.use('/notifications', notificationRoutes);
app.use('/stats', statRoutes);
app.use('/payments', paymentRoutes);

// Routes từ nhánh của bạn (Yen/Finance_User)
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/tickets', ticketRoutes);
app.use('/registrations', registrationRoutes);
app.use('/checkin', checkinRoutes);

// ----------------
// 4. Base Route & Error Handling
// Test Route
app.get('/', (req, res) => {
    res.send('Conference API System is running...');
});

// Global Error Handler
app.use(errorMiddleware);

// ----------------
module.exports = app;