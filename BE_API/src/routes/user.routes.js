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

//Xem danh sách user (có filter role AND/OR)
router.get('/', userController.getAllUsers);

// Phân quyền cho user
router.patch('/:id/role', userController.addRoles);

// Xóa quyền của user
router.delete('/:id/role', userController.removeRoles);
module.exports = router;
