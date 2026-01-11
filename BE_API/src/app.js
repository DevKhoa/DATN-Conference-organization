const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger'); 

// --- IMPORT ROUTES MỚI TẠI ĐÂY ---
const conferenceRoutes = require('./routes/conference.routes'); 
const locationRoutes = require('./routes/locationRoutes');      
const errorMiddleware = require('./middlewares/error.middleware');
const sessionRoutes = require('./routes/sessionRoutes');
const agendaRoutes = require('./routes/agendaRoutes');

const app = express();
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- ĐĂNG KÝ ROUTE ---
app.use('/conferences', conferenceRoutes);
app.use('/locations', locationRoutes); // 
app.use('/sessions', sessionRoutes);
app.use('/agenda', agendaRoutes);

// Middleware xử lý lỗi (luôn để cuối cùng)
app.use(errorMiddleware);

module.exports = app;