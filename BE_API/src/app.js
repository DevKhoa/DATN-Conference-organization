require('dotenv').config();
const express = require('express');
const path = require('path');

//----------------
// Swagger Imports
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

// Middleware Imports
const errorMiddleware = require('./middlewares/error.middleware');

// ----------------
// Route Imports
const conferenceRoutes = require('./routes/conference.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const ticketRoutes = require('./routes/ticket.routes');
const registrationRoutes = require('./routes/registration.routes');
const checkinRoutes = require('./routes/checkin.routes');

// ----------------
const app = express();

// 1. Global Middlewares
app.use(express.json());

// Cấu hình Static Folder cho thư mục public
// Giúp truy cập file xuất ra qua URL: http://localhost:3000/exports/ten_file.xlsx
app.use(express.static(path.join(__dirname, '../public'))); // path.join(__dirname, '../public') trỏ ra thư mục public nằm ngang hàng với thư mục src


// 2. Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ----------------
// 3. Application Routes
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
// 4. Base Route & Error Handling
// Test Route
app.get('/', (req, res) => {
    res.send('Conference API System is running...');
});

// Global Error Handler
app.use(errorMiddleware);

// ----------------
module.exports = app;