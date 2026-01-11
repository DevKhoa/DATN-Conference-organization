const express = require('express');
const router = express.Router();
//const authMiddleware = require('../middlewares/auth.middleware');
const checkinController = require('../controllers/checkin.controller');

// Tạo QR code check-in
router.post('/qr-generate', checkinController.generateQr);
// router.post('/qr-generate', authMiddleware, checkinController.generateQr);

// Xác minh QR code check-in
router.post('/verify', checkinController.verifyQr);
// router.post('/verify', authMiddleware, checkinController.verifyQr);

module.exports = router;