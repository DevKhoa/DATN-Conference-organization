const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

/**
 * @swagger
 * /notifications/send-bulk:
 *   post:
 *     summary: Gửi email hàng loạt (Hỗ trợ Dynamic Mapping)
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - template_code
 *               - target_group
 *             properties:
 *               template_code:
 *                 type: string
 *                 example: INVOICE_NOTIF
 *               target_group:
 *                 type: string
 *                 example: ALL_USERS
 *               variable_mapping:
 *                 type: object
 *                 description: Ánh xạ {tên_biến_trong_template= tên_cột_trong_db}
 *                 example:
 *                   customer: full_name
 *                   id_code: user_id
 *               extra_variables:
 *                 type: object
 *                 example:
 *                   company: FPT Software
 *     responses:
 *       200:
 *         description: Kết quả gửi
 */
router.post('/send-bulk', notificationController.sendBulk);
module.exports = router;
