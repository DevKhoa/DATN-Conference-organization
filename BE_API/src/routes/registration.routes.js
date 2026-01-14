const express = require('express');
const router = express.Router();
//const authMiddleware = require('../middlewares/auth.middleware');
const regController = require('../controllers/registration.controller');

// Đăng ký tham gia hội nghị
router.post('/create', regController.create);
//router.post('/create', authMiddleware, regController.create);

// Xuất danh sách người đăng ký hội nghị
router.get('/export', regController.exportList);
//router.get('/export', authMiddleware, regController.exportList);

// Lấy danh sách đăng ký theo hội nghị
router.get('/list', regController.getList);
//router.get('/list', authMiddleware, regController.getList);

// Hủy đăng ký
router.patch('/:id/cancel', regController.cancel);
//router.patch('/:id/cancel', authMiddleware, regController.cancel);

module.exports = router;