const express = require('express');
const router = express.Router();
//const authMiddleware = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

// Lấy thông tin người dùng
router.get('/profile', userController.getProfile);
//router.get('/profile', authMiddleware, userController.getProfile);

// Cập nhật thông tin người dùng
router.put('/profile', userController.updateProfile);
//router.put('/profile', authMiddleware, userController.updateProfile);

module.exports = router;