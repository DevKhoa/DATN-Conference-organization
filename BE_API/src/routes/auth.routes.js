const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Đăng ký
router.post('/register', authController.register);
// Đăng nhập
router.post('/login', authController.login);
// Xác minh email
router.get('/verify', authController.verifyEmail);
// Refresh Token
router.post('/refresh-token', authController.refreshToken);
// Quên mật khẩu (Yêu cầu gửi mail)
router.post('/forgot-password', authController.forgotPassword);
// Đặt lại mật khẩu (Nhập mật khẩu mới từ token)
router.post('/reset-password', authController.resetPassword);

module.exports = router;