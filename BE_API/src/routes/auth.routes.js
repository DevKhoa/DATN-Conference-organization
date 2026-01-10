const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Đăng ký
router.post('/register', authController.register);
// Đăng nhập
router.post('/login', authController.login);
// Xác minh email
router.get('/verify', authController.verifyEmail);

module.exports = router;