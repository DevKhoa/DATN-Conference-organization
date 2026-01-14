const express = require('express');
const router = express.Router();
//const authMiddleware = require('../middlewares/auth.middleware');
const ticketController = require('../controllers/ticket.controller');

// Tạo loại vé mới
router.post('/types', ticketController.createType);

// Cập nhật cấu hình loại vé
router.put('/settings', ticketController.updateSettings);

// xóa vé
router.delete('/types/:id', ticketController.delete);

// Xem danh sách vé
router.get('/types', ticketController.getList);

/*
router.post('/types', authMiddleware, ticketController.createType);
router.put('/settings', authMiddleware, ticketController.updateSettings);
router.delete('/types/:id', authMiddleware, ticketController.delete);
router.get('/types', authMiddleware, ticketController.getList);
*/

module.exports = router;