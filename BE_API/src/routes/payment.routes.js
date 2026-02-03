const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Tạo phiên thanh toán
router.post('/checkout', paymentController.checkout); 

// Xử lý Return URL (sau khi user thanh toán xong, redirect về đây)
// PayPal
router.get('/paypal-return', (req, res) => {
    req.query.gateway = 'paypal';
    paymentController.handleReturn(req, res);
});

// MoMo
router.get('/momo-return', (req, res) => {
    req.query.gateway = 'momo';
    paymentController.handleReturn(req, res);
});

// Lấy danh sách giao dịch
router.get('/transactions', paymentController.getTransactions);

// Thống kê giao dịch
router.get('/audit', paymentController.auditPayments);

// Yêu cầu xuất hóa đơn (User request)
router.post('/invoices/request', paymentController.requestInvoice);

// Gửi hóa đơn VAT (Admin/System gửi email kèm link hóa đơn)
router.post('/invoices/send', paymentController.sendInvoice);

// Xử lý hoàn tiền
router.post('/refund', paymentController.refund);

module.exports = router;