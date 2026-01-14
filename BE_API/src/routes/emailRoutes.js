const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

/**
 * @swagger
 * tags:
 *   name: Emails
 *   description: Quản lý mẫu email và gửi thông báo
 */

/**
 * @swagger
 * /emails/templates:
 *   post:
 *     summary: Tạo mẫu email mới
 *     tags: [Emails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - template_code
 *               - subject
 *               - body_content
 *             properties:
 *               template_code:
 *                 type: string
 *                 example: "PAYMENT_CONFIRM"
 *                 description: Tương ứng với cột template_name trong DB
 *               subject:
 *                 type: string
 *                 example: "Xác nhận thanh toán đơn hàng {{order_id}}"
 *               body_content:
 *                 type: string
 *                 example: "<p>Xin chào {{name}}, bạn đã thanh toán thành công.</p>"
 *                 description: Tương ứng với cột body_html trong DB
 *     responses:
 *       201:
 *         description: Tạo thành công
 *   get:
 *     summary: Lấy danh sách mẫu email
 *     tags: [Emails]
 *     responses:
 *       200:
 *         description: Danh sách template
 */
router.post('/templates', emailController.createTemplate);
router.get('/templates', emailController.getTemplates);

/**
 * @swagger
 * /emails/send:
 *   post:
 *     summary: Gửi email theo template (Giả lập)
 *     tags: [Emails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - template_code
 *               - recipient_email
 *             properties:
 *               template_code:
 *                 type: string
 *                 example: "PAYMENT_CONFIRM"
 *               recipient_email:
 *                 type: string
 *                 example: "user@example.com"
 *               variables:
 *                 type: object
 *                 example: { "name": "Minh Khoa", "order_id": "DH123" }
 *                 description: Biến thay thế vào template
 *     responses:
 *       200:
 *         description: Gửi thành công
 */
router.post('/send', emailController.sendEmail);

/**
 * @swagger
 * /emails/logs:
 *   get:
 *     summary: Xem lịch sử gửi email (Audit Log)
 *     tags: [Emails]
 *     responses:
 *       200:
 *         description: Danh sách logs
 */
router.get('/logs', emailController.getLogs);

module.exports = router;
